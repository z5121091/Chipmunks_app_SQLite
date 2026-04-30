import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useCustomAlert } from '@/components/CustomAlert';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParseNullable } from '@/utils/json';
import {
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
  addInboundRecordsBatch,
  getAllInboundRecords,
  updateInboundSummary,
  generateInboundNo,
  detectRule,
  parseWithRule,
  getInventoryCodeByModel,
  getSupplierByModel,
  initDatabase,
  getAllMaterials,
  generateId,
} from '@/utils/database';
import { isQRCode } from '@/utils/qrcodeParser';
import { parseQuantity } from '@/utils/quantity';
import { Spacing } from '@/constants/theme';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { feedbackSuccess, feedbackError, feedbackWarning, feedbackDuplicate, feedbackConfirm, useFeedbackCleanup } from '@/utils/feedback';
import { useToast } from '@/utils/toast';
import { Str } from '@/resources/strings';
import { formatDateTime, formatDate } from '@/utils/time';
import { STORAGE_KEYS } from '@/constants/config';
import { getErrorDetail } from '@/utils/errorTypes';

// 扫描记录类型
interface ScanRecord {
  id: string;
  model: string;
  batch: string;
  quantity: number;
  scanTime: string;
  rawContent: string;
  inventoryCode?: string;
  supplier?: string;
  // 扩展字段
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  // 自定义字段
  customFields?: Record<string, string>;
  // 是否已确认
  confirmed?: boolean;
}

interface SavedInboundSummary {
  key: string;
  model: string;
  version: string;
  totalQty: number;
}

