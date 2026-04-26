/**
 * 心跳检测工具
 * 
 * 封装心跳检测逻辑，支持连接状态管理和自动重连
 */
import { useRef, useCallback, useEffect } from 'react';
import { NETWORK_CONFIG, SyncConfig, ConnectionStatus } from '@/constants/config';

/** 心跳回调 */
export interface HeartbeatCallbacks {
  onSuccess?: () => void;
  onError?: () => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * 心跳检测 Hook
 */
export const useHeartbeat = (
  syncConfig: SyncConfig,
  callbacks?: HeartbeatCallbacks
) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);
  const isRunningRef = useRef(false);

  // 单次心跳检测
  const ping = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.ip) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_CONFIG.HEARTBEAT_TIMEOUT);

      const response = await fetch(
        `http://${syncConfig.ip}:${syncConfig.port || NETWORK_CONFIG.DEFAULT_PORT}/health`,
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, [syncConfig.ip, syncConfig.port]);

  // 开始心跳检测
  const start = useCallback(() => {
    if (timerRef.current || !syncConfig.ip) return;

    isRunningRef.current = true;
    failureCountRef.current = 0;
    callbacks?.onStatusChange?.('testing');

    const check = async () => {
      if (!isRunningRef.current) return;

      const success = await ping();
      
      if (success) {
        failureCountRef.current = 0;
        callbacks?.onStatusChange?.('success');
        callbacks?.onSuccess?.();
      } else {
        failureCountRef.current++;
        
        if (failureCountRef.current >= NETWORK_CONFIG.MAX_FAILURE_COUNT) {
          callbacks?.onStatusChange?.('error');
          callbacks?.onError?.();
          stop();
        }
      }
    };

    // 立即执行一次
    check();
    
    // 定时检测
    timerRef.current = setInterval(check, NETWORK_CONFIG.HEARTBEAT_INTERVAL);
  }, [syncConfig.ip, ping, callbacks]);

  // 停止心跳检测
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    callbacks?.onStatusChange?.('disconnected');
  }, [callbacks]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    start,
    stop,
    ping,
  };
};

/**
 * 测试连接（单次）
 */
export const testConnection = async (config: SyncConfig): Promise<boolean> => {
  if (!config.ip) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_CONFIG.HEARTBEAT_TIMEOUT);

    const response = await fetch(
      `http://${config.ip}:${config.port || NETWORK_CONFIG.DEFAULT_PORT}/health`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};
