/**
 * Excel 导出工具
 * 
 * 封装 Excel 生成和同步到电脑的功能
 */
import * as XLSX from 'xlsx';
import { EXPORT_CONFIG, SyncConfig } from '@/constants/config';

/** Excel Sheet 配置 */
export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: any[][];
}

/** 导出结果 */
export interface ExportResult {
  success: boolean;
  message?: string;
  path?: string;
}

/**
 * 生成 Excel 文件（返回 base64）
 */
export const generateExcelBase64 = (sheets: ExcelSheet[]): string => {
  const wb = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    
    // 自动列宽
    const colWidths = sheet.headers.map((header, colIdx) => {
      let maxWidth = header.length;
      sheet.rows.forEach(row => {
        const cellValue = String(row[colIdx] || '');
        const width = cellValue.split('').reduce((acc, char) => {
          return acc + (char.charCodeAt(0) > 127 ? 2 : 1);
        }, 0);
        if (width > maxWidth) maxWidth = width;
      });
      return { wch: Math.min(maxWidth + 2, 50) };
    });
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
};

/**
 * 同步 Excel 到电脑（支持多 Sheet）
 */
export const syncExcelToComputer = async (
  sheets: ExcelSheet[],
  endpoint: string,
  syncConfig: SyncConfig,
  nameSuffix?: string,
  onSuccess?: (path: string) => void,
  onError?: (error: string) => void
): Promise<ExportResult> => {
  if (!syncConfig.ip) {
    return { success: false, message: '请先配置服务器地址' };
  }
  
  const totalRows = sheets.reduce((sum, s) => sum + s.rows.length, 0);
  if (totalRows === 0) {
    return { success: false, message: '暂无数据可同步' };
  }
  
  try {
    const base64String = generateExcelBase64(sheets);
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const baseUrl = `http://${syncConfig.ip}:${syncConfig.port || '8080'}${endpoint}`;
    const url = nameSuffix ? `${baseUrl}?name_suffix=${encodeURIComponent(nameSuffix)}` : baseUrl;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPORT_CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: bytes,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    const result = await response.json();
    
    if (result.success) {
      onSuccess?.(result.path || '');
      return { success: true, path: result.path };
    } else {
      const msg = result.message || '未知错误';
      onError?.(msg);
      return { success: false, message: msg };
    }
  } catch (error: any) {
    const errorMsg = error.name === 'AbortError' 
      ? '同步超时（30秒）' 
      : `同步失败: ${error.message || '请检查服务是否运行'}`;
    onError?.(errorMsg);
    return { success: false, message: errorMsg };
  }
};

/**
 * 验证同步配置
 */
export const validateSyncConfig = (config: SyncConfig): boolean => {
  return Boolean(config.ip);
};
