import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
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

interface Module {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
  priority: 'primary' | 'secondary';
}

const HomeModuleCard = React.memo<{
  module: Module;
  variant: 'primary' | 'secondary';
  styles: ReturnType<typeof createStyles>;
  screenWidth: number;
  onPress: () => void;
}>(({ module, variant, styles, screenWidth, onPress }) => {
  const isPrimary = variant === 'primary';
  const iconSize = isPrimary
    ? (screenWidth <= 410 ? 28 : 32)
    : (screenWidth <= 410 ? 20 : 24);

  return (
    <TouchableOpacity
      style={isPrimary ? [styles.primaryCard, { borderColor: module.color }] : styles.secondaryCard}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View style={isPrimary ? styles.primaryCardInner : styles.secondaryCardInner}>
        <View
          style={[
            isPrimary ? styles.primaryIconContainer : styles.secondaryIconContainer,
            { backgroundColor: `${module.color}18` },
          ]}
        >
          <Feather name={module.icon} size={iconSize} color={module.color} />
        </View>

        <View style={isPrimary ? styles.primaryTextGroup : styles.secondaryTextGroup}>
          <Text style={isPrimary ? styles.primaryTitle : styles.secondaryTitle} numberOfLines={1}>
            {module.name}
          </Text>
          <Text
            style={isPrimary ? styles.primaryDescription : styles.secondaryDescription}
            numberOfLines={isPrimary ? 2 : 1}
          >
            {module.description}
          </Text>
        </View>

        <View style={isPrimary ? styles.primaryFooter : styles.secondaryFooter}>
          <Text style={[isPrimary ? styles.primaryFooterText : styles.secondaryFooterText, { color: module.color }]}>
            {isPrimary ? '立即开始' : '进入模块'}
          </Text>
          <Feather name="arrow-up-right" size={isPrimary ? 16 : 14} color={module.color} />
        </View>

        {isPrimary && <View style={[styles.primaryAccent, { backgroundColor: module.color }]} />}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => (
  prevProps.module.id === nextProps.module.id &&
  prevProps.module.route === nextProps.module.route &&
  prevProps.module.name === nextProps.module.name &&
  prevProps.variant === nextProps.variant &&
  prevProps.screenWidth === nextProps.screenWidth
));

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [showWarehouseGuide, setShowWarehouseGuide] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const styles = useMemo(
    () => createStyles(theme, screenWidth, screenHeight),
    [theme, screenWidth, screenHeight]
  );

  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

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

  const modules: Module[] = [
    {
      id: 'inbound',
      name: Str.moduleInbound,
      description: '扫码入库、恢复草稿、快速确认',
      icon: 'archive',
      color: moduleColors[0],
      route: '/inbound',
      priority: 'primary',
    },
    {
      id: 'outbound',
      name: Str.moduleOutbound,
      description: '按订单出库，适合连续高频扫描',
      icon: 'send',
      color: moduleColors[1],
      route: '/outbound',
      priority: 'primary',
    },
    {
      id: 'orders',
      name: Str.moduleOrders,
      description: '查询订单与物料明细',
      icon: 'file-text',
      color: moduleColors[2],
      route: '/orders',
      priority: 'secondary',
    },
    {
      id: 'inventory',
      name: Str.moduleInventory,
      description: '盘点差异与数量复核',
      icon: 'clipboard',
      color: moduleColors[3],
      route: '/inventory',
      priority: 'secondary',
    },
    {
      id: 'material',
      name: Str.moduleMaterials,
      description: '库存绑定与物料维护',
      icon: 'link',
      color: moduleColors[4],
      route: '/inventory-binding',
      priority: 'secondary',
    },
    {
      id: 'settings',
      name: Str.moduleSettings,
      description: '同步、规则与基础配置',
      icon: 'settings',
      color: moduleColors[5],
      route: '/settings',
      priority: 'secondary',
    },
  ];

  const primaryModules = modules.filter((module) => module.priority === 'primary');
  const secondaryModules = modules.filter((module) => module.priority === 'secondary');

  const renderPrimaryCard = useCallback((module: Module) => (
    <HomeModuleCard
      key={module.id}
      module={module}
      variant="primary"
      styles={styles}
      screenWidth={screenWidth}
      onPress={() => router.push(module.route as any)}
    />
  ), [router, screenWidth, styles]);

  const renderSecondaryCard = useCallback((module: Module) => (
    <HomeModuleCard
      key={module.id}
      module={module}
      variant="secondary"
      styles={styles}
      screenWidth={screenWidth}
      onPress={() => router.push(module.route as any)}
    />
  ), [router, screenWidth, styles]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>掌上仓库</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.primaryGrid}>
              {primaryModules.map(renderPrimaryCard)}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>辅助功能</Text>
            <View style={styles.secondaryGrid}>
              {secondaryModules.map(renderSecondaryCard)}
            </View>
          </View>
        </ScrollView>
      </View>

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
