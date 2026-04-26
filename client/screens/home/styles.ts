import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { rf } from '@/utils/responsive';
import { withAlpha } from '@/utils/colors';

export const createStyles = (theme: Theme, screenWidth: number, screenHeight: number) => {
  // 屏幕尺寸
  const screenH = screenHeight;
  const screenW = screenWidth;

  // 判断是否为小屏幕PDA（400×800等4寸屏）
  const isSmallScreen = screenW <= 410;

  // 布局配置 - 根据屏幕大小自适应，最大化利用屏幕空间
  const marginHorizontal = isSmallScreen ? 8 : 12;  // 减少左右留白
  const marginTop = isSmallScreen ? 12 : 16;        // 减少顶部留白
  const marginBottom = isSmallScreen ? 8 : 12;      // 减少底部留白

  // 可用尺寸
  const availableWidth = screenW - marginHorizontal * 2;
  const availableHeight = screenH - marginTop - marginBottom;

  // 3行2列布局
  const cols = 2;
  const rows = 3;

  // 统一间距 - 减少间距以充分利用屏幕
  const gap = isSmallScreen ? 8 : 12;

  // 计算每个模块的尺寸（均匀分布）
  const moduleWidth = (availableWidth - gap * (cols - 1)) / cols;
  const moduleHeight = (availableHeight - gap * (rows - 1)) / rows;

  // 图标容器尺寸（占模块宽度的50%，居中显示）
  const iconContainerSize = Math.min(moduleWidth * 0.5, moduleHeight * 0.45);
  const iconSize = Math.floor(iconContainerSize * (isSmallScreen ? 0.42 : 0.45));

  // 文字大小 - 小屏幕适当缩小
  const titleSize = isSmallScreen
    ? Math.max(14, Math.min(moduleWidth * 0.11, 18))
    : Math.max(18, Math.min(moduleWidth * 0.11, 22));

  return StyleSheet.create({
    container: {
      flex: 1,
      marginHorizontal: marginHorizontal,
      marginTop: marginTop,
      marginBottom: marginBottom,
      backgroundColor: theme.backgroundRoot,
    },

    // 模块网格区域
    modulesGrid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignContent: 'flex-start',
    },

    // 模块卡片 - 极简设计，有边框区分
    moduleCard: {
      width: moduleWidth,
      height: moduleHeight,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      paddingHorizontal: Spacing.sm,
      // 重边框区分模块
      borderWidth: 2,
      borderColor: theme.border,
    },

    // 模块卡片内层（用于动画）
    moduleCardInner: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // 图标容器 - 彩色圆形背景
    moduleIconContainer: {
      width: iconContainerSize,
      height: iconContainerSize,
      borderRadius: iconContainerSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },

    // 模块标题
    moduleName: {
      fontSize: titleSize,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
    },
  });
};
