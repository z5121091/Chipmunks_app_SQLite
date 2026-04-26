import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

/**
 * 存储适配器接口
 * 定义所有数据操作方法
 */
interface IStorageAdapter {
  init(): Promise<void>;
  getAll<T>(tableName: string): Promise<T[]>;
  getById<T>(tableName: string, id: string): Promise<T | null>;
  create(tableName: string, data: Record<string, any>): Promise<string>;
  update(tableName: string, id: string, data: Record<string, any>): Promise<void>;
  delete(tableName: string, id: string): Promise<void>;
  clear(tableName: string): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * 内存适配器（Web/虚拟机使用）
 * 使用 JavaScript 对象模拟数据库
 */
class MemoryAdapter implements IStorageAdapter {
  private data: Map<string, Record<string, any>[]> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    console.log('📦 MemoryAdapter: 使用内存存储（Web/虚拟机模式）');
    this.initialized = true;
  }

  private ensureTable(tableName: string): void {
    if (!this.data.has(tableName)) {
      this.data.set(tableName, []);
    }
  }

  async getAll<T>(tableName: string): Promise<T[]> {
    this.ensureTable(tableName);
    return (this.data.get(tableName) || []) as T[];
  }

  async getById<T>(tableName: string, id: string): Promise<T | null> {
    const records = await this.getAll<T>(tableName);
    return records.find((r: any) => r.id === id) || null;
  }

  async create(tableName: string, data: Record<string, any>): Promise<string> {
    this.ensureTable(tableName);
    const records = this.data.get(tableName)!;
    const id = data.id || this.generateId();
    const record = { ...data, id };
    records.push(record);
    return id;
  }

