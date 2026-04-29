import { StyleSheet } from 'react-native';
import { BorderRadius, BorderWidth, Spacing, Theme } from '@/constants/theme';
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
  },
  emptyListContent: {
    flexGrow: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: withAlpha(theme.success, 0.08),
    borderRadius: BorderRadius.lg,
    borderWidth: BorderWidth.normal,
    borderColor: withAlpha(theme.success, 0.2),
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
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    borderWidth: BorderWidth.thick,
    borderColor: theme.border,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ruleTitleWrap: {
    flex: 1,
  },
  ruleName: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 3,
  },
  ruleDescription: {
    fontSize: rf(12),
    lineHeight: rf(17),
    color: theme.textMuted,
  },
  ruleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: theme.backgroundTertiary,
  },
  metaText: {
    fontSize: rf(11),
    color: theme.textSecondary,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  disabledBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: withAlpha(theme.warning, 0.12),
  },
  disabledBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: theme.warning,
  },
  prefixBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: withAlpha(theme.success, 0.12),
  },
  prefixBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: theme.success,
  },
  itemGap: {
    height: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyIcon: {
    width: rs(64),
    height: rs(64),
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.backgroundTertiary,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: rf(13),
    color: theme.textMuted,
  },
});
