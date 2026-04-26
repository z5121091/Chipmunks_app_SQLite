import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { getSpacing, rs } from '@/utils/responsive';

interface ModuleCardProps {
  module: {
    id: string;
    name: string;
    icon: any;
    color: string;
    route: string;
  };
  styles: any;
  onPress: () => void;
}

/**
 * 性能优化版本：使用 Animated.Value 代替 useSharedValue
 * 在低配设备上性能更好
 */
export const ModuleCard: React.FC<ModuleCardProps> = React.memo(({ module, styles, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,  // 缩短动画时间
      useNativeDriver: true,  // 使用原生驱动
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,  // 使用原生驱动
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.moduleCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}  // 禁用默认的 activeOpacity，避免双重效果
        testID={`module-${module.id}`}
      >
        <View style={[styles.moduleIcon, { backgroundColor: `${module.color}15` }]}>
          <Feather name={module.icon as any} size={rs(24)} color={module.color} />
        </View>
        <Text style={styles.moduleName}>{module.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  return (
    prevProps.module.id === nextProps.module.id &&
    prevProps.module.name === nextProps.module.name &&
    prevProps.module.route === nextProps.module.route
  );
});

export default ModuleCard;
