/**
 * Excel 导出工具
 *
 * 封装 Excel 生成和同步到电脑的功能
 */
import * as XLSX from 'xlsx';
import { Base64 } from 'js-base64';
import { EXPORT_CONFIG, SyncConfig } from '@/constants/config';
import type { JsonValidator } from '@/utils/json';

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
      sheet.rows.forEach((row) => {
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

export const decodeBase64ToBytes = (base64String: string): Uint8Array => {
  return Base64.toUint8Array(base64String);
};

export const toBinaryBody = (bytes: Uint8Array): ArrayBuffer => {
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
};

export const parseJsonResponse = async <T>(
  response: Response,
  invalidJsonMessage = '服务器返回格式错误',
  validator?: JsonValidator<T>
): Promise<T> => {
  const responseText = await response.text();

  if (!responseText.trim()) {
    throw new Error(invalidJsonMessage);
  }

  try {
    const parsed = JSON.parse(responseText) as unknown;

    if (!validator) {
      return parsed as T;
    }

    if (typeof validator === 'function' && !('safeParse' in validator)) {
      if (validator(parsed)) {
        return parsed;
      }
    } else {
      const result = (
        validator as {
          safeParse: (value: unknown) => {
            success: boolean;
            data: T;
            error: { flatten: () => unknown };
          };
        }
      ).safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      console.error('[parseJsonResponse] 响应校验失败:', result.error.flatten());
    }

    throw new Error(invalidJsonMessage);
  } catch (error) {
    console.error(
      '[parseJsonResponse] JSON解析失败，响应内容:',
      responseText.substring(0, 200),
      error
    );
    throw new Error(invalidJsonMessage);
  }
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
    const bytes = decodeBase64ToBytes(base64String);
    const body = toBinaryBody(bytes);

    const baseUrl = `http://${syncConfig.ip}:${syncConfig.port || '8080'}${endpoint}`;
    const url = nameSuffix ? `${baseUrl}?name_suffix=${encodeURIComponent(nameSuffix)}` : baseUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPORT_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body,
        signal: controller.signal,
      });

      const result = await parseJsonResponse<{ success?: boolean; message?: string; path?: string }>(
        response,
        '服务器返回格式错误，请检查同步服务是否正常运行'
      );

      if (result.success) {
        onSuccess?.(result.path || '');
        return { success: true, path: result.path };
      } else {
        const msg = result.message || '未知错误';
        onError?.(msg);
        return { success: false, message: msg };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    const errorMsg =
      error.name === 'AbortError'
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
