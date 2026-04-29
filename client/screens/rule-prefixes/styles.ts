import { StyleSheet } from 'react-native';
import { BorderRadius, BorderWidth, Spacing, Theme } from '@/constants-theme';
import { withAlpha } from '@/utils/colors';
import { rf, rs } from '@/utils/responsive';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: theme.backgroundDefault,
    borderBottomWidth: BorderWidth.normal,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: rs(44),
    height: rs(44),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: rf(20),
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyListContent: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: withAlpha(theme.success, 0.08),
    borderWidth: BorderWidth.normal,
    borderColor: withAlpha(theme.success, 0.22),
  },
  infoIcon: {
    width: rs(34),
    height: rs(34),
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withAlpha(theme.success, 0.12),
  },
  infoText: {
    flex: 1,
    fontSize: rf(13),
    lineHeight: rf(19),
    color: theme.textSecondary,
  },
  ruleCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: theme.backgroundDefault,
    borderWidth: BorderWidth.thick,
    borderColor: theme.border,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ruleTitleWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  ruleName: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  ruleDescription: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: theme.textMuted,
  },
  ruleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: theme.backgroundTertiary,
  },
  metaText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: theme.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  disabledBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: withAlpha(theme.error, 0.12),
    borderWidth: BorderWidth.normal,
    borderColor: withAlpha(theme.error, 0.24),
  },
  disabledBadgeText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: theme.error,
  },
  prefixBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: withAlpha(theme.success, 0.12),
    borderWidth: BorderWidth.normal,
    borderColor: withAlpha(theme.success, 0.24),
  },
  prefixBadgeText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: theme.success,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: rs(60),
    height: rs(60),
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.backgroundTertiary,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: rf(13),
    color: theme.textMuted,
  },
  itemGap: {
    height: Spacing.sm,
  },
});