// ========================================
// React.memo 优化：列表项组件
// ========================================
const RecordItem = React.memo(({ item, isExpanded, isConfirmed, onToggle, onConfirm, onDeleteGroup, onDeleteRecord, theme, styles }: {
  item: any;
  isExpanded: boolean;
  isConfirmed: boolean;
  onToggle: (key: string) => void;
  onConfirm: (key: string) => void;
  onDeleteGroup: (item: any) => void;
  onDeleteRecord: (record: any) => void;
  theme: any;
  styles: any;
}) => {
  const key = `${item.model}|${item.version}`;

  return (
    <View key={key} style={styles.itemContainer}>
      {/* 聚合项 - 两行布局 */}
      <TouchableOpacity
        style={[
          styles.itemRow,
          isConfirmed && styles.itemConfirmed
        ]}
        onLongPress={() => onDeleteGroup(item)}
      >
        {/* 勾选框 */}
        <TouchableOpacity style={styles.checkbox}
          activeOpacity={0.7} onPress={() => onConfirm(key)}
        >
          <FontAwesome6
            name={isConfirmed ? "square-check" : "square"}
            size={18}
            color={isConfirmed ? theme.success : theme.textMuted}
          />
        </TouchableOpacity>

        {/* 型号内容（包含型号和版本号两行） */}
        <TouchableOpacity style={styles.modelContent}
          activeOpacity={0.7} onPress={() => onToggle(key)}
        >
          <Text style={[styles.itemModel, isConfirmed && styles.itemModelConfirmed]}>
            {isExpanded ? '▼' : '▶'} {item.model}
          </Text>
          <Text style={[styles.itemBatch, isConfirmed && styles.itemModelConfirmed]}>
            版本: {item.version || '-'}
          </Text>
        </TouchableOpacity>

        {/* 数量 */}
        <Text style={[styles.itemQty, isConfirmed && styles.itemQtyConfirmed]}>
          {item.totalQuantity.toLocaleString()}
        </Text>
      </TouchableOpacity>

      {/* 展开的明细 */}
      {isExpanded && (
        <View style={styles.detailsContainer}>
          {item.records.map((record: any) => (
            <TouchableOpacity
              key={record.id}
              style={styles.detailItem}
              onLongPress={() => onDeleteRecord(record)}
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
    prevProps.isConfirmed === nextProps.isConfirmed &&
    prevProps.item.records.length === nextProps.item.records.length
  );
});

export default function InboundScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const alert = useCustomAlert();
  const router = useSafeRouter();

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerFocusBlockedRef = useRef(false);
  // 扫码队列 - 暂存处理中的新扫码
  const scanQueueRef = useRef<string[]>([]);
  // 防抖相关
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 当前供应商（从物料管理获取）
  const [currentSupplier, setCurrentSupplier] = useState<string | null>(null);

  // 入库单号
  const [inboundNo, setInboundNo] = useState('');

  // AsyncStorage Key
  const INBOUND_SCAN_RECORDS_KEY = 'inbound_scan_records';
  const INBOUND_PENDING_DATA_KEY = 'inbound_pending_data';
  // 全局仓库 Storage Key
  const GLOBAL_WAREHOUSE_KEY = STORAGE_KEYS.GLOBAL_WAREHOUSE;

  // 扫描记录
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [saving, setSaving] = useState(false);

  // 已保存入库记录
  const [savedInboundModalVisible, setSavedInboundModalVisible] = useState(false);
  const [savedInboundRecords, setSavedInboundRecords] = useState<any[]>([]);

  // Toast
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    scannerFocusBlockedRef.current = showWarehousePicker || savedInboundModalVisible || saving;
  }, [savedInboundModalVisible, saving, showWarehousePicker]);

  const focusScannerInput = useCallback((delay = 80) => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      if (!scannerFocusBlockedRef.current) {
        inputRef.current?.focus();
      }
    }, delay);
  }, []);

  useEffect(() => () => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!showWarehousePicker && !savedInboundModalVisible && !saving) {
      focusScannerInput(80);
    }
  }, [focusScannerInput, savedInboundModalVisible, saving, showWarehousePicker]);

  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 确认状态管理
  const [confirmedGroups, setConfirmedGroups] = useState<Set<string>>(new Set());

  // 加载扫描记录
  const loadScanRecords = async (warehouse?: Warehouse | null): Promise<string | null> => {
    try {
      const savedRecords = await AsyncStorage.getItem(INBOUND_SCAN_RECORDS_KEY);
      if (savedRecords) {
        const records = safeJsonParseNullable<ScanRecord[]>(savedRecords, 'inbound.scanRecords');
        if (!records) {
          return null;
        }
        let restoredInboundNo: string | null = null;

        // 恢复供应商和入库单号，同时检查仓库是否匹配
        const pendingData = await AsyncStorage.getItem(INBOUND_PENDING_DATA_KEY);
        if (pendingData) {
          const data = safeJsonParseNullable<{
            supplier?: string | null;
            inboundNo?: string;
            warehouseId?: string;
            warehouseName?: string;
          }>(pendingData, 'inbound.pendingData');
          if (!data) {
            return null;
          }

          // 验证保存时的仓库是否与当前仓库匹配（使用传入的 warehouse 参数，避免状态闭包问题）
          const currentWarehouseId = warehouse?.id;
          if (data.warehouseId && currentWarehouseId) {
            if (data.warehouseId !== currentWarehouseId) {
              // 仓库不匹配，不恢复记录
              console.log('[loadScanRecords] 仓库不匹配，跳过恢复:', {
                savedWarehouseId: data.warehouseId,
                currentWarehouseId: currentWarehouseId,
              });
              return null;
            }
          } else if (!currentWarehouseId) {
            // 当前仓库未加载，不恢复记录（等待仓库加载完成后再恢复）
            console.log('[loadScanRecords] 当前仓库未加载，跳过恢复');
            return null;
          }

          setCurrentSupplier(data.supplier || null);
          setInboundNo(data.inboundNo || '');
          restoredInboundNo = data.inboundNo || null;
        }

        setScanRecords(records);

        if (records.length > 0) {
          showToast(`${Str.inboundRestoreRecords} ${records.length} ${Str.inboundRecords}`, 'success');
        }

        return restoredInboundNo;
      }
    } catch (error) {
      console.error('加载扫描记录失败:', error);
    }

    return null;
  };

  // 保存扫描记录
  const saveScanRecords = async (records: ScanRecord[], supplier?: string | null) => {
    try {
      await AsyncStorage.setItem(INBOUND_SCAN_RECORDS_KEY, JSON.stringify(records));
      
      const pendingData = {
        supplier: supplier || currentSupplier,
        inboundNo: inboundNo,
        warehouseId: currentWarehouse?.id,
        warehouseName: currentWarehouse?.name,
      };
      await AsyncStorage.setItem(INBOUND_PENDING_DATA_KEY, JSON.stringify(pendingData));
    } catch (error) {
      console.error('保存扫描记录失败:', error);
    }
  };

  // 清空扫描记录
  const clearScanRecords = async () => {
    try {
      await AsyncStorage.removeItem(INBOUND_SCAN_RECORDS_KEY);
      await AsyncStorage.removeItem(INBOUND_PENDING_DATA_KEY);
    } catch (error) {
      console.error('清空扫描记录失败:', error);
    }
  };

  // 加载已保存入库记录（最新的入库批次）
  const loadSavedInboundRecords = async (warehouseId?: string) => {
    try {
      // 获取当前仓库的最新入库记录
      const records = await getAllInboundRecords(warehouseId);

      if (records.length === 0) {
        setSavedInboundRecords([]);
        return;
      }

      // 找到最新的入库单号
      const latestInboundNo = records[0].inbound_no;

      // 筛选出最新入库单号的所有记录
      const latestRecords = records.filter(r => r.inbound_no === latestInboundNo);

      setSavedInboundRecords(latestRecords);
    } catch (error) {
      console.error('加载已保存入库记录失败:', error);
    }
  };

  // 初始化
  // 自动清理震动和提示音
  useFeedbackCleanup();

  // 页面聚焦时初始化和恢复数据
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const init = async () => {
        // 1. 加载仓库列表（数据库已在 APP 启动时初始化）
        const list = await getAllWarehouses();
        setWarehouses(list);

        // 2. 恢复之前选择的仓库，并等待状态更新
        let warehouse: Warehouse | null = null;
        const savedWarehouse = await AsyncStorage.getItem(GLOBAL_WAREHOUSE_KEY);
        if (savedWarehouse) {
          const saved = safeJsonParseNullable<Warehouse>(savedWarehouse, 'inbound.globalWarehouse');
          // 确保仓库仍然存在
          if (saved && list.find(w => w.id === saved.id)) {
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

        // 4. 加载扫描记录（直接传入 warehouse 参数，避免状态闭包问题）
        const restoredInboundNo = await loadScanRecords(warehouse);

        // 5. 加载已保存入库记录
        await loadSavedInboundRecords(warehouse?.id);

        // 6. 如果没有入库单号，生成新单号
        if (!restoredInboundNo) {
          await generateNo();
        }

        // 7. 聚焦输入框
        if (isActive) {
          focusScannerInput(100);
        }
      };
      init();

      return () => {
        isActive = false;
      };
    }, [focusScannerInput])
  );

  // 加载仓库
  // 切换仓库
  const handleWarehouseChange = async (warehouse: Warehouse) => {
    // 先保存当前仓库的扫码记录
    if (scanRecords.length > 0) {
      await saveScanRecords(scanRecords);
    }
    
    // 切换仓库
    setCurrentWarehouse(warehouse);
    await AsyncStorage.setItem(GLOBAL_WAREHOUSE_KEY, JSON.stringify(warehouse));

    // 先重置界面状态，再恢复新仓库自己的暂存
    setScanRecords([]);
    setCurrentSupplier(null);
    setInboundNo('');

    // 清空展开和确认状态
    setExpandedGroups(new Set());
    setConfirmedGroups(new Set());

    const restoredInboundNo = await loadScanRecords(warehouse);
    await loadSavedInboundRecords(warehouse.id);

    if (!restoredInboundNo) {
      await generateNo();
    }
  };

  // 生成入库单号
  const generateNo = async () => {
    const no = await generateInboundNo();
    setInboundNo(no);
  };

  // 处理扫描（带参数版本，供自动触发调用）
  const processScan = useCallback(async (code: string) => {
    if (!code || processingRef.current) return;

    if (!currentWarehouse) {
      showToast('请先选择仓库', 'error');
      feedbackError();
      return;
    }

    processingRef.current = true;
    let parsed: {
      model: string;
      batch: string;
      quantity: string;
      package?: string;
      version?: string;
      productionDate?: string;
      traceNo?: string;
      sourceNo?: string;
      customFields?: Record<string, string>;
    } | null = null;

    try {
      // 解析二维码
      try {
        const rule = await detectRule(code);
        console.log('[扫码入库] 检测到规则:', { ruleName: rule?.name, ruleSeparator: rule?.separator, codeLength: code.length });
        if (rule) {
          const { standardFields, customFields } = parseWithRule(code, rule);
          console.log('[扫码入库] 解析结果:', { standardFields, customFieldsCount: Object.keys(customFields || {}).length });
          parsed = {
            model: standardFields.model || '',
            batch: standardFields.batch || '',
            quantity: standardFields.quantity || '1',
            package: standardFields.package || '',
            version: standardFields.version || '',
            productionDate: standardFields.productionDate || '',
            traceNo: standardFields.traceNo || '',
            sourceNo: standardFields.sourceNo || '',
            customFields: customFields || {},
          };
        } else {
          console.warn('[扫码入库] 未检测到匹配的解析规则');
        }
      } catch (e) {
        console.error('[扫码入库] 规则解析失败:', e);
        showToast(`⚠️ 规则解析失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
      }

      if (!parsed || !parsed.model) {
        showToast(`⚠️ 无法识别物料信息\n二维码内容: ${code.substring(0, 20)}${code.length > 20 ? '...' : ''}`, 'error');
        feedbackError();
        console.error('[扫码入库] 无法识别物料信息:', { code, parsed, parsedModel: parsed?.model });
        return;
      }

      const parsedRecord = parsed;
      const quantity = parseQuantity(parsedRecord.quantity, { min: 1 });

      if (quantity === null) {
        showToast('⚠️ 数量字段无效，必须为大于 0 的整数', 'error');
        feedbackError();
        console.error('[扫码入库] 数量字段无效:', {
          code,
          quantity: parsedRecord.quantity,
          model: parsedRecord.model,
        });
        return;
      }

      // 查找存货编码和供应商
      const inventoryCode = await getInventoryCodeByModel(parsedRecord.model);
      const supplier = await getSupplierByModel(parsedRecord.model);

      console.log('[扫码入库] 查询结果:', {
        model: parsedRecord.model,
        inventoryCode,
        supplier,
        currentSupplier,
      });

      // 检查供应商一致性（仅警告，不阻止入库）
      if (supplier && currentSupplier && supplier !== currentSupplier) {
        console.warn('[扫码入库] 供应商不一致:', {
          currentSupplier,
          newSupplier: supplier,
          model: parsedRecord.model,
        });
        // 改为警告提示，不阻止入库
        showToast(`⚠️ 供应商不同\n当前: ${currentSupplier}\n此物料: ${supplier}`, 'warning');
        // 继续处理，不 return
      }

      // 首次扫描时设置供应商
      if (!currentSupplier && supplier) {
        setCurrentSupplier(supplier);
      }

      // 检查是否重复扫描（只检测追溯码，因为箱号可能重复）
      let isDuplicate = false;

      // 根据追溯码判断（已保存的记录）
      if (parsedRecord.traceNo) {
        const existing = scanRecords.find(r => r.traceNo === parsedRecord.traceNo);
        if (existing) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        showToast('⚠️ 该物料已扫码，请勿重复', 'warning');
        feedbackDuplicate();
        return;
      }

      // 新增记录（保存原始记录，不合并数量）
      const newRecord: ScanRecord = {
        id: generateId(),
        model: parsedRecord.model,
        batch: parsedRecord.batch,
        quantity,
        scanTime: formatDateTime(new Date().toISOString()),
        rawContent: code,
        inventoryCode: inventoryCode || undefined,
        supplier: supplier || undefined,
        // 扩展字段
        package: parsedRecord.package || undefined,
        version: parsedRecord.version || undefined,
        productionDate: parsedRecord.productionDate || undefined,
        traceNo: parsedRecord.traceNo || undefined,
        sourceNo: parsedRecord.sourceNo || undefined,
        // 自定义字段
        customFields: parsedRecord.customFields,
      };
      const newRecords = [newRecord, ...scanRecords];
      setScanRecords(newRecords);
      saveScanRecords(newRecords);
      showToast(`${parsedRecord.model}`, 'success');
      feedbackSuccess();
    } catch (e) {
      console.error('[扫码入库] 处理失败:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('[扫码入库] 错误详情:', {
        code,
        codeLength: code.length,
        parsed,
        processingRef: processingRef.current,
        scanQueueLength: scanQueueRef.current.length,
      });
      showToast(`⚠️ 解析失败: ${errorMessage}\n二维码长度: ${code.length}`, 'error');
      feedbackError();
    } finally {
      processingRef.current = false;
      // 处理完成后，检查队列是否有待处理的扫码
      // 注意：使用 setTimeout 让 React 有机会更新状态，避免重复检测失败
      setTimeout(() => {
        if (scanQueueRef.current.length > 0) {
          console.log('[扫码入库] 队列中有待处理扫码:', scanQueueRef.current.length);
          const nextCode = scanQueueRef.current.shift();
          if (nextCode) {
            processScan(nextCode);
          }
        } else {
          // 队列空了，重新聚焦输入框
          focusScannerInput(0);
        }
      }, 0);
    }
  }, [currentWarehouse, currentSupplier, focusScannerInput, scanRecords]);

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
            focusScannerInput(0);
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
  }, [focusScannerInput, processScan]);

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
      focusScannerInput(0);
      return;
    }

    setInputValue('');
    processScan(code);
  }, [focusScannerInput, inputValue, processScan]);

  // 选择仓库
  const selectWarehouse = async (wh: Warehouse) => {
    // 如果选择的是当前仓库，直接关闭弹窗
    if (wh.id === currentWarehouse?.id) {
      setShowWarehousePicker(false);
      return;
    }

    // 切换到新仓库
    await handleWarehouseChange(wh);
    setShowWarehousePicker(false);
    showToast(`已切换到 ${wh.name}`, 'success');
    focusScannerInput(100);
  };

  // 确认入库
  const handleSaveInbound = async () => {
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

    setSaving(true);
    try {
      const today = formatDate(new Date().toISOString());

      const recordsToSave = scanRecords.map(record => ({
        inbound_no: inboundNo,
        warehouse_id: currentWarehouse.id,
        warehouse_name: currentWarehouse.name,
        inventory_code: record.inventoryCode || '',
        scan_model: record.model,
        batch: record.batch || '',
        quantity: record.quantity,
        in_date: today,
        notes: '',
        rawContent: record.rawContent || '',
        package: record.package || '',
        version: record.version || '',
        productionDate: record.productionDate || '',
        traceNo: record.traceNo || '',
        sourceNo: record.sourceNo || '',
        customFields: record.customFields,
      }));

      console.log('[handleSaveInbound] 开始批量保存入库记录:', {
        count: recordsToSave.length,
        inboundNo,
        warehouseId: currentWarehouse.id,
      });

      await addInboundRecordsBatch(recordsToSave);

      showToast(`入库成功！共 ${scanRecords.length} 条`, 'success');
      feedbackConfirm();

      // 更新入库汇总表（按型号+版本号+入库日期每日统计）
      await updateInboundSummary(currentWarehouse.id);

      // 刷新已保存入库记录
      await loadSavedInboundRecords(currentWarehouse.id);

      // 全部成功才清空记录
      setScanRecords([]);
      setCurrentSupplier(null);
      setExpandedGroups(new Set());
      setConfirmedGroups(new Set());
      await clearScanRecords();
      await generateNo();
    } catch (error) {
      console.error('[handleSaveInbound] 保存失败:', error);
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
    setCurrentSupplier(null);
    clearScanRecords();
    showToast(Str.toastClearSuccess, 'warning');
    feedbackWarning();
  };

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

  // 切换确认状态
  const toggleConfirm = useCallback((key: string) => {
    setConfirmedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 删除聚合组（所有同型号+版本号的记录）
  const handleDeleteGroup = useCallback((item: any) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${item.model} V${item.version || '-'} 的所有 ${item.count} 箱记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const recordIds = item.records.map((r: ScanRecord) => r.id);
            const updated = scanRecords.filter(r => !recordIds.includes(r.id));
            setScanRecords(updated);
            saveScanRecords(updated);
            showToast(`已删除 ${item.count} 箱记录`, 'success');
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
            saveScanRecords(updated);
            showToast('已删除记录', 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 计算总数量
  const totalQuantity = scanRecords.reduce((sum, r) => sum + r.quantity, 0);

  // 计算已确认数量
  const confirmedCount = confirmedGroups.size;

  // 聚合扫描记录（按型号+版本号聚合，用于显示）
  const aggregatedRecords = useMemo(() => {
    const map = new Map<string, { records: ScanRecord[], totalQuantity: number }>();
    
    scanRecords.forEach(record => {
      const key = `${record.model}|${record.version || ''}`;
      if (!map.has(key)) {
        map.set(key, { records: [], totalQuantity: 0 });
      }
      const group = map.get(key)!;
      group.records.push(record);
      group.totalQuantity += record.quantity;
    });
    
    return Array.from(map.entries()).map(([key, group]) => {
      const [model, version] = key.split('|');
      return {
        model,
        version: version || '',
        records: group.records,
        totalQuantity: group.totalQuantity,
        count: group.records.length,
      };
    });
  }, [scanRecords]);

  // 数据变化时自动保存到 AsyncStorage（实现持久化）
  useEffect(() => {
    // 当有扫描记录时自动保存
    if (scanRecords.length > 0) {
      saveScanRecords(scanRecords, currentSupplier);
      console.log('[入库] 数据变化，自动保存记录:', scanRecords.length);
    }
  }, [scanRecords, currentSupplier, currentWarehouse]);

  // 按型号+版本号分组的统计（用于已保存入库记录弹窗）
  const savedGroupByModel = useMemo(() => {
    const groups: { [key: string]: { totalQty: number } } = {};
    savedInboundRecords.forEach(r => {
      const key = `${r.scan_model}|${r.version || ''}`;
      if (!groups[key]) {
        groups[key] = { totalQty: 0 };
      }
      groups[key].totalQty += r.quantity;
    });
    return groups;
  }, [savedInboundRecords]);

  const savedInboundSummary = useMemo<SavedInboundSummary[]>(() => (
    Object.entries(savedGroupByModel).map(([key, data]) => {
      const [model, version] = key.split('|');
      return {
        key,
        model,
        version: version || '-',
        totalQty: data.totalQty,
      };
    })
  ), [savedGroupByModel]);

  const inboundListState = useMemo(
    () => `${[...expandedGroups].join('|')}::${[...confirmedGroups].join('|')}`,
    [expandedGroups, confirmedGroups]
  );

  const renderAggregatedRecord = useCallback(({ item }: { item: any }) => {
    const key = `${item.model}|${item.version}`;
    const isExpanded = expandedGroups.has(key);
    const isConfirmed = confirmedGroups.has(key);

    return (
      <RecordItem
        item={item}
        isExpanded={isExpanded}
        isConfirmed={isConfirmed}
        onToggle={toggleExpand}
        onConfirm={toggleConfirm}
        onDeleteGroup={handleDeleteGroup}
        onDeleteRecord={handleDeleteRecord}
        theme={theme}
        styles={styles}
      />
    );
  }, [confirmedGroups, expandedGroups, handleDeleteGroup, handleDeleteRecord, styles, theme, toggleConfirm, toggleExpand]);

  const renderSavedInboundItem = useCallback(({ item }: { item: SavedInboundSummary }) => (
    <View style={styles.savedItem}>
      <View style={styles.savedItemLeft}>
        <Text style={styles.savedModel} numberOfLines={1}>{item.model}</Text>
        <Text style={styles.savedVersion}>版本: {item.version}</Text>
      </View>
      <View style={styles.savedItemRight}>
        <Text style={styles.savedQty}>{item.totalQty} PCS</Text>
      </View>
    </View>
  ), [styles]);

  const savedInboundKeyExtractor = useCallback((item: SavedInboundSummary) => item.key, []);

  const aggregatedRecordKeyExtractor = useCallback(
    (item: any) => `${item.model}|${item.version}`,
    []
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫码入库</Text>

          {/* 已保存入库按钮 */}
          <TouchableOpacity
            style={styles.savedBtn}
            activeOpacity={0.7}
            onPress={() => setSavedInboundModalVisible(true)}
          >
            <Feather name="check-circle" size={14} color={theme.textPrimary} />
            <Text style={styles.savedBtnText}>{Object.keys(savedGroupByModel).length}</Text>
          </TouchableOpacity>
        </View>

        {/* 顶部：仓库选择 + 供应商 */}
        <View style={[styles.topBar]}>
          <TouchableOpacity style={styles.warehouseBtn} activeOpacity={0.7} onPress={() => setShowWarehousePicker(true)}>
            <FontAwesome6 name="warehouse" size={14} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || Str.labelSelectWarehouse}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={[styles.supplierTag, scanRecords.length > 0 && styles.supplierTagActive]}>
            <FontAwesome6 
              name="building" 
              size={12} 
              color={scanRecords.length > 0 ? theme.white : theme.textMuted} 
            />
            <Text style={[styles.supplierText, scanRecords.length > 0 && styles.supplierTextActive]} numberOfLines={1}>
              {currentSupplier || (scanRecords.length > 0 ? `${Str.inboundScanned} ${scanRecords.length} ${Str.inboundRecords}` : Str.labelSupplier)}
            </Text>
          </View>
        </View>

        {/* 扫码输入 + Toast（在同一个容器里） */}
        <View style={[styles.scanBox, inputValue.length > 0 && styles.scanBoxActive]}>
          <TextInput
            ref={inputRef}
            style={styles.scanInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitEditing}
            onBlur={() => focusScannerInput(120)}
            placeholder="等待扫码"
            placeholderTextColor={theme.textMuted}
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
            <Text style={styles.listTitle}>待入库记录</Text>
            <Text style={styles.listCount}>
              {aggregatedRecords.length} 型号 / {totalQuantity} PCS
              {confirmedCount > 0 && ` / 已确认 ${confirmedCount}`}
            </Text>
          </View>
          <FlatList
            style={styles.list}
            contentContainerStyle={aggregatedRecords.length === 0 ? styles.listEmptyContent : styles.listContent}
            data={aggregatedRecords}
            renderItem={renderAggregatedRecord}
            keyExtractor={aggregatedRecordKeyExtractor}
            extraData={inboundListState}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={16}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无扫描记录</Text>
              </View>
            }
          />

          {/* 操作按钮 */}
          {scanRecords.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.clearBtn} activeOpacity={0.7} onPress={handleClearRecords}>
                <Feather name="trash-2" size={17} color={theme.textSecondary} />
                <Text style={styles.clearBtnText}>{Str.btnClear}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.7}
                onPress={handleSaveInbound}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.buttonPrimaryText} />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color={theme.buttonPrimaryText} />
                    <Text style={styles.submitBtnText}>保存入库</Text>
                  </>
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

        {/* 已保存入库记录弹窗 */}
        <Modal
          visible={savedInboundModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSavedInboundModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSavedInboundModalVisible(false)}
          >
            <View style={styles.savedModalContent}>
              <View style={styles.savedModalHeader}>
                <Text style={styles.savedModalTitle}>已保存入库</Text>
                <TouchableOpacity onPress={() => setSavedInboundModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {savedInboundSummary.length === 0 ? (
                <View style={styles.savedEmpty}>
                  <Text style={styles.savedEmptyText}>暂无入库记录</Text>
                </View>
              ) : (
                <FlatList
                  data={savedInboundSummary}
                  keyExtractor={savedInboundKeyExtractor}
                  renderItem={renderSavedInboundItem}
                  contentContainerStyle={styles.savedList}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={12}
                  maxToRenderPerBatch={16}
                  windowSize={7}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Screen>
  );
}
