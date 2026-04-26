import { StyleSheet } from 'react-native';
import { withAlpha } from '@/utils/colors';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.sm,
      paddingBottom: Spacing["2xl"],
    },
    emptyContainer: {
      flexGrow: 1,
    },
    // 头部
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    backButton: {
      padding: Spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    // 顶部区域：统计 + 按钮
    topSection: {
      marginBottom: Spacing.md,
    },
    statsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    statsNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    statsLabel: {
      fontSize: 14,
      color: theme.textMuted,
    },
    // 操作按钮
    actionButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundDefault,
    },
    actionBtnText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    actionBtnPrimary: {
      backgroundColor: theme.primary,
    },
    actionBtnPrimaryText: {
      color: theme.buttonPrimaryText,
      fontWeight: '600',
    },
    // 列表区域
    listSection: {
      flex: 1,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    listTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    addSmallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: withAlpha(theme.primary, 0.07),
    },
    addSmallBtnText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    listContent: {
      gap: Spacing.xs,
    },
    // 绑定卡片
    bindingCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
    },
    bindingMain: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bindingInfo: {
      flex: 1,
    },
    // 型号行
    modelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    bindingModel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
      flex: 1,
    },
    supplierBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 1,
      borderRadius: 4,
      maxWidth: 100,
    },
    supplierBadgeText: {
      fontSize: 10,
      fontWeight: '500',
    },
    // 编码行
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    // 供应商行
    supplierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    supplierText: {
      fontSize: 11,
      color: theme.accent,
      flex: 1,
    },
    bindingCode: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: '500',
      flex: 1,
    },
    // 操作列
    actionColumn: {
      flexDirection: 'row',
      gap: 4,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    // 空状态
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing["2xl"],
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: Spacing.sm,
      marginBottom: 2,
    },
    emptyDesc: {
      fontSize: 12,
      color: theme.textMuted,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.md,
      width: '100%',
      maxWidth: 360,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    formGroup: {
      marginBottom: Spacing.sm,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: 4,
    },
    required: {
      color: theme.error,
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: 14,
      color: theme.textPrimary,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelBtnText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    submitBtn: {
      backgroundColor: theme.primary,
    },
    submitBtnText: {
      color: theme.buttonPrimaryText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
};
