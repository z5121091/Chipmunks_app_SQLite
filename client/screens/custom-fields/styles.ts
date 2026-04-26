import { StyleSheet } from 'react-native';
import { withAlpha } from '@/utils/colors';
import { Spacing, BorderRadius, Theme, BorderWidth } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      padding: Spacing.md,
      paddingBottom: 100,
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
      fontSize: 20,
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing["4xl"],
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    addButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
    fieldItem: {
      padding: Spacing.md,
    },
    fieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    fieldName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    fieldType: {
      fontSize: 11,
      color: theme.textMuted,
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 1,
      borderRadius: BorderRadius.sm,
    },
    fieldMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    fieldTag: {
      fontSize: 11,
      color: theme.textSecondary,
      marginRight: Spacing.xs,
    },
    requiredTag: {
      fontSize: 11,
      color: theme.error,
    },
    optionsContainer: {
      marginTop: Spacing.xs,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    optionTag: {
      fontSize: 11,
      color: theme.textSecondary,
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 1,
      borderRadius: BorderRadius.sm,
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
    modalCloseButton: {
      padding: Spacing.xs,
    },
    modalBody: {
      padding: Spacing.md,
    },
    modalBodyContent: {
      paddingBottom: Spacing['2xl'],
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
    formInput: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.sm + 2,
      fontSize: 14,
      color: theme.textPrimary,
    },
    formInputError: {
      borderWidth: 1,
      borderColor: theme.error,
    },
    typeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    typeButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    typeButtonActive: {
      backgroundColor: withAlpha(theme.primary, 0.08),
      borderColor: theme.primary,
    },
    typeButtonText: {
      fontSize: 13,
      color: theme.textPrimary,
    },
    typeButtonTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    checkboxLabel: {
      fontSize: 13,
      color: theme.textPrimary,
    },
    optionsInputContainer: {
      marginTop: Spacing.xs,
    },
    optionsHint: {
      fontSize: 11,
      color: theme.textMuted,
      marginBottom: Spacing.xs,
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
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    cancelButtonText: {
      fontSize: 13,
      color: theme.textPrimary,
    },
    saveButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.buttonPrimaryText,
    },
  });
};
