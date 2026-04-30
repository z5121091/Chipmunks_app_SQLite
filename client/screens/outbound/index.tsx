import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { parseQRCodeSync, isQRCode } from '@/utils/qrcodeParser';
import {
  initDatabase,
  upsertOrder,
  addMaterial,
  getOrder,
  detectRule,
  parseWithRule,
  checkMaterialExists,
  searchMaterials,
  getInventoryCodeByModel,
  deleteMaterial,
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
} from '@/utils/database';
import { scanQueue, QueueItem, QueueItemStatus } from '@/utils/scanQueue';
import { STORAGE_KEYS } from '@/constants/config';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing } from '@/constants/theme';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { feedbackSuccess, feedbackError, feedbackWarning, feedbackDuplicate, feedbackNewOrder, feedbackSwitchOrder, initSoundSetting, useFeedbackCleanup } from '@/utils/feedback';
import { useToast } from '@/utils/toast';
import { getISODateTime } from '@/utils/time';

// 订单号格式：IO-年-月-日-序号（序号2-3位）
const ORDER_NO_REGEX = /^IO-\d{4}-\d{2}-\d{2}-\d{2,3}$/;

interface MaterialItem {
  id: string;
  model: string;
  batch: string;
  quantity: string;
  scannedAt: Date;
  version?: string;
  traceNo?: string;
  sourceNo?: string;
  package?: string;
  productionDate?: string;
  customFields?: Record<string, string>;
}

interface AggregatedGroup {
  key: string; // model + version
  model: string;
  version: string;
  totalQuantity: number;
  boxCount: number;
  items: MaterialItem[]; // 所有items，用于聚合总数量和显示
}

