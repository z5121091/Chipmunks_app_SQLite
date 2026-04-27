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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
    gap: Spacing.xs,
  },

  // 盘点类型选择器
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },

  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minHeight: 40,
  },

  typeBtnActive: {
    backgroundColor: theme.success,
  },

  typeBtnText: {
    ...Typography.bodyMedium,
    color: theme.textPrimary,
  },

  typeBtnTextActive: {
    color: theme.white,
  },

  // 已保存按钮
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    minHeight: 40,
  },

  savedBtnText: {
    ...Typography.bodyMedium,
    color: theme.textPrimary,
  },

  // 仓库按钮
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

  // 扫码框（包含输入框和 Toast）
  scanBox: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    height: rf(56),
    backgroundColor: theme.backgroundDefault,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden', // 隐藏超出的内容
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

  itemModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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

  itemCode: {
    ...Typography.caption,
    color: theme.textMuted,
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

  itemQtyLabel: {
    ...Typography.caption,
    color: theme.textMuted,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },

  actualRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 1,
  },

  actualLabel: {
    ...Typography.caption,
    color: theme.textMuted,
  },

  actualQty: {
    ...Typography.smallMedium,
    fontWeight: '700',
    color: theme.accent,
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

  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  emptyText: {
    ...Typography.body,
    color: theme.textMuted,
  },

  // 操作按钮
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },

  clearBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
  },

  clearBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textSecondary,
  },

  submitBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: theme.primary,
    alignItems: 'center',
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
    fontSize: rf(13),
    color: theme.textSecondary,
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
    width: '85%',
    maxWidth: 300,
  },

  modalTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },

  modalInput: {
    fontSize: rf(14),
    fontWeight: '500',
    color: theme.textPrimary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
  },

  modalCancelText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  modalConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },

  modalConfirmText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.buttonPrimaryText,
  },

  // 已保存记录弹窗样式
  savedEmptyText: {
    fontSize: rf(14),
    color: theme.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  savedList: {
    maxHeight: 300,
  },

  savedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  savedItemLeft: {
    flex: 1,
  },

  savedModel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  savedDate: {
    fontSize: rf(12),
    color: theme.textMuted,
    marginTop: 2,
  },

  savedItemRight: {
    alignItems: 'flex-end',
  },

  savedQty: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.primary,
  },

  // 已保存盘点弹窗
  modalInfo: {
    maxHeight: '70%',
  },

  savedModalContent: {
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '85%',
    maxWidth: 320,
  },

  savedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  savedModalTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
  },

  savedEmpty: {
    paddingVertical: Spacing.xl,
  },
});
