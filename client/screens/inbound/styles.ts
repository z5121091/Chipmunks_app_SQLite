import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme, Typography } from '@/constants/theme';
import { withAlpha } from '@/utils/colors';
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

  supplierTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minHeight: 40,
  },

  supplierTagActive: {
    backgroundColor: theme.success,
  },

  supplierText: {
    ...Typography.bodyMedium,
    color: theme.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },

  supplierTextActive: {
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
    overflow: 'hidden',
  },

  scanBoxActive: {
    borderColor: theme.success,
    backgroundColor: withAlpha(theme.success, 0.06),
  },

  scanInput: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    ...Typography.h4,
    color: theme.textPrimary,
    textAlign: 'center',
  },

  // Toast（完全覆盖在输入框上面）
  toast: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  toastSuccess: { backgroundColor: theme.success },
  toastWarning: { backgroundColor: theme.warning },
  toastError: { backgroundColor: theme.error },

  toastText: {
    ...Typography.bodyMedium,
    color: theme.white,
    textAlign: 'center',
  },

  // 入库单标签
  inboundNoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },

  inboundNoText: {
    ...Typography.captionMedium,
    color: theme.textPrimary,
    marginRight: Spacing.xs,
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
  },

  listTitle: {
    ...Typography.captionMedium,
    color: theme.textSecondary,
  },

  listCount: {
    ...Typography.captionMedium,
    color: theme.primary,
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

  // 空状态
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },

  emptyText: {
    ...Typography.body,
    color: theme.textMuted,
    marginTop: Spacing.md,
  },

  // 已确认状态的样式
  itemConfirmed: {
    backgroundColor: withAlpha(theme.success, 0.15),
  },

  itemModelConfirmed: {
    color: theme.success,
  },

  itemTime: {
    ...Typography.caption,
    color: theme.textMuted,
    marginTop: 1,
  },

  // 聚合项容器
  itemContainer: {
    marginBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
  },

  // 聚合项主行（两行布局）
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundDefault,
  },

  // 左侧区域（勾选框 + 型号 + 版本号）
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 勾选框
  checkbox: {
    marginRight: rf(6),
  },

  // 型号内容区域
  modelContent: {
    flex: 1,
  },

  // 型号文字
  itemModel: {
    ...Typography.smallMedium,
    color: theme.textPrimary,
  },

  // 版本号（第二行）
  itemBatch: {
    ...Typography.caption,
    color: theme.textSecondary,
    marginTop: 1,
  },

  // 数量（右侧）
  itemQty: {
    ...Typography.title,
    fontWeight: '700',
    color: theme.primary,
    marginLeft: Spacing.sm,
  },

  itemQtyConfirmed: {
    color: theme.success,
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

  // 明细项
  detailItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.sm,
  },

  // 明细文本
  detailText: {
    ...Typography.caption,
    color: theme.textSecondary,
    lineHeight: Typography.small.lineHeight,
  },

  // 操作按钮
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: theme.backgroundDefault,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    gap: Spacing.sm,
  },

  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: rf(56),
    paddingVertical: Spacing.md,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.lg,
  },

  clearBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textSecondary,
  },

  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: rf(56),
    paddingVertical: Spacing.md,
    backgroundColor: theme.primary,
    borderRadius: BorderRadius.lg,
  },

  submitBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.buttonPrimaryText,
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
    zIndex: 100,
  },

  pickerBox: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },

  pickerTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },

  pickerItemActive: {
    backgroundColor: withAlpha(theme.primary, 0.1),
  },

  pickerItemText: {
    fontSize: rf(14),
    color: theme.textPrimary,
  },

  pickerClose: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },

  pickerCloseText: {
    fontSize: rf(14),
    color: theme.textSecondary,
  },

  // 已保存入库按钮
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minHeight: 40,
  },

  savedBtnText: {
    ...Typography.captionMedium,
    color: theme.textPrimary,
  },

  // 已保存入库弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },

  savedModalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  savedModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  savedModalTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
  },

  savedEmpty: {
    padding: Spacing.xl,
    alignItems: 'center',
  },

  savedEmptyText: {
    fontSize: rf(14),
    color: theme.textSecondary,
  },

  savedList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },

  savedItemLeft: {
    flex: 1,
  },

  savedModel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 2,
  },

  savedVersion: {
    fontSize: rf(12),
    color: theme.textSecondary,
  },

  savedItemRight: {
    alignItems: 'flex-end',
  },

  savedQty: {
    fontSize: rf(14),
    fontWeight: '700',
    color: theme.primary,
  },
});
