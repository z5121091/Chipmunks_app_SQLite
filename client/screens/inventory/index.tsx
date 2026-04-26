import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
  detectRule,
  parseWithRule,
  getInventoryCodeByModel,
  addInventoryCheckRecord,
  generateCheckNo,
  getAllInventoryCheckRecords,
  InventoryCheckRecord,
  initDatabase,
  getAllMaterials,
} from '@/utils/database';
import { isQRCode } from '@/utils/qrcodeParser';
import { Spacing } from '@/constants/theme';
import { feedbackSuccess, feedbackError, feedbackWarning, feedbackDuplicate, feedbackConfirm, useFeedbackCleanup } from '@/utils/feedback';
import { useToast } from '@/utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateTime, formatDate } from '@/utils/time';
import { STORAGE_KEYS } from '@/constants/config';
import { getErrorDetail } from '@/utils/errorTypes';

// 盘点类型
type CheckType = 'whole' | 'partial';

// 扫描记录（每条独立）
interface ScanRecord {
  id: string;
  traceCode: string; // 追溯码（二维码原始内容）
  model: string;
  batch: string;
  quantity: number;
  actualQuantity?: number;
  inventoryCode?: string;
  scanTime: string;
  // 扩展字段
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  // 自定义字段
  customFields?: Record<string, string>;
}

