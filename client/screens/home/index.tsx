import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { initDatabase, getAllMaterials } from '@/utils/database';
import { ModuleColors } from '@/constants/theme';
import { Str } from '@/resources/strings';
import { WarehouseGuide, shouldShowWarehouseGuide, markWarehouseGuideShown } from '@/components/WarehouseGuide';

// 模块定义
interface Module {
  id: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
}

// 模块组件（性能优化版本 - 移除动画以提升低配设备性能）
const ModuleCard = React.memo<{
  module: Module;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}>(({ module, styles, onPress }) => {
  // 根据模块名称计算图标大小比例
  const iconSizeMultiplier = module.name.length > 4 ? 0.42 : 0.5;
  const iconSize = Math.floor(styles.moduleIconContainer.width * iconSizeMultiplier);

  return (
    <TouchableOpacity
      style={styles.moduleCard}
      activeOpacity={0.7}  // 使用 activeOpacity 提供点击反馈
      onPress={onPress}
    >
      <View style={[styles.moduleCardInner]}>
        <View style={[styles.moduleIconContainer, { backgroundColor: module.color + '18' }]}>
          <Feather
            name={module.icon}
            size={iconSize}
            color={module.color}
          />
        </View>
        <Text style={styles.moduleName} numberOfLines={1}>
          {module.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  return (
    prevProps.module.id === nextProps.module.id &&
    prevProps.module.name === nextProps.module.name &&
    prevProps.module.route === nextProps.module.route
  );
});

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const [screenHeight, setScreenHeight] = React.useState(Dimensions.get('window').height);
  const [screenWidth, setScreenWidth] = React.useState(Dimensions.get('window').width);

  // 仓库引导状态
  const [showWarehouseGuide, setShowWarehouseGuide] = useState(false);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const styles = useMemo(() => createStyles(theme, screenWidth, screenHeight), [theme, screenHeight, screenWidth]);

  // 初始化数据库
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  // 检查是否需要显示仓库引导（仅在首次安装时）
  useEffect(() => {
    const checkWarehouseGuide = async () => {
      try {
        const materials = await getAllMaterials();
        const needsGuide = await shouldShowWarehouseGuide(materials.length > 0);
        if (needsGuide) {
          setShowWarehouseGuide(true);
        }
      } catch (error) {
        console.error('[首页] 检查仓库引导失败:', error);
      }
    };
    checkWarehouseGuide();
  }, []);

  // 6种主题色（从统一配置读取）
  const moduleColors = theme.isDark ? [
    ModuleColors.dark.inbound,
    ModuleColors.dark.outbound,
    ModuleColors.dark.orders,
    ModuleColors.dark.inventory,
    ModuleColors.dark.materials,
    ModuleColors.dark.settings,
  ] : [
    ModuleColors.light.inbound,
    ModuleColors.light.outbound,
    ModuleColors.light.orders,
    ModuleColors.light.inventory,
    ModuleColors.light.materials,
    ModuleColors.light.settings,
  ];

  // 功能模块列表
  const modules: Module[] = [
    {
      id: 'inbound',
      name: Str.moduleInbound,
      icon: 'archive',
      color: moduleColors[0],
      route: '/inbound',
    },
    {
      id: 'outbound',
      name: Str.moduleOutbound,
      icon: 'send',
      color: moduleColors[1],
      route: '/outbound',
    },
    {
      id: 'orders',
      name: Str.moduleOrders,
      icon: 'file-text',
      color: moduleColors[2],
      route: '/orders',
    },
    {
      id: 'inventory',
      name: Str.moduleInventory,
      icon: 'clipboard',
      color: moduleColors[3],
      route: '/inventory',
    },
    {
      id: 'material',
      name: Str.moduleMaterials,
      icon: 'link',
      color: moduleColors[4],
      route: '/inventory-binding',
    },
    {
      id: 'settings',
      name: Str.moduleSettings,
      icon: 'settings',
      color: moduleColors[5],
      route: '/settings',
    },
  ];

  // 渲染模块卡片
  const renderModuleCard = useCallback((module: Module) => (
    <ModuleCard
      key={module.id}
      module={module}
      styles={styles}
      onPress={() => router.push(module.route as any)}
    />
  ), [styles, router]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 功能模块区域 - 自适应撑满全屏 */}
        <View style={styles.modulesGrid}>
          {modules.map(renderModuleCard)}
        </View>
      </View>

      {/* 仓库引导（仅在首次安装时显示） */}
      <WarehouseGuide
        visible={showWarehouseGuide}
        onSkip={() => {
          setShowWarehouseGuide(false);
          markWarehouseGuideShown();
        }}
        onGoToSettings={() => {
          setShowWarehouseGuide(false);
          markWarehouseGuideShown();
          router.push('/warehouse-management');
        }}
      />
    </Screen>
  );
}
