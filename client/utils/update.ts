/**
 * 在线更新工具
 *
 * 封装版本检查、下载、安装等功能
 */
import * as Updates from 'expo-updates';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Base64 } from 'js-base64';
import { UPDATE_CONFIG, STORAGE_KEYS } from '@/constants/config';

// 使用 any 绕过类型检查
const FileSystem = FileSystemLegacy as any;

/** 更新信息 */
export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  changelog: string;
  forceUpdate: boolean;
}

/** 更新状态 */
export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

/**
 * 从 URL 中提取不含认证信息的显示用 URL
 */
export const extractDisplayUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
};

/**
 * 从 URL 中解析用户名和密码
 */
export const parseAuthFromUrl = (
  url: string
): { baseUrl: string; username: string; password: string } | null => {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
      return {
        baseUrl,
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Base64 编码
 */
export const base64Encode = (str: string): string => {
  return Base64.encode(str);
};

/**
 * 版本号比较
 * @returns 1: v1 > v2, -1: v1 < v2, 0: v1 = v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/[Vv]/, '').split('.').map(Number);
  const parts2 = v2.replace(/[Vv]/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * 检查更新
 */
export const checkForUpdate = async (
  serverUrl: string,
  currentVersion: string
): Promise<UpdateInfo | null> => {
  try {
    const updateXmlUrl = serverUrl.includes('AppUpdate')
      ? serverUrl.replace(/\/[^/]*$/, '/update.xml')
      : `${serverUrl}/update.xml`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(updateXmlUrl, {
        method: 'GET',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();

    // 简单解析 XML
    const versionMatch = xmlText.match(/<version>([^<]+)<\/version>/);
    const urlMatch = xmlText.match(/<url>([^<]+)<\/url>/);
    const forceMatch = xmlText.match(/<force>([^<]+)<\/force>/);
    const changelogMatch = xmlText.match(/<changelog><!\[CDATA\[([\s\S]*?)\]\]><\/changelog>/);

    if (!versionMatch || !urlMatch) {
      return null;
    }

    const latestVersion = versionMatch[1];

    // 比较版本
    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return null;
    }

    return {
      version: latestVersion,
      downloadUrl: urlMatch[1],
      changelog: changelogMatch ? changelogMatch[1].trim() : '',
      forceUpdate: forceMatch ? forceMatch[1].toLowerCase() === 'true' : false,
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    return null;
  }
};

/**
 * 保存更新服务器地址
 */
export const saveUpdateServer = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_SERVER_URL, url.trim());
};

/**
 * 获取更新服务器地址
 */
export const getUpdateServer = async (): Promise<string> => {
  return (
    (await AsyncStorage.getItem(STORAGE_KEYS.UPDATE_SERVER_URL)) || UPDATE_CONFIG.DEFAULT_SERVER
  );
};

/**
 * 下载并安装更新（使用 expo-updates）
 */
export const downloadAndInstallWithExpoUpdates = async (
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      return false;
    }

    await Updates.fetchUpdateAsync();

    await Updates.reloadAsync();
    return true;
  } catch (error) {
    console.error('下载更新失败:', error);
    return false;
  }
};

/**
 * 下载并安装更新（使用 IntentLauncher，适用于 APK）
 */
export const downloadAndInstallWithIntent = async (
  downloadUrl: string,
  onProgress?: (progress: number) => void,
  progressRef?: React.MutableRefObject<ReturnType<typeof setInterval> | null>
): Promise<boolean> => {
  try {
    const localUri = `${FileSystem.cacheDirectory}${UPDATE_CONFIG.APK_FILE_NAME}`;

    const downloadPromise = FileSystem.downloadAsync(downloadUrl, localUri);

    // 轮询进度
    const progressTimer = setInterval(async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists && 'size' in fileInfo) {
          // 估算进度（实际进度需要服务器支持）
          const estimated = Math.min(0.9, (fileInfo as any).size / 50000000);
          onProgress?.(estimated);
        }
        // 静默忽略：文件还没下载完成时 getInfoAsync 可能失败，不影响主流程
      } catch (error) {
        // 下载初期文件可能尚未生成，这里不打断主流程。
        void error;
      }
    }, 500);

    if (progressRef) {
      progressRef.current = progressTimer;
    }

    const result = await downloadPromise;

    clearInterval(progressTimer);
    onProgress?.(1);

    if (result.status !== 200) {
      return false;
    }

    // 启动安装
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: result.uri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });

    return true;
  } catch (error) {
    console.error('下载安装失败:', error);
    if (progressRef?.current) {
      clearInterval(progressRef.current);
    }
    return false;
  }
};