  async update(tableName: string, id: string, data: Record<string, any>): Promise<void> {
    this.ensureTable(tableName);
    const records = this.data.get(tableName)!;
    const index = records.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...data };
    }
  }

  async delete(tableName: string, id: string): Promise<void> {
    this.ensureTable(tableName);
    const records = this.data.get(tableName)!;
    const index = records.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      records.splice(index, 1);
    }
  }

  async clear(tableName: string): Promise<void> {
    this.data.delete(tableName);
  }

  async clearAll(): Promise<void> {
    this.data.clear();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * SQLite 适配器（实机使用）
 * 使用真实的 SQLite 数据库
 */
class SQLiteAdapter implements IStorageAdapter {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    console.log('💾 SQLiteAdapter: 使用 SQLite 数据库（实机模式）');
    this.db = await SQLite.openDatabaseAsync('warehouse.db');

    // 启用 WAL 模式和外键约束
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // 创建所有表
    await this.createTables();

    // 插入默认数据
    await this.insertDefaultData();

    this.initialized = true;
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_no TEXT NOT NULL UNIQUE,
        customer_name TEXT,
        warehouse_id TEXT,
        warehouse_name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        order_no TEXT DEFAULT '',
        customer_name TEXT,
        operation_type TEXT NOT NULL DEFAULT 'inbound',
        model TEXT NOT NULL,
        batch TEXT DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        package TEXT DEFAULT '',
        version TEXT DEFAULT '',
        productionDate TEXT DEFAULT '',
        traceNo TEXT DEFAULT '',
        sourceNo TEXT DEFAULT '',
        scanned_at TEXT NOT NULL,
        raw_content TEXT,
        customFields TEXT,
        isUnpacked INTEGER DEFAULT 0,
        original_quantity TEXT,
        remaining_quantity TEXT,
        warehouse_id TEXT,
        warehouse_name TEXT,
        inventory_code TEXT,
        rule_id INTEGER,
        rule_name TEXT
      );

      CREATE TABLE IF NOT EXISTS unpack_records (
        id TEXT PRIMARY KEY,
        original_material_id TEXT NOT NULL,
        order_no TEXT NOT NULL,
        customer_name TEXT,
        model TEXT NOT NULL,
        batch TEXT,
        package TEXT,
        version TEXT,
        warehouse_id TEXT,
        warehouse_name TEXT,
        inventory_code TEXT,
        original_quantity TEXT NOT NULL,
        new_quantity TEXT NOT NULL,
        productionDate TEXT,
        traceNo TEXT,
        new_traceNo TEXT,
        sourceNo TEXT,
        label_type TEXT,
        pair_id TEXT NOT NULL,
        status TEXT,
        notes TEXT,
        unpacked_at TEXT NOT NULL,
        printed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS print_history (
        id TEXT PRIMARY KEY,
        unpack_record_ids TEXT NOT NULL,
        export_format TEXT NOT NULL,
        export_file_path TEXT,
        printed_at TEXT NOT NULL,
        print_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qr_code_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        separator TEXT NOT NULL,
        field_order TEXT NOT NULL,
        custom_field_ids TEXT,
        is_active INTEGER DEFAULT 1,
        supplier_name TEXT,
        match_conditions TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_fields (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        required INTEGER DEFAULT 0,
        options TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_bindings (
        id TEXT PRIMARY KEY,
        scan_model TEXT NOT NULL UNIQUE,
        inventory_code TEXT NOT NULL UNIQUE,
        supplier TEXT,
        description TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inbound_records (
        id TEXT PRIMARY KEY,
        inbound_no TEXT NOT NULL UNIQUE,
        warehouse_id TEXT NOT NULL,
        warehouse_name TEXT NOT NULL,
        inventory_code TEXT,
        scan_model TEXT NOT NULL,
        batch TEXT,
        quantity INTEGER NOT NULL,
        in_date TEXT NOT NULL,
        notes TEXT,
        raw_content TEXT,
        created_at TEXT NOT NULL,
        package TEXT,
        version TEXT,
        productionDate TEXT,
        traceNo TEXT,
        sourceNo TEXT,
        customFields TEXT
      );

      CREATE TABLE IF NOT EXISTS inventory_check_records (
        id TEXT PRIMARY KEY,
        check_no TEXT NOT NULL UNIQUE,
        warehouse_id TEXT NOT NULL,
        warehouse_name TEXT NOT NULL,
        inventory_code TEXT,
        scan_model TEXT NOT NULL,
        batch TEXT,
        quantity INTEGER,
        check_type TEXT NOT NULL,
        actual_quantity INTEGER,
        check_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        package TEXT,
        version TEXT,
        productionDate TEXT,
        traceNo TEXT,
        sourceNo TEXT,
        customFields TEXT
      );

      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_materials_order ON materials(order_no);
      CREATE INDEX IF NOT EXISTS idx_inventory_bindings_scan_model ON inventory_bindings(scan_model);
      CREATE INDEX IF NOT EXISTS idx_inventory_bindings_inventory_code ON inventory_bindings(inventory_code);
    `);
  }

  private async insertDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 检查是否已插入默认数据
    const count = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM warehouses'
    );

    if (count && count.count > 0) {
      return; // 已有数据，跳过
    }

    // 插入默认仓库
    const isoDateTime = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO warehouses (id, name, description, is_default, created_at) VALUES (?, ?, ?, ?, ?)`,
      [this.generateId(), '主仓库', '默认仓库', 1, isoDateTime]
    );

    // 插入默认规则（极海半导体）
    await this.db.runAsync(
      `INSERT INTO qr_code_rules (id, name, description, separator, field_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'default_jihai',
        '极海半导体',
        '型号/批次/封装/版本号/数量/生产日期年周/追踪码/箱号',
        '/',
        JSON.stringify(['model', 'batch', 'package', 'version', 'quantity', 'productionDate', 'traceNo', 'sourceNo']),
        1,
        isoDateTime,
        isoDateTime
      ]
    );
  }

  async getAll<T>(tableName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<T>(`SELECT * FROM ${tableName}`);
  }

  async getById<T>(tableName: string, id: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<T>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
  }

  async create(tableName: string, data: Record<string, any>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = data.id || this.generateId();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    await this.db.runAsync(
      `INSERT INTO ${tableName} (id, ${columns.join(', ')}) VALUES (?, ${placeholders})`,
      [id, ...values]
    );

    return id;
  }

  async update(tableName: string, id: string, data: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    await this.db.runAsync(
      `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
  }

  async delete(tableName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
  }

  async clear(tableName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(`DELETE FROM ${tableName}`);
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      'orders',
      'materials',
      'unpack_records',
      'print_history',
      'qr_code_rules',
      'custom_fields',
      'warehouses',
      'inventory_bindings',
      'inbound_records',
      'inventory_check_records',
      'system_config'
    ];

    for (const table of tables) {
      await this.db.runAsync(`DELETE FROM ${table}`);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 存储适配器工厂
 * 根据平台自动选择适配器
 */
let adapter: IStorageAdapter | null = null;

export const getStorageAdapter = (): IStorageAdapter => {
  if (!adapter) {
    // Web 端和模拟器使用内存适配器
    // 实机（iOS/Android）使用 SQLite 适配器
    if (Platform.OS === 'web' || Platform.isTV) {
      console.log('🌐 检测到 Web/模拟器环境，使用内存存储');
      adapter = new MemoryAdapter();
    } else {
      console.log('📱 检测到实机环境，使用 SQLite 数据库');
      adapter = new SQLiteAdapter();
    }
  }
  return adapter;
};

export const resetAdapter = (): void => {
  adapter = null;
};
