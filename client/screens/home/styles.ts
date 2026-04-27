import { StyleSheet } from 'react-native';
import { BorderRadius, BorderWidth, Spacing, Theme, Typography } from '@/constants/theme';

export const createStyles = (theme: Theme, screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth <= 410;
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const primaryGap = isSmallScreen ? 10 : 14;
  const secondaryGap = isSmallScreen ? 10 : 14;
  const secondaryCardWidth = (screenWidth - horizontalPadding * 2 - secondaryGap) / 2;
  const primaryCardHeight = Math.max(172, Math.min(screenHeight * 0.27, 230));
  const secondaryCardHeight = Math.max(118, Math.min(screenHeight * 0.17, 150));
  const primaryIconSize = isSmallScreen ? 76 : 84;
  const secondaryIconSize = isSmallScreen ? 50 : 56;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },

    content: {
      flexGrow: 1,
      minHeight: screenHeight - 24,
      paddingHorizontal: horizontalPadding,
      paddingTop: isSmallScreen ? 12 : 16,
      paddingBottom: isSmallScreen ? 16 : 24,
    },

    hero: {
      marginBottom: isSmallScreen ? Spacing.md : Spacing.lg,
    },

    heroEyebrow: {
      ...Typography.labelSmall,
      color: theme.textMuted,
      marginBottom: Spacing.xs,
    },

    heroTitle: {
      ...Typography.h2,
      color: theme.textPrimary,
      letterSpacing: 0.3,
    },

    workbench: {
      flex: 1,
      justifyContent: 'space-between',
      gap: isSmallScreen ? Spacing.md : Spacing.lg,
    },

    primarySection: {
      flexShrink: 0,
    },

    secondarySection: {
      flexShrink: 0,
    },

    sectionLabel: {
      ...Typography.captionMedium,
      color: theme.textSecondary,
      marginBottom: Spacing.sm,
      letterSpacing: 0.8,
    },

    primaryGrid: {
      flexDirection: 'row',
      gap: primaryGap,
    },

    primaryCard: {
      flex: 1,
      minHeight: primaryCardHeight,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      backgroundColor: theme.backgroundDefault,
      overflow: 'hidden',
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },

    primaryCardInner: {
      flex: 1,
      padding: isSmallScreen ? Spacing.md : Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryIconContainer: {
      width: primaryIconSize,
      height: primaryIconSize,
      borderRadius: primaryIconSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isSmallScreen ? Spacing.sm : Spacing.md,
    },

    primaryTitle: {
      ...Typography.h4,
      color: theme.textPrimary,
      letterSpacing: 0.2,
      textAlign: 'center',
    },

    primaryFooter: {
      marginTop: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: theme.backgroundTertiary,
    },

    primaryAction: {
      ...Typography.captionMedium,
      color: theme.textPrimary,
    },

    primaryAccent: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
    },

    secondaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: secondaryGap,
    },

    secondaryCard: {
      width: secondaryCardWidth,
      minHeight: secondaryCardHeight,
      borderRadius: BorderRadius.md,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      backgroundColor: theme.backgroundDefault,
    },

    secondaryCardInner: {
      flex: 1,
      padding: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    secondaryIconContainer: {
      width: secondaryIconSize,
      height: secondaryIconSize,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },

    secondaryTitle: {
      ...Typography.smallMedium,
      color: theme.textPrimary,
      textAlign: 'center',
    },

    secondaryFooter: {
      marginTop: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    secondaryAction: {
      ...Typography.caption,
      color: theme.textSecondary,
    },

  });
};
