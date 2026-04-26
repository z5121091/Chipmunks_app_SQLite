import { StyleSheet } from 'react-native';
import { withAlpha } from '@/utils/colors';
import { Spacing, BorderRadius, Theme, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing["4xl"],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    backButton: {
      padding: Spacing.sm,
      marginRight: Spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: rf(20),
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    sectionHeader: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: rf(12),
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    // 仓库卡片
    warehouseCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    warehouseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    warehouseInfo: {
      flex: 1,
    },
    warehouseName: {
      fontSize: rf(14),
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 2,
    },
    warehouseDesc: {
      fontSize: rf(12),
      color: theme.textMuted,
    },
    warehouseActions: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    actionButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultBadge: {
      backgroundColor: withAlpha(theme.primary, 0.08),
      paddingHorizontal: Spacing.sm,
      paddingVertical: 1,
      borderRadius: BorderRadius.sm,
      marginLeft: Spacing.xs,
    },
    defaultBadgeText: {
      fontSize: rf(10),
      color: theme.primary,
      fontWeight: '600',
    },
    // 添加按钮
    addButton: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    addButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: rf(14),
      fontWeight: '600',
    },
    // Modal
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
    inputLabel: {
      fontSize: rf(13),
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: Spacing.xs,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: Spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkboxText: {
      fontSize: rf(13),
      color: theme.textSecondary,
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
      color: theme.textSecondary,
      fontSize: rf(14),
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: theme.primary,
    },
    submitButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: rf(14),
      fontWeight: '600',
    },
    // 空状态
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing["2xl"],
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: rf(14),
      color: theme.textMuted,
      marginTop: Spacing.sm,
    },
    emptyTitle: {
      fontSize: rf(16),
      fontWeight: '600',
      color: theme.textPrimary,
      marginTop: Spacing.md,
    },
    emptyDesc: {
      fontSize: rf(13),
      color: theme.textMuted,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
  });
};
