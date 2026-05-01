import React from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { rf, rs } from '@/utils/responsive';

interface GuideStep {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
}

const STEPS: GuideStep[] = [
  {
    title: '\u6b22\u8fce\u4f7f\u7528 Chipmunks \u638c\u4e0a\u4ed3\u5e93',
    description:
      '\u8bf7\u5148\u521b\u5efa\u4ed3\u5e93\uff0c\u518d\u5f00\u59cb\u5165\u5e93\u3001\u51fa\u5e93\u548c\u76d8\u70b9\u4f5c\u4e1a\u3002',
    icon: 'package',
  },
];

interface WarehouseGuideProps {
  visible: boolean;
  onSkip: () => void;
  onGoToSettings: () => void;
}

export function WarehouseGuide({ visible, onSkip, onGoToSettings }: WarehouseGuideProps) {
  const step = STEPS[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Feather name={step.icon || 'package'} size={rs(64)} color="#4F46E5" />
            </View>

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
                <Text style={styles.skipButtonText}>
                  {'\u7a0d\u540e\u518d\u8bf4'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={onGoToSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.nextButtonText}>
                  {'\u53bb\u5efa\u4ed3\u5e93'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export async function shouldShowWarehouseGuide(options: {
  hasBusinessData: boolean;
  hasWarehouseConfig: boolean;
}): Promise<boolean> {
  return !options.hasBusinessData && !options.hasWarehouseConfig;
}

export async function markWarehouseGuideShown(): Promise<void> {
  return;
}

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
