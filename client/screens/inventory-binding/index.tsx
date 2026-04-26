import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as XLSX from 'xlsx';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useCustomAlert } from '@/components/CustomAlert';
import {
  InventoryBinding,
  getAllInventoryBindings,
  addInventoryBinding,
  updateInventoryBinding,
  deleteInventoryBinding,
  importInventoryBindings,
} from '@/utils/database';
import { formatDate } from '@/utils/time';

// 使用 any 绕过类型检查
const FileSystem = FileSystemLegacy as any;

export default function InventoryBindingScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const router = useSafeRouter();
  const alert = useCustomAlert();

  const [bindings, setBindings] = useState<InventoryBinding[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBinding, setEditingBinding] = useState<InventoryBinding | null>(null);
  const [formData, setFormData] = useState({
    scan_model: '',
    inventory_code: '',
    supplier: '',
    description: '',
  });
  const [importing, setImporting] = useState(false);

  // 加载绑定列表
  const loadBindings = useCallback(async () => {
    const data = await getAllInventoryBindings();
    setBindings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBindings();
    }, [loadBindings])
  );

  // 打开添加/编辑弹窗
  const handleOpenModal = (binding?: InventoryBinding) => {
    if (binding) {
      setEditingBinding(binding);
      setFormData({
        scan_model: binding.scan_model,
        inventory_code: binding.inventory_code,
        supplier: binding.supplier || '',
        description: binding.description || '',
      });
    } else {
      setEditingBinding(null);
      setFormData({
        scan_model: '',
        inventory_code: '',
        supplier: '',
        description: '',
      });
    }
    setModalVisible(true);
  };

  // 保存绑定
  const handleSave = async () => {
    if (!formData.scan_model.trim()) {
      alert.showWarning('请输入扫描型号');
      return;
    }
    if (!formData.inventory_code.trim()) {
      alert.showWarning('请输入存货编码');
      return;
    }

    // 检查存货编码是否已存在（按存货编码查重）
    const existingCode = bindings.find(
      b => b.inventory_code === formData.inventory_code.trim() && 
           (!editingBinding || b.id !== editingBinding.id)
    );
    if (existingCode) {
      alert.showWarning(`存货编码「${formData.inventory_code.trim()}」已存在\n\n请使用其他编码或编辑已有记录`);
      return;
    }

    try {
      if (editingBinding) {
        await updateInventoryBinding(editingBinding.id, formData);
        alert.showSuccess('绑定已更新');
      } else {
        await addInventoryBinding(formData);
        alert.showSuccess('绑定已添加');
      }
      setModalVisible(false);
      loadBindings();
    } catch (error) {
      console.error('保存绑定失败:', error);
      alert.showError('保存失败，请重试');
    }
  };

  // 删除绑定
  const handleDelete = (binding: InventoryBinding) => {
    alert.showConfirm(
      '确认删除',
      `确定要删除「${binding.scan_model}」的绑定吗？`,
      async () => {
        try {
          await deleteInventoryBinding(binding.id);
          alert.showSuccess('绑定已删除');
          loadBindings();
        } catch (error) {
          console.error('删除绑定失败:', error);
          alert.showError('删除失败，请重试');
        }
      },
      true
    );
  };

  // 从Excel导入
  const handleImportFromExcel = async () => {
    if (importing) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      setImporting(true);

      // 读取Excel文件
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      // 跳过表头，从第二行开始
      const bindingsToImport: Array<{ scan_model: string; inventory_code: string; supplier?: string; description?: string }> = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length >= 2 && row[0] && row[1]) {
          bindingsToImport.push({
            scan_model: String(row[0]).trim(),
            inventory_code: String(row[1]).trim(),
            supplier: row[2] ? String(row[2]).trim() : undefined,
            description: row[3] ? String(row[3]).trim() : undefined,
          });
        }
      }

      if (bindingsToImport.length === 0) {
        alert.showWarning('未找到有效的绑定数据\n\n请确保Excel格式正确');
        setImporting(false);
        return;
      }

      // 按存货编码查重：获取已存在的存货编码
      const existingCodes = new Set(bindings.map(b => b.inventory_code));
      const duplicateCodes: string[] = [];
      const uniqueBindings: typeof bindingsToImport = [];

      for (const binding of bindingsToImport) {
        if (existingCodes.has(binding.inventory_code)) {
          // 记录重复的编码
          if (!duplicateCodes.includes(binding.inventory_code)) {
            duplicateCodes.push(binding.inventory_code);
          }
        } else {
          // 记录不重复的，用于后续导入
          uniqueBindings.push(binding);
        }
      }

      if (uniqueBindings.length === 0) {
        alert.showWarning(`所有存货编码均已存在\n\n重复编码：${duplicateCodes.slice(0, 5).join('、')}${duplicateCodes.length > 5 ? '...' : ''}`);
        setImporting(false);
        return;
      }

      // 批量导入（只导入不重复的）
      const importCount = await importInventoryBindings(uniqueBindings);
      
      // 构建提示信息
      let message = `导入成功！\n新增 ${importCount} 条绑定`;
      if (duplicateCodes.length > 0) {
        const dupList = duplicateCodes.slice(0, 5).join('、');
        message += `\n\n已跳过 ${duplicateCodes.length} 条重复编码：\n${dupList}${duplicateCodes.length > 5 ? '...' : ''}`;
      }
      alert.showSuccess(message);
      loadBindings();
    } catch (error) {
      console.error('导入失败:', error);
      alert.showError('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  // 导出为Excel
  const handleExportToExcel = async () => {
    if (bindings.length === 0) {
      alert.showWarning('暂无数据可导出');
      return;
    }

    try {
      const headers = ['型号', '存货编码', '供应商', '描述', '创建时间'];
      const rows = bindings.map(b => [
        b.scan_model,
        b.inventory_code,
        b.supplier || '',
        b.description || '',
        b.created_at ? formatDate(b.created_at) : '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '物料绑定');

      // 设置列宽
      ws['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
      ];

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `物料绑定_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: '导出物料绑定',
        });
        alert.showSuccess(`已导出 ${bindings.length} 条绑定数据`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert.showError('导出失败，请重试');
    }
  };

  // 导出导入模板（兼容 Android 7.0）
  const handleExportTemplate = async () => {
    try {
      // 模板表头 + 示例数据行
      const headers = ['型号', '存货编码', '供应商', '描述（可选）'];
      const exampleRow = ['示例型号ABC', 'INV001', '供应商A', '这是示例描述'];
      const hintRow = ['（必填）', '（必填）', '（选填）', '（选填）'];

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, hintRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '物料绑定模板');

      // 设置列宽
      ws['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
      ];

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `物料绑定导入模板.xlsx`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 检测 Android 版本（API 26 = Android 8.0）
      const isAndroid8OrAbove = Platform.OS === 'android' && Platform.Version >= 26;

      if (isAndroid8OrAbove) {
        // Android 8.0+：直接使用 Sharing 分享
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: '导出导入模板',
          });
          alert.showSuccess('模板已导出\n\n请按照模板格式填写数据后导入');
        }
      } else {
        // Android 7.0 及以下：保存到 Downloads 文件夹
        try {
          // 请求媒体库权限
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            alert.showError('需要存储权限才能保存模板');
            return;
          }

          // 将文件保存到媒体库
          const asset = await MediaLibrary.createAssetAsync(filePath);

          // 获取 Downloads 相册
          try {
            const albums = await MediaLibrary.getAlbumsAsync();
            let downloadAlbum = albums.find((album: any) => 
              album.title === 'Download' || album.title === 'Downloads'
            );
            
            if (!downloadAlbum) {
              downloadAlbum = await MediaLibrary.createAlbumAsync('Downloads', asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], downloadAlbum.id, false);
            }
          } catch (albumError) {
            // 相册操作失败没关系，文件已经保存到媒体库了
          }

          // 尝试打开 Downloads 文件夹
          try {
            await Linking.openURL('content://downloads/all_downloads');
          } catch {
            try {
              await Linking.openURL('content://com.android.providers.downloads.documents/root/downloads');
            } catch {
              // 都打不开就算了
            }
          }

          alert.showSuccess(
            '模板已保存到下载文件夹\n请在文件管理器中找到并打开\n（用于导入数据）'
          );
        } catch (mediaError) {
          console.error('保存到下载文件夹失败:', mediaError);
          
          // 备选方案：使用 Sharing
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              dialogTitle: '导出导入模板',
            });
            alert.showSuccess('模板已导出');
          } else {
            alert.showError('导出失败，请重试');
          }
        }
      }
    } catch (error) {
      console.error('导出模板失败:', error);
      alert.showError('导出失败，请重试');
    }
  };

  // 渲染单个绑定卡片
  const renderBindingCard = useCallback(({ item: binding }: { item: InventoryBinding }) => (
    <View style={styles.bindingCard}>
      <View style={styles.bindingMain}>
        <View style={styles.bindingInfo}>
          {/* 型号 */}
          <Text style={styles.bindingModel} numberOfLines={1}>{binding.scan_model}</Text>
          {/* 编码 */}
          <View style={styles.codeRow}>
            <Feather name="arrow-right" size={10} color={theme.primary} />
            <Text style={styles.bindingCode} numberOfLines={1}>{binding.inventory_code}</Text>
          </View>
          {/* 供应商 */}
          {binding.supplier && (
            <View style={styles.supplierRow}>
              <Feather name="briefcase" size={10} color={theme.accent} />
              <Text style={styles.supplierText} numberOfLines={1}>{binding.supplier}</Text>
            </View>
          )}
        </View>
        
        {/* 操作 */}
        <View style={styles.actionColumn}>
          <TouchableOpacity style={styles.iconBtn}
            activeOpacity={0.7} onPress={() => handleOpenModal(binding)}
          >
            <Feather name="edit-2" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}
            activeOpacity={0.7} onPress={() => handleDelete(binding)}
          >
            <Feather name="trash-2" size={14} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [theme, handleOpenModal, handleDelete]);

  // 空状态组件
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Feather name="link" size={28} color={theme.textMuted} />
      <Text style={styles.emptyTitle}>暂无绑定数据</Text>
      <Text style={styles.emptyDesc}>点击上方"添加"按钮创建</Text>
    </View>
  ), [theme]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>物料管理</Text>
        </View>
      </View>

      <FlatList
        data={bindings}
        keyExtractor={(item) => item.id}
        renderItem={renderBindingCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.scrollContent,
          bindings.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <>
            {/* 统计 + 操作按钮 */}
            <View style={styles.topSection}>
              <View style={styles.statsCard}>
                <Feather name="link" size={20} color={theme.primary} />
                <Text style={styles.statsNumber}>{bindings.length}</Text>
                <Text style={styles.statsLabel}>条绑定</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleExportTemplate} >
                  <Feather name="file-text" size={14} color={theme.textSecondary} />
                  <Text style={styles.actionBtnText}>模板</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleExportToExcel} >
                  <Feather name="download" size={14} color={theme.textSecondary} />
                  <Text style={styles.actionBtnText}>导出</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} 
                  activeOpacity={0.7} onPress={handleImportFromExcel}
                  
                >
                  {importing ? (
                    <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
                  ) : (
                    <Feather name="upload-cloud" size={14} color={theme.buttonPrimaryText} />
                  )}
                  <Text style={[styles.actionBtnText, styles.actionBtnPrimaryText]}>
                    {importing ? '...' : '导入'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 列表区域 */}
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>绑定列表</Text>
                <TouchableOpacity style={styles.addSmallBtn}
                  activeOpacity={0.7} onPress={() => handleOpenModal()}
                >
                  <Feather name="plus" size={14} color={theme.primary} />
                  <Text style={styles.addSmallBtnText}>添加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
      />

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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBinding ? '编辑绑定' : '添加绑定'}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn}
                activeOpacity={0.7} onPress={() => setModalVisible(false)}
              >
                <Feather name="x" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>扫描型号 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.scan_model}
                onChangeText={(text) => setFormData({ ...formData, scan_model: text })}
                placeholder="二维码解析后的型号"
                placeholderTextColor={theme.textMuted}
                
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>存货编码 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.inventory_code}
                onChangeText={(text) => setFormData({ ...formData, inventory_code: text })}
                placeholder="ERP系统中的编码"
                placeholderTextColor={theme.textMuted}
                
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>供应商</Text>
              <TextInput
                style={styles.input}
                value={formData.supplier}
                onChangeText={(text) => setFormData({ ...formData, supplier: text })}
                placeholder="供应商名称（选填）"
                placeholderTextColor={theme.textMuted}
                
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>描述</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="备注说明（选填）"
                placeholderTextColor={theme.textMuted}
                
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]}
                activeOpacity={0.7} onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]}
                activeOpacity={0.7} onPress={handleSave}
                
              >
                <Text style={styles.submitBtnText}>保存</Text>
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
