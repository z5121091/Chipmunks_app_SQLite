import { StyleSheet, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

// 检测是否是 Android 7.0 及以下（不支持透明色）
// Platform.Version 在 Android 上可能是数字或字符串，需要转换
const isLowAndroid = Platform.OS === 'android' && Number(Platform.Version) <= 24;

// 安全的颜色透明度函数（Android 7.0 及以下使用实色）
const withAlpha = (hex: string, alpha: number): string => {
  if (isLowAndroid) {
    // Android 7.0 不支持透明色，使用接近的实色
    return hex;
  }
  // 将 #RRGGBB 转换为 rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Android 7.0 兼容的白色半透明
const whiteAlpha = (alpha: number, fallback: string = '#999999'): string => {
  if (isLowAndroid) {
    return fallback; // Android 7.0 使用灰色替代
  }
  return `rgba(255, 255, 255, ${alpha})`;
};

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    // 头部区域
    header: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.md,
      backgroundColor: theme.backgroundRoot,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    backButton: {
      padding: Spacing.sm,
      marginRight: Spacing.sm,
      marginTop: Spacing.xs,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      flex: 1,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: rf(22),
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: rf(13),
      color: theme.textSecondary,
      marginTop: Spacing.xs,
    },
    // 统计概览
    statsContainer: {
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    statCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statCardPrimary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      marginBottom: Spacing.sm,
    },
    statIconBg: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      backgroundColor: whiteAlpha(0.2),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    statContent: {
      flex: 1,
    },
    statNumber: {
      fontSize: rf(32),
      fontWeight: '700',
      color: theme.white,
    },
    statLabel: {
      fontSize: rf(13),
      color: whiteAlpha(0.9),
      marginTop: 2,
    },
    statBadge: {
      backgroundColor: whiteAlpha(0.2),
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    statBadgeText: {
      fontSize: rf(12),
      fontWeight: '600',
      color: theme.white,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    statCardShipped: {
      flex: 1,
      backgroundColor: withAlpha(theme.info, 0.06),
      borderColor: withAlpha(theme.info, 0.2),
    },
    statCardRemaining: {
      flex: 1,
      backgroundColor: withAlpha(theme.success, 0.06),
      borderColor: withAlpha(theme.success, 0.2),
    },
    statContentSmall: {
      marginLeft: Spacing.sm,
    },
    statNumberSmall: {
      fontSize: rf(20),
      fontWeight: '700',
    },
    statLabelSmall: {
      fontSize: rf(11),
      color: theme.textSecondary,
      marginTop: 2,
    },
    statBadgeSmall: {
      backgroundColor: withAlpha(theme.info, 0.15),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      marginLeft: 'auto',
    },
    statBadgeTextSmall: {
      fontSize: rf(10),
      fontWeight: '600',
      color: theme.info,
    },
    // 搜索和筛选
    searchContainer: {
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderWidth: 2,
      borderColor: theme.border,
      marginBottom: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: rf(14),
      color: theme.textPrimary,
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
    },
    filterTabs: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    filterTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterTabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterTabText: {
      fontSize: rf(12),
      fontWeight: '500',
      color: theme.textSecondary,
    },
    filterTabTextActive: {
      color: theme.white,
    },
    // 标签列表
    listContainer: {
      flex: 1,
      paddingHorizontal: Spacing.md,
    },
    labelCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 2,
      borderColor: theme.border,
    },
    labelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    labelInfo: {
      flex: 1,
    },
    labelModel: {
      fontSize: rf(15),
      fontWeight: '700',
      color: theme.textPrimary,
    },
    labelCode: {
      fontSize: rf(11),
      color: theme.textMuted,
      marginTop: 2,
    },
    labelStatus: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    labelStatusPrinted: {
      backgroundColor: withAlpha(theme.success, 0.1),
    },
    labelStatusPending: {
      backgroundColor: withAlpha(theme.warning, 0.1),
    },
    labelStatusText: {
      fontSize: rf(11),
      fontWeight: '600',
    },
    labelStatusTextPrinted: {
      color: theme.success,
    },
    labelStatusTextPending: {
      color: theme.warning,
    },
    labelDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    labelDetailItem: {
      flex: 1,
    },
    labelDetailLabel: {
      fontSize: rf(11),
      color: theme.textMuted,
    },
    labelDetailValue: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.textPrimary,
      marginTop: 1,
    },
    labelActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    printBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
      gap: Spacing.xs,
    },
    printBtnText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.white,
    },
    deleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: withAlpha(theme.error, 0.1),
      gap: Spacing.xs,
    },
    deleteBtnText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.error,
    },
    // 底部操作栏
    bottomBar: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: Spacing.sm,
    },
    addBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
      gap: Spacing.xs,
    },
    addBtnText: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.white,
    },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      gap: Spacing.xs,
    },
    exportBtnText: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.textPrimary,
    },
    // 空状态
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    emptyText: {
      fontSize: rf(14),
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    emptyBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    emptyBtnText: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.white,
    },
    // 弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      width: '90%',
      maxWidth: 360,
    },
    modalTitle: {
      fontSize: rf(16),
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: rf(14),
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelButtonText: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.textSecondary,
    },
    submitButton: {
      backgroundColor: theme.primary,
    },
    submitButtonText: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.white,
    },
    // 开箱卡片样式
    unpackCardWrapper: {
      marginBottom: Spacing.md,
    },
    unpackCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 2,
      borderColor: theme.border,
    },
    unpackCardSelected: {
      borderColor: theme.primary,
      backgroundColor: withAlpha(theme.primary, 0.04),
    },
    shippedCard: {
      backgroundColor: withAlpha(theme.info, 0.06),
      borderColor: withAlpha(theme.info, 0.3),
    },
    remainingCard: {
      backgroundColor: withAlpha(theme.success, 0.06),
      borderColor: withAlpha(theme.success, 0.3),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    cardCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    cardCheckboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    labelTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.sm,
    },
    labelTypeShipped: {
      backgroundColor: withAlpha(theme.info, 0.15),
    },
    labelTypeRemaining: {
      backgroundColor: withAlpha(theme.success, 0.15),
    },
    labelTypeText: {
      fontSize: rf(11),
      fontWeight: '600',
    },
    labelTypeTextShipped: {
      color: theme.info,
    },
    labelTypeTextRemaining: {
      color: theme.success,
    },
    cardCustomerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.xs,
    },
    cardCustomerText: {
      fontSize: rf(11),
      color: theme.primary,
    },
    cardModel: {
      fontSize: rf(16),
      fontWeight: '700',
      color: theme.textPrimary,
      marginTop: Spacing.xs,
    },
    cardBody: {
      marginTop: Spacing.sm,
    },
    cardInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardInfoIcon: {
      width: 20,
      alignItems: 'center',
    },
    cardInfoLabel: {
      fontSize: rf(12),
      color: theme.textMuted,
      width: 50,
    },
    cardInfoValue: {
      fontSize: rf(12),
      color: theme.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    cardQuantityChange: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    quantityOld: {
      fontSize: rf(12),
      color: theme.textMuted,
      textDecorationLine: 'line-through',
    },
    quantityArrow: {
      marginHorizontal: 4,
    },
    quantityNew: {
      fontSize: rf(12),
      fontWeight: '700',
      color: theme.primary,
    },
    cardTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.sm,
    },
    cardTime: {
      fontSize: rf(11),
      color: theme.textMuted,
    },
    traceNoValue: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: rf(11),
    },
    // 卡片操作
    cardActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    cardActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
      gap: Spacing.xs,
    },
    cardActionBtnText: {
      fontSize: rf(12),
      fontWeight: '600',
      color: theme.white,
    },
    // 空状态
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
      fontSize: rf(16),
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
    },
    emptyDesc: {
      fontSize: rf(13),
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    // 筛选标签（发货/剩余）
    filterTabActiveShipped: {
      backgroundColor: theme.info,
      borderColor: theme.info,
    },
    filterTabTextActiveShipped: {
      color: theme.white,
    },
    filterTabActiveRemaining: {
      backgroundColor: theme.success,
      borderColor: theme.success,
    },
    filterTabTextActiveRemaining: {
      color: theme.white,
    },
    // 批次选择栏
    batchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      gap: Spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    batchBarText: {
      fontSize: rf(13),
      fontWeight: '500',
      color: theme.textPrimary,
      flex: 1,
    },
    batchActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    batchBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    batchBtnDanger: {
      backgroundColor: theme.error,
    },
    batchBtnText: {
      fontSize: rf(12),
      fontWeight: '600',
      color: theme.white,
    },
    batchBtnTextDanger: {
      color: theme.white,
    },
    // 列表内容
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: 100,
    },
  });
};