// ========================================
// React.memo 优化：列表项组件
// ========================================
const RecordItem = React.memo(({ group, isExpanded, onToggle, onDeleteGroup, onDeleteItem, styles }: {
  group: any;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  onDeleteGroup: (group: any) => void;
  onDeleteItem: (item: any) => void;
  styles: any;
}) => {
  return (
    <View key={group.key}>
      {/* 聚合项（两行布局） */}
      <TouchableOpacity style={styles.itemRow}
        activeOpacity={0.7} onPress={() => onToggle(group.key)}
        onLongPress={() => onDeleteGroup(group)}
        delayLongPress={500}
      >
        <View style={styles.itemLeft}>
          <Text style={styles.itemModel}>
            {isExpanded ? '▼' : '▶'} {group.model}
          </Text>
          <Text style={styles.itemBatch}>
            版本: {group.version || '-'}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemQty}>
            {group.totalQuantity.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 展开的明细 */}
      {isExpanded && (
        <View style={styles.detailsContainer}>
          {group.items.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={styles.detailItem}
              onLongPress={() => onDeleteItem(item)}
              delayLongPress={500}
            >
              <Text style={styles.detailText}>
                批次: {item.batch || '-'}  |  生产日期: {item.productionDate || '-'}  |  数量: {parseInt(item.quantity, 10) || 0} PCS
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
    prevProps.group.model === nextProps.group.model &&
    prevProps.group.version === nextProps.group.version &&
    prevProps.group.totalQuantity === nextProps.group.totalQuantity &&
    prevProps.group.boxCount === nextProps.group.boxCount &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.group.items.length === nextProps.group.items.length
  );
});

export default function PDAScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  // 初始化声音设置
  useEffect(() => {
    initSoundSetting();
  }, []);

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveInputValueRef = useRef('');
  const pendingScanCodesRef = useRef<string[]>([]);
  const scannerFocusBlockedRef = useRef(false);
  const orderNoRef = useRef(''); // 🔥 添加 orderNoRef，用于批量写入时判断是否需要刷新

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 当前订单
  const [orderNo, setOrderNo] = useState('');
  const [materialCount, setMaterialCount] = useState(0);

  // 🔥 同步 orderNo 到 orderNoRef（避免闭包问题）
  useEffect(() => {
    orderNoRef.current = orderNo;
  }, [orderNo]);

  // 扫码记录（参考入库实现）
  const [scanRecords, setScanRecords] = useState<MaterialItem[]>([]);

  // 聚合展开状态（记录哪些聚合组是展开的）
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Toast
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    scannerFocusBlockedRef.current = showWarehousePicker;
  }, [showWarehousePicker]);

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
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!showWarehousePicker) {
      focusScannerInput(80);
    }
  }, [focusScannerInput, showWarehousePicker]);

  // AsyncStorage Key
  const OUTBOUND_SCAN_RECORDS_KEY = 'outbound_scan_records';

  // 自动清理震动和提示音
  useFeedbackCleanup();

  // 页面聚焦时初始化和恢复数据
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        // 1. 设置批量写入函数（数据库写入前强制等待数据库初始化）
        scanQueue.setBatchWriteFunction(async (items: QueueItem[]) => {
          console.log('[ScanQueue] ===== 批量写入开始 =====');
          console.log('[ScanQueue] 批量数量:', items.length);

          // 🔥 限制每次批量写入的数量，防止突然扫太多导致卡顿
          const itemsToProcess = items.slice(0, 10);
          console.log('[ScanQueue] 限制后数量:', itemsToProcess.length);

          // 🔥 强制等待数据库初始化，确保数据库一定 ready
          console.log('[ScanQueue] 等待数据库初始化...');
          await initDatabase();
          console.log('[ScanQueue] 数据库初始化完成');

          const success: boolean[] = [];
          const materialIds: string[] = [];
          const errors: (string | null)[] = [];
          const ordersToRefresh = new Set<string>();
          const ordersToRefreshWarehouseIds = new Map<string, string>(); // 🔥 存储 orderNo -> warehouseId 映射

          console.log('[ScanQueue] 开始处理队列项...'); // 收集需要刷新的订单

          for (const item of itemsToProcess) {
            try {
              const parsed = item.parsed;
              const orderNo = parsed.orderNo;
              const warehouseId = parsed.warehouseId;
              const warehouseName = parsed.warehouseName;

              console.log('[ScanQueue] 处理物料:', {
                orderNo,
                model: parsed.model,
                batch: parsed.batch,
                warehouseId,
                warehouseName
              });

              if (!orderNo || typeof orderNo !== 'string' || orderNo.trim() === '') {
                throw new Error('订单号为空');
              }

              if (!warehouseId || typeof warehouseId !== 'string' || warehouseId.trim() === '') {
                console.error('[ScanQueue] 仓库ID无效，跳过物料:', {
                  warehouseId,
                  warehouseName,
                  currentWarehouse,
                  parsed
                });
                throw new Error('仓库ID无效');
              }

              // 添加物料到数据库
              const materialId = await addMaterial({
                order_no: orderNo,
                customer_name: '',
                operation_type: 'outbound',
                model: parsed.model || '',
                batch: parsed.batch || '',
                quantity: parseInt(parsed.quantity || '1', 10),
                traceNo: parsed.traceNo,
                sourceNo: parsed.sourceNo,
                package: parsed.package,
                version: parsed.version,
                productionDate: parsed.productionDate,
                raw_content: item.scanData,
                separator: parsed.separator,
                rule_name: parsed.ruleName,
                customFields: parsed.customFields,
                scanned_at: getISODateTime(),
                warehouse_id: warehouseId,
                warehouse_name: warehouseName,
                inventory_code: parsed.inventoryCode || '',
              });

              console.log('[ScanQueue] 物料添加成功:', materialId);

              // 更新订单
              await upsertOrder(orderNo, undefined, { id: warehouseId, name: warehouseName });
              console.log('[ScanQueue] 订单更新成功:', orderNo);

              success.push(true);
              materialIds.push(materialId);
              errors.push(null);

              // 收集需要刷新的订单（循环结束后统一刷新）
              console.log('[ScanQueue] 判断是否需要刷新:', {
                itemOrderNo: orderNo,
                pageOrderNo: orderNoRef.current,
                shouldRefresh: orderNo === orderNoRef.current
              });

              if (orderNo === orderNoRef.current) {
                ordersToRefresh.add(orderNo);
                ordersToRefreshWarehouseIds.set(orderNo, warehouseId); // 🔥 同时记录 warehouseId
                console.log('[ScanQueue] 添加到刷新列表:', orderNo);
              }
            } catch (e) {
              console.error('[ScanQueue] 批量写入失败:', item.id, e);
              success.push(false);
              materialIds.push('');
              errors.push(e instanceof Error ? e.message : String(e));
            }
          }

          // 🔥 循环结束后统一刷新 UI，避免多次刷新导致卡顿
          console.log('[ScanQueue] 准备刷新订单，当前页面订单号:', orderNoRef.current);
          console.log('[ScanQueue] 需要刷新的订单列表:', Array.from(ordersToRefresh));

          for (const orderNo of ordersToRefresh) {
            try {
              const warehouseId = ordersToRefreshWarehouseIds.get(orderNo); // 🔥 获取对应的 warehouseId
              console.log('[ScanQueue] 开始刷新订单:', orderNo, 'warehouseId:', warehouseId);
              await loadOrderMaterials(orderNo, warehouseId); // 🔥 传入 warehouseId 参数
              console.log('[ScanQueue] 订单刷新成功:', orderNo);
            } catch (e) {
              console.error('[ScanQueue] 刷新订单物料失败:', orderNo, e);
            }
          }

          return { success, materialIds, errors };
        });

        // 3. 启动队列定时器
        scanQueue.startTimer();

        // 4. 订阅队列变化（简化订阅，避免重复刷新）
        // 注意：批量写入函数中已经统一刷新 UI，这里只用于显示统计信息
        const unsubscribe = scanQueue.subscribe(() => {
          // 队列变化时，只需要更新统计信息，不需要重新加载数据
          // 因为批量写入函数中已经统一刷新了 UI
          const stats = scanQueue.getStats();
          console.log('[ScanQueue] 队列状态:', stats);
        });

        // 5. 加载仓库列表
        const list = await getAllWarehouses();
        setWarehouses(list);

        // 6. 恢复之前选择的仓库，并等待状态更新
        let warehouse: Warehouse | null = null;
        const savedWarehouse = await AsyncStorage.getItem(STORAGE_KEYS.GLOBAL_WAREHOUSE);
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

        // 7. 设置当前仓库
        setCurrentWarehouse(warehouse);

        // 8. 加载扫码出库持久化状态（显式传入仓库，避免读取旧闭包）
        await loadOutboundState(list, warehouse);

        // 9. 聚焦输入框
        if (isActive) {
          focusScannerInput(100);
        }

        // 返回清理函数
        return () => {
          scanQueue.stopTimer();
          unsubscribe();
        };
      };

      const cleanupPromise = init();

      return () => {
        isActive = false;
        if (autoSubmitTimerRef.current) {
          clearTimeout(autoSubmitTimerRef.current);
        }
        // 等待 init 完成，清理订阅
        cleanupPromise.then(cleanup => {
          if (cleanup) cleanup();
        }).catch(console.error);
      };
    }, [focusScannerInput])
  );

  // 加载扫码出库持久化状态（订单号、仓库、扫码记录）
  const loadOutboundState = async (
    warehouseList?: Warehouse[],
    explicitWarehouse?: Warehouse | null
  ) => {
    try {
      // 1. 加载订单号
      const savedOrderNo = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
      if (savedOrderNo) {
        // 2. 验证订单是否存在
        const order = await getOrder(savedOrderNo);
        if (!order) {
          console.log('[loadOutboundState] 订单不存在，清空订单号:', savedOrderNo);
          await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
          setOrderNo('');
          return;
        }

        // 3. 检查订单的仓库是否存在（使用传入的仓库列表，避免依赖状态）
        const list = warehouseList || warehouses;
        const warehouse = list.find(w => w.id === order.warehouse_id);
        if (!warehouse) {
          console.log('[loadOutboundState] 订单的仓库已不存在，清空订单号');
          Alert.alert('提示', '订单所属的仓库已被删除，订单号已清空');
          await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
          setOrderNo('');
          return;
        }

        // 4. 检查订单仓库是否与当前仓库匹配（仅在当前仓库已加载时检查）
        const activeWarehouse = explicitWarehouse ?? currentWarehouse;
        if (activeWarehouse && order.warehouse_id !== activeWarehouse.id) {
          console.log('[loadOutboundState] 订单仓库不匹配，清空订单号:', {
            savedOrderNo,
            orderWarehouseId: order.warehouse_id,
            currentWarehouseId: activeWarehouse.id,
          });
          Alert.alert('提示', '订单属于其他仓库，订单号已清空');
          await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
          setOrderNo('');
          return;
        }

        // 5. 订单验证通过，恢复订单号和物料
        setOrderNo(savedOrderNo);
        await loadOrderMaterials(savedOrderNo, order.warehouse_id);
      }
    } catch (error) {
      console.error('[扫码出库] 加载持久化状态失败:', error);
    }
  };

  // 切换仓库
  const handleWarehouseChange = async (warehouse: Warehouse) => {
    // 切换仓库
    setCurrentWarehouse(warehouse);
    AsyncStorage.setItem(STORAGE_KEYS.GLOBAL_WAREHOUSE, JSON.stringify(warehouse));

    // 清空当前扫码记录（新仓库从零开始）
    setOrderNo('');
    setScanRecords([]);
    setMaterialCount(0);
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
    await clearScanRecords();

    // 清空展开状态
    setExpandedGroups(new Set());
  };

  // 保存扫描记录
  const saveScanRecords = async (records: MaterialItem[]) => {
    try {
      await AsyncStorage.setItem(OUTBOUND_SCAN_RECORDS_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('保存扫描记录失败:', error);
    }
  };

  // 清空扫描记录
  const clearScanRecords = async () => {
    try {
      await AsyncStorage.removeItem(OUTBOUND_SCAN_RECORDS_KEY);
    } catch (error) {
      console.error('清空扫描记录失败:', error);
    }
  };

  // 加载订单物料（从数据库加载已保存的记录）
  const loadOrderMaterials = async (no: string, explicitWarehouseId?: string) => {
    // 🔥 优先使用显式传入的 warehouseId（解决闭包问题）
    const warehouseId = explicitWarehouseId || (currentWarehouse?.id);

    // 确保仓库ID有效
    if (!warehouseId || typeof warehouseId !== 'string' || warehouseId.trim() === '') {
      console.warn('[loadOrderMaterials] 仓库ID无效，无法加载订单物料');
      return;
    }

    // 确保订单号有效
    if (!no || typeof no !== 'string' || no.trim() === '') {
      console.warn('[loadOrderMaterials] 订单号无效，无法加载订单物料');
      return;
    }

    const list = await searchMaterials({
      exactOrderNo: no.trim(),
      warehouse_id: warehouseId.trim()
    });
    setMaterialCount(list.length);
    // 加载全部数据用于聚合，显示时限制10行
    const materials = list.slice().reverse().map(m => ({
      id: m.id,
      model: m.model,
      batch: m.batch,
      quantity: String(m.quantity),
      scannedAt: new Date(m.scanned_at),
      version: m.version,
      traceNo: m.traceNo,
      sourceNo: m.sourceNo,
      package: m.package,
      productionDate: m.productionDate,
      customFields: m.customFields,
    }));
    setScanRecords(materials);
  };

  // 处理扫描（带参数版本）
  const processScan = useCallback(async (code: string) => {
    console.log('[processScan] 开始处理扫码:', code);
    console.log('[processScan] 当前订单号:', orderNo);
    console.log('[processScan] 当前仓库:', currentWarehouse ? currentWarehouse.name : 'null');

    if (!code || processingRef.current) return;

    // 如果当前没有订单号，扫描内容必须是订单号格式
    if (!orderNo && !ORDER_NO_REGEX.test(code)) {
      showToast('请先扫描订单\n格式: IO-年-月-日-序号', 'error');
      feedbackError();
      return;
    }

    processingRef.current = true;

    try {
      // 判断是否是订单号格式
      if (ORDER_NO_REGEX.test(code)) {
        // 确保仓库已加载
        if (!currentWarehouse) {
          showToast('请先选择仓库', 'error');
          feedbackError();
          return;
        }

        // 确保仓库ID有效
        if (!currentWarehouse.id || typeof currentWarehouse.id !== 'string' || currentWarehouse.id.trim() === '') {
          showToast('仓库信息无效，请重新选择仓库', 'error');
          feedbackError();
          return;
        }

        // 切换/新建订单
        const existing = await getOrder(code);
        setScanRecords([]); // 清空当前列表
        setMaterialCount(0);
        setOrderNo(code);
        // 保存订单号到持久化存储
        AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_ORDER_NO, code);

        if (existing) {
          await loadOrderMaterials(code);
          showToast(`切换订单: ${code}`, 'warning');
          feedbackSwitchOrder();
        } else {
          // 立即创建订单到数据库，防止退出页面后订单号丢失
          await upsertOrder(code, undefined, { id: currentWarehouse.id, name: currentWarehouse.name });
          showToast('新订单', 'success');
          feedbackNewOrder();
        }
        return;
      }

      // 物料扫描
      if (!orderNo) {
        showToast('请先扫描订单', 'warning');
        feedbackWarning();
        return;
      }

      if (!currentWarehouse) {
        showToast('请选择仓库', 'warning');
        feedbackWarning();
        setShowWarehousePicker(true);
        return;
      }

      // 确保仓库ID有效
      if (!currentWarehouse.id || typeof currentWarehouse.id !== 'string' || currentWarehouse.id.trim() === '') {
        showToast('仓库信息无效，请重新选择仓库', 'error');
        feedbackError();
        return;
      }

      // 解析
      let parsed: {
        model: string;
        batch: string;
        quantity: string;
        traceNo?: string;
        sourceNo?: string;
        package?: string;
        version?: string;
        productionDate?: string;
        separator?: string;
      } | null = null;

      // 保存扫码时使用的分隔符和规则名称
      let separator = ',';
      let ruleName = '';
      let customFields: Record<string, string> = {};

      try {
        const rule = await detectRule(code);
        if (rule) {
          separator = rule.separator || ',';
          ruleName = rule.name || '';
          const { standardFields, customFields: parsedCustomFields } = parseWithRule(code, rule);
          parsed = {
            model: standardFields.model || '',
            batch: standardFields.batch || '',
            quantity: standardFields.quantity || '',
            traceNo: standardFields.traceNo,
            sourceNo: standardFields.sourceNo,
            package: standardFields.package,
            version: standardFields.version,
            productionDate: standardFields.productionDate,
          };
          customFields = parsedCustomFields || {};
        }
        // 静默失败，走兜底逻辑 parseQRCodeSync
      } catch (e) {}

      if (!parsed) {
        // 兜底：使用 qrcodeParser 的同步解析（不依赖数据库）
        const fallback = parseQRCodeSync(code);
        if (fallback) {
          parsed = {
            model: fallback.model,
            batch: fallback.batch,
            quantity: fallback.quantity,
            traceNo: fallback.traceNo,
            sourceNo: fallback.sourceNo,
            package: fallback.package,
            version: fallback.version,
            productionDate: fallback.productionDate,
          };
        }
      }

      if (!parsed) {
        showToast('无法识别', 'error');
        feedbackError();
        return;
      }

      // 检查重复 + 查找存货编码（并行查询，性能优化）
      console.log('[扫码出库] 开始检查重复和查找存货编码，参数:', { orderNo, model: parsed.model, batch: parsed.batch, traceNo: parsed.traceNo, quantity: parsed.quantity });
      const [check, inventoryCode] = await Promise.all([
        checkMaterialExists(orderNo, parsed.model, parsed.batch, parsed.sourceNo, parsed.traceNo, parsed.quantity, currentWarehouse.id),
        getInventoryCodeByModel(parsed.model || ''),
      ]);
      console.log('[扫码出库] 重复检查结果:', check);
      console.log('[扫码出库] 存货编码:', inventoryCode);

      if (check.material) {
        showToast('⚠️ 该物料已扫码，请勿重复', 'warning');
        feedbackDuplicate();
        return;
      }

      // 添加到队列（而不是直接写入数据库）
      const queueItem = scanQueue.add(code, {
        orderNo,
        model: parsed.model || '',
        batch: parsed.batch || '',
        quantity: parsed.quantity || '1',
        traceNo: parsed.traceNo,
        sourceNo: parsed.sourceNo,
        package: parsed.package,
        version: parsed.version,
        productionDate: parsed.productionDate,
        separator,
        ruleName,
        customFields,
        inventoryCode: inventoryCode || '',
        warehouseId: currentWarehouse.id,
        warehouseName: currentWarehouse.name,
      });

      console.log('[扫码出库] 已添加到队列，队列项ID:', queueItem.id);
      console.log('[扫码出库] 队列状态:', scanQueue.getStats());
      showToast(`${parsed.model} +1`, 'success');
      feedbackSuccess();

    } catch (e) {
      console.error('[扫码出库] 处理失败:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`错误: ${errorMessage}`, 'error');
      feedbackError();
    } finally {
      // 给扫码枪留一个很短的输入窗口，避免上一条还在处理时下一条被吞掉。
      setTimeout(() => {
        processingRef.current = false;

        const nextPendingCode = pendingScanCodesRef.current.shift();
        if (nextPendingCode) {
          processScan(nextPendingCode);
          return;
        }

        focusScannerInput(0);
      }, 170);
    }
  }, [currentWarehouse, focusScannerInput, orderNo]);

  // 聚合物料（按型号+版本）
  const aggregateMaterials = useMemo(() => {
    const groups: AggregatedGroup[] = [];
    const map = new Map<string, AggregatedGroup>();

    scanRecords.forEach(item => {
      const key = `${item.model}_${item.version || ''}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          model: item.model,
          version: item.version || '',
          totalQuantity: parseInt(item.quantity, 10) || 0,
          boxCount: 1,
          items: [item],
        });
      } else {
        const group = map.get(key)!;
        group.totalQuantity += parseInt(item.quantity, 10) || 0;
        group.boxCount += 1;
        group.items.push(item);
      }
    });

    return Array.from(map.values());
  }, [scanRecords]);

  const aggregateTotals = useMemo(() => ({
    modelCount: aggregateMaterials.length,
    totalQuantity: aggregateMaterials.reduce((sum, group) => sum + group.totalQuantity, 0),
  }), [aggregateMaterials]);

  const outboundListState = useMemo(
    () => Array.from(expandedGroups).sort().join('|'),
    [expandedGroups]
  );

  const renderAggregatedGroup = useCallback(({ item }: { item: AggregatedGroup }) => {
    const isExpanded = expandedGroups.has(item.key);
    return (
      <RecordItem
        group={item}
        isExpanded={isExpanded}
        onToggle={toggleExpand}
        onDeleteGroup={handleDeleteGroup}
        onDeleteItem={handleDeleteItem}
        styles={styles}
      />
    );
  }, [expandedGroups, orderNo, styles]);

  const aggregatedGroupKeyExtractor = useCallback((item: AggregatedGroup) => item.key, []);

  // 切换展开/折叠
  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 删除聚合组（同型号/版本的所有记录）
  const handleDeleteGroup = useCallback((group: AggregatedGroup) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${group.model} 的所有 ${group.boxCount} 条物料吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 删除所有物料
              await Promise.all(group.items.map(item => deleteMaterial(item.id)));
              // 从数据库重新加载列表
              if (orderNo) {
                await loadOrderMaterials(orderNo);
              }
              showToast(`已删除 ${group.boxCount} 条物料`, 'success');
            } catch (error) {
              console.error('删除失败:', error);
              showToast('删除失败', 'error');
            }
          },
        },
      ]
    );
  }, [orderNo]);

  // 删除单个物料
  const handleDeleteItem = useCallback((item: MaterialItem) => {
    Alert.alert(
      '确认删除',
      `确定要删除这条物料吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(item.id);
              // 从数据库重新加载列表
              if (orderNo) {
                await loadOrderMaterials(orderNo);
              }
              showToast('已删除物料', 'success');
            } catch (error) {
              console.error('删除失败:', error);
              showToast('删除失败', 'error');
            }
          },
        },
      ]
    );
  }, [orderNo]);

  const normalizeScannerInput = useCallback((rawText: string): string => {
    return rawText
      .trim()
      .replace(/[\r\n\t\s]+/g, '')
      .replace(/^[^A-Za-z0-9]+/, '')
      .replace(/[^A-Za-z0-9]+$/, '');
  }, []);

  const flushScannerInput = useCallback((rawText?: string) => {
    const sourceText = typeof rawText === 'string' ? rawText : liveInputValueRef.current;
    const code = normalizeScannerInput(sourceText);

    liveInputValueRef.current = '';
    setInputValue('');

    if (!code) {
      if (!processingRef.current && pendingScanCodesRef.current.length === 0) {
        focusScannerInput(0);
      }
      return;
    }

    if (!ORDER_NO_REGEX.test(code) && !isQRCode(code)) {
      if (!processingRef.current && pendingScanCodesRef.current.length === 0) {
        focusScannerInput(0);
      }
      return;
    }

    if (processingRef.current) {
      pendingScanCodesRef.current.push(code);
      return;
    }

    processScan(code);
  }, [focusScannerInput, normalizeScannerInput, processScan]);

  // 输入变化时自动检测并触发（扫码器逐字符输入，需要防抖检测完成）
  const handleInputChange = useCallback((text: string) => {
    // 清除之前的定时器（每次输入都重置）
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    liveInputValueRef.current = text;
    setInputValue(text);

    // 如果当前有输入内容，启动定时器检测扫码完成
    if (text.length > 0) {
      autoSubmitTimerRef.current = setTimeout(() => {
        autoSubmitTimerRef.current = null;
        flushScannerInput(text);
      }, 150); // 150ms 防抖，等待扫码器输入完成
      return;
    }
  }, [flushScannerInput]);

  // 扫码完成确认（焦点录入模式：用户手动按回车）
  const handleSubmitEditing = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    flushScannerInput();
  }, [flushScannerInput]);

  // 选择仓库
  const selectWarehouse = async (wh: Warehouse) => {
    // 如果选择的是当前仓库，直接关闭弹窗
    if (wh.id === currentWarehouse?.id) {
      setShowWarehousePicker(false);
      return;
    }

    // B: 清空当前页面数据（订单号与仓库绑定，不同仓库序号位数不同）
    setOrderNo('');
    setMaterialCount(0);
    setScanRecords([]);
    setExpandedGroups(new Set());
    
    // 清理持久化存储
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_SCAN_RECORDS);

    // 切换到新仓库
    handleWarehouseChange(wh);
    setShowWarehousePicker(false);
    showToast(`已切换到 ${wh.name}`, 'success');
    focusScannerInput(100);
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫码出库</Text>
        </View>

        {/* 顶部：仓库 + 订单 */}
        <View style={[styles.topBar]}>
          <TouchableOpacity
            style={styles.warehouseBtn}
            activeOpacity={0.7}
            onPress={() => setShowWarehousePicker(true)}
          >
            <FontAwesome6 name="warehouse" size={14} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || '仓库'}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={[styles.orderTag, orderNo && styles.orderTagActive]}>
            <Text style={[styles.orderText, orderNo && styles.orderTextActive]} numberOfLines={1}>
              {orderNo || '待扫描订单'}
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
            placeholder={orderNo ? "继续扫描物料" : "先扫描订单号"}
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
            <Text style={styles.listTitle}>本单物料</Text>
            <Text style={styles.listCount}>
              {aggregateTotals.modelCount} 型号 / {aggregateTotals.totalQuantity.toLocaleString()} PCS
            </Text>
          </View>
          <FlatList
            data={aggregateMaterials}
            keyExtractor={aggregatedGroupKeyExtractor}
            renderItem={renderAggregatedGroup}
            extraData={outboundListState}
            style={styles.list}
            contentContainerStyle={scanRecords.length === 0 ? styles.listEmptyContent : styles.listContent}
            initialNumToRender={12}
            maxToRenderPerBatch={16}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无物料</Text>
              </View>
            }
          />

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
                  {currentWarehouse?.id === wh.id && <FontAwesome6 name="check" size={14} color={theme.primary} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={styles.pickerClose} 
                onPress={() => setShowWarehousePicker(false)}
              >
                <Text style={styles.pickerCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

    </Screen>
  );
}
