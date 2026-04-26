/**
 * PDA 扫码器 Hook - 焦点录入模式
 * 
 * 使用方式：
 * import { usePDAScanner } from '@/hooks/usePDAScanner';
 * 
 * const { handleScan } = usePDAScanner({
 *   onScan: (code) => {
 *     console.log('收到扫码:', code);
 *   }
 * });
 * 
 * // 在输入框 onChangeText 中调用
 * <TextInput onChangeText={handleScan} />
 */

import { useRef, useCallback } from 'react';

interface UsePDAScannerOptions {
  /** 收到扫码数据时的回调 */
  onScan?: (code: string) => void;
  /** 防抖延迟（毫秒），默认 1500ms */
  debounceMs?: number;
  /** 最小码长度，默认 8 */
  minLength?: number;
}

/**
 * 清理字符串中的特殊字符
 */
function cleanCode(input: string): string {
  return input
    .trim()
    .replace(/[\r\n\t\s]+/g, '')  // 清理所有空白字符
    .replace(/^[^A-Za-z0-9]+/, '')  // 清理开头非字母数字
    .replace(/[^A-Za-z0-9]+$/, ''); // 清理结尾非字母数字
}

export function usePDAScanner({
  onScan,
  debounceMs = 1000,
  minLength = 8,
}: UsePDAScannerOptions = {}) {
  const lastCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 处理扫码输入
   * 每次输入变化时调用，自动检测扫码完成并触发回调
   */
  const handleScan = useCallback((input: string) => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 清理输入
    const code = cleanCode(input);

    // 如果输入包含换行符（模拟按键模式），立即触发
    if (input.includes('\n') || input.includes('\r')) {
      const cleanInput = cleanCode(input.replace(/[\r\n]+$/, ''));
      if (cleanInput && cleanInput.length >= minLength) {
        // 防抖：200ms 内的重复扫码忽略
        const now = Date.now();
        if (cleanInput === lastCodeRef.current && now - lastScanTimeRef.current < 200) {
          return;
        }
        lastCodeRef.current = cleanInput;
        lastScanTimeRef.current = now;

        console.log('[PDA Scanner] 模拟按键扫码:', cleanInput);
        onScan?.(cleanInput);
      }
      return;
    }

    // 焦点录入模式：设置定时器，输入停止后自动触发
    if (code.length >= minLength) {
      timerRef.current = setTimeout(() => {
        // 检查是否是最新的输入
        if (code === cleanCode(input)) {
          const now = Date.now();
          if (code === lastCodeRef.current && now - lastScanTimeRef.current < 200) {
            return;
          }
          lastCodeRef.current = code;
          lastScanTimeRef.current = now;

          console.log('[PDA Scanner] 焦点录入扫码:', code);
          onScan?.(code);
        }
      }, debounceMs);
    }
  }, [onScan, debounceMs, minLength]);

  /**
   * 清除状态
   */
  const clear = useCallback(() => {
    lastCodeRef.current = '';
    lastScanTimeRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    handleScan,
    clear,
  };
}
