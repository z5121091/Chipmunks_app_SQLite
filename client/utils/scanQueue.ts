import { generateId } from './database';

export enum QueueItemStatus {
  PENDING = 'pending',
  WRITING = 'writing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface QueueItem {
  id: string;
  scanData: string;
  parsed: any;
  status: QueueItemStatus;
  timestamp: number;
  errorMessage?: string;
  materialId?: string;
}

export interface BatchConfig {
  maxSize: number;
  interval: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxSize: 10,
  interval: 500,
};

const TERMINAL_ITEM_LIMIT = 50;

class ScanQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private config: BatchConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();

  private batchWriteToDatabase: (items: QueueItem[]) => Promise<{
    success: boolean[];
    materialIds: string[];
    errors: (string | null)[];
  }> = async () => {
    throw new Error('batchWriteToDatabase not configured');
  };

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[ScanQueue] initialized with config:', this.config);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  add(scanData: string, parsed: any): QueueItem {
    const item: QueueItem = {
      id: `queue_${generateId()}`,
      scanData,
      parsed,
      status: QueueItemStatus.PENDING,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    console.log(`[ScanQueue] added item ${item.id}, size: ${this.queue.length}`);
    this.notify();

    if (this.queue.length >= this.config.maxSize) {
      this.triggerBatchWrite();
    }

    return item;
  }

  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  getPendingItems(): QueueItem[] {
    return this.queue.filter((item) => item.status === QueueItemStatus.PENDING);
  }

  private triggerBatchWrite() {
    if (!this.isProcessing) {
      void this.processBatch();
    }
  }

  private async processBatch() {
    if (this.isProcessing) {
      console.log('[ScanQueue] batch already in progress, skipping');
      return;
    }

    const pendingItems = this.getPendingItems().slice(0, this.config.maxSize);
    if (pendingItems.length === 0) {
      console.log('[ScanQueue] no pending items');
      return;
    }

    this.isProcessing = true;
    console.log(`[ScanQueue] writing batch with ${pendingItems.length} items`);

    pendingItems.forEach((item) => {
      item.status = QueueItemStatus.WRITING;
    });
    this.notify();

    try {
      const results = await this.batchWriteToDatabase(pendingItems);

      pendingItems.forEach((item, index) => {
        if (results.success[index]) {
          item.status = QueueItemStatus.SUCCESS;
          item.materialId = results.materialIds[index];
          return;
        }

        item.status = QueueItemStatus.FAILED;
        item.errorMessage = results.errors[index] || 'write failed';
      });

      console.log(
        '[ScanQueue] batch complete, success count:',
        results.success.filter(Boolean).length
      );
    } catch (error) {
      console.error('[ScanQueue] batch write failed:', error);
      pendingItems.forEach((item) => {
        item.status = QueueItemStatus.FAILED;
        item.errorMessage = String(error);
      });
    } finally {
      this.isProcessing = false;
      this.cleanupCompletedItems();
      this.notify();

      if (this.getPendingItems().length > 0) {
        void this.processBatch();
      }
    }
  }

  private cleanupCompletedItems() {
    const removableIds = new Set<string>();
    const terminalStatuses = [
      QueueItemStatus.SUCCESS,
      QueueItemStatus.FAILED,
    ] as const;

    terminalStatuses.forEach((status) => {
      const items = this.queue.filter((item) => item.status === status);
      if (items.length <= TERMINAL_ITEM_LIMIT) {
        return;
      }

      items
        .slice(0, items.length - TERMINAL_ITEM_LIMIT)
        .forEach((item) => removableIds.add(item.id));
    });

    if (removableIds.size === 0) {
      return;
    }

    this.queue = this.queue.filter((item) => !removableIds.has(item.id));
    console.log(`[ScanQueue] cleaned terminal items: ${removableIds.size}`);
  }

  setBatchWriteFunction(fn: typeof this.batchWriteToDatabase) {
    this.batchWriteToDatabase = fn;
  }

  startTimer() {
    if (this.timer) {
      console.log('[ScanQueue] timer already running');
      return;
    }

    console.log('[ScanQueue] starting timer:', this.config.interval, 'ms');
    this.timer = setInterval(() => {
      const pending = this.getPendingItems();
      if (pending.length > 0 && !this.isProcessing) {
        console.log(`[ScanQueue] timer triggered batch write, pending: ${pending.length}`);
        void this.processBatch();
      }
    }, this.config.interval);
  }

  stopTimer() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
    console.log('[ScanQueue] timer stopped');
  }

  clear() {
    this.queue = [];
    this.notify();
    console.log('[ScanQueue] queue cleared');
  }

  getStats() {
    return {
      total: this.queue.length,
      pending: this.getPendingItems().length,
      writing: this.queue.filter((item) => item.status === QueueItemStatus.WRITING).length,
      success: this.queue.filter((item) => item.status === QueueItemStatus.SUCCESS).length,
      failed: this.queue.filter((item) => item.status === QueueItemStatus.FAILED).length,
    };
  }
}

export const scanQueue = new ScanQueue();
