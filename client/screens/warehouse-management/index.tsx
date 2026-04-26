import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useCustomAlert } from '@/components/CustomAlert';
import {
  Warehouse,
  getAllWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from '@/utils/database';

export default function WarehouseManagementScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const router = useSafeRouter();
  const alert = useCustomAlert();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
  });

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    console.log('[WarehouseManagement] 开始加载仓库列表');
    const data = await getAllWarehouses();
    console.log(`[WarehouseManagement] 加载完成，设置 ${data.length} 条仓库数据`);
    setWarehouses(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWarehouses();
    }, [loadWarehouses])
  );

  // 打开添加/编辑弹窗
  const handleOpenModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        description: warehouse.description || '',
        is_default: warehouse.is_default || false,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        description: '',
        is_default: false,
      });
    }
    setModalVisible(true);
  };

  // 保存仓库
  const handleSave = async () => {
    // 强制截断名称到4个字符
    const trimmedName = formData.name.trim().slice(0, 4);
    if (!trimmedName) {
      alert.showWarning('请输入仓库名称');
      return;
    }
    
    const finalFormData = { ...formData, name: trimmedName };

    // 检查名称唯一性（排除当前编辑的仓库）
    const existingWarehouse = warehouses.find(
      w => w.name.trim() === trimmedName && 
           (!editingWarehouse || w.id !== editingWarehouse.id)
    );
    if (existingWarehouse) {
      alert.showWarning('该仓库名称已存在，请使用其他名称');
      return;
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, finalFormData);
        alert.showSuccess('仓库已更新');
      } else {
        await addWarehouse(finalFormData);
        alert.showSuccess('仓库已添加');
      }
      setModalVisible(false);
      loadWarehouses();
    } catch (error) {
      console.error('保存仓库失败:', error);
      alert.showError('保存失败，请重试');
    }
  };

  // 删除仓库
  const handleDelete = (warehouse: Warehouse) => {
    if (warehouse.is_default) {
      alert.showWarning('默认仓库不能删除');
      return;
    }

    alert.showConfirm(
      '确认删除',
      `确定要删除仓库「${warehouse.name}」吗？\n此操作不可撤销。`,
      async () => {
        try {
          await deleteWarehouse(warehouse.id);
          alert.showSuccess('仓库已删除');
          loadWarehouses();
        } catch (error) {
          console.error('删除仓库失败:', error);
          alert.showError('删除失败，请重试');
        }
      },
      true
    );
  };

  // 设为默认仓库
  const handleSetDefault = async (warehouse: Warehouse) => {
    try {
      await updateWarehouse(warehouse.id, { is_default: true });
      alert.showSuccess(`已将「${warehouse.name}」设为默认仓库`);
      loadWarehouses();
    } catch (error) {
      console.error('设置默认仓库失败:', error);
      alert.showError('操作失败，请重试');
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>仓库管理</Text>
        </View>

        {/* 仓库列表 */}
        {warehouses.length > 0 ? (
          warehouses.map((warehouse) => (
            <View key={warehouse.id} style={styles.warehouseCard}>
              <View style={styles.warehouseHeader}>
                <View style={styles.warehouseInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.warehouseName}>{warehouse.name}</Text>
                    {warehouse.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>默认</Text>
                      </View>
                    )}
                  </View>
                  {warehouse.description && (
                    <Text style={styles.warehouseDesc}>{warehouse.description}</Text>
                  )}
                </View>
                <View style={styles.warehouseActions}>
                  {!warehouse.is_default && (
                    <TouchableOpacity style={styles.actionButton}
                      activeOpacity={0.7} onPress={() => handleSetDefault(warehouse)}
                    >
                      <Feather name="star" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionButton}
                    activeOpacity={0.7} onPress={() => handleOpenModal(warehouse)}
                  >
                    <Feather name="edit-2" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}
                    activeOpacity={0.7} onPress={() => handleDelete(warehouse)}
                  >
                    <Feather name="trash-2" size={18} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="home" size={36} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>暂无仓库</Text>
            <Text style={styles.emptyDesc}>点击下方按钮添加您的第一个仓库</Text>
          </View>
        )}

        {/* 添加仓库按钮 */}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => handleOpenModal()}>
          <Text style={styles.addButtonText}>+ 添加仓库</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 添加/编辑弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingWarehouse ? '编辑仓库' : '添加仓库'}
            </Text>

            <Text style={styles.inputLabel}>仓库名称 *（中文4字/英文4字符）</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => {
                // 实时更新输入值，不限制长度（让输入法正常选字）
                setFormData({ ...formData, name: text });
              }}
              placeholder="请输入仓库名称"
              placeholderTextColor={theme.textMuted}
              
            />

            <Text style={styles.inputLabel}>仓库描述</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="可选，用于备注仓库信息"
              placeholderTextColor={theme.textMuted}
              
            />

            <TouchableOpacity style={styles.checkboxRow}
              activeOpacity={0.7} onPress={() => setFormData({ ...formData, is_default: !formData.is_default })}
            >
              <View
                style={[
                  styles.checkbox,
                  formData.is_default && styles.checkboxChecked,
                ]}
              >
                {formData.is_default && (
                  <Feather name="check" size={14} color={theme.buttonPrimaryText} />
                )}
              </View>
              <Text style={styles.checkboxText}>设为默认仓库</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]}
                activeOpacity={0.7} onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]}
                activeOpacity={0.7} onPress={handleSave}
              >
                <Text style={styles.submitButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 全局提示组件 */}
      {alert.AlertComponent}
    </Screen>
  );
}
