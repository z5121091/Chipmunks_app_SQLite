import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useCustomAlert } from '@/components/CustomAlert';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import {
  CustomField,
  FIELD_LABELS,
  FieldPrefixes,
  QRCodeRule,
  getAllCustomFields,
  getCustomFieldId,
  getRuleById,
  isCustomField,
  updateRule,
} from '@/utils/database';
import { createStyles } from './styles';

type FieldRow = {
  key: string;
  index: number;
  label: string;
  subtitle: string;
};

const getFieldMeta = (fieldKey: string, index: number, customFields: CustomField[]): FieldRow => {
  if (isCustomField(fieldKey)) {
    const fieldId = getCustomFieldId(fieldKey);
    const customField = customFields.find(field => field.id === fieldId);
    return {
      key: fieldKey,
      index,
      label: customField?.name || '未知自定义字段',
      subtitle: fieldKey,
    };
  }

  return {
    key: fieldKey,
    index,
    label: FIELD_LABELS[fieldKey] || fieldKey,
    subtitle: fieldKey,
  };
};

export default function RulePrefixEditScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { showAlert, showError, AlertComponent } = useCustomAlert();
  const { ruleId } = useSafeSearchParams<{ ruleId?: string }>();

  const [rule, setRule] = useState<QRCodeRule | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [prefixes, setPrefixes] = useState<FieldPrefixes>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!ruleId) {
      showError('未找到解析规则');
      return;
    }

    setLoading(true);
    try {
      const [ruleData, customFieldData] = await Promise.all([
        getRuleById(ruleId),
        getAllCustomFields(),
      ]);

      if (!ruleData) {
        showError('解析规则不存在');
        return;
      }

      setRule(ruleData);
      setCustomFields(customFieldData);
      setPrefixes(ruleData.fieldPrefixes || {});
    } catch (error) {
      console.error('加载字段前缀配置失败:', error);
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [ruleId, showError]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const fields = useMemo(() => {
    return (rule?.fieldOrder || []).map((fieldKey, index) => getFieldMeta(fieldKey, index, customFields));
  }, [customFields, rule?.fieldOrder]);

  const configuredCount = fields.filter(field => prefixes[field.key]?.trim()).length;

  const handleChangePrefix = (fieldKey: string, value: string) => {
    setPrefixes(prev => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleClearField = (fieldKey: string) => {
    setPrefixes(prev => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const handleClearAll = () => {
    showAlert(
      '清空全部',
      '确定清空该规则所有字段的前缀配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: () => setPrefixes({}),
        },
      ],
      'warning'
    );
  };

  const handleSave = async () => {
    if (!rule || saving) {
      return;
    }

    const fieldKeys = new Set(fields.map(field => field.key));
    const cleanedPrefixes = Object.entries(prefixes).reduce<FieldPrefixes>((acc, [fieldKey, value]) => {
      const trimmedValue = value.trim();
      if (fieldKeys.has(fieldKey) && trimmedValue) {
        acc[fieldKey] = trimmedValue;
      }
      return acc;
    }, {});

    setSaving(true);
    try {
      await updateRule(rule.id, { fieldPrefixes: cleanedPrefixes });
      setRule(prev => prev ? { ...prev, fieldPrefixes: cleanedPrefixes } : prev);
      setPrefixes(cleanedPrefixes);
      showAlert(
        '成功',
        '字段前缀配置已保存',
        [{ text: '确定', onPress: () => router.back() }],
        'success'
      );
    } catch (error) {
      console.error('保存字段前缀配置失败:', error);
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderField = ({ item }: { item: FieldRow }) => {
    const value = prefixes[item.key] || '';
    const configured = value.trim().length > 0;

    return (
      <View style={[styles.fieldCard, configured && styles.fieldCardConfigured]}>
        <View style={styles.fieldHeader}>
          <View style={[styles.fieldIndex, configured && styles.fieldIndexConfigured]}>
            <Text style={[styles.fieldIndexText, configured && styles.fieldIndexTextConfigured]}>
              {item.index + 1}
            </Text>
          </View>
          <View style={styles.fieldTitleWrap}>
            <Text style={styles.fieldLabel}>{item.label}</Text>
            <Text style={styles.fieldSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          </View>
        </View>

        <View style={[styles.inputWrap, configured && styles.inputWrapConfigured]}>
          <TextInput
            style={styles.prefixInput}
            value={value}
            onChangeText={text => handleChangePrefix(item.key, text)}
            placeholder="输入前缀（留空不配置）"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {configured && (
            <TouchableOpacity style={styles.clearButton} activeOpacity={0.7} onPress={() => handleClearField(item.key)}>
              <Text style={styles.clearButtonText}>清除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.ruleInfoCard}>
        <Text style={styles.ruleName}>{rule?.name || '加载中'}</Text>
        <Text style={styles.ruleDescription}>{rule?.description || '未填写规则描述'}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{fields.length} 个字段</Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={styles.summaryText}>{configuredCount} 个已配置</Text>
        </View>
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Feather name="info" size={17} color={theme.success} />
        </View>
        <Text style={styles.tipText}>为每个字段配置识别前缀，系统在解析时会自动去除这些前缀。</Text>
      </View>
    </View>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>编辑前缀</Text>
          </View>

          <FlatList
            data={fields}
            keyExtractor={item => item.key}
            renderItem={renderField}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Feather name="list" size={28} color={theme.textMuted} />
                  <Text style={styles.emptyText}>该规则暂无字段</Text>
                </View>
              ) : null
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {rule && (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity style={styles.clearAllButton} activeOpacity={0.72} onPress={handleClearAll}>
                <Text style={styles.clearAllButtonText}>清空全部</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} activeOpacity={0.72} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存配置'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {AlertComponent}
    </Screen>
  );
}
