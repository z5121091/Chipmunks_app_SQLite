import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { AnimatedCard } from '@/components/AnimatedCard';
import { Spacing } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import {
  getAllCustomFields,
  addCustomField,
  updateCustomField,
  deleteCustomField,
  CustomField,
} from '@/utils/database';
import { useCustomAlert } from '@/components/CustomAlert';

// 字段类型映射
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '选择',
};

export default function CustomFieldsScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const alert = useCustomAlert();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  // 字段名称输入框 ref
  const fieldNameInputRef = useRef<TextInput>(null);
  const fieldNameFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 弹窗打开时聚焦输入框
  useEffect(() => {
    if (modalVisible && fieldNameInputRef.current) {
      fieldNameFocusTimerRef.current = setTimeout(() => {
        fieldNameInputRef.current?.focus();
        fieldNameFocusTimerRef.current = null;
      }, 300);
    }

    return () => {
      if (fieldNameFocusTimerRef.current) {
        clearTimeout(fieldNameFocusTimerRef.current);
        fieldNameFocusTimerRef.current = null;
      }
    };
  }, [modalVisible]);

  // 表单状态
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  // 加载自定义字段
  const loadFields = useCallback(async () => {
    const data = await getAllCustomFields();
    setFields(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFields();
    }, [loadFields])
  );

  // 打开新增弹窗
  const handleAddField = () => {
    setEditingField(null);
    setFieldName('');
    setFieldType('text');
    setIsRequired(false);
    setOptionsText('');
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.name);
    setFieldType(field.type);
    setIsRequired(field.required);
    setOptionsText(field.options?.join(', ') || '');
    setModalVisible(true);
  };

  // 保存字段
  const handleSaveField = async () => {
    if (!fieldName.trim()) {
      alert.showWarning('请输入字段名称');
      return;
    }

    // 验证选择类型必须有选项
    if (fieldType === 'select') {
      const options = optionsText
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o);
      if (options.length < 2) {
        alert.showWarning('选择类型至少需要2个选项');
        return;
      }
    }

    try {
      const options =
        fieldType === 'select'
          ? optionsText
              .split(',')
              .map((o) => o.trim())
              .filter((o) => o)
          : undefined;

      if (editingField) {
        await updateCustomField(editingField.id, {
          name: fieldName.trim(),
          type: fieldType,
          required: isRequired,
          options,
        });
        alert.showSuccess('字段已更新');
      } else {
        await addCustomField({
          name: fieldName.trim(),
          type: fieldType,
          required: isRequired,
          options,
        });
        alert.showSuccess('字段已添加');
      }
      setModalVisible(false);
      loadFields();
    } catch (error) {
      console.error('保存字段失败:', error);
      alert.showError('保存失败');
    }
  };

  // 删除字段
  const handleDeleteField = (field: CustomField) => {
    alert.showConfirm(
      '确认删除',
      `确定要删除字段"${field.name}"吗？`,
      async () => {
        try {
          await deleteCustomField(field.id);
          loadFields();
        } catch (error) {
          console.error('删除字段失败:', error);
          alert.showError('删除失败');
        }
      },
      true
    );
  };

  // 渲染字段类型选择器
  const renderTypeSelector = useCallback(
    () => (
      <View style={styles.typeSelector}>
        {(['text', 'number', 'date', 'select'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeButton, fieldType === type && styles.typeButtonActive]}
            activeOpacity={0.7}
            onPress={() => setFieldType(type)}
          >
            <Text
              style={[styles.typeButtonText, fieldType === type && styles.typeButtonTextActive]}
            >
              {FIELD_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [
      fieldType,
      styles.typeSelector,
      styles.typeButton,
      styles.typeButtonActive,
      styles.typeButtonText,
      styles.typeButtonTextActive,
    ]
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>自定义字段</Text>
        </View>

        {/* 字段列表 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>字段列表</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={handleAddField}>
            <Text style={styles.addButtonText}>+ 添加</Text>
          </TouchableOpacity>
        </View>

        {fields.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Feather name="plus-square" size={28} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyText}>暂无自定义字段{'\n'}点击上方添加按钮创建</Text>
          </View>
        ) : (
          fields.map((field) => (
            <AnimatedCard key={field.id} style={styles.fieldItem}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldType}>{FIELD_TYPE_LABELS[field.type]}</Text>
              </View>
              <View style={styles.fieldMeta}>
                <Text style={styles.fieldTag}>排序: {field.sortOrder + 1}</Text>
                {field.required && <Text style={styles.requiredTag}>必填</Text>}
              </View>
              {field.type === 'select' && field.options && (
                <View style={styles.optionsContainer}>
                  {field.options.map((opt, idx) => (
                    <Text key={idx} style={styles.optionTag}>
                      {opt}
                    </Text>
                  ))}
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: Spacing.sm,
                  gap: Spacing.md,
                }}
              >
                <TouchableOpacity onPress={() => handleEditField(field)}>
                  <Feather name="edit-2" size={18} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteField(field)}>
                  <Feather name="trash-2" size={18} color={theme.error} />
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* 新增/编辑弹窗 */}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingField ? '编辑字段' : '添加字段'}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                >
                  <Feather name="x" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>字段名称 *</Text>
                  <TextInput
                    ref={fieldNameInputRef}
                    style={styles.formInput}
                    value={fieldName}
                    onChangeText={setFieldName}
                    placeholder="如：供应商、库位等"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>字段类型</Text>
                  {renderTypeSelector()}
                </View>

                {fieldType === 'select' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>选项列表</Text>
                    <Text style={styles.optionsHint}>多个选项用逗号分隔</Text>
                    <TextInput
                      style={styles.formInput}
                      value={optionsText}
                      onChangeText={setOptionsText}
                      placeholder="如：选项1, 选项2, 选项3"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                )}

                <View style={styles.formGroup}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    activeOpacity={0.7}
                    onPress={() => setIsRequired(!isRequired)}
                  >
                    <View style={[styles.checkbox, isRequired && styles.checkboxChecked]}>
                      {isRequired && (
                        <Feather name="check" size={14} color={theme.buttonPrimaryText} />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>必填字段</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  activeOpacity={0.7}
                  onPress={handleSaveField}
                >
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 自定义弹窗 */}
      {alert.AlertComponent}
    </Screen>
  );
}
