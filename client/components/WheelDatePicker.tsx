import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { rf } from '@/utils/responsive';

const { width } = Dimensions.get('window');
const WHEEL_WIDTH = width - Spacing['2xl'] * 2;
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface WheelDatePickerProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  theme: Theme;
}

// 生成年月日数据
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));
};

const generateMonths = () => {
  return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
};

const generateDays = (year: string, month: string) => {
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
};

// 快捷选项
const QUICK_OPTIONS = [
  { label: '今天', days: 0 },
  { label: '最近7天', days: 7 },
  { label: '最近15天', days: 15 },
  { label: '最近30天', days: 30 },
  { label: '最近90天', days: 90 },
];

export function WheelDatePicker({
  visible,
  startDate,
  endDate,
  onClose,
  onConfirm,
  theme,
}: WheelDatePickerProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 解析初始日期
  const parseDate = (dateStr: string) => {
    if (!dateStr) {
      return {
        year: String(today.getFullYear()),
        month: String(today.getMonth() + 1).padStart(2, '0'),
        day: String(today.getDate()).padStart(2, '0'),
      };
    }
    const [year, month, day] = dateStr.split('-');
    return { year, month, day };
  };

  const startParsed = parseDate(startDate);
  const endParsed = parseDate(endDate);

  const [startYear, setStartYear] = useState(startParsed.year);
  const [startMonth, setStartMonth] = useState(startParsed.month);
  const [startDay, setStartDay] = useState(startParsed.day);

  const [endYear, setEndYear] = useState(endParsed.year);
  const [endMonth, setEndMonth] = useState(endParsed.month);
  const [endDay, setEndDay] = useState(endParsed.day);

  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [quickOption, setQuickOption] = useState<number | null>(null);

  const startYearScrollRef = useRef<ScrollView>(null);
  const startMonthScrollRef = useRef<ScrollView>(null);
  const startDayScrollRef = useRef<ScrollView>(null);
  const endYearScrollRef = useRef<ScrollView>(null);
  const endMonthScrollRef = useRef<ScrollView>(null);
  const endDayScrollRef = useRef<ScrollView>(null);
  const scrollTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const years = generateYears();
  const months = generateMonths();
  const startDays = generateDays(startYear, startMonth);
  const endDays = generateDays(endYear, endMonth);

  // 滚动到选中项
  useEffect(() => {
    const scrollToIndex = (ref: React.RefObject<ScrollView | null>, index: number) => {
      const timer = setTimeout(() => {
        ref.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: false,
        });
        scrollTimerRefs.current = scrollTimerRefs.current.filter((item) => item !== timer);
      }, 100);
      scrollTimerRefs.current.push(timer);
    };

    if (activeTab === 'start') {
      scrollToIndex(startYearScrollRef, years.indexOf(startYear));
      scrollToIndex(startMonthScrollRef, months.indexOf(startMonth));
      scrollToIndex(startDayScrollRef, Math.min(startDays.indexOf(startDay), startDays.length - 1));
    } else {
      scrollToIndex(endYearScrollRef, years.indexOf(endYear));
      scrollToIndex(endMonthScrollRef, months.indexOf(endMonth));
      scrollToIndex(endDayScrollRef, Math.min(endDays.indexOf(endDay), endDays.length - 1));
    }

    return () => {
      scrollTimerRefs.current.forEach(clearTimeout);
      scrollTimerRefs.current = [];
    };
  }, [
    activeTab,
    startYear,
    startMonth,
    startDay,
    endYear,
    endMonth,
    endDay,
    years,
    months,
    startDays,
    endDays,
  ]);

  // 快捷选择
  const handleQuickOption = (days: number) => {
    setQuickOption(days);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setStartYear(String(start.getFullYear()));
    setStartMonth(String(start.getMonth() + 1).padStart(2, '0'));
    setStartDay(String(start.getDate()).padStart(2, '0'));

    setEndYear(String(end.getFullYear()));
    setEndMonth(String(end.getMonth() + 1).padStart(2, '0'));
    setEndDay(String(end.getDate()).padStart(2, '0'));
  };

  // 确认选择
  const handleConfirm = () => {
    const start = `${startYear}-${startMonth}-${startDay}`;
    const end = `${endYear}-${endMonth}-${endDay}`;
    onConfirm(start, end);
    onClose();
  };

  // 清除日期
  const handleClear = () => {
    onConfirm('', '');
    onClose();
  };

  const styles = createStyles(theme);

  // 渲染滚轮列
  const renderWheelColumn = useCallback(
    (
      items: string[],
      selectedValue: string,
      onSelect: (value: string) => void,
      scrollRef: React.RefObject<ScrollView | null>,
      label: string
    ) => (
      <View style={styles.wheelColumn}>
        <Text style={styles.wheelLabel}>{label}</Text>
        <View style={styles.wheelContainer}>
          <View style={styles.selectionIndicator} />
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
              if (items[index]) {
                onSelect(items[index]);
              }
            }}
            contentContainerStyle={styles.wheelScrollContent}
          >
            {/* 顶部占位 */}
            <View style={{ height: ITEM_HEIGHT * 2 }} />

            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.wheelItem, selectedValue === item && styles.wheelItemSelected]}
                onPress={() => onSelect(item)}
              >
                <Text
                  style={[
                    styles.wheelItemText,
                    selectedValue === item && styles.wheelItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}

            {/* 底部占位 */}
            <View style={{ height: ITEM_HEIGHT * 2 }} />
          </ScrollView>
        </View>
      </View>
    ),
    [
      styles.wheelColumn,
      styles.wheelLabel,
      styles.wheelContainer,
      styles.selectionIndicator,
      styles.wheelScrollContent,
      styles.wheelItem,
      styles.wheelItemSelected,
      styles.wheelItemText,
      styles.wheelItemTextSelected,
    ]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <TouchableOpacity activeOpacity={1}>
            {/* 头部 */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.title}>选择日期范围</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmText}>确定</Text>
              </TouchableOpacity>
            </View>

            {/* 快捷选项 */}
            <View style={styles.quickOptions}>
              {QUICK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.days}
                  style={[
                    styles.quickOptionBtn,
                    quickOption === option.days && styles.quickOptionBtnActive,
                  ]}
                  onPress={() => handleQuickOption(option.days)}
                >
                  <Text
                    style={[
                      styles.quickOptionText,
                      quickOption === option.days && styles.quickOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 日期范围显示 */}
            <View style={styles.dateRangeDisplay}>
              <TouchableOpacity
                style={[styles.dateTab, activeTab === 'start' && styles.dateTabActive]}
                onPress={() => setActiveTab('start')}
              >
                <Text
                  style={[styles.dateTabLabel, activeTab === 'start' && styles.dateTabLabelActive]}
                >
                  开始日期
                </Text>
                <Text
                  style={[styles.dateTabValue, activeTab === 'start' && styles.dateTabValueActive]}
                >
                  {startYear}-{startMonth}-{startDay}
                </Text>
              </TouchableOpacity>

              <Text style={styles.dateRangeSeparator}>至</Text>

              <TouchableOpacity
                style={[styles.dateTab, activeTab === 'end' && styles.dateTabActive]}
                onPress={() => setActiveTab('end')}
              >
                <Text
                  style={[styles.dateTabLabel, activeTab === 'end' && styles.dateTabLabelActive]}
                >
                  结束日期
                </Text>
                <Text
                  style={[styles.dateTabValue, activeTab === 'end' && styles.dateTabValueActive]}
                >
                  {endYear}-{endMonth}-{endDay}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 滚轮选择器 */}
            {activeTab === 'start' ? (
              <View style={styles.wheelRow}>
                {renderWheelColumn(years, startYear, setStartYear, startYearScrollRef, '年')}
                {renderWheelColumn(months, startMonth, setStartMonth, startMonthScrollRef, '月')}
                {renderWheelColumn(startDays, startDay, setStartDay, startDayScrollRef, '日')}
              </View>
            ) : (
              <View style={styles.wheelRow}>
                {renderWheelColumn(years, endYear, setEndYear, endYearScrollRef, '年')}
                {renderWheelColumn(months, endMonth, setEndMonth, endMonthScrollRef, '月')}
                {renderWheelColumn(endDays, endDay, setEndDay, endDayScrollRef, '日')}
              </View>
            )}

            {/* 清除按钮 */}
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>清除日期</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.backgroundDefault,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      paddingBottom: Spacing['2xl'],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    cancelText: {
      fontSize: rf(16),
      color: theme.textSecondary,
    },
    title: {
      fontSize: rf(16),
      fontWeight: '600',
      color: theme.textPrimary,
    },
    confirmText: {
      fontSize: rf(16),
      color: theme.primary,
      fontWeight: '600',
    },
    quickOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    quickOptionBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    quickOptionBtnActive: {
      backgroundColor: theme.primary,
    },
    quickOptionText: {
      fontSize: rf(14),
      color: theme.textPrimary,
    },
    quickOptionTextActive: {
      color: theme.white,
      fontWeight: '600',
    },
    dateRangeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dateTab: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
    },
    dateTabActive: {
      backgroundColor: theme.black,
    },
    dateTabLabel: {
      fontSize: rf(12),
      fontWeight: '500',
      marginBottom: 2,
      color: theme.textSecondary,
    },
    dateTabLabelActive: {
      color: 'rgba(255,255,255,0.7)',
    },
    dateTabValue: {
      fontSize: rf(16),
      fontWeight: '600',
      color: theme.textPrimary,
    },
    dateTabValueActive: {
      color: theme.white,
    },
    dateRangeSeparator: {
      marginHorizontal: Spacing.md,
      fontSize: rf(14),
      color: theme.textMuted,
    },
    wheelRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    wheelColumn: {
      flex: 1,
      alignItems: 'center',
    },
    wheelLabel: {
      fontSize: rf(14),
      color: theme.textPrimary,
      fontWeight: '500',
      marginBottom: Spacing.sm,
    },
    wheelContainer: {
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    },
    selectionIndicator: {
      position: 'absolute',
      top: ITEM_HEIGHT * 2,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      zIndex: 0,
      borderWidth: 1,
      borderColor: theme.primary + '30',
    },
    wheelScrollContent: {
      flexGrow: 1,
    },
    wheelItem: {
      height: ITEM_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wheelItemSelected: {
      // 选中样式通过文字体现
    },
    wheelItemText: {
      fontSize: rf(18),
      color: theme.textPrimary,
      opacity: 0.6,
    },
    wheelItemTextSelected: {
      fontSize: rf(20),
      fontWeight: '700',
      color: theme.textPrimary,
      opacity: 1,
    },
    clearButton: {
      marginHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    clearButtonText: {
      fontSize: rf(16),
      color: theme.textSecondary,
    },
  });