// ========================================
// React.memo 优化：列表项组件
// ========================================
const RecordItem = React.memo(({ item, isExpanded, onToggle, onDelete, onEditQuantity, checkType, theme, styles }: {
  item: any;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  onDelete: (item: any) => void;
  onEditQuantity?: (record: any) => void;
  checkType: CheckType;
  theme: any;
  styles: any;
}) => {
  const key = `${item.model}|${item.version}`;

  return (
    <View key={key} style={styles.itemContainer}>
      {/* 聚合项（两行布局） */}
      <TouchableOpacity style={styles.itemRow}
        activeOpacity={0.7} onPress={() => onToggle(key)}
        onLongPress={() => onDelete(item)}
      >
        <View style={styles.itemLeft}>
          <TouchableOpacity style={styles.itemModelRow}
            activeOpacity={0.7} onPress={() => onToggle(key)}
          >
            <Text style={styles.itemModel}>
              {isExpanded ? '▼' : '▶'} {item.model}
            </Text>
          </TouchableOpacity>
          <Text style={styles.itemBatch}>
            版本: {item.version || '-'}
          </Text>
        </View>
        <View style={styles.itemRight}>
          {checkType === 'partial' ? (
            <>
              <View style={styles.quantityRow}>
                <Text style={styles.itemQtyLabel}>标签:</Text>
                <Text style={styles.itemQty}>{item.totalQuantity.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={styles.actualRow}
                activeOpacity={0.7} onPress={() => onEditQuantity && onEditQuantity(item.records[0])}
              >
                <Text style={styles.actualLabel}>实际:</Text>
                <Text style={styles.actualQty}>{item.actualTotalQuantity.toLocaleString()}</Text>
                <Feather name="edit-3" size={12} color={theme.accent} style={{ marginLeft: Spacing.xs }} />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.itemQty}>
              {item.totalQuantity.toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* 展开的明细 */}
      {isExpanded && (
        <View style={styles.detailsContainer}>
          {item.records.map((record: any) => (
            <TouchableOpacity
              key={record.id}
              style={styles.detailItem}
              onLongPress={() => onDelete(record)}
              delayLongPress={500}
            >
              <Text style={styles.detailText}>
                批次: {record.batch || '-'}{record.productionDate ? `  |  生产日期: ${record.productionDate}` : ''}  |  数量: {record.quantity} PCS
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有关键属性变化时才重新渲染
  return (
    prevProps.item.model === nextProps.item.model &&
    prevProps.item.version === nextProps.item.version &&
    prevProps.item.totalQuantity === nextProps.item.totalQuantity &&
    prevProps.item.count === nextProps.item.count &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.checkType === nextProps.checkType &&
    prevProps.item.records.length === nextProps.item.records.length
  );
});

export default function InventoryScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  // 盘点类型
  const [checkType, setCheckType] = useState<CheckType>('whole');

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 扫码队列 - 暂存处理中的新扫码
  const scanQueueRef = useRef<string[]>([]);

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 扫描记录
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);

  // AsyncStorage Key
  const INVENTORY_CHECK_RECORDS_KEY = 'inventory_check_records';
  const INVENTORY_CHECK_TYPE_KEY = 'inventory_check_type';
  // 全局仓库 Storage Key
  const GLOBAL_WAREHOUSE_KEY = STORAGE_KEYS.GLOBAL_WAREHOUSE;

  // 加载扫描记录
  const loadCheckRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem(INVENTORY_CHECK_RECORDS_KEY);
      if (savedRecords) {
        const records = JSON.parse(savedRecords) as ScanRecord[];

        // 恢复盘点类型和仓库，同时验证仓库是否匹配
        const savedType = await AsyncStorage.getItem(INVENTORY_CHECK_TYPE_KEY);
        if (savedType) {
          setCheckType(savedType as CheckType);
        }

        const savedWarehouse = await AsyncStorage.getItem(GLOBAL_WAREHOUSE_KEY);
        if (savedWarehouse) {
          const warehouse = JSON.parse(savedWarehouse);

          // 验证保存时的仓库是否与当前仓库匹配
          if (currentWarehouse) {
            if (warehouse.id !== currentWarehouse.id) {
              // 仓库不匹配，不恢复记录
              console.log('[盘点] 仓库不匹配，跳过恢复:', {
                savedWarehouseId: warehouse.id,
                currentWarehouseId: currentWarehouse.id,
              });
              return;
            }
          } else if (!currentWarehouse) {
            // 当前仓库未加载，不恢复记录（等待仓库加载完成后再恢复）
            console.log('[盘点] 当前仓库未加载，跳过恢复');
            return;
          }

          setCurrentWarehouse(warehouse);
        }

        setScanRecords(records);

        if (records.length > 0) {
          showToast(`已恢复 ${records.length} 条盘点记录`, 'success');
        }
      }
    } catch (error) {
      console.error('[盘点] 加载记录失败:', error);
    }
  };

  // 保存扫描记录
  const saveCheckRecords = async (records: ScanRecord[], type: CheckType, warehouse?: Warehouse | null) => {
    try {
      await AsyncStorage.setItem(INVENTORY_CHECK_RECORDS_KEY, JSON.stringify(records));
      await AsyncStorage.setItem(INVENTORY_CHECK_TYPE_KEY, type);
      if (warehouse) {
        await AsyncStorage.setItem(GLOBAL_WAREHOUSE_KEY, JSON.stringify(warehouse));
      }
    } catch (error) {
      console.error('[盘点] 保存记录失败:', error);
    }
  };

  // 清空扫描记录
  const clearCheckRecords = async () => {
    try {
      await AsyncStorage.removeItem(INVENTORY_CHECK_RECORDS_KEY);
      await AsyncStorage.removeItem(INVENTORY_CHECK_TYPE_KEY);
    } catch (error) {
      console.error('[盘点] 清空记录失败:', error);
    }
  };

  // 拆包数量修改
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ScanRecord | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const quantityInputRef = useRef<TextInput>(null);
  
  // 数量弹窗打开时聚焦输入框
  useEffect(() => {
    if (quantityModalVisible && quantityInputRef.current) {
      setTimeout(() => quantityInputRef.current?.focus(), 300);
    }
  }, [quantityModalVisible]);

  // 已保存盘点记录
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [savedRecords, setSavedRecords] = useState<InventoryCheckRecord[]>([]);

  // 保存状态
  const [saving, setSaving] = useState(false);

  // Toast
  const { showToast, ToastContainer } = useToast();

  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 切换展开/折叠
  const toggleExpand = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 数据变化时自动保存
  useEffect(() => {
    if (scanRecords.length > 0) {
      saveCheckRecords(scanRecords, checkType, currentWarehouse);
    } else {
      // 没有数据时清空存储
      clearCheckRecords();
    }
  }, [scanRecords, checkType, currentWarehouse]);

  // 删除聚合组（所有同型号+版本号的记录）
  const handleDeleteGroup = useCallback((item: any) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${item.model} V${item.version || '-'} 的所有 ${item.count} 条记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const recordIds = item.records.map((r: ScanRecord) => r.id);
            const updated = scanRecords.filter(r => !recordIds.includes(r.id));
            setScanRecords(updated);
            showToast(`已删除 ${item.count} 条记录`, 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 删除单条记录
  const handleDeleteRecord = useCallback((record: ScanRecord) => {
    Alert.alert(
      '确认删除',
      `确定要删除这条记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const updated = scanRecords.filter(r => r.id !== record.id);
            setScanRecords(updated);
            showToast('已删除记录', 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 自动清理震动和提示音
  useFeedbackCleanup();

  // 页面聚焦时初始化和恢复数据
  useFocusEffect(
    useCallback(() => {
      let focusTimer: NodeJS.Timeout | null = null;
      const init = async () => {
        // 1. 加载仓库列表（数据库已在 APP 启动时初始化）
        const list = await getAllWarehouses();
        setWarehouses(list);

        // 2. 恢复之前选择的仓库，并等待状态更新
        let warehouse: Warehouse | null = null;
        const savedWarehouse = await AsyncStorage.getItem(GLOBAL_WAREHOUSE_KEY);
        if (savedWarehouse) {
          const saved = JSON.parse(savedWarehouse) as Warehouse;
          // 确保仓库仍然存在
          if (list.find(w => w.id === saved.id)) {
            warehouse = saved;
          }
        }

        // 没有保存的选择，使用默认仓库
        if (!warehouse) {
          const def = await getDefaultWarehouse();
          warehouse = def || list[0] || null;
        }

        // 3. 设置当前仓库并等待状态更新
        setCurrentWarehouse(warehouse);

        // 4. 等待状态更新完成（给 React 一帧的时间）
        await new Promise(resolve => setTimeout(resolve, 0));

        // 5. 加载检查记录（仓库已加载）
        await loadCheckRecords();

        // 6. 加载已保存的盘点记录
        await loadSavedRecords();

        // 7. 聚焦输入框
        focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
      };

      init();

      return () => {
        if (autoSubmitTimerRef.current) {
          clearTimeout(autoSubmitTimerRef.current);
        }
        if (focusTimer) {
          clearTimeout(focusTimer);
        }
      };
    }, [])
  );

  // 加载仓库
  // 切换仓库
  const handleWarehouseChange = async (warehouse: Warehouse) => {
    // 先保存当前仓库的扫码记录
    if (scanRecords.length > 0) {
      await AsyncStorage.setItem(INVENTORY_CHECK_RECORDS_KEY, JSON.stringify(scanRecords));
    }
    
    // 切换仓库
    setCurrentWarehouse(warehouse);
    AsyncStorage.setItem(GLOBAL_WAREHOUSE_KEY, JSON.stringify(warehouse));
    
    // 清空当前扫码记录（新仓库从零开始）
    setScanRecords([]);
    await AsyncStorage.removeItem(INVENTORY_CHECK_RECORDS_KEY);
    
    // 清空编辑记录
    setEditingRecord(null);
    setQuantityModalVisible(false);
  };

  // 加载已保存盘点记录
  const loadSavedRecords = async () => {
    const records = await getAllInventoryCheckRecords(currentWarehouse?.id);
    setSavedRecords(records);
  };

  // 处理扫描（带参数版本）
  const processScan = useCallback(async (code: string) => {
    if (!code || processingRef.current) return;

    if (!currentWarehouse) {
      const errorDetail = getErrorDetail('ERR_NO_WAREHOUSE', undefined, router);
      showToast(errorDetail.title, 'error');
      if (errorDetail.action && errorDetail.onPress) {
        setTimeout(() => errorDetail.onPress!(), 500);
      }
      feedbackError();
      return;
    }

    processingRef.current = true;

    try {
      // 解析二维码
      const rule = await detectRule(code);
      if (!rule) {
        const errorDetail = getErrorDetail('ERR_QR_FORMAT', { code }, router);
        showToast(errorDetail.title, 'error');
        console.error('[盘点] 无法识别二维码格式:', code);
        feedbackError();
        return;
      }

      const { standardFields, customFields } = parseWithRule(code, rule);
      const model = standardFields.model || '';
      const batch = standardFields.batch || '';
      const quantity = parseInt(standardFields.quantity || '1', 10);
      const version = standardFields.version || '';


      if (!model) {
        showToast('无法识别型号信息', 'error');
        feedbackError();
        console.error('[盘点] 无法识别型号信息');
        return;
      }

      // 查找存货编码
      const inventoryCode = await getInventoryCodeByModel(model);

      // 检查重复（只检测追溯码，因为箱号可能重复）
      let isDuplicate = false;

      // 根据追溯码字段判断（已保存的记录）
      if (standardFields.traceNo) {
        const existingByTraceNo = scanRecords.find(r => r.traceNo === standardFields.traceNo);
        if (existingByTraceNo) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        showToast('⚠️ 该物料已扫码，请勿重复', 'warning');
        feedbackDuplicate();
        return;
      }

      // 新增记录
      const newRecord: ScanRecord = {
        id: Date.now().toString(),
        traceCode: code, // 追溯码
        model,
        batch,
        quantity,
        actualQuantity: checkType === 'partial' ? quantity : undefined,
        inventoryCode: inventoryCode || undefined,
        scanTime: formatDateTime(new Date().toISOString()),
        // 扩展字段
        package: standardFields.package || undefined,
        version: version || undefined,
        productionDate: standardFields.productionDate || undefined,
        traceNo: standardFields.traceNo || undefined,
        sourceNo: standardFields.sourceNo || undefined,
        // 自定义字段
        customFields: customFields || {},
      };

      // 计算该型号+版本的累计数量（包含新记录）
      const sameModelVersionRecords = scanRecords.filter(
        r => r.model === model && r.version === version
      );
      const totalCount = sameModelVersionRecords.length + 1;
      const totalQty = sameModelVersionRecords.reduce((sum, r) => sum + r.quantity, 0) + quantity;

      setScanRecords(prev => [newRecord, ...prev]);

      showToast(`${model}`, 'success');
      feedbackSuccess();
    } catch (e) {
      console.error('[盘点] 处理失败:', e);
      console.error(e);
      showToast('处理失败', 'error');
      feedbackError();
    } finally {
      processingRef.current = false;
      // 处理完成后，检查队列是否有待处理的扫码
      // 注意：使用 setTimeout 让 React 有机会更新状态，避免重复检测失败
      setTimeout(() => {
        if (scanQueueRef.current.length > 0) {
          const nextCode = scanQueueRef.current.shift();
          if (nextCode) {
            processScan(nextCode);
          }
        } else {
          // 队列空了，重新聚焦输入框
          inputRef.current?.focus();
        }
      }, 0);
    }
  }, [currentWarehouse, scanRecords, checkType]);

  // 处理扫描（入口函数，清理换行符后调用）
  // 修复：防止 onChangeText 和 onSubmitEditing 重复触发
  const handleScan = useCallback(async () => {
    // 如果正在处理中，直接返回
    if (processingRef.current) return;
    
    // PDA扫码可能带有多余的字符，需要全面清理
    let code = inputValue.trim()
      .replace(/[\r\n\t\s]+/g, '')  // 清理所有空白字符（换行、回车、制表符、空格）
      .replace(/^[^A-Za-z0-9]+/, '')  // 清理开头非字母数字字符
      .replace(/[^A-Za-z0-9]+$/, ''); // 清理结尾非字母数字字符

    // 如果没有有效内容，不处理
    if (!code) {
      return;
    }

    
    setInputValue(''); // 清空输入框
    await processScan(code);
    // 注意：processScan 的 finally 块会处理重新聚焦
  }, [inputValue, processScan]);

  // 输入变化时自动检测并触发（扫码器逐字符输入，需要防抖检测完成）
  const handleInputChange = useCallback((text: string) => {
    // 清除之前的定时器（每次输入都重置）
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    // 如果正在处理中，先缓存当前输入
    if (processingRef.current) {
      // 暂存到队列
      if (text.trim()) {
        scanQueueRef.current.push(text.trim());
      }
      return;
    }

    // 如果当前有输入内容，启动定时器检测扫码完成
    if (text.length > 0) {
      autoSubmitTimerRef.current = setTimeout(() => {
        const code = text.trim();
        // 检测到输入完成（输入停止超过阈值，认为扫码完成）
        if (code.length >= 1) {
          // 一维码过滤：不含分隔符的扫码静默忽略
          if (!isQRCode(code)) {
            setInputValue(''); // 清空输入框
            inputRef.current?.focus(); // 重新聚焦
            return;
          }
          setInputValue(''); // 清空输入框
          processScan(code);
        }
      }, 150); // 150ms 防抖，等待扫码器输入完成
      return;
    }

    // 输入框被清空时，更新状态
    setInputValue(text);
  }, [processScan]);

  // 扫码完成确认（焦点录入模式：用户手动按回车）
  const handleSubmitEditing = useCallback(() => {
    if (processingRef.current) return;

    let code = inputValue
      .replace(/[\r\n\t]+$/, '')
      .trim()
      .replace(/[\r\n\t\s]+/g, '')
      .replace(/^[^A-Za-z0-9]+/, '')
      .replace(/[^A-Za-z0-9]+$/, '');

    if (!code) return;

    // 一维码过滤：不含分隔符的扫码静默忽略
    if (!isQRCode(code)) {
      setInputValue('');
      inputRef.current?.focus();
      return;
    }

    setInputValue('');
    processScan(code);
  }, [inputValue, processScan]);

  // 选择仓库
  const selectWarehouse = async (wh: Warehouse) => {
    // 如果选择的是当前仓库，直接关闭弹窗
    if (wh.id === currentWarehouse?.id) {
      setShowWarehousePicker(false);
      return;
    }

    // C: 切换前自动保存当前记录
    if (scanRecords.length > 0) {
      await saveCheckRecords(scanRecords, checkType, currentWarehouse);
    }

    // B: 清空当前页面积累的扫描记录
    setScanRecords([]);
    setExpandedGroups(new Set());

    // 切换到新仓库
    handleWarehouseChange(wh);
    setShowWarehousePicker(false);
    showToast(`已切换到 ${wh.name}`, 'success');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 打开数量修改弹窗
  const openQuantityModal = (record: ScanRecord) => {
    setEditingRecord(record);
    setQuantityInput(record.actualQuantity?.toString() || record.quantity.toString());
    setQuantityModalVisible(true);
  };

  // 确认修改数量（支持回车和按钮）
  const handleConfirmQuantity = () => {
    if (!editingRecord) return;

    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty < 0) {
      showToast('请输入有效数量', 'warning');
      return;
    }

    setScanRecords(prev =>
      prev.map(r => r.id === editingRecord.id ? { ...r, actualQuantity: qty } : r)
    );
    setQuantityModalVisible(false);
    setEditingRecord(null);
    showToast(`已修改为 ${qty}`, 'success');
    feedbackConfirm();
  };

  // 确认盘点
  const handleSaveInventory = async () => {
    if (!currentWarehouse) {
      showToast('请先选择仓库', 'warning');
      feedbackWarning();
      return;
    }
    if (scanRecords.length === 0) {
      showToast('暂无扫描记录', 'warning');
      feedbackWarning();
      return;
    }

    // 数据库已在 APP 启动时初始化，直接处理保存

    setSaving(true);
    try {
      console.log('[库存盘点] 开始保存盘点记录，共', scanRecords.length, '条');
      const checkNo = await generateCheckNo();
      const today = formatDate(new Date().toISOString());
      console.log('[库存盘点] 盘点单号:', checkNo);

      for (const record of scanRecords) {
        console.log('[库存盘点] 保存记录:', { model: record.model, quantity: record.quantity });
        await addInventoryCheckRecord({
          check_no: checkNo,
          warehouse_id: currentWarehouse.id,
          warehouse_name: currentWarehouse.name,
          inventory_code: record.inventoryCode || '',
          scan_model: record.model,
          batch: record.batch,
          quantity: record.quantity,  // 原始数量，不受盘点模式影响
          check_type: checkType,
          actual_quantity: checkType === 'partial' ? record.actualQuantity : undefined,  // 实际盘点数量
          check_date: today,
          notes: record.traceCode, // 保存追溯码到备注
          // 扩展字段
          package: record.package,
          version: record.version,
          productionDate: record.productionDate,
          traceNo: record.traceNo,
          sourceNo: record.sourceNo,
          // 自定义字段
          customFields: record.customFields,
        });
      }

      console.log('[库存盘点] 保存成功');
      showToast(`盘点成功！共 ${scanRecords.length} 条`, 'success');
      feedbackConfirm();
      setScanRecords([]);
      loadSavedRecords(); // 刷新已保存记录
    } catch (error) {
      console.error('[库存盘点] 保存失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`保存失败: ${errorMessage}`, 'error');
      feedbackError();
    } finally {
      setSaving(false);
    }
  };

  // 清空记录
  const handleClearRecords = () => {
    if (scanRecords.length === 0) return;
    setScanRecords([]);
    showToast('已清空', 'warning');
    feedbackWarning();
  };

  // 按型号+版本号分组显示（用于列表渲染）
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: ScanRecord[] } = {};
    scanRecords.forEach(r => {
      const key = `${r.model}|${r.version || ''}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });
    return groups;
  }, [scanRecords]);

  // 计算每个型号+版本的累计数量
  const modelVersionTotals = useMemo(() => {
    const totals: { [key: string]: { qty: number; actualQty: number; count: number } } = {};
    scanRecords.forEach(r => {
      const key = `${r.model}|${r.version || ''}`;
      if (!totals[key]) {
        totals[key] = { qty: 0, actualQty: 0, count: 0 };
      }
      totals[key].qty += r.quantity;
      totals[key].actualQty += r.actualQuantity !== undefined ? r.actualQuantity : r.quantity;
      totals[key].count += 1;
    });
    return totals;
  }, [scanRecords]);

  // 计算总数量
  const totalQuantity = useMemo(() => {
    return Object.values(modelVersionTotals).reduce((sum, t) => {
      return sum + (checkType === 'partial' ? t.actualQty : t.qty);
    }, 0);
  }, [modelVersionTotals, checkType]);

  // 聚合显示数据（按型号+版本号聚合）
  const aggregatedRecords = useMemo(() => {
    const map = new Map<string, { records: ScanRecord[], totalQuantity: number, actualTotalQuantity: number }>();
    
    scanRecords.forEach(record => {
      const key = `${record.model}|${record.version || ''}`;
      if (!map.has(key)) {
        map.set(key, { records: [], totalQuantity: 0, actualTotalQuantity: 0 });
      }
      const group = map.get(key)!;
      group.records.push(record);
      group.totalQuantity += record.quantity;
      group.actualTotalQuantity += record.actualQuantity !== undefined ? record.actualQuantity : record.quantity;
    });
    
    return Array.from(map.entries()).map(([key, group]) => {
      const [model, version] = key.split('|');
      return {
        model,
        version: version || '',
        records: group.records,
        totalQuantity: group.totalQuantity,
        actualTotalQuantity: group.actualTotalQuantity,
        count: group.records.length,
      };
    });
  }, [scanRecords]);

  // 按型号分组的统计（用于已保存记录Modal）
  const savedGroupByModel = useMemo(() => {
    const groups: { [model: string]: { totalQty: number; lastDate: string; count: number } } = {};
    savedRecords.forEach(r => {
      if (!groups[r.scan_model]) {
        groups[r.scan_model] = { totalQty: 0, lastDate: r.check_date, count: 0 };
      }
      groups[r.scan_model].totalQty += r.quantity;
      groups[r.scan_model].count += 1;
      // 更新最新日期
      if (r.check_date > groups[r.scan_model].lastDate) {
        groups[r.scan_model].lastDate = r.check_date;
      }
    });
    return groups;
  }, [savedRecords]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>库存盘点</Text>
        </View>

        {/* 顶栏：盘点类型 + 仓库 */}
        <View style={styles.topBar}>
          {/* 盘点类型选择 */}
          <View style={styles.typeSelector}>
            <TouchableOpacity style={[styles.typeBtn, checkType === 'whole' && styles.typeBtnActive]}
              activeOpacity={0.7} onPress={() => {
                setCheckType('whole');
                setScanRecords([]);
              }}
            >
              <FontAwesome6 name="box" size={12} color={checkType === 'whole' ? theme.white : theme.textSecondary} />
              <Text style={[styles.typeBtnText, checkType === 'whole' && styles.typeBtnTextActive]}>整包</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, checkType === 'partial' && styles.typeBtnActive]}
              activeOpacity={0.7} onPress={() => {
                setCheckType('partial');
                setScanRecords([]);
              }}
            >
              <FontAwesome6 name="layer-group" size={12} color={checkType === 'partial' ? theme.white : theme.textSecondary} />
              <Text style={[styles.typeBtnText, checkType === 'partial' && styles.typeBtnTextActive]}>拆包</Text>
            </TouchableOpacity>
          </View>

          {/* 已保存按钮 */}
          <TouchableOpacity style={styles.savedBtn} activeOpacity={0.7} onPress={() => setSavedModalVisible(true)}>
            <Feather name="check-circle" size={14} color={theme.textPrimary} />
            <Text style={styles.savedBtnText}>{Object.keys(savedGroupByModel).length}</Text>
          </TouchableOpacity>

          {/* 仓库选择 */}
          <TouchableOpacity style={styles.warehouseBtn} activeOpacity={0.7} onPress={() => setShowWarehousePicker(true)}>
            <FontAwesome6 name="warehouse" size={14} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || '仓库'}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 扫码输入 + Toast（在同一个容器里） */}
        <View style={styles.scanBox}>
          <TextInput
            ref={inputRef}
            style={styles.scanInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitEditing}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            showSoftInputOnFocus={false}
          />
          
          {/* Toast */}
          <ToastContainer />
        </View>

        {/* 物料列表 */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>扫描记录</Text>
            <Text style={styles.listCount}>
              {scanRecords.length} 条 / {totalQuantity} PCS
            </Text>
          </View>
          <ScrollView style={styles.list}>
            {aggregatedRecords.map((item) => {
              const key = `${item.model}|${item.version}`;
              const isExpanded = expandedGroups.has(key);

              return (
                <RecordItem
                  key={key}
                  item={item}
                  isExpanded={isExpanded}
                  onToggle={toggleExpand}
                  onDelete={handleDeleteGroup}
                  onEditQuantity={openQuantityModal}
                  checkType={checkType}
                  theme={theme}
                  styles={styles}
                />
              );
            })}
            {scanRecords.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无扫描记录</Text>
              </View>
            )}
          </ScrollView>

          {/* 原始代码（已注释，用于快速回滚） */}
          {/* <ScrollView style={styles.list}>
            {aggregatedRecords.map((item) => {
              const key = `${item.model}|${item.version}`;
              const isExpanded = expandedGroups.has(key);

              return (
                <View key={key} style={styles.itemContainer}>
                  <TouchableOpacity style={styles.itemRow}
                    activeOpacity={0.7} onPress={() => toggleExpand(key)}
                    onLongPress={() => handleDeleteGroup(item)}
                  >
                    <View style={styles.itemLeft}>
                      <TouchableOpacity style={styles.itemModelRow}
                        activeOpacity={0.7} onPress={() => toggleExpand(key)}
                      >
                        <Text style={styles.itemModel}>
                          {isExpanded ? '▼' : '▶'} {item.model}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.itemBatch}>
                        版本: {item.version || '-'}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      {checkType === 'partial' ? (
                        <>
                          <View style={styles.quantityRow}>
                            <Text style={styles.itemQtyLabel}>标签:</Text>
                            <Text style={styles.itemQty}>{item.totalQuantity.toLocaleString()}</Text>
                          </View>
                          <TouchableOpacity style={styles.actualRow}
                            activeOpacity={0.7} onPress={() => openQuantityModal(item.records[0])}
                          >
                            <Text style={styles.actualLabel}>实际:</Text>
                            <Text style={styles.actualQty}>{item.actualTotalQuantity.toLocaleString()}</Text>
                            <Feather name="edit-3" size={12} color={theme.accent} style={{ marginLeft: Spacing.xs }} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.itemQty}>
                          {item.totalQuantity.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {item.records.map((record) => (
                        <TouchableOpacity
                          key={record.id}
                          style={styles.detailItem}
                          onLongPress={() => handleDeleteRecord(record)}
                          delayLongPress={500}
                        >
                          <Text style={styles.detailText}>
                            批次: {record.batch || '-'}{record.productionDate ? `  |  生产日期: ${record.productionDate}` : ''}  |  数量: {record.quantity} PCS
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {scanRecords.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无扫描记录</Text>
              </View>
            )}
          </ScrollView> */}

          {/* 操作按钮 */}
          {scanRecords.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.clearBtn} activeOpacity={0.7} onPress={handleClearRecords}>
                <Text style={styles.clearBtnText}>清空</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.7}
                onPress={handleSaveInventory}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>确认盘点</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 仓库选择器 */}
        {showWarehousePicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>选择仓库</Text>
              {warehouses.map(wh => (
                <TouchableOpacity key={wh.id}
                  style={[styles.pickerItem, currentWarehouse?.id === wh.id && styles.pickerItemActive]}
                  activeOpacity={0.7} onPress={() => selectWarehouse(wh)}
                >
                  <Text style={styles.pickerItemText}>{wh.name}</Text>
                  {currentWarehouse?.id === wh.id && (
                    <FontAwesome6 name="check" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.pickerClose} activeOpacity={0.7} onPress={() => setShowWarehousePicker(false)}>
                <Text style={styles.pickerCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 拆包数量修改弹窗 */}
        <Modal
          visible={quantityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQuantityModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setQuantityModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>修改实际数量</Text>
              {editingRecord && (
                <>
                  <Text style={styles.modalInfo}>
                    型号: {editingRecord.model}
                  </Text>
                  <Text style={styles.modalInfo}>
                    标签数量: {editingRecord.quantity}
                  </Text>
                  <TextInput
                    ref={quantityInputRef}
                    style={styles.modalInput}
                    value={quantityInput}
                    onChangeText={setQuantityInput}
                    onSubmitEditing={handleConfirmQuantity}
                    placeholder="实际数量"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    autoFocus={false}
                    
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalCancelBtn}
                      activeOpacity={0.7} onPress={() => setQuantityModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalConfirmBtn} activeOpacity={0.7} onPress={handleConfirmQuantity}>
                      <Text style={styles.modalConfirmText}>确认</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* 已保存盘点记录弹窗 */}
        <Modal
          visible={savedModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSavedModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSavedModalVisible(false)}
          >
            <View style={styles.savedModalContent}>
              <View style={styles.savedModalHeader}>
                <Text style={styles.savedModalTitle}>已保存盘点</Text>
                <TouchableOpacity onPress={() => setSavedModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              {Object.keys(savedGroupByModel).length === 0 ? (
                <View style={styles.savedEmpty}>
                  <Text style={styles.savedEmptyText}>暂无盘点记录</Text>
                </View>
              ) : (
                <ScrollView style={styles.savedList}>
                  {Object.entries(savedGroupByModel).map(([model, data]) => (
                    <View key={model} style={styles.savedItem}>
                      <View style={styles.savedItemLeft}>
                        <Text style={styles.savedModel}>{model}</Text>
                        <Text style={styles.savedDate}>{data.lastDate}</Text>
                      </View>
                      <View style={styles.savedItemRight}>
                        <Text style={styles.savedQty}>{data.totalQty} PCS</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </Screen>
  );
}
