/**
 * 扫码队列管理模块
 * PDA 扫码稳定架构：扫码广播 → 解析条码 → 队列缓存 → SQLite批量写入 → UI刷新
 */

import { MaterialRecord } from './database';

// 队列项状态
export enum QueueItemStatus {
  PENDING = 'pending',      // 待写入
  WRITING = 'writing',      // 正在写入
  SUCCESS = 'success',      // 写入成功
  FAILED = 'failed'         // 写入失败
}

// 队列项
export interface QueueItem {
  id: string;               // 唯一ID
  scanData: string;         // 扫码原始数据
  parsed: any;              // 解析后的数据
  status: QueueItemStatus;  // 状态
  timestamp: number;        // 入队时间
  errorMessage?: string;    // 错误信息
  materialId?: string;      // 数据库记录ID（成功后）
}

// 批量写入配置
export interface BatchConfig {
  maxSize: number;          // 最大批次大小
  interval: number;         // 批量写入间隔（毫秒）
}

// 默认配置
const DEFAULT_CONFIG: BatchConfig = {
  maxSize: 10,              // 每10条批量写入
  interval: 500             // 每500毫秒批量写入
};

class ScanQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private config: BatchConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[ScanQueue] 初始化队列，配置:', this.config);
  }

  // 订阅队列变化
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知监听器
  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // 添加到队列
  add(scanData: string, parsed: any): QueueItem {
    const item: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scanData,
      parsed,
      status: QueueItemStatus.PENDING,
      timestamp: Date.now()
    };

    this.queue.push(item);
    console.log(`[ScanQueue] 添加到队列: ${item.id}, 队列长度: ${this.queue.length}`);

    this.notify();

    // 检查是否需要触发批量写入
    if (this.queue.length >= this.config.maxSize) {
      this.triggerBatchWrite();
    }

    return item;
  }

  // 获取队列
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  // 获取待处理项
  getPendingItems(): QueueItem[] {
    return this.queue.filter(item => item.status === QueueItemStatus.PENDING);
  }

  // 触发批量写入
  private triggerBatchWrite() {
    if (!this.isProcessing) {
      this.processBatch();
    }
  }

  // 批量写入
  private async processBatch() {
    if (this.isProcessing) {
      console.log('[ScanQueue] 正在处理中，跳过');
      return;
    }

    // 🔥 限制每次批量处理的大小，防止突然扫太多导致卡顿
    const pendingItems = this.getPendingItems().slice(0, this.config.maxSize);
    if (pendingItems.length === 0) {
      console.log('[ScanQueue] 没有待处理项');
      return;
    }

    this.isProcessing = true;
    console.log(`[ScanQueue] 开始批量写入，数量: ${pendingItems.length}`);

    // 标记为写入中
    pendingItems.forEach(item => {
      item.status = QueueItemStatus.WRITING;
    });
    this.notify();

    try {
      // 调用外部提供的批量写入函数
      const results = await this.batchWriteToDatabase(pendingItems);

      // 更新状态
      pendingItems.forEach((item, index) => {
        if (results.success[index]) {
          item.status = QueueItemStatus.SUCCESS;
          item.materialId = results.materialIds[index];
        } else {
          item.status = QueueItemStatus.FAILED;
          item.errorMessage = results.errors[index] || '写入失败';
        }
      });

      console.log('[ScanQueue] 批量写入完成，成功:', results.success.filter(Boolean).length);
    } catch (error) {
      console.error('[ScanQueue] 批量写入异常:', error);
      pendingItems.forEach(item => {
        item.status = QueueItemStatus.FAILED;
        item.errorMessage = String(error);
      });
    } finally {
      this.isProcessing = false;
      this.notify();

      // 清理成功的项
      this.cleanupSuccessItems();

      // 检查是否还有待处理项
      if (this.getPendingItems().length > 0) {
        this.processBatch();
      }
    }
  }

  // 清理成功的项（保留最近50条用于显示）
  private cleanupSuccessItems() {
    const successItems = this.queue.filter(item => item.status === QueueItemStatus.SUCCESS);
    if (successItems.length > 50) {
      const toRemove = successItems.slice(0, successItems.length - 50);
      this.queue = this.queue.filter(item => !toRemove.includes(item));
      console.log(`[ScanQueue] 清理成功项: ${toRemove.length}条`);
    }
  }

  // 设置批量写入函数（由外部实现）
  private batchWriteToDatabase: (items: QueueItem[]) => Promise<{
    success: boolean[];
    materialIds: string[];
    errors: (string | null)[];
  }> = async () => {
    throw new Error('batchWriteToDatabase 未设置');
  };

  // 设置批量写入函数
  setBatchWriteFunction(fn: typeof this.batchWriteToDatabase) {
    this.batchWriteToDatabase = fn;
  }

  // 定时触发器（用于定期批量写入）
  startTimer() {
    if (this.timer) {
      console.log('[ScanQueue] 定时器已在运行，不重复启动');
      return;
    }

    console.log('[ScanQueue] 启动定时器，间隔:', this.config.interval, 'ms');
    this.timer = setInterval(() => {
      const pending = this.getPendingItems();
      if (pending.length > 0 && !this.isProcessing) {
        console.log(`[ScanQueue] ⏰ 定时触发批量写入，待处理: ${pending.length}条`);
        this.processBatch();
      }
    }, this.config.interval);

    console.log('[ScanQueue] 定时器已启动');
  }

  // 停止定时器
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[ScanQueue] 定时器已停止');
    }
  }

  // 清空队列
  clear() {
    this.queue = [];
    this.notify();
    console.log('[ScanQueue] 队列已清空');
  }

  // 获取统计信息
  getStats() {
    return {
      total: this.queue.length,
      pending: this.getPendingItems().length,
      writing: this.queue.filter(item => item.status === QueueItemStatus.WRITING).length,
      success: this.queue.filter(item => item.status === QueueItemStatus.SUCCESS).length,
      failed: this.queue.filter(item => item.status === QueueItemStatus.FAILED).length
    };
  }
}

// 导出单例
export const scanQueue = new ScanQueue();
