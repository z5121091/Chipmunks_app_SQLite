/**
 * 仓库引导组件
 * 首次使用时引导用户选择仓库
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rf, rs } from '@/utils/responsive';
import { STORAGE_KEYS } from '@/constants/config';

interface GuideStep {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
}

const STEPS: GuideStep[] = [
  {
    title: '欢迎启用 Chipmunks 掌上仓库',
    description: '先建立仓库档案，再开始入库、出库和盘点',
    icon: 'package',
  },
];

interface WarehouseGuideProps {
  visible: boolean;
  onSkip: () => void;
  onGoToSettings: () => void;
}

export function WarehouseGuide({ visible, onSkip, onGoToSettings }: WarehouseGuideProps) {
  const step = STEPS[0]; // 单步引导

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {/* 图标 */}
            <View style={styles.iconContainer}>
              <Feather name={step.icon || 'package'} size={rs(64)} color="#4F46E5" />
            </View>

            {/* 标题 */}
            <Text style={styles.title}>{step.title}</Text>

            {/* 描述 */}
            <Text style={styles.description}>{step.description}</Text>

            {/* 按钮组 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
                <Text style={styles.skipButtonText}>跳过</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={onGoToSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.nextButtonText}>去建仓库</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/**
 * 检查并标记仓库引导是否已显示
 * @param hasBusinessData 是否已有业务数据（订单/物料）
 * @returns 是否需要显示引导
 */
export async function shouldShowWarehouseGuide(hasBusinessData: boolean): Promise<boolean> {
  // 如果已有业务数据，不显示引导
  if (hasBusinessData) {
    return false;
  }

  // 检查引导是否已显示
  const guideShown = await AsyncStorage.getItem(STORAGE_KEYS.WAREHOUSE_GUIDE_SHOWN);
  return guideShown !== 'true';
}

/**
 * 标记仓库引导已显示
 */
export async function markWarehouseGuideShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.WAREHOUSE_GUIDE_SHOWN, 'true');
  } catch (error) {
    console.error('标记仓库引导失败:', error);
  }
}

// 样式
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  container: {
    width: '100%',
    maxWidth: rs(400),
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: rs(24),
    padding: rs(32),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: rs(24),
  },
  title: {
    fontSize: rf(20),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: rs(16),
  },
  description: {
    fontSize: rf(14),
    lineHeight: rf(22),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: rs(32),
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: rs(12),
  },
  skipButton: {
    flex: 1,
    paddingVertical: rs(12),
    paddingHorizontal: rs(20),
    borderRadius: rs(12),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 1,
    paddingVertical: rs(12),
    paddingHorizontal: rs(20),
    borderRadius: rs(12),
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
