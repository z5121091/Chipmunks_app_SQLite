import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { AnimatedCard } from '@/components/AnimatedCard';
import {
  initDatabase,
  upsertOrder,
  getFilteredOrders,
  getOrderManagerStats,
  getOrderMaterialSummaries,
  getOrderMaterialsByModel,
  deleteOrder,
  getMaterialsByOrder,
  deleteMaterial,
  getNextUnpackIndex,
  getUnpackHistoryByMaterialId,
  updateMaterial,
  saveUnpackOperation,
  Order,
  MaterialRecord,
  UnpackRecord,
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
} from '@/utils/database';
import { STORAGE_KEYS, SyncConfig } from '@/constants/config';
import { formatDate, formatDateTime, formatTime } from '@/utils/time';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

// 物料汇总接口
interface MaterialSummary {
  model: string;
  count: number;
  totalQuantity: number;
  todayCount: number;
}

// 搜索类型
type SearchType = 'order' | 'customer' | 'batch';

// 时间筛选类型
type TimeFilterType = 'today' | 'threeDays' | 'sevenDays' | 'all';

// 自定义弹窗配置
interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'warning' | 'error' | 'info';
  buttons: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[];
}

export default function OrdersScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ orderNo?: string; materialId?: number }>();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('order');
  
  // 仓库相关状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  
  // 时间筛选状态
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('today');
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalMaterials: 0,
    totalQuantity: 0,
    todayOrders: 0,
    todayMaterials: 0,
    todayQuantity: 0,
    threeDaysOrders: 0,
    threeDaysMaterials: 0,
    threeDaysQuantity: 0,
    sevenDaysOrders: 0,
    sevenDaysMaterials: 0,
    sevenDaysQuantity: 0,
  });
  
  // 展开的订单
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedMaterials, setExpandedMaterials] = useState<MaterialRecord[]>([]);
  const expandedOrderIdRef = useRef<string | null>(null);
  
  // 标记是否需要自动展开订单（从拆包跳转过来）
  const pendingExpandOrderNo = useRef<string | null>(null);
  const pendingMaterialId = useRef<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 同步 ref
  useEffect(() => {
    expandedOrderIdRef.current = expandedOrderId;
  }, [expandedOrderId]);
  
  // 自定义弹窗
  const [customAlert, setCustomAlert] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  
  // 显示自定义弹窗
  const showCustomAlert = (
    title: string, 
    message: string, 
    buttons: CustomAlertConfig['buttons'],
    icon?: 'success' | 'warning' | 'error' | 'info'
  ) => {
    setCustomAlert({ visible: true, title, message, buttons, icon });
  };
  
  // 关闭自定义弹窗
  const closeCustomAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };
  
  // 编辑客户名称弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const customerNameInputRef = useRef<TextInput>(null);
  
  // 客户名称弹窗打开时聚焦输入框
  useEffect(() => {
    if (editModalVisible && customerNameInputRef.current) {
      setTimeout(() => customerNameInputRef.current?.focus(), 300);
    }
  }, [editModalVisible]);
  
  // 所有订单弹窗
  const [allOrdersModalVisible, setAllOrdersModalVisible] = useState(false);
  
  // 物料汇总弹窗
  const [materialsModalVisible, setMaterialsModalVisible] = useState(false);
  const [materialSummaries, setMaterialSummaries] = useState<MaterialSummary[]>([]);
  const [materialTotalQuantity, setMaterialTotalQuantity] = useState(0);
  
  // 物料详情弹窗（按型号筛选）
  const [materialDetailModalVisible, setMaterialDetailModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelMaterials, setSelectedModelMaterials] = useState<MaterialRecord[]>([]);
  
  // 拆包弹窗
  const [unpackModalVisible, setUnpackModalVisible] = useState(false);
  const [unpackingMaterial, setUnpackingMaterial] = useState<MaterialRecord | null>(null);
  const [unpackNewQuantity, setUnpackNewQuantity] = useState('');
  const [unpackNewTraceNo, setUnpackNewTraceNo] = useState('');
  const [unpackNotes, setUnpackNotes] = useState('');
  const [unpacking, setUnpacking] = useState(false);
  const [unpackHistory, setUnpackHistory] = useState<UnpackRecord[]>([]);
  const [nextUnpackIndex, setNextUnpackIndex] = useState(1);
  
  // 拆包数量输入框 ref
  const unpackQuantityRef = useRef<TextInput>(null);
  // 拆包备注输入框 ref
  const unpackNotesRef = useRef<TextInput>(null);
  
  // 拆包弹窗打开后聚焦输入框
  useEffect(() => {
    if (unpackModalVisible && unpackQuantityRef.current) {
      setTimeout(() => unpackQuantityRef.current?.focus(), 300);
    }
  }, [unpackModalVisible]);
  
  // 编辑物料弹窗
  const [editMaterialModalVisible, setEditMaterialModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRecord | null>(null);
  const [editMaterialData, setEditMaterialData] = useState({
    model: '',
    batch: '',
    quantity: '',
    package: '',
    version: '',
    productionDate: '',
    traceNo: '',
    sourceNo: '',
  });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const quantityInputRef = useRef<TextInput>(null);
  const editMaterialScrollRef = useRef<ScrollView>(null);
  
  // 同步配置
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ ip: '', port: '8080' });
  const [syncing, setSyncing] = useState(false);
  
  // 加载同步配置
  const loadSyncConfig = useCallback(async () => {
    const savedSyncConfig = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    if (savedSyncConfig) {
      setSyncConfig(JSON.parse(savedSyncConfig));
    }
  }, []);
  
  // 页面加载时获取同步配置
  useFocusEffect(
    useCallback(() => {
      loadSyncConfig();
    }, [loadSyncConfig])
  );
  
  // 拆包弹窗样式
  const unpackModalStyles = useMemo(() => ({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      width: '90%' as any,
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: BorderWidth.normal,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: rf(18),
      fontWeight: '600' as const,
      color: theme.textPrimary,
    },
    modalClose: {
      fontSize: rf(20),
      color: theme.textSecondary,
    },
    modalBody: {
      padding: Spacing.lg,
    },
    modalBodyContent: {
      paddingBottom: Spacing['2xl'],
    },
    inputLabel: {
      fontSize: rf(14),
      fontWeight: '500' as const,
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    textInput: {
      fontSize: rf(16),
      color: theme.textPrimary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    infoBox: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    infoRow: {
      flexDirection: 'row' as const,
      marginBottom: Spacing.sm,
    },
    infoLabel: {
      width: 60,
      fontSize: rf(13),
      color: theme.textSecondary,
    },
    infoValue: {
      flex: 1,
      fontSize: rf(14),
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    modalFooter: {
      flexDirection: 'row' as const,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: BorderWidth.normal,
      borderTopColor: theme.border,
      gap: Spacing.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: rf(16),
      fontWeight: '600' as const,
      color: theme.textPrimary,
    },
    saveButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      fontSize: rf(16),
      fontWeight: '600' as const,
      color: theme.buttonPrimaryText,
    },
  }), [theme]);
  
  // 加载仓库数据
  // 加载仓库
  const loadWarehouses = useCallback(async () => {
    const list = await getAllWarehouses();
    setWarehouses(list);

    // 尝试从订单管理独立的 Storage Key 加载仓库（不与扫码出库共享）
    const savedWarehouse = await AsyncStorage.getItem(STORAGE_KEYS.GLOBAL_WAREHOUSE);
    if (savedWarehouse) {
      const warehouse = JSON.parse(savedWarehouse) as Warehouse;
      // 确保仓库仍然存在
      if (list.find(w => w.id === warehouse.id)) {
        setCurrentWarehouse(warehouse);
        return;
      }
    }

    // 没有保存的选择，使用默认仓库
    const def = await getDefaultWarehouse();
    setCurrentWarehouse(def || list[0] || null);
  }, []);
  
  // 订单查询下沉到 SQLite，避免订单多时把全量数据拉到 JS 里过滤。
  const runOrderSearch = useCallback(async ({
    text,
    type = searchType,
    warehouseId = currentWarehouse?.id,
    timeFilterValue = timeFilter,
  }: {
    text: string;
    type?: SearchType;
    warehouseId?: string;
    timeFilterValue?: TimeFilterType;
  }) => {
    return getFilteredOrders({
      searchText: text,
      searchType: type,
      warehouseId,
      timeFilter: timeFilterValue,
    });
  }, [currentWarehouse?.id, searchType, timeFilter]);
  
  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const warehouseId = currentWarehouse?.id;
      const [allOrdersForWarehouse, filtered, statsData] = await Promise.all([
        getFilteredOrders({
          warehouseId,
          timeFilter: 'all',
        }),
        runOrderSearch({
          text: searchText,
          type: searchType,
          warehouseId,
          timeFilterValue: timeFilter,
        }),
        getOrderManagerStats(warehouseId),
      ]);

      setOrders(allOrdersForWarehouse);
      setFilteredOrders(filtered);
      setStats(statsData);
      
      // 如果有展开的订单，刷新其物料列表
      const currentExpandedId = expandedOrderIdRef.current;
      if (currentExpandedId) {
        const expandedOrder = allOrdersForWarehouse.find(o => o.id === currentExpandedId);
        if (expandedOrder) {
          const materials = await getMaterialsByOrder(expandedOrder.order_no, warehouseId);
          setExpandedMaterials(materials);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [currentWarehouse?.id, runOrderSearch, searchText, searchType, timeFilter]);
  
  // 搜索过滤
  const handleSearchInput = useCallback((text: string) => {
    setSearchText(text);
  }, []);
  
  // 搜索类型变更时重新搜索
  const handleSearchTypeChange = useCallback((type: SearchType) => {
    setSearchType(type);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      runOrderSearch({
        text: searchText,
        type: searchType,
        warehouseId: currentWarehouse?.id,
        timeFilterValue: timeFilter,
      }).then(result => {
        if (isActive) {
          setFilteredOrders(result);
        }
      });
    }, searchType === 'batch' ? 220 : 120);

    return () => {
      isActive = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [currentWarehouse?.id, runOrderSearch, searchText, searchType, timeFilter]);

  const loadDataRef = useRef(loadData);
  
  // 保持 loadDataRef 与 loadData 同步
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);
  
  // 页面聚焦时刷新数据（监听 currentWarehouse 变化）
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const init = async () => {
        await loadWarehouses();
        if (isMounted) {
          loadDataRef.current();
        }
      };

      init();

      return () => {
        isMounted = false;
      };
    }, [currentWarehouse?.id]) // 监听 currentWarehouse.id 变化
  );
  
  // 处理仓库切换
  const handleWarehouseChange = useCallback(async (warehouse: Warehouse) => {
    if (warehouse.id === currentWarehouse?.id) {
      setShowWarehousePicker(false);
      return;
    }
    setCurrentWarehouse(warehouse);
    setShowWarehousePicker(false);

    // 保存到订单管理独立的 Storage Key（不与扫码出库共享）
    AsyncStorage.setItem(STORAGE_KEYS.GLOBAL_WAREHOUSE, JSON.stringify(warehouse));

    const [allOrdersForWarehouse, filtered, statsData] = await Promise.all([
      getFilteredOrders({
        warehouseId: warehouse.id,
        timeFilter: 'all',
      }),
      runOrderSearch({
        text: searchText,
        type: searchType,
        warehouseId: warehouse.id,
        timeFilterValue: timeFilter,
      }),
      getOrderManagerStats(warehouse.id),
    ]);

    setOrders(allOrdersForWarehouse);
    setFilteredOrders(filtered);
    setStats(statsData);

    // 清空展开的订单（因为仓库切换后物料列表可能为空）
    setExpandedOrderId(null);
    setExpandedMaterials([]);
  }, [currentWarehouse, runOrderSearch, searchText, searchType, timeFilter]);
  
  const handleTimeFilterChange = useCallback((filter: TimeFilterType) => {
    setTimeFilter(filter);
  }, []);
  
  // 处理从扫描页面跳转过来的参数（自动展开订单）
  useEffect(() => {
    if (params.orderNo && orders.length > 0) {
      // 找到对应的订单
      const targetOrder = orders.find(o => o.order_no === params.orderNo);
      if (targetOrder && targetOrder.id !== expandedOrderId) {
        // 展开该订单
        setExpandedOrderId(targetOrder.id);
        getMaterialsByOrder(targetOrder.order_no, currentWarehouse?.id).then(materials => {
          setExpandedMaterials(materials);
        });
      }
    }
  }, [params.orderNo, orders]);
  
  // 点击订单 - 展开/收起显示物料列表
  const handleToggleOrder = async (order: Order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setExpandedMaterials([]);
    } else {
      setExpandedOrderId(order.id);
      const materials = await getMaterialsByOrder(order.order_no, currentWarehouse?.id);
      setExpandedMaterials(materials);
    }
  };
  
  // 查看物料详情
  const handleViewMaterial = (material: MaterialRecord) => {
    router.push('/detail', { id: material.id });
  };
  
  // 打开编辑客户名称弹窗
  const handleEditCustomer = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customer_name || '');
    setEditModalVisible(true);
  };
  
  // 保存客户名称
  const handleSaveCustomer = async () => {
    if (!editingOrder) return;
    
    try {
      await upsertOrder(editingOrder.order_no, editCustomerName.trim());
      setEditModalVisible(false);
      setEditingOrder(null);
      setEditCustomerName('');
      await loadData();
    } catch (error) {
      console.error('保存失败:', error);
      showCustomAlert('错误', '保存失败', [{ text: '确定', style: 'destructive' }], 'error');
    }
  };
  
  // 删除订单
  const handleDeleteOrder = (order: Order) => {
    showCustomAlert(
      '确认删除',
      `确定要删除订单 ${order.order_no} 及其所有物料记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(order.order_no);
              if (expandedOrderId === order.id) {
                setExpandedOrderId(null);
                setExpandedMaterials([]);
              }
              await loadData();
              showCustomAlert('成功', '订单已删除', [{ text: '确定' }], 'success');
            } catch (error) {
              console.error('删除订单失败:', error);
              showCustomAlert('错误', '删除订单失败', [{ text: '确定', style: 'destructive' }], 'error');
            }
          },
        },
      ],
      'warning'
    );
  };
  
  // 打开物料汇总弹窗
  const handleOpenMaterials = async (todayOnly: boolean = false) => {
    try {
      const summaries = await getOrderMaterialSummaries({
        warehouseId: currentWarehouse?.id,
        timeFilter: todayOnly ? 'today' : timeFilter,
      });
      const totalQty = summaries.reduce((sum, item) => sum + item.totalQuantity, 0);

      setMaterialSummaries(summaries);
      setMaterialTotalQuantity(totalQty);
      setMaterialsModalVisible(true);
    } catch (error) {
      console.error('获取物料汇总失败:', error);
    }
  };
  
  // 打开物料详情弹窗（按型号筛选）
  const handleOpenMaterialDetail = async (model: string) => {
    try {
      const filtered = await getOrderMaterialsByModel({
        model,
        warehouseId: currentWarehouse?.id,
        timeFilter,
      });
      
      setSelectedModel(model);
      setSelectedModelMaterials(filtered);
      setMaterialsModalVisible(false);
      setMaterialDetailModalVisible(true);
    } catch (error) {
      console.error('获取物料详情失败:', error);
    }
  };
  
  // 删除物料
  const handleDeleteMaterial = (material: MaterialRecord) => {
    showCustomAlert(
      '确认删除',
      `确定要删除这条物料记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(material.id!);
              // 短暂延迟确保 AsyncStorage 写入完成
              await new Promise(resolve => setTimeout(resolve, 50));
              const materials = await getMaterialsByOrder(material.order_no, currentWarehouse?.id);
              setExpandedMaterials(materials);
              await loadData();
            } catch (error) {
              console.error('删除物料失败:', error);
              showCustomAlert('错误', '删除失败', [{ text: '确定', style: 'destructive' }], 'error');
            }
          },
        },
      ],
      'warning'
    );
  };
  
  // 打开拆包弹窗
  const handleOpenUnpack = async (material: MaterialRecord) => {
    setUnpackingMaterial(material);
    setUnpackNewQuantity('');
    setUnpackNotes('');
    
    // 获取拆包历史和下一个序号
    try {
      const history = await getUnpackHistoryByMaterialId(material.id!);
      setUnpackHistory(history);
      
      const nextIndex = await getNextUnpackIndex(material.traceNo);
      setNextUnpackIndex(nextIndex);
      
      // 自动生成新追踪码：先提取基础码（去掉已有的序号部分）
      // 例如：ABC-1 → 提取 ABC，然后拼接 -2 → ABC-2
      const baseTraceNo = material.traceNo ? material.traceNo.replace(/-\d+$/, '') : '';
      const newTraceNo = baseTraceNo ? `${baseTraceNo}-${nextIndex}` : '';
      setUnpackNewTraceNo(newTraceNo);
    } catch (error) {
      console.error('获取拆包信息失败:', error);
      setUnpackHistory([]);
      setNextUnpackIndex(1);
      // 同样处理基础码
      const baseTraceNo = material.traceNo ? material.traceNo.replace(/-\d+$/, '') : '';
      setUnpackNewTraceNo(baseTraceNo ? `${baseTraceNo}-1` : '');
    }
    
    setUnpackModalVisible(true);
  };
  
  // 确认拆包
  const handleConfirmUnpack = async () => {
    if (!unpackingMaterial) return;
    
    const newQty = parseInt(unpackNewQuantity, 10);
    if (!unpackNewQuantity.trim() || isNaN(newQty) || newQty <= 0) {
      showCustomAlert('错误', '请输入有效的拆出数量', [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    // 使用剩余数量作为当前可用数量（已拆包物料使用 remaining_quantity，新物料使用 quantity）
    const availableQty = parseInt(unpackingMaterial.remaining_quantity || (unpackingMaterial.quantity || 0).toString(), 10);
    if (!isNaN(availableQty) && newQty > availableQty) {
      showCustomAlert('错误', `拆出数量不能大于当前数量（${availableQty}个）`, [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    const remainingQty = availableQty - newQty;
    
    setUnpacking(true);
    try {
      const unpackResult = await saveUnpackOperation({
        material: unpackingMaterial,
        shippedQuantity: newQty,
        remainingQuantity: remainingQty,
        newTraceNo: unpackNewTraceNo,
        notes: unpackNotes,
      });
      
      // 2. 刷新物料列表（短暂延迟确保 AsyncStorage 写入完成）
      await new Promise(resolve => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(unpackingMaterial.order_no, currentWarehouse?.id);
      setExpandedMaterials(materials);
      await loadData();
      
      setUnpackModalVisible(false);
      
      showCustomAlert(
        '拆包成功',
        `已生成 2 条标签：\n• 发货标签：${unpackNewTraceNo}（${newQty}个）\n• 剩余标签：${unpackNewTraceNo}（${remainingQty}个）`,
        [
          { text: '完成', style: 'cancel' },
          {
            text: '同步到电脑',
            onPress: async () => {
              handleSyncUnpackToComputer(unpackResult.shippedRecord, unpackResult.remainingRecord);
            },
          },
        ],
        'success'
      );
    } catch (error) {
      console.error('拆包失败:', error);
      showCustomAlert('错误', '拆包失败，请稍后重试', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setUnpacking(false);
    }
  };
  
  // 同步单次拆包数据到电脑
  const handleSyncUnpackToComputer = async (shippedRecord: UnpackRecord, remainingRecord: UnpackRecord) => {
    if (!syncConfig.ip) {
      showCustomAlert('提示', '请先在设置页面配置电脑IP地址', [{ text: '确定' }], 'warning');
      return;
    }
    
    setSyncing(true);
    try {
      // 定义表头（与设置页同步标签数据格式保持一致，确保BarTender能正确识别）
      const headers = [
        '仓库名称', '标签类型', '订单号', '客户', '型号', '存货编码', '批次', '封装', '版本',
        '原数量', '标签数量', '生产日期', '追踪码', '箱号', '拆包时间', '备注'
      ];
      
      // 构建数据行（发货标签和剩余标签）
      const rows = [
        [
          shippedRecord.warehouse_name || '',
          '发货标签',
          shippedRecord.order_no || '',
          shippedRecord.customer_name || '',
          shippedRecord.model || '',
          shippedRecord.inventory_code || '',
          shippedRecord.batch || '',
          shippedRecord.package || '',
          shippedRecord.version || '',
          parseInt(shippedRecord.original_quantity, 10) || 0,
          parseInt(shippedRecord.new_quantity, 10) || 0,
          shippedRecord.productionDate || '',
          shippedRecord.new_traceNo || shippedRecord.traceNo || '',
          shippedRecord.sourceNo || '',
          formatTime(shippedRecord.unpacked_at),
          shippedRecord.notes || '',
        ],
        [
          remainingRecord.warehouse_name || '',
          '剩余标签',
          remainingRecord.order_no || '',
          remainingRecord.customer_name || '',
          remainingRecord.model || '',
          remainingRecord.inventory_code || '',
          remainingRecord.batch || '',
          remainingRecord.package || '',
          remainingRecord.version || '',
          parseInt(remainingRecord.original_quantity, 10) || 0,
          parseInt(remainingRecord.new_quantity, 10) || 0,
          remainingRecord.productionDate || '',
          remainingRecord.new_traceNo || remainingRecord.traceNo || '',
          remainingRecord.sourceNo || '',
          formatTime(remainingRecord.unpacked_at),
          remainingRecord.notes || '',
        ],
      ];
      
      // 创建Excel
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // 计算列宽
      const colWidths = headers.map((header, colIdx) => {
        let maxWidth = header.length;
        rows.forEach(row => {
          const cellValue = String(row[colIdx] || '');
          const width = cellValue.split('').reduce((acc, char) => {
            return acc + (char.charCodeAt(0) > 127 ? 2 : 1);
          }, 0);
          if (width > maxWidth) maxWidth = width;
        });
        return { wch: Math.min(maxWidth + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '标签数据');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      // 转换为二进制
      const binaryString = atob(wbout);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 发送到电脑（添加订单号作为name_suffix，与设置页同步格式保持一致）
      const baseUrl = `http://${syncConfig.ip}:${syncConfig.port || '8080'}/labels`;
      const nameSuffix = shippedRecord.order_no || '拆包标签';
      const url = `${baseUrl}?name_suffix=${encodeURIComponent(nameSuffix)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: bytes,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', response.status, errorText);
        throw new Error(`服务器错误 (${response.status})`);
      }
      
      // 尝试解析JSON响应
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        const responseText = await response.text();
        console.error('JSON解析失败，响应内容:', responseText.substring(0, 200));
        throw new Error('服务器返回格式错误，请检查同步服务是否正常运行');
      }
      
      if (result.success) {
        showCustomAlert('同步成功', `已同步 2 条标签到电脑\n${result.path || ''}`, [{ text: '确定' }], 'success');
      } else {
        showCustomAlert('同步失败', result.message || '未知错误', [{ text: '确定', style: 'destructive' }], 'error');
      }
    } catch (error: any) {
      console.error('同步失败:', error);
      const errorMsg = error.name === 'AbortError' 
        ? '连接超时，请检查网络' 
        : error.message?.includes('服务器')
          ? error.message
          : `同步失败: ${error.message || '请检查网络和同步服务'}`;
      showCustomAlert('同步失败', errorMsg, [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSyncing(false);
    }
  };
  
  // 打开编辑物料弹窗
  const handleOpenEditMaterial = (material: MaterialRecord) => {
    setEditingMaterial(material);
    setEditMaterialData({
      model: material.model || '',
      batch: material.batch || '',
      quantity: (material.quantity || 0).toString(),
      package: material.package || '',
      version: material.version || '',
      productionDate: material.productionDate || '',
      traceNo: material.traceNo || '',
      sourceNo: material.sourceNo || '',
    });
    setEditMaterialModalVisible(true);
    // 延迟聚焦到数量输入框，等待 Modal 打开动画完成
    setTimeout(() => {
      quantityInputRef.current?.focus();
      // 滚动到输入框位置
      setTimeout(() => {
        editMaterialScrollRef.current?.scrollTo({ y: 200, animated: true });
      }, 100);
    }, 300);
  };
  
  // 确认编辑物料
  const handleConfirmEditMaterial = async () => {
    if (!editingMaterial) return;
    
    // 验证数量
    const newQty = parseInt(editMaterialData.quantity, 10);
    const originalQty = parseInt(editingMaterial.original_quantity || (editingMaterial.quantity || 0).toString(), 10);
    
    if (isNaN(newQty) || newQty <= 0) {
      showCustomAlert('错误', '请输入有效的数量', [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    if (!isNaN(originalQty) && newQty > originalQty) {
      showCustomAlert('错误', `数量不能大于原始扫描数量（${originalQty}个）`, [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    setSavingMaterial(true);
    try {
      // 只更新数量字段，其他字段不可修改
      await updateMaterial(editingMaterial.id!, {
        quantity: parseInt(editMaterialData.quantity, 10),
      });
      
      // 刷新物料列表（短暂延迟确保 AsyncStorage 写入完成）
      await new Promise(resolve => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(editingMaterial.order_no, currentWarehouse?.id);
      setExpandedMaterials(materials);
      await loadData();
      
      setEditMaterialModalVisible(false);
      showCustomAlert('成功', '物料数量已更新', [{ text: '确定' }], 'success');
    } catch (error) {
      console.error('更新物料失败:', error);
      showCustomAlert('错误', '更新失败，请稍后重试', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSavingMaterial(false);
    }
  };
  
  const renderOrderItem = useCallback(({ item: order }: { item: Order }) => (
    <View>
      <AnimatedCard
        onPress={() => handleToggleOrder(order)}
        onLongPress={() => handleDeleteOrder(order)}
      >
        <View style={[
          styles.orderItem,
          expandedOrderId === order.id && styles.orderItemExpanded,
        ]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Feather
                name={expandedOrderId === order.id ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textSecondary}
              />
              <Text style={styles.orderNo} numberOfLines={1} ellipsizeMode="tail">
                {order.order_no}
              </Text>
            </View>
            <Text style={styles.orderDate}>
              {formatDate(order.created_at)}
            </Text>
          </View>

          <View style={styles.orderContent}>
            <View style={styles.orderInfo}>
              {order.customer_name ? (
                <Text style={styles.customerName} numberOfLines={1}>
                  {order.customer_name}
                </Text>
              ) : (
                <Text style={styles.noCustomer} numberOfLines={1}>点击设置客户名称</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.7}
              onPress={() => handleEditCustomer(order)}
            >
              <Feather
                name={order.customer_name ? 'edit-2' : 'plus'}
                size={16}
                color={theme.primary}
              />
              <Text style={styles.editBtnText}>
                {order.customer_name ? '编辑' : '设置'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedCard>

      {expandedOrderId === order.id && (
        <View style={styles.materialsList}>
          {expandedMaterials.length === 0 ? (
            <View style={styles.noMaterials}>
              <Text style={styles.noMaterialsText}>该订单暂无物料记录</Text>
            </View>
          ) : (
            expandedMaterials.map((material) => (
              <View key={material.id} style={styles.materialItem}>
                <TouchableOpacity
                  style={styles.materialMainInfo}
                  activeOpacity={0.7}
                  onPress={() => handleViewMaterial(material)}
                  onLongPress={() => handleDeleteMaterial(material)}
                >
                  <Text style={styles.materialModel} numberOfLines={1}>{material.model || '未知型号'}</Text>
                  <Text style={styles.materialDetails}>批次: {material.batch || '-'}</Text>
                  <Text style={styles.materialDetails}>
                    数量: {material.quantity || 0}
                  </Text>
                  <Text style={styles.materialDate}>
                    {formatDate(material.scanned_at)}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TouchableOpacity
                    style={[styles.unpackBtn, { backgroundColor: theme.backgroundTertiary }]}
                    activeOpacity={0.7}
                    onPress={() => handleOpenEditMaterial(material)}
                  >
                    <Feather name="edit-2" size={14} color={theme.textPrimary} />
                    <Text style={[styles.unpackBtnText, { color: theme.textPrimary }]}>编辑</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.unpackBtn}
                    activeOpacity={0.7}
                    onPress={() => handleOpenUnpack(material)}
                  >
                    <Feather name="scissors" size={14} color={theme.primary} />
                    <Text style={styles.unpackBtnText}>拆包</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  ), [
    expandedMaterials,
    expandedOrderId,
    handleDeleteMaterial,
    handleDeleteOrder,
    handleEditCustomer,
    handleOpenEditMaterial,
    handleOpenUnpack,
    handleToggleOrder,
    handleViewMaterial,
    styles,
    theme.backgroundTertiary,
    theme.primary,
    theme.textPrimary,
    theme.textSecondary,
  ]);

  const renderAllOrdersModalItem = useCallback(({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderListItem}
      activeOpacity={0.7}
      onPress={() => {
        setAllOrdersModalVisible(false);
        handleToggleOrder(item);
      }}
    >
      <View>
        <Text style={styles.orderListItemNo}>{item.order_no}</Text>
        <Text style={styles.orderListItemInfo} numberOfLines={1}>
          {item.customer_name || '未设置客户'}
        </Text>
      </View>
      <Text style={{ fontSize: rf(12), color: theme.textMuted }}>
        {formatDate(item.created_at)}
      </Text>
    </TouchableOpacity>
  ), [handleToggleOrder, theme.textMuted, styles.orderListItem, styles.orderListItemInfo, styles.orderListItemNo]);

  const renderMaterialSummaryItem = useCallback(({ item }: { item: MaterialSummary }) => (
    <TouchableOpacity
      style={{
        backgroundColor: theme.backgroundTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
      }}
      activeOpacity={0.7}
      onPress={() => handleOpenMaterialDetail(item.model)}
    >
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
      }}>
        <Text style={{ fontSize: rf(16), fontWeight: '700', color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
          {item.model}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="chevron-right" size={16} color={theme.textMuted} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
        <View>
          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>扫码次数</Text>
          <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }}>{item.count} 次</Text>
        </View>
        <View>
          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>总数量</Text>
          <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.primary }}>{item.totalQuantity.toLocaleString()}</Text>
        </View>
        {item.todayCount > 0 && (
          <View>
            <Text style={{ fontSize: rf(11), color: theme.textMuted }}>今日</Text>
            <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.accent }}>{item.todayCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [handleOpenMaterialDetail, theme.accent, theme.backgroundTertiary, theme.primary, theme.textMuted, theme.textPrimary]);

  const renderSelectedModelMaterialItem = useCallback(({ item }: { item: MaterialRecord }) => (
    <TouchableOpacity
      style={{
        backgroundColor: theme.backgroundTertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
      }}
      activeOpacity={0.7}
      onPress={() => {
        setMaterialDetailModalVisible(false);
        router.push('/detail', { id: item.id });
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
        <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }} numberOfLines={1}>
          {item.traceNo || '无追踪码'}
        </Text>
        <Text style={{ fontSize: rf(12), color: theme.textMuted }}>
          {formatDate(item.scanned_at)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
        <View>
          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>数量</Text>
          <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }}>{item.quantity || 0}</Text>
        </View>
        <View>
          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>批次</Text>
          <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>{item.batch || '-'}</Text>
        </View>
        <View>
          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>订单</Text>
          <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>{item.order_no}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [router, theme.backgroundTertiary, theme.textMuted, theme.textPrimary, theme.textSecondary]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>出库订单</Text>
            <Text style={styles.subtitle}>展开订单查看物料，按需拆包</Text>
          </View>
        </View>
        
        {/* 搜索框 */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              searchType === 'batch' ? '搜索批次号...' :
              searchType === 'customer' ? '搜索客户名称...' :
              '搜索订单号...'
            }
            placeholderTextColor={theme.textMuted}
            value={searchText}
              onChangeText={handleSearchInput}
            
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchInput('')} style={styles.searchClear}>
              <Feather name="x" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* 仓库选择器 + 搜索类型选择器 + 时间筛选 */}
        <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
          {/* 第一行：仓库 + 搜索类型 */}
          <View style={styles.filterRow}>
            {/* 仓库选择器 */}
            <TouchableOpacity style={styles.warehouseBtn}
              activeOpacity={0.7} onPress={() => setShowWarehousePicker(true)}
            >
              <FontAwesome6 name="warehouse" size={14} color={theme.primary} />
              <Text style={styles.warehouseBtnText}>
                {currentWarehouse?.name || '选择仓库'}
              </Text>
              <FontAwesome6 name="chevron-down" size={10} color={theme.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            
            {/* 订单号 */}
            <TouchableOpacity style={[styles.searchTypeBtn, searchType === 'order' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleSearchTypeChange('order')}
            >
              <FontAwesome6 
                name="file-alt" 
                size={12} 
                color={searchType === 'order' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, searchType === 'order' && styles.searchTypeTextActive]}>
                订单号
              </Text>
            </TouchableOpacity>
            
            {/* 客户名称 */}
            <TouchableOpacity style={[styles.searchTypeBtn, searchType === 'customer' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleSearchTypeChange('customer')}
            >
              <FontAwesome6 
                name="user" 
                size={12} 
                color={searchType === 'customer' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, searchType === 'customer' && styles.searchTypeTextActive]}>
                客户
              </Text>
            </TouchableOpacity>
            
            {/* 批次号 */}
            <TouchableOpacity style={[styles.searchTypeBtn, searchType === 'batch' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleSearchTypeChange('batch')}
            >
              <FontAwesome6 
                name="barcode" 
                size={12} 
                color={searchType === 'batch' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, searchType === 'batch' && styles.searchTypeTextActive]}>
                批次
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 第二行：时间筛选 Tab */}
          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.searchTypeBtn, timeFilter === 'today' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleTimeFilterChange('today')}
            >
              <FontAwesome6 
                name="calendar-day" 
                size={12} 
                color={timeFilter === 'today' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, timeFilter === 'today' && styles.searchTypeTextActive]}>
                当天
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.searchTypeBtn, timeFilter === 'threeDays' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleTimeFilterChange('threeDays')}
            >
              <FontAwesome6 
                name="calendar-week" 
                size={12} 
                color={timeFilter === 'threeDays' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, timeFilter === 'threeDays' && styles.searchTypeTextActive]}>
                近3天
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.searchTypeBtn, timeFilter === 'sevenDays' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleTimeFilterChange('sevenDays')}
            >
              <FontAwesome6 
                name="calendar-week" 
                size={12} 
                color={timeFilter === 'sevenDays' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, timeFilter === 'sevenDays' && styles.searchTypeTextActive]}>
                近7天
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.searchTypeBtn, timeFilter === 'all' && styles.searchTypeBtnActive]}
              activeOpacity={0.7} onPress={() => handleTimeFilterChange('all')}
            >
              <FontAwesome6 
                name="calendar" 
                size={12} 
                color={timeFilter === 'all' ? theme.buttonPrimaryText : theme.textMuted} 
                style={styles.searchTypeBtnIcon}
              />
              <Text style={[styles.searchTypeText, timeFilter === 'all' && styles.searchTypeTextActive]}>
                全部
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 统计信息 */}
        <View style={styles.statsContainer}>
          {timeFilter === 'all' ? (
            /* 全部筛选：只显示总数概览 */
            <View style={styles.statsOverview}>
              <Text style={styles.statsOverviewText}>总订单 <Text style={styles.statsOverviewNum}>{stats.totalOrders}</Text></Text>
              <Text style={styles.statsOverviewDivider}>|</Text>
              <TouchableOpacity onPress={() => handleOpenMaterials(false)}>
                <Text style={styles.statsOverviewText}>总物料 <Text style={styles.statsOverviewNum}>{stats.totalMaterials}</Text></Text>
              </TouchableOpacity>
              <Text style={styles.statsOverviewDivider}>|</Text>
              <Text style={styles.statsOverviewText}>总数量 <Text style={styles.statsOverviewNum}>{stats.totalQuantity.toLocaleString()}</Text></Text>
            </View>
          ) : (
            /* 时间筛选：显示对应的订单和物料数量 */
            <View style={styles.statsCards}>
              <TouchableOpacity style={styles.statCard}
                activeOpacity={0.7} onPress={() => setAllOrdersModalVisible(true)}
              >
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {timeFilter === 'today' ? stats.todayOrders : timeFilter === 'threeDays' ? stats.threeDaysOrders : stats.sevenDaysOrders}
                </Text>
                <Text style={styles.statLabel}>
                  {timeFilter === 'today' ? '今日订单' : timeFilter === 'threeDays' ? '近3天订单' : '近7天订单'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statCard, { marginRight: 0 }]}
                activeOpacity={0.7} onPress={() => handleOpenMaterials(timeFilter === 'today')}
              >
                <Text style={[styles.statNumber, { color: theme.accent }]}>
                  {timeFilter === 'today' ? stats.todayMaterials : timeFilter === 'threeDays' ? stats.threeDaysMaterials : stats.sevenDaysMaterials}
                </Text>
                <Text style={styles.statLabel}>
                  {timeFilter === 'today' ? '今日物料' : timeFilter === 'threeDays' ? '近3天物料' : '近7天物料'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* 订单列表 */}
        <View style={styles.recentOrders}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>订单列表</Text>
              <Text style={styles.sectionTip}>点击展开查看物料，长按删除订单</Text>
            </View>
          </View>
          
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            extraData={`${expandedOrderId}-${expandedMaterials.length}`}
            style={styles.ordersList}
            contentContainerStyle={[
              styles.ordersListContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="file-text" size={48} color={theme.textMuted} />
                <Text style={styles.emptyText}>
                  {searchText ? '未找到匹配的订单' : '暂无订单'}
                </Text>
                <Text style={styles.emptyTip}>
                  {searchText ? '请尝试其他关键词' : '扫码出库时会自动创建订单'}
                </Text>
              </View>
            }
          />
        </View>
      </View>
      
      {/* 编辑客户名称弹窗 */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
        hardwareAccelerated
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>设置客户名称</Text>
              <Text style={styles.modalSubtitle}>订单号: {editingOrder?.order_no}</Text>
              <TextInput
                ref={customerNameInputRef}
                style={styles.modalInput}
                placeholder="输入客户名称"
                placeholderTextColor={theme.textMuted}
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                
                autoFocus
              />
              <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton}
                activeOpacity={0.7} onPress={() => {
                  setEditModalVisible(false);
                  setEditingOrder(null);
                  setEditCustomerName('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton}
                activeOpacity={0.7} onPress={handleSaveCustomer}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* 所有订单弹窗 */}
      <Modal
        visible={allOrdersModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAllOrdersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
              <Text style={styles.modalTitle}>
                {timeFilter === 'today' ? '今日订单' : timeFilter === 'threeDays' ? '近3天订单' : timeFilter === 'sevenDays' ? '近7天订单' : '所有订单'}
              </Text>
              <TouchableOpacity onPress={() => setAllOrdersModalVisible(false)}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              renderItem={renderAllOrdersModalItem}
              style={{ maxHeight: 400 }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                  暂无订单
                </Text>
              }
            />
            
            <TouchableOpacity style={styles.modalCloseButton}
              activeOpacity={0.7} onPress={() => setAllOrdersModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 物料汇总弹窗 */}
      <Modal
        visible={materialsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaterialsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <View>
                <Text style={styles.modalTitle}>
                  {timeFilter === 'today' ? '今日物料' : timeFilter === 'threeDays' ? '近3天物料' : timeFilter === 'sevenDays' ? '近7天物料' : '物料汇总'}
                </Text>
                <Text style={{ fontSize: rf(13), color: theme.textSecondary, marginTop: 2 }}>
                  {materialSummaries.length} 种型号 · 总数量 {materialTotalQuantity.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMaterialsModalVisible(false)}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={materialSummaries}
              keyExtractor={(item) => item.model}
              renderItem={renderMaterialSummaryItem}
              style={{ maxHeight: 450 }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                  暂无物料数据
                </Text>
              }
            />
            
            <TouchableOpacity style={styles.modalCloseButton}
              activeOpacity={0.7} onPress={() => setMaterialsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 物料详情弹窗（按型号筛选） */}
      <Modal
        visible={materialDetailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaterialDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <View>
                <Text style={styles.modalTitle}>{selectedModel}</Text>
                <Text style={{ fontSize: rf(13), color: theme.textSecondary, marginTop: 2 }}>
                  共 {selectedModelMaterials.length} 条记录
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMaterialDetailModalVisible(false)}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={selectedModelMaterials}
              keyExtractor={(item, index) => String(item.id || index)}
              renderItem={renderSelectedModelMaterialItem}
              style={{ maxHeight: 450 }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                  暂无数据
                </Text>
              }
            />
            
            <TouchableOpacity style={styles.modalCloseButton}
              activeOpacity={0.7} onPress={() => setMaterialDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 拆包弹窗 */}
      <Modal
        visible={unpackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnpackModalVisible(false)}
      >
        <View style={unpackModalStyles.modalOverlay}>
          <View style={[unpackModalStyles.modalContent, { maxHeight: '85%' }]}>
            <View style={unpackModalStyles.modalHeader}>
              <Text style={unpackModalStyles.modalTitle}>拆包打印</Text>
              <TouchableOpacity onPress={() => setUnpackModalVisible(false)}>
                <Text style={unpackModalStyles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={unpackModalStyles.modalBody}
              contentContainerStyle={unpackModalStyles.modalBodyContent}
              showsVerticalScrollIndicator={true}
            >
              {/* 物料信息 */}
              <View style={unpackModalStyles.infoBox}>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>追踪码</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.traceNo || '-'}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>型号</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.model}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>批次</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.batch || '-'}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>原始数量</Text>
                  <Text style={[unpackModalStyles.infoValue, { color: theme.textMuted }]}>
                    {unpackingMaterial?.original_quantity || (unpackingMaterial?.quantity || 0).toString()}
                  </Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>剩余数量</Text>
                  <Text style={[unpackModalStyles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
                    {unpackingMaterial?.remaining_quantity || (unpackingMaterial?.quantity || 0).toString()}
                  </Text>
                </View>
                {unpackingMaterial?.sourceNo && (
                  <View style={unpackModalStyles.infoRow}>
                    <Text style={unpackModalStyles.infoLabel}>箱号</Text>
                    <Text style={unpackModalStyles.infoValue}>{unpackingMaterial.sourceNo}</Text>
                  </View>
                )}
              </View>
              
              {/* 拆包历史 */}
              {unpackHistory.length > 0 && (
                <View style={{ marginBottom: Spacing.md }}>
                  <Text style={[unpackModalStyles.inputLabel, { marginBottom: Spacing.sm }]}>
                    拆包历史（共{unpackHistory.length}次）
                  </Text>
                  {unpackHistory.map((record, index) => (
                    <View 
                      key={record.id} 
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: theme.backgroundTertiary,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.sm,
                        marginBottom: Spacing.xs,
                      }}
                    >
                      <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>
                        {record.new_traceNo}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: rf(13), color: theme.textPrimary, fontWeight: '600' }}>
                          {record.new_quantity}个
                        </Text>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>
                          {formatDateTime(record.unpacked_at)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* 新追踪码（自动生成） */}
              <Text style={unpackModalStyles.inputLabel}>新追踪码（自动生成）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center' }]}>
                <Text style={{ fontSize: rf(16), fontWeight: '600', color: theme.primary }}>
                  {unpackNewTraceNo || '-'}
                </Text>
              </View>
              
              {/* 拆出数量 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg }}>
                <Text style={unpackModalStyles.inputLabel}>拆出数量 *</Text>
                <Text style={{ fontSize: rf(13), color: theme.textMuted }}>
                  可拆: {unpackingMaterial?.remaining_quantity || (unpackingMaterial?.quantity || 0).toString()} 个
                </Text>
              </View>
              <TextInput
                ref={unpackQuantityRef}
                style={unpackModalStyles.textInput}
                placeholder="输入要拆出的数量"
                placeholderTextColor={theme.textMuted}
                value={unpackNewQuantity}
                onChangeText={(text) => {
                  // 只允许输入数字
                  const numeric = text.replace(/[^0-9]/g, '');
                  setUnpackNewQuantity(numeric);
                }}
                keyboardType="number-pad"
                
              />
              
              {/* 剩余数量预览 */}
              {unpackNewQuantity && !isNaN(parseInt(unpackNewQuantity, 10)) && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.md,
                  marginTop: Spacing.sm,
                }}>
                  <Text style={{ fontSize: rf(14), color: theme.textSecondary }}>剩余标签数量</Text>
                  <Text style={{ fontSize: rf(16), fontWeight: '600', color: theme.textPrimary }}>
                    {Math.max(0, parseInt(String(unpackingMaterial?.remaining_quantity || unpackingMaterial?.quantity || '0'), 10) - parseInt(String(unpackNewQuantity), 10))} 个
                  </Text>
                </View>
              )}
              
              {/* 备注 */}
              <Text style={unpackModalStyles.inputLabel}>备注（可选）</Text>
              <TextInput
                ref={unpackNotesRef}
                style={[unpackModalStyles.textInput, { minHeight: Spacing["2xl"], textAlignVertical: 'top' }]}
                placeholder="添加备注信息"
                placeholderTextColor={theme.textMuted}
                value={unpackNotes}
                onChangeText={setUnpackNotes}
                multiline
                
              />
            </ScrollView>
            
            <View style={unpackModalStyles.modalFooter}>
              <TouchableOpacity style={unpackModalStyles.cancelButton}
                activeOpacity={0.7} onPress={() => setUnpackModalVisible(false)}
              >
                <Text style={unpackModalStyles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={unpackModalStyles.saveButton}
                activeOpacity={0.7} onPress={handleConfirmUnpack}
                disabled={unpacking}
              >
                <Text style={unpackModalStyles.saveButtonText}>
                  {unpacking ? '处理中...' : '确认拆包'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 编辑物料弹窗 */}
      <Modal
        visible={editMaterialModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditMaterialModalVisible(false)}
      >
        <View style={unpackModalStyles.modalOverlay}>
          <View style={[unpackModalStyles.modalContent, { maxHeight: '85%' }]}>
            <View style={unpackModalStyles.modalHeader}>
              <Text style={unpackModalStyles.modalTitle}>编辑物料</Text>
              <TouchableOpacity onPress={() => setEditMaterialModalVisible(false)}>
                <Text style={unpackModalStyles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
                
                <ScrollView
                  ref={editMaterialScrollRef}
                  style={unpackModalStyles.modalBody}
                  keyboardShouldPersistTaps="handled"
                >
              {/* 原始扫码数量（只读） */}
              <Text style={unpackModalStyles.inputLabel}>原始扫码数量</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editingMaterial?.original_quantity || editingMaterial?.quantity || '-'}
                </Text>
              </View>
              
              {/* 型号（只读） */}
              <Text style={unpackModalStyles.inputLabel}>型号</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.model || '-'}
                </Text>
              </View>
              
              {/* 批次（只读） */}
              <Text style={unpackModalStyles.inputLabel}>批次</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.batch || '-'}
                </Text>
              </View>
              
              {/* 生产日期（只读） */}
              <Text style={unpackModalStyles.inputLabel}>生产日期</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.productionDate || '-'}
                </Text>
              </View>
              
              {/* 数量（可修改） */}
              <Text style={unpackModalStyles.inputLabel}>数量 *</Text>
              <TextInput
                ref={quantityInputRef}
                style={unpackModalStyles.textInput}
                placeholder={`最多 ${editingMaterial?.original_quantity || editingMaterial?.quantity || 0} 个`}
                placeholderTextColor={theme.textMuted}
                value={editMaterialData.quantity}
                onChangeText={(text) => {
                  // 只允许输入数字
                  const numeric = text.replace(/[^0-9]/g, '');
                  setEditMaterialData(prev => ({ ...prev, quantity: numeric }));
                }}
                keyboardType="number-pad"
                
              />
              {/* 底部留空，避免内容被键盘遮挡 */}
              <View style={{ height: 40 }} />
            </ScrollView>
            
            <View style={unpackModalStyles.modalFooter}>
              <TouchableOpacity style={unpackModalStyles.cancelButton}
                activeOpacity={0.7} onPress={() => setEditMaterialModalVisible(false)}
              >
                <Text style={unpackModalStyles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={unpackModalStyles.saveButton}
                activeOpacity={0.7} onPress={handleConfirmEditMaterial}
                disabled={savingMaterial}
              >
                {savingMaterial ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={unpackModalStyles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 自定义弹窗 */}
      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        onRequestClose={closeCustomAlert}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing["2xl"],
        }}>
          <View style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: BorderRadius.xl,
            padding: Spacing.xl,
            alignItems: 'center',
            backgroundColor: theme.backgroundDefault,
          }}>
            {/* 图标 */}
            {customAlert.icon && (
              <View style={{
                width: 72,
                height: 72,
                borderRadius: BorderRadius["4xl"],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.lg,
                backgroundColor: customAlert.icon === 'success' ? 'rgba(16, 185, 129, 0.12)' 
                  : customAlert.icon === 'warning' ? 'rgba(245, 158, 11, 0.12)'
                  : customAlert.icon === 'error' ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
                shadowColor: customAlert.icon === 'success' ? theme.success 
                  : customAlert.icon === 'warning' ? theme.warning
                  : customAlert.icon === 'error' ? theme.error
                  : theme.info,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 14,
                elevation: 4,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius["2xl"],
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: customAlert.icon === 'success' ? theme.success 
                    : customAlert.icon === 'warning' ? theme.warning
                    : customAlert.icon === 'error' ? theme.error
                    : theme.info,
                }}>
                  <FontAwesome6 
                    name={
                      customAlert.icon === 'success' ? 'check' 
                      : customAlert.icon === 'warning' ? 'triangle-exclamation'
                      : customAlert.icon === 'error' ? 'xmark'
                      : 'info'
                    }
                    size={24} 
                    color={theme.white}
                  />
                </View>
              </View>
            )}
            
            {/* 标题 */}
            <Text style={{
              fontSize: rf(18),
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: Spacing.sm,
              color: theme.textPrimary,
            }}>
              {customAlert.title}
            </Text>
            
            {/* 消息内容 */}
            <Text style={{
              fontSize: rf(14),
              lineHeight: Spacing.xl,
              textAlign: 'center',
              marginBottom: Spacing.xl,
              color: theme.textSecondary,
            }}>
              {customAlert.message}
            </Text>
            
            {/* 按钮组 */}
            <View style={{
              flexDirection: 'row',
              gap: Spacing.md,
              width: '100%',
            }}>
              {customAlert.buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const bgColor = isDestructive ? theme.error 
                  : isCancel ? theme.backgroundTertiary 
                  : theme.primary;
                const textColor = isDestructive ? theme.white 
                  : isCancel ? theme.textPrimary 
                  : theme.buttonPrimaryText;
                
                return (
                  <TouchableOpacity key={index}
                    style={{
                      flex: customAlert.buttons.length === 1 ? 0 : 1,
                      width: customAlert.buttons.length === 1 ? '100%' : undefined,
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: Spacing["2xl"],
                      backgroundColor: bgColor,
                      borderWidth: isCancel ? 1.5 : 0,
                      borderColor: isCancel ? theme.border : 'transparent',
                    }}
                    activeOpacity={0.7} onPress={() => {
                      closeCustomAlert();
                      button.onPress?.();
                    }}
                  >
                    <Text style={{
                      fontSize: rf(16),
                      fontWeight: '600',
                      color: textColor,
                    }}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 仓库选择器弹窗 */}
      {showWarehousePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>选择仓库</Text>
            {warehouses.map(wh => (
              <TouchableOpacity key={wh.id}
                style={[styles.pickerItem, currentWarehouse?.id === wh.id && styles.pickerItemActive]}
                activeOpacity={0.7} onPress={() => handleWarehouseChange(wh)}
              >
                <Text style={styles.pickerItemText}>{wh.name}</Text>
                {currentWarehouse?.id === wh.id && <FontAwesome6 name="check" size={14} color={theme.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerClose} activeOpacity={0.7} onPress={() => setShowWarehousePicker(false)}>
              <Text style={styles.pickerCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Screen>
  );
}
