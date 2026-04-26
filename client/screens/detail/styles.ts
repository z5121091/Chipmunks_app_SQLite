import { Platform, StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme, BorderWidth } from '@/constants/theme';
import { withAlpha } from '@/utils/colors';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      padding: Spacing.md,
      paddingBottom: 80,
    },
    header: {
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    card: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      borderWidth: BorderWidth.thick,
      borderColor: theme.border,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    cardTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
    },
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    fieldColumn: {
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    fieldRowLast: {
      borderBottomWidth: 0,
    },
    fieldLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: Spacing.xs,
    },
    fieldValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
      flex: 1,
      textAlign: 'right',
    },
    fieldValueLong: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textPrimary,
      lineHeight: 20,
    },
    modelValue: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    rawContentCard: {
      marginTop: Spacing.md,
    },
    rawContentText: {
      fontSize: 11,
      color: theme.textMuted,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 16,
    },
    noDataText: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: Spacing.md,
    },
    actionsContainer: {
      marginTop: Spacing.lg,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
    secondaryButton: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.sm,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    dangerButton: {
      backgroundColor: theme.error,
    },
    dangerButtonText: {
      color: theme.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    errorText: {
      fontSize: 14,
      color: theme.error,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    backButton: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
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
      borderRadius: BorderRadius.lg,
      width: '100%',
      maxWidth: 360,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: BorderWidth.normal,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalBody: {
      padding: Spacing.md,
    },
    modalBodyContent: {
      paddingBottom: Spacing['3xl'],
    },
    formGroup: {
      marginBottom: Spacing.md,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textPrimary,
      marginBottom: Spacing.xs,
    },
    requiredMark: {
      color: theme.error,
    },
    formInput: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.sm,
      padding: Spacing.sm,
      fontSize: 14,
      color: theme.textPrimary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    optionButton: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    optionButtonActive: {
      backgroundColor: withAlpha(theme.primary, 0.08),
      borderColor: theme.primary,
    },
    optionButtonText: {
      fontSize: 13,
      color: theme.textPrimary,
    },
    optionButtonTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: Spacing.md,
      borderTopWidth: BorderWidth.normal,
      borderTopColor: theme.border,
      gap: Spacing.sm,
    },
    cancelButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    saveButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
  });
};
