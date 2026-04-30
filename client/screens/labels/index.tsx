import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  RefreshControl,
  Animated,
  TextInput,
  FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/hooks/useTheme';
import { createStyles } from './styles';
import { useCustomAlert } from '@/components/CustomAlert';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  UnpackRecord,
  getAllUnpackRecords,
  deleteUnpackRecord,
  deleteUnpackRecords,
} from '@/utils/database';
import { formatTime } from '@/utils/time';

// 简单的按压动画卡片组件（兼容旧版Android）
function AnimatedLabelCard({ 
  children, 
  onPress,
  style,
}: { 
  children: React.ReactNode; 
  onPress?: () => void;
  style?: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity  activeOpacity={0.7} onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LabelsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const alert = useCustomAlert();
  const router = useSafeRouter();

  const [records, setRecords] = useState<UnpackRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'shipped' | 'remaining'>('all');

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const allRecords = await getAllUnpackRecords();
      // 按拆包时间倒序排列
      allRecords.sort((a, b) => new Date(b.unpacked_at).getTime() - new Date(a.unpacked_at).getTime());
      setRecords(allRecords);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 统计数据
  const stats = useMemo(() => {
    const shippedCount = records.filter(r => r.label_type === 'shipped').length;
    const remainingCount = records.filter(r => r.label_type === 'remaining').length;
    const totalQuantity = records.reduce((sum, r) => sum + Number(r.new_quantity || 0), 0);
    
    // 本周数据
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekRecords = records.filter(r => new Date(r.unpacked_at) >= weekStart);
    
    // 今日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = records.filter(r => new Date(r.unpacked_at) >= today);

    return {
      total: records.length,
      shipped: shippedCount,
      remaining: remainingCount,
      totalQuantity,
      weekCount: weekRecords.length,
      todayCount: todayRecords.length,
    };
  }, [records]);

  // 过滤后的记录
  const filteredRecords = useMemo(() => {
    let result = records;
    
    // 类型筛选
    if (filterType === 'shipped') {
      result = result.filter(r => r.label_type === 'shipped');
    } else if (filterType === 'remaining') {
      result = result.filter(r => r.label_type === 'remaining');
    }
    
    // 搜索筛选
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(r => 
        r.model?.toLowerCase().includes(search) ||
        r.batch?.toLowerCase().includes(search) ||
        r.traceNo?.toLowerCase().includes(search) ||
        r.new_traceNo?.toLowerCase().includes(search) ||
        r.customer_name?.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [records, filterType, searchText]);

  const isAllSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < filteredRecords.length;

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // 切换单个选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 删除记录
  const handleDelete = (record: UnpackRecord) => {
    alert.showConfirm(
      '确认删除',
      `确定要删除「${record.model}」的${record.label_type === 'shipped' ? '发货标签' : '剩余标签'}吗？`,
      async () => {
        try {
          await deleteUnpackRecord(record.id);
          await loadData();
          const newSelected = new Set(selectedIds);
          newSelected.delete(record.id);
          setSelectedIds(newSelected);
        } catch (error) {
          console.error('删除失败:', error);
          alert.showError('请稍后重试');
        }
      },
      true
    );
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      alert.showWarning('请先选择要删除的记录');
      return;
    }

    alert.showConfirm(
      '确认删除',
      `确定要删除选中的 ${selectedIds.size} 条记录吗？`,
      async () => {
        try {
          await deleteUnpackRecords(Array.from(selectedIds));
          await loadData();
          setSelectedIds(new Set());
        } catch (error) {
          console.error('批量删除失败:', error);
          alert.showError('请稍后重试');
        }
      },
      true
    );
  };

  // 渲染标签卡片
  const renderUnpackCard = useCallback(({ item: record }: { item: UnpackRecord }) => {
    const isSelected = selectedIds.has(record.id);
    const isShipped = record.label_type === 'shipped';
    // 发货标签显示新追踪码，剩余标签显示原追踪码
    const displayTraceNo = isShipped ? (record.new_traceNo || record.traceNo) : record.traceNo;

    return (
      <AnimatedLabelCard 
        onPress={() => toggleSelect(record.id)}
        style={styles.unpackCardWrapper}
      >
        <View style={[
          styles.unpackCard, 
          isSelected && styles.unpackCardSelected,
          isShipped ? styles.shippedCard : styles.remainingCard
        ]}>
          {/* 卡片头部 */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardCheckbox, isSelected && styles.cardCheckboxChecked]}>
              {isSelected && <FontAwesome6 name="check" size={12} color={theme.buttonPrimaryText} />}
            </View>

            {/* 标签类型标识 */}
            <View style={[
              styles.labelTypeBadge, 
              isShipped ? styles.labelTypeShipped : styles.labelTypeRemaining
            ]}>
              <FontAwesome6 
                name={isShipped ? 'truck-fast' : 'cube'} 
                size={12} 
                color={isShipped ? theme.info : theme.success} 
              />
              <Text style={[
                styles.labelTypeText,
                isShipped ? styles.labelTypeTextShipped : styles.labelTypeTextRemaining
              ]}>
                {isShipped ? '发货' : '剩余'}
              </Text>
            </View>

            {record.customer_name ? (
              <View style={styles.cardCustomerBadge}>
                <FontAwesome6 name="user" size={10} color={theme.primary} />
                <Text style={styles.cardCustomerText}>{record.customer_name}</Text>
              </View>
            ) : null}

            <Text style={styles.cardModel} numberOfLines={1}>
              {record.model}
            </Text>
          </View>

          {/* 卡片内容 */}
          <View style={styles.cardBody}>
            <View style={styles.cardInfoRow}>
              <View style={styles.cardInfoIcon}>
                <FontAwesome6 name="layer-group" size={12} color={theme.textSecondary} />
              </View>
              <Text style={styles.cardInfoLabel}>批次</Text>
              <Text style={styles.cardInfoValue}>{record.batch || '-'}</Text>
            </View>
            <View style={styles.cardInfoRow}>
              <View style={styles.cardInfoIcon}>
                <FontAwesome6 name="box" size={12} color={theme.textSecondary} />
              </View>
              <Text style={styles.cardInfoLabel}>封装</Text>
              <Text style={styles.cardInfoValue}>{record.package || '-'}</Text>
            </View>
            <View style={styles.cardInfoRow}>
              <View style={styles.cardInfoIcon}>
                <FontAwesome6 name="hashtag" size={12} color={theme.textSecondary} />
              </View>
              <Text style={styles.cardInfoLabel}>数量</Text>
              <View style={styles.cardQuantityChange}>
                <Text style={styles.quantityOld}>{record.original_quantity}</Text>
                <FontAwesome6 name="arrow-right" size={10} color={theme.textSecondary} style={styles.quantityArrow} />
                <Text style={[
                  styles.quantityNew, 
                  !isShipped && { color: theme.success }
                ]}>
                  {record.new_quantity}
                </Text>
              </View>
            </View>
            {record.traceNo ? (
              <View style={styles.cardInfoRow}>
                <View style={styles.cardInfoIcon}>
                  <FontAwesome6 name="barcode" size={12} color={theme.textSecondary} />
                </View>
                <Text style={styles.cardInfoLabel}>
                  {isShipped ? '新追踪码' : '追踪码'}
                </Text>
                <Text style={[styles.cardInfoValue, styles.traceNoValue]}>
                  {displayTraceNo}
                </Text>
              </View>
            ) : null}
            <View style={styles.cardTimeRow}>
              <FontAwesome6 name="clock" size={10} color={theme.textMuted} />
              <Text style={styles.cardTime}>
                {formatTime(record.unpacked_at)}
              </Text>
            </View>
          </View>

          {/* 卡片操作 */}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.cardActionBtn}
              activeOpacity={0.7} onPress={() => handleDelete(record)}
            >
              <FontAwesome6 name="trash" size={14} color={theme.error} />
              <Text style={[styles.cardActionBtnText, { color: theme.error }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedLabelCard>
    );
  }, [selectedIds, styles, theme]);

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <FontAwesome6 name="tags" size={32} color={theme.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>暂无标签记录</Text>
      <Text style={styles.emptyDesc}>
        从订单页面拆包物料后{'\n'}标签将显示在这里
      </Text>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>标签管理</Text>
            </View>
            <Text style={styles.subtitle}>
              拆包后生成发货标签和剩余标签，可同步到电脑打印
            </Text>
          </View>
        </View>
      </View>

      {/* 统计概览 */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardShipped]}>
            <FontAwesome6 name="truck-fast" size={16} color={theme.info} />
            <View style={styles.statContentSmall}>
              <Text style={[styles.statNumberSmall, { color: theme.info }]}>{stats.shipped}</Text>
              <Text style={styles.statLabelSmall}>发货标签</Text>
            </View>
            {stats.todayCount > 0 && (
              <View style={styles.statBadgeSmall}>
                <Text style={styles.statBadgeTextSmall}>+{stats.todayCount}</Text>
              </View>
            )}
          </View>

          <View style={[styles.statCard, styles.statCardRemaining]}>
            <FontAwesome6 name="cube" size={16} color={theme.success} />
            <View style={styles.statContentSmall}>
              <Text style={[styles.statNumberSmall, { color: theme.success }]}>{stats.remaining}</Text>
              <Text style={styles.statLabelSmall}>剩余标签</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 搜索和筛选 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <FontAwesome6 name="magnifying-glass" size={16} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索型号、批次、追踪码..."
            placeholderTextColor={theme.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <FontAwesome6 name="times-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            activeOpacity={0.7} onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
              全部
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterTab, filterType === 'shipped' && styles.filterTabActiveShipped]}
            activeOpacity={0.7} onPress={() => setFilterType('shipped')}
          >
            <FontAwesome6 name="truck-fast" size={12} color={filterType === 'shipped' ? theme.info : theme.textSecondary} />
            <Text style={[styles.filterTabText, filterType === 'shipped' && styles.filterTabTextActiveShipped]}>
              发货
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterTab, filterType === 'remaining' && styles.filterTabActiveRemaining]}
            activeOpacity={0.7} onPress={() => setFilterType('remaining')}
          >
            <FontAwesome6 name="cube" size={12} color={filterType === 'remaining' ? theme.success : theme.textSecondary} />
            <Text style={[styles.filterTabText, filterType === 'remaining' && styles.filterTabTextActiveRemaining]}>
              剩余
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 批量操作栏 */}
      {filteredRecords.length > 0 && (
        <View style={styles.batchBar}>
          <TouchableOpacity style={[styles.checkbox, (isAllSelected || isPartialSelected) && styles.checkboxChecked]}
            activeOpacity={0.7} onPress={toggleSelectAll}
          >
            {(isAllSelected || isPartialSelected) && (
              <FontAwesome6 
                name={isPartialSelected ? 'minus' : 'check'} 
                size={12} 
                color={theme.buttonPrimaryText} 
              />
            )}
          </TouchableOpacity>
          <Text style={styles.batchBarText}>
            {selectedIds.size > 0 ? `已选 ${selectedIds.size} / ${filteredRecords.length} 条` : `共 ${filteredRecords.length} 条`}
          </Text>
          
          {selectedIds.size > 0 && (
            <View style={styles.batchActions}>
              <TouchableOpacity style={[styles.batchBtn, styles.batchBtnDanger]}
                activeOpacity={0.7} onPress={handleBatchDelete}
              >
                <FontAwesome6 name="trash" size={14} color={theme.error} />
                <Text style={[styles.batchBtnText, styles.batchBtnTextDanger]}>删除选中</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 列表 */}
      <FlatList
        style={styles.container}
        contentContainerStyle={[
          styles.listContent,
          filteredRecords.length === 0 ? { flexGrow: 1 } : null,
        ]}
        data={filteredRecords}
        renderItem={renderUnpackCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={renderEmpty}
      />
      
      {/* 自定义弹窗 */}
      {alert.AlertComponent}
    </Screen>
  );
}
