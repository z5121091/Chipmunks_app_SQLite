import { StyleSheet } from 'react-native';
import { withAlpha } from '@/utils/colors';
import { Spacing, BorderRadius, Theme, Typography } from '@/constants/theme';
import { rf } from '@/utils/responsive';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: theme.backgroundDefault,
  },

  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    ...Typography.h4,
    color: theme.textPrimary,
  },

  // 顶栏
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
    gap: Spacing.xs,
  },

  warehouseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    minHeight: 40,
  },

  warehouseText: {
    ...Typography.captionMedium,
    color: theme.textPrimary,
    maxWidth: 96,
    flexShrink: 1,
  },

  orderTag: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minHeight: 40,
    justifyContent: 'center',
  },

  orderTagActive: {
    backgroundColor: theme.success,
  },

  orderText: {
    ...Typography.bodyMedium,
    color: theme.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  orderTextActive: {
    color: theme.white,
  },

  // 扫码框（包含输入框和 Toast）
  scanBox: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    height: rf(60),
    backgroundColor: theme.backgroundDefault,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden', // 隐藏超出的内容
  },

  scanBoxActive: {
    borderColor: theme.success,
    backgroundColor: withAlpha(theme.success, 0.06),
  },

  scanInput: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent', // 透明，让容器背景显示
    paddingHorizontal: Spacing.lg,
    ...Typography.h4,
    color: theme.textPrimary,
    textAlign: 'center',
  },

  // Toast（完全覆盖在输入框上面）
  toast: {
    ...StyleSheet.absoluteFillObject, // top:0, left:0, right:0, bottom:0
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // 在输入框上面
  },

  toastSuccess: { backgroundColor: theme.success },
  toastWarning: { backgroundColor: theme.warning },
  toastError: { backgroundColor: theme.error },

  toastText: {
    ...Typography.bodyMedium,
    color: theme.white,
    textAlign: 'center',
  },

  // 列表
  listSection: {
    flex: 1,
    marginTop: Spacing.md,
    backgroundColor: theme.backgroundDefault,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: Spacing.sm,
  },

  listTitle: {
    ...Typography.captionMedium,
    color: theme.textSecondary,
  },

  listCount: {
    ...Typography.captionMedium,
    color: theme.primary,
    flexShrink: 1,
    textAlign: 'right',
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: Spacing.md,
  },

  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // 聚合项容器
  itemContainer: {
    marginBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
  },

  // 聚合项主行（两行布局：型号 + 版本/数量）
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundDefault,
  },

  itemLeft: {
    flex: 1,
  },

  itemModel: {
    ...Typography.smallMedium,
    color: theme.textPrimary,
  },

  itemBatch: {
    ...Typography.caption,
    color: theme.textSecondary,
    marginTop: 1,
  },

  itemRight: {
    alignItems: 'flex-end',
  },

  itemQty: {
    ...Typography.title,
    fontWeight: '700',
    color: theme.primary,
  },

  itemTime: {
    ...Typography.caption,
    color: theme.textMuted,
    marginTop: 1,
  },

  // 明细容器
  detailsContainer: {
    backgroundColor: theme.backgroundTertiary,
    marginLeft: Spacing.xl,
    marginRight: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  detailItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  detailText: {
    ...Typography.caption,
    color: theme.textSecondary,
    lineHeight: Typography.small.lineHeight,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  emptyText: {
    ...Typography.body,
    color: theme.textMuted,
  },

  // 仓库选择器
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pickerBox: {
    width: '80%',
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },

  pickerTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
    backgroundColor: withAlpha(theme.primary, 0.06),
  },

  pickerItemText: {
    fontSize: rf(14),
    color: theme.textPrimary,
  },

  pickerClose: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },

  pickerCloseText: {
    fontSize: rf(14),
    color: theme.textSecondary,
  },
});
