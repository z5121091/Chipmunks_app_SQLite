import { StyleSheet } from 'react-native';
import { BorderRadius, BorderWidth, Spacing, Theme, Typography } from '@/constants/theme';

export const createStyles = (theme: Theme, screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth <= 410;
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const primaryGap = isSmallScreen ? 10 : 14;
  const secondaryGap = isSmallScreen ? 10 : 14;
  const secondaryCardWidth = (screenWidth - horizontalPadding * 2 - secondaryGap) / 2;
  const primaryCardHeight = Math.max(150, Math.min(screenHeight * 0.22, 188));
  const secondaryCardHeight = Math.max(116, Math.min(screenHeight * 0.16, 142));
  const primaryIconSize = isSmallScreen ? 56 : 64;
  const secondaryIconSize = isSmallScreen ? 42 : 46;

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
      marginBottom: Spacing.lg,
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

    heroSubtitle: {
      ...Typography.body,
      color: theme.textSecondary,
      marginTop: Spacing.xs,
    },

    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.md,
    },

    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundDefault,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },

    badgeText: {
      ...Typography.captionMedium,
      color: theme.textSecondary,
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
      borderRadius: BorderRadius.xl,
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

    primaryTextGroup: {
      gap: 4,
    },

    primaryTitle: {
      ...Typography.title,
      color: theme.textPrimary,
    },

    primaryDescription: {
      ...Typography.small,
      color: theme.textSecondary,
    },

    primaryFooter: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    primaryFooterText: {
      ...Typography.captionMedium,
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
      borderRadius: BorderRadius.lg,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
      backgroundColor: theme.backgroundDefault,
    },

    secondaryCardInner: {
      flex: 1,
      padding: Spacing.sm,
    },

    secondaryIconContainer: {
      width: secondaryIconSize,
      height: secondaryIconSize,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },

    secondaryTextGroup: {
      gap: 2,
    },

    secondaryTitle: {
      ...Typography.smallMedium,
      color: theme.textPrimary,
    },

    secondaryDescription: {
      ...Typography.caption,
      color: theme.textSecondary,
    },

    secondaryFooter: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    secondaryFooterText: {
      ...Typography.captionMedium,
    },
  });
};
