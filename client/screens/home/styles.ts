import { StyleSheet } from 'react-native';
import { BorderRadius, BorderWidth, Spacing, Theme, Typography } from '@/constants/theme';

export const createStyles = (theme: Theme, screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth <= 410;
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const primaryGap = isSmallScreen ? 10 : 14;
  const secondaryGap = isSmallScreen ? 10 : 14;
  const secondaryCardWidth = (screenWidth - horizontalPadding * 2 - secondaryGap) / 2;
  const primaryCardHeight = Math.max(132, Math.min(screenHeight * 0.18, 164));
  const secondaryCardHeight = Math.max(88, Math.min(screenHeight * 0.12, 112));
  const primaryIconSize = isSmallScreen ? 52 : 58;
  const secondaryIconSize = isSmallScreen ? 36 : 40;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },

    content: {
      paddingHorizontal: horizontalPadding,
      paddingTop: isSmallScreen ? 14 : 18,
      paddingBottom: 24,
    },

    hero: {
      marginBottom: Spacing.md,
    },

    heroEyebrow: {
      ...Typography.labelSmall,
      color: theme.textMuted,
      marginBottom: Spacing.xs,
    },

    heroTitle: {
      ...Typography.h2,
      color: theme.textPrimary,
    },

    section: {
      marginBottom: Spacing.lg,
    },

    sectionLabel: {
      ...Typography.captionMedium,
      color: theme.textMuted,
      marginBottom: Spacing.sm,
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
    },

    primaryCardInner: {
      flex: 1,
      padding: Spacing.md,
    },

    primaryIconContainer: {
      width: primaryIconSize,
      height: primaryIconSize,
      borderRadius: primaryIconSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },

    primaryTitle: {
      ...Typography.h4,
      color: theme.textPrimary,
    },

    primaryFooter: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      padding: Spacing.sm,
      justifyContent: 'space-between',
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
    },

    secondaryFooter: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

  });
};
