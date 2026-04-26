/**
 * 统一颜色资源 - 模拟 Android @color
 * 所有颜色必须从此处引用，禁止硬编码
 * 
 * 使用方式：
 * - 静态引用: Colors.success, Colors.primary
 * - 半透明: withAlpha(Colors.success, 0.1)
 * - 主题色: useTheme().theme.success
 */

import { Platform, useColorScheme } from 'react-native';

// ============================================
// 颜色定义
// ============================================

// 基础文字色
const textPrimary = {
  light: '#111111',
  dark: '#FFFFFF',
} as const;

const textSecondary = {
  light: '#525252',
  dark: '#D4D4D4',
} as const;

const textMuted = {
  light: '#78716C',
  dark: '#A3A3A3',
} as const;

// 主色调
const primary = {
  light: '#111111',
  dark: '#FFFFFF',
} as const;

const accent = {
  light: '#FF4444',
  dark: '#FF6B6B',
} as const;

// 状态色
const success = {
  light: '#10B981',
  dark: '#34D399',
} as const;

const error = {
  light: '#EF4444',
  dark: '#F87171',
} as const;

const warning = {
  light: '#F59E0B',
  dark: '#FBBF24',
} as const;

const info = {
  light: '#3B82F6',
  dark: '#60A5FA',
} as const;

// 功能色
const purple = {
  light: '#8B5CF6',
  dark: '#A78BFA',
} as const;

const cyan = {
  light: '#06B6D4',
  dark: '#22D3EE',
} as const;

// 背景色
const backgroundRoot = {
  light: '#FFFFFF',
  dark: '#0A0A0A',
} as const;

const backgroundDefault = {
  light: '#FFFFFF',
  dark: '#171717',
} as const;

const backgroundTertiary = {
  light: '#F7F7F7',
  dark: '#262626',
} as const;

// 边框色
const border = {
  light: '#E5E5E5',
  dark: '#404040',
} as const;

const borderLight = {
  light: '#F5F5F5',
  dark: '#262626',
} as const;

// ============================================
// 颜色工具函数
// ============================================

// 颜色转换工具
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

// 获取颜色（基于系统主题）
const getThemeColor = (
  lightColor: string,
  darkColor: string
): string => {
  // 默认使用浅色，通过 useColorScheme 动态获取
  // 注意：在 StyleSheet.create 外部调用时返回默认值
  const colorScheme = useColorScheme?.() ?? 'light';
  return colorScheme === 'dark' ? darkColor : lightColor;
};

// ============================================
// 半透明颜色工厂函数
// ============================================

// Android 7.0 及以下不支持透明色
const isLowAndroid = Platform.OS === 'android' && Number(Platform.Version) <= 24;

/**
 * 创建带透明度的颜色
 * @param hex 基础颜色（#RRGGBB 格式）
 * @param alpha 透明度（0-1）
 */
export const withAlpha = (hex: string, alpha: number): string => {
  if (isLowAndroid) {
    return hex;
  }
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 创建白色带透明度
 */
export const whiteAlpha = (alpha: number): string => {
  return withAlpha('#FFFFFF', alpha);
};

/**
 * 创建黑色带透明度
 */
export const blackAlpha = (alpha: number): string => {
  return withAlpha('#000000', alpha);
};

/**
 * 创建主题色带透明度
 */
export const colorAlpha = (color: string, alpha: number): string => {
  return withAlpha(color, alpha);
};

// ============================================
// 颜色资源导出（静态值，用于 theme.ts）
// ============================================

// 浅色主题颜色
export const LightColors = {
  text: {
    primary: textPrimary.light,
    secondary: textSecondary.light,
    muted: textMuted.light,
  },
  primary: primary.light,
  accent: accent.light,
  success: success.light,
  error: error.light,
  warning: warning.light,
  info: info.light,
  purple: purple.light,
  cyan: cyan.light,
  background: {
    root: backgroundRoot.light,
    default: backgroundDefault.light,
    tertiary: backgroundTertiary.light,
  },
  border: {
    default: border.light,
    light: borderLight.light,
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    extraLight: 'rgba(0, 0, 0, 0.3)',
  },
  tag: {
    blue: info.light,
    green: success.light,
    orange: warning.light,
    purple: purple.light,
    cyan: cyan.light,
    gray: {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
  },
  module: {
    inbound: success.light,
    outbound: info.light,
    orders: warning.light,
    inventory: error.light,
    materials: purple.light,
    settings: {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
  },
  button: {
    primary: '#FFFFFF',
    secondary: textPrimary.light,
  },
  shadow: '#000000',
} as const;

// 深色主题颜色
export const DarkColors = {
  text: {
    primary: textPrimary.dark,
    secondary: textSecondary.dark,
    muted: textMuted.dark,
  },
  primary: primary.dark,
  accent: accent.dark,
  success: success.dark,
  error: error.dark,
  warning: warning.dark,
  info: info.dark,
  purple: purple.dark,
  cyan: cyan.dark,
  background: {
    root: backgroundRoot.dark,
    default: backgroundDefault.dark,
    tertiary: backgroundTertiary.dark,
  },
  border: {
    default: border.dark,
    light: borderLight.dark,
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    extraLight: 'rgba(0, 0, 0, 0.3)',
  },
  tag: {
    blue: info.dark,
    green: success.dark,
    orange: warning.dark,
    purple: purple.dark,
    cyan: cyan.dark,
    gray: {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
  },
  module: {
    inbound: success.dark,
    outbound: info.dark,
    orders: warning.dark,
    inventory: error.dark,
    materials: purple.dark,
    settings: {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
  },
  button: {
    primary: '#0A0A0A',
    secondary: textPrimary.dark,
  },
  shadow: '#000000',
} as const;

// 默认导出浅色主题（运行时会被 useTheme 覆盖）
export const Colors = LightColors;

// ============================================
// 预设颜色组合
// ============================================

// 状态背景色（浅色背景配深色文字）
export const StatusBgColors = {
  success: withAlpha(success.light, 0.1),
  error: withAlpha(error.light, 0.1),
  warning: withAlpha(warning.light, 0.1),
  info: withAlpha(info.light, 0.1),
} as const;

// 状态边框色
export const StatusBorderColors = {
  success: withAlpha(success.light, 0.2),
  error: withAlpha(error.light, 0.2),
  warning: withAlpha(warning.light, 0.2),
  info: withAlpha(info.light, 0.2),
} as const;

// 类型导出
export type ColorKey = keyof typeof LightColors;
export type LightColorTheme = typeof LightColors;
export type DarkColorTheme = typeof DarkColors;
