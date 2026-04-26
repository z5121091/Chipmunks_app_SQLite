import React, { useRef, useMemo } from 'react';
import {
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';

interface AnimatedCardProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

export function AnimatedCard({
  onPress,
  onLongPress,
  children,
  style,
  disabled = false,
}: AnimatedCardProps) {
  // 使用 useMemo 创建 Animated.Value，避免 ESLint 报错
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const shadowAnim = useMemo(() => new Animated.Value(0), []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        disabled={disabled || (!onPress && !onLongPress)}
        style={{ width: '100%' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
