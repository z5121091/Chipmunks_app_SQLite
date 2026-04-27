import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme, BorderWidth, Typography } from '@/constants/theme';
import { rs, rf } from '@/utils/responsive';
import { withAlpha } from '@/utils/colors';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
      padding: Spacing.sm,
    },
    scrollContent: {
      padding: Spacing.sm,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    backButton: {
      padding: Spacing.sm,
      marginRight: Spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      flex: 1,
    },
    title: {
      ...Typography.h4,
      color: theme.textPrimary,
    },
    subtitle: {
      ...Typography.caption,
      color: theme.textSecondary,
      marginTop: 1,
    },
    // 搜索框
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.sm,
      minHeight: 44,
    },
    searchIcon: {
      marginRight: Spacing.xs,
    },
    searchInput: {
      flex: 1,
      ...Typography.body,
      color: theme.textPrimary,
      paddingVertical: Spacing.xs + 2,
    },
    searchClear: {
      padding: Spacing.xs,
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 仓库选择器 + 搜索类型选择器（横向排列）
    filterRow: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    // 仓库选择器
    warehouseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs + 1,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundDefault,
      borderWidth: BorderWidth.normal,
      borderColor: theme.primary,
      minHeight: 40,
    },
    warehouseBtnText: {
      ...Typography.captionMedium,
      color: theme.primary,
      marginLeft: Spacing.xs,
    },
    // 搜索类型按钮（统一风格）
    searchTypeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xs + 1,
      paddingHorizontal: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundDefault,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      minHeight: 40,
    },
    searchTypeBtnIcon: {
      marginRight: 2,
    },
    searchTypeBtnActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    searchTypeText: {
      ...Typography.captionMedium,
      color: theme.textSecondary,
    },
    searchTypeTextActive: {
      color: theme.buttonPrimaryText,
      fontWeight: '600',
    },
    // 统计卡片
    statsContainer: {
      marginBottom: Spacing.sm,
    },
    statsOverview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    statsOverviewText: {
      ...Typography.caption,
      color: theme.textMuted,
    },
    statsOverviewNum: {
      ...Typography.smallMedium,
      color: theme.textPrimary,
    },
    statsOverviewDivider: {
      ...Typography.caption,
      color: theme.border,
      marginHorizontal: Spacing.xs,
    },
    statsCards: {
      flexDirection: 'row',
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      padding: Spacing.sm,
      marginRight: Spacing.xs,
      alignItems: 'center',
    },
    statNumber: {
      ...Typography.h3,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    statLabel: {
      ...Typography.caption,
      color: theme.textMuted,
      marginTop: 1,
    },
    // 订单列表
    recentOrders: {
      marginTop: Spacing.xs,
      flex: 1,
    },
    ordersList: {
      flex: 1,
    },
    ordersListContent: {
      paddingBottom: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.xs,
    },
    sectionTitle: {
      ...Typography.smallMedium,
      color: theme.textPrimary,
    },
    sectionTip: {
      ...Typography.caption,
      color: theme.textMuted,
    },
    orderItem: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      padding: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    orderNo: {
      ...Typography.smallMedium,
      color: theme.textPrimary,
      flex: 1,
      marginRight: Spacing.xs,
    },
    orderDate: {
      ...Typography.caption,
      color: theme.textMuted,
    },
    orderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderInfo: {
      flex: 1,
    },
    customerName: {
      ...Typography.captionMedium,
      color: theme.textSecondary,
    },
    noCustomer: {
      ...Typography.caption,
      color: theme.textMuted,
      fontStyle: 'italic',
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      backgroundColor: withAlpha(theme.primary, 0.06),
      borderRadius: BorderRadius.sm,
      gap: 3,
      minHeight: 36,
    },
    editBtnText: {
      ...Typography.captionMedium,
      color: theme.primary,
    },
    orderItemExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
    },
    orderHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: Spacing.xs,
    },
    // 物料列表样式
    materialsList: {
      backgroundColor: theme.backgroundDefault,
      borderBottomLeftRadius: BorderRadius.sm,
      borderBottomRightRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderTopWidth: 0,
      borderColor: theme.border,
      marginBottom: Spacing.xs,
      padding: Spacing.xs,
    },
    noMaterials: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    noMaterialsText: {
      fontSize: rf(12),
      color: theme.textMuted,
    },
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      padding: Spacing.xs + 2,
      marginBottom: Spacing.xs,
    },
    materialMainInfo: {
      flex: 1,
    },
    materialModel: {
      fontSize: rf(12),
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 1,
    },
    materialDetails: {
      fontSize: rf(11),
      color: theme.textSecondary,
      marginBottom: 1,
    },
    materialDate: {
      fontSize: rf(10),
      color: theme.textMuted,
    },
    // 拆包按钮
    unpackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.xs,
      backgroundColor: withAlpha(theme.primary, 0.06),
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.xs,
      gap: 2,
    },
    unpackBtnText: {
      fontSize: rf(11),
      fontWeight: '600',
      color: theme.primary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    emptyText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: Spacing.xs,
    },
    emptyTip: {
      fontSize: rf(11),
      color: theme.textMuted,
      marginTop: 1,
    },
    // Modal样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: rf(15),
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 1,
    },
    modalSubtitle: {
      fontSize: rf(12),
      color: theme.textSecondary,
      marginBottom: Spacing.sm,
    },
    modalInput: {
      fontSize: rf(14),
      fontWeight: '500',
      color: theme.textPrimary,
      paddingVertical: Spacing.xs + 2,
      paddingHorizontal: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: Spacing.sm,
      gap: Spacing.xs,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      paddingVertical: Spacing.xs + 2,
      alignItems: 'center',
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    modalCancelText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalSaveButton: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.sm,
      paddingVertical: Spacing.xs + 2,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
    // 单独关闭按钮样式
    modalCloseButton: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.sm,
      paddingVertical: Spacing.xs + 2,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    modalCloseText: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
    // 订单列表弹窗
    orderListContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      width: '100%',
      maxWidth: 340,
      maxHeight: '80%',
    },
    orderListItem: {
      paddingVertical: Spacing.xs + 2,
      borderBottomWidth: BorderWidth.normal,
      borderBottomColor: theme.border,
    },
    orderListItemLast: {
      borderBottomWidth: 0,
    },
    orderListItemNo: {
      fontSize: rf(13),
      fontWeight: '600',
      color: theme.textPrimary,
    },
    orderListItemInfo: {
      fontSize: rf(10),
      color: theme.textMuted,
      marginTop: 1,
    },
    // 仓库选择器弹窗样式
    pickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    pickerBox: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      width: '80%',
      maxWidth: 280,
    },
    pickerTitle: {
      fontSize: rf(15),
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
    },
    pickerItemActive: {
      backgroundColor: withAlpha(theme.primary, 0.1),
    },
    pickerItemText: {
      fontSize: rf(14),
      color: theme.textPrimary,
    },
    pickerClose: {
      marginTop: Spacing.sm,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderTopWidth: BorderWidth.normal,
      borderTopColor: theme.border,
    },
    pickerCloseText: {
      fontSize: rf(14),
      color: theme.textMuted,
    },
  });
};
