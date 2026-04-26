/**
 * Toast 提示工具
 * 统一的提示反馈组件
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rf } from '@/utils/responsive';

// Toast 类型
type ToastType = 'success' | 'warning' | 'error';

// 主题色
const ToastColors = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

// ============================================================================
// Toast Hook - 页面使用
// ============================================================================

interface ToastOptions {
  duration?: number; // 显示时长，默认 500ms
  animationDuration?: number; // 动画时长，默认 100ms
}

interface UseToastReturn {
  showToast: (text: string, type?: ToastType) => void;
  ToastContainer: React.FC;
}

/**
 * Toast Hook
 * 
 * @example
 * function MyScreen() {
 *   const { showToast, ToastContainer } = useToast();
 *   
 *   const handleClick = () => {
 *     showToast('操作成功', 'success');
 *   };
 *   
 *   return (
 *     <View>
 *       <Button title="点击" onPress={handleClick} />
 *       <ToastContainer />
 *     </View>
 *   );
 * }
 */
export function useToast(options: ToastOptions = {}): UseToastReturn {
  const { duration = 500, animationDuration = 100 } = options;
  
  const [text, setText] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: animationDuration,
      useNativeDriver: false,
    }).start(() => {
      setVisible(false);
      setText('');
    });
  }, [anim, animationDuration]);

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setText(msg);
    setType(toastType);
    setVisible(true);
    
    Animated.timing(anim, {
      toValue: 1,
      duration: animationDuration,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(hideToast, duration);
  }, [anim, duration, animationDuration, hideToast]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const ToastContainer: React.FC = useCallback(() => {
    if (!visible) return null;

    const backgroundColor = ToastColors[type];

    return (
      <Animated.View
        style={[
          styles.toastContainer,
          { opacity: anim, backgroundColor },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{text}</Text>
      </Animated.View>
    );
  }, [visible, type, text, anim]);

  return { showToast, ToastContainer };
}

// ============================================================================
// 全局 Toast（可选，不推荐使用）
// ============================================================================

// 全局状态（简单实现）
let globalShowToast: ((text: string, type?: ToastType) => void) | null = null;

/**
 * 设置全局 Toast 函数
 * 用于无法使用 Hook 的场景（如回调函数）
 */
export function setGlobalToast(showFn: (text: string, type?: ToastType) => void) {
  globalShowToast = showFn;
}

/**
 * 显示全局 Toast
 */
export function toast(text: string, type: ToastType = 'success') {
  if (globalShowToast) {
    globalShowToast(text, type);
  }
}

// ============================================================================
// 样式
// ============================================================================

const styles = StyleSheet.create({
  toastContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  toastText: {
    color: ToastColors.white,
    fontSize: rf(16),
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: rf(20),
  },
});
