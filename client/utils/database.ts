import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { APP_VERSION } from '@/constants/version';
import { STORAGE_KEYS, ExportType, ExportCountData } from '@/constants/config';
import { getISODateTime, getExportDateTime, formatDateTime } from './time';

// 使用 any 绕过类型检查
const FS = FileSystem as any;

// 重新导出 STORAGE_KEYS，供其他模块使用
export { STORAGE_KEYS };

  // 安装 ID 存储键（已废弃，现在改用数据库存储）
const INSTALL_ID_KEY = '@warehouse_app_install_id';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// 检测是否为 Web 平台
const isWebPlatform = Platform.OS === 'web';

// 数据版本
const CURRENT_DATA_VERSION = 12;

// 匹配条件接口（简化版：指定位置字段包含指定关键字）
export interface MatchCondition {
  fieldIndex: number;           // 字段位置（从0开始）
  keyword: string;              // 匹配关键字（字段值包含此关键字即匹配）
}

// 二维码解析规则接口
export interface QRCodeRule {
  id: string;
  name: string;           // 厂家/规则名称，如"极海半导体"
  description: string;    // 规则描述
  separator: string;      // 分隔符，如 "/"、","、"*"等
  fieldOrder: string[];   // 字段顺序，标准字段用原名称（如"model"），自定义字段用"custom:字段ID"格式
  customFieldIds?: string[]; // 关联的自定义字段ID列表（已弃用，保留兼容性）
  isActive: boolean;      // 是否启用
  supplierName?: string;  // 供应商名称（可选）
  matchConditions?: MatchCondition[]; // 识别条件（可选，用于区分相同分隔符和字段数的规则）
  created_at: string;
  updated_at: string;
}

// 字段定义（用于显示）
export const FIELD_LABELS: Record<string, string> = {
  model: '型号',
  batch: '批次', 
  package: '封装',
  version: '版本号',
  quantity: '数量',
  productionDate: '生产日期',
  traceNo: '追踪码',
  sourceNo: '箱号',
};

// 固定字段顺序（极海半导体标准格式：型号/批次/封装/版本/数量/生产日期/追踪码/箱号）
// 这个顺序是固定的，无论用户用什么分隔符，都会按这个顺序提取值
export const STANDARD_FIELD_ORDER = [
  'model',          // 0: 型号
  'batch',          // 1: 批次
  'package',        // 2: 封装
  'version',        // 3: 版本号
  'quantity',       // 4: 数量
  'productionDate', // 5: 生产日期
  'traceNo',        // 6: 追踪码
  'sourceNo',       // 7: 箱号
];

// 可用字段列表
export const AVAILABLE_FIELDS = [
  'model',
  'batch', 
  'package',
  'version',
  'quantity',
  'productionDate',
  'traceNo',
  'sourceNo',
];

// 判断是否为自定义字段
export const isCustomField = (field: string): boolean => {
  return field.startsWith('custom:');
};

// 获取自定义字段ID
export const getCustomFieldId = (field: string): string => {
  return field.replace('custom:', '');
};

// 创建自定义字段标识
export const createCustomFieldKey = (fieldId: string): string => {
  return `custom:${fieldId}`;
};

// 自定义字段定义接口
export interface CustomField {
  id: string;
  name: string;           // 字段名称（显示名称）
  type: 'text' | 'number' | 'date' | 'select';  // 字段类型
  required: boolean;      // 是否必填
  options?: string[];     // 选择类型的选项
  sortOrder: number;      // 排序顺序
  created_at: string;
  updated_at: string;
}

// 物料记录接口（完整版，包含极海半导体所有字段）
export interface MaterialRecord {
  id: string;
  order_no: string;
  customer_name: string;
  operation_type: 'inbound' | 'outbound' | 'inventory';
  rule_id?: string;       // 使用的规则ID
  rule_name?: string;     // 使用的规则名称
  // 核心字段
  model: string;          // 型号
  batch: string;          // 批次
  quantity: number;       // 未拆包时为原始数量，拆包后为累计发货数量（数据库是 INTEGER）
  // 扩展字段
  package: string;        // 封装
  version: string;        // 版本号
  productionDate: string; // 生产日期年周
  traceNo: string;        // 追踪码
  sourceNo: string;       // 箱号
  // 系统字段
  scanned_at: string;
  raw_content: string;
  separator?: string;       // 扫码时使用的分隔符（用于显示拆分结果）
  // 自定义字段
  customFields?: Record<string, string>;  // 自定义字段值，key为字段ID
  // 拆包相关
  isUnpacked?: boolean;      // 是否已拆包
  unpackCount?: number;      // 拆包次数
  original_quantity?: string; // 原始数量（第一次拆包时记录）
  remaining_quantity?: string; // 剩余数量（用于下次扫码拆包）
  // V3.0 新增字段
  warehouse_id?: string;     // 仓库ID
  warehouse_name?: string;   // 仓库名称（冗余存储）
  inventory_code?: string;   // 存货编码
}

// 订单接口
export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  created_at: string;
  // V3.0 新增字段
  warehouse_id?: string;  // 仓库ID
  warehouse_name?: string; // 仓库名称（冗余存储，方便显示）
}

// ============== V3.0 新增接口 ==============

// 仓库接口
export interface Warehouse {
  id: string;
  name: string;           // 仓库名称
  description?: string;   // 仓库描述
  is_default?: boolean;   // 是否默认仓库
  created_at?: string;    // 创建时间
}

// 物料管理接口（型号-存货编码绑定）
export interface InventoryBinding {
  id: string;
  scan_model: string;     // 扫描型号
  inventory_code: string; // 存货编码
  supplier?: string;      // 供应商
  description?: string;   // 描述备注
  created_at: string;
}

// 入库记录接口
export interface InboundRecord {
  id: string;
  inbound_no: string;     // 入库单号（RK+日期+序号）
  warehouse_id: string;   // 仓库ID
  warehouse_name: string; // 仓库名称（冗余存储）
  inventory_code: string; // 存货编码
  scan_model: string;     // 扫描型号
  batch: string;          // 批次
  quantity: number;       // 数量（数值类型，便于Excel求和）
  in_date: string;        // 入库日期
  notes?: string;         // 备注
  rawContent?: string;    // 原始二维码内容（新增）
  created_at: string;
  // 扩展字段
  package?: string;       // 封装
  version?: string;       // 版本号
  productionDate?: string; // 生产日期
  traceNo?: string;       // 追踪码
  sourceNo?: string;       // 箱号
  customFields?: Record<string, string>; // 自定义字段
}

// 盘点记录接口
export interface InventoryCheckRecord {
  id: string;
  check_no: string;       // 盘点单号（PD+日期+序号）
  warehouse_id: string;   // 仓库ID
  warehouse_name: string; // 仓库名称（冗余存储）
  inventory_code: string; // 存货编码
  scan_model: string;     // 扫描型号
  batch: string;          // 批次
  quantity: number;       // 数量（数值类型）
  check_type: 'whole' | 'partial';  // 整包/拆包
  actual_quantity?: number; // 实际数量（拆包时填写）
  check_date: string;     // 盘点日期
  notes?: string;         // 备注
  created_at: string;
  // 扩展字段
  package?: string;       // 封装
  version?: string;       // 版本号
  productionDate?: string; // 生产日期
  traceNo?: string;       // 追踪码
  sourceNo?: string;      // 箱号
  customFields?: Record<string, string>; // 自定义字段
}

// ============== 拆包记录相关接口 ==============

// 拆包记录接口
export interface UnpackRecord {
  id: string;
  // 关联原物料
  original_material_id: string;
  // 物料信息（冗余存储，方便查询）
  order_no: string;
  customer_name: string;
  model: string;
  batch: string;
  package: string;
  version: string;
  // V3.0 新增：仓库信息
  warehouse_id?: string;
  warehouse_name?: string;
  // V3.0 新增：存货编码
  inventory_code?: string;
  // 数量信息
  original_quantity: string;   // 原数量（拆包前的总数）
  new_quantity: string;        // 当前标签数量
  // 溯源信息
  productionDate: string;
  traceNo: string;             // 原追踪码
  new_traceNo: string;         // 新追踪码（拆包生成）
  sourceNo: string;            // 箱号（不变）
  // 标签类型：shipped=发货标签（拆出的部分），remaining=剩余标签（剩余的部分）
  label_type: 'shipped' | 'remaining';
  // 关联ID：发货标签和剩余标签是一对，通过这个字段关联
  pair_id: string;
  // 状态
  status: 'pending' | 'printed';  // pending(待打印) / printed(已打印)
  // 备注
  notes: string;
  // 操作信息
  unpacked_at: string;         // 拆包时间
  printed_at: string | null;   // 打印时间
  created_at: string;
  updated_at: string;
}

// 打印历史接口
export interface PrintHistory {
  id: string;
  // 关联拆包记录
  unpack_record_ids: string[];  // 支持批量
  // 导出信息
  export_format: 'csv' | 'excel' | 'json';
  export_file_path: string | null;
  // 打印信息
  printed_at: string;
  print_count: number;          // 打印份数
  created_at: string;
}

// 备份数据接口
export interface BackupData {
  version: number;
  timestamp: string;
  backupTime?: string;
  // 只包含配置数据，不包含业务数据
  rules: QRCodeRule[];
  customFields: CustomField[];
  // V3.0 新增
  inventoryBindings: InventoryBinding[];
  warehouses: Warehouse[];
  syncConfig?: any;
  stats?: {
    rules: number;
    customFields: number;
    inventoryBindings: number;
    warehouses: number;
    hasSyncConfig?: boolean;
  };
}

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// 辅助函数：JSON 字符串化/解析
const jsonToString = (obj: any): string => {
  return JSON.stringify(obj);
};

const stringToJson = <T>(str: string | null): T | null => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

// 获取数据库实例
const getDb = (): SQLite.SQLiteDatabase => {
  if (isWebPlatform) {
    // Web 平台返回 mock 对象
    console.log('[Web Platform] Using mock database');
    return createMockDatabase();
  }

  if (!db) {
    // 如果数据库未初始化，尝试自动初始化
    console.warn('[getDb] 数据库未初始化，尝试自动初始化...');
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
};

// 创建 mock 数据库（用于 Web 预览）
// 使用内存存储模拟数据库功能，尽可能模拟 SQLite 行为
const mockTables: Record<string, any[]> = {
  warehouses: [],
  orders: [],
  materials: [],
  inventory_bindings: [],
  qr_code_rules: [],
  inbound_records: [],
  inventory_check_records: [],
  unpack_records: [],
  print_history: [],
  custom_fields: [],
  system_config: [],
};

// 调试函数：打印所有表的状态
const debugDumpTables = () => {
  console.log('[MockDB] ===== Database State Dump =====');
  Object.entries(mockTables).forEach(([tableName, rows]) => {
    console.log(`[MockDB] Table: ${tableName} (${rows.length} rows)`);
    if (rows.length > 0) {
      console.log(`[MockDB]   First row:`, rows[0]);
    }
  });
  console.log('[MockDB] ===== End Dump =====');
};

// 全局暴露调试函数（在控制台可以调用）
if (typeof global !== 'undefined') {
  (global as any).debugDumpTables = debugDumpTables;
}

// 解析 WHERE 条件并过滤数据
const filterByWhere = (rows: any[], whereClause: string, params: any[]): any[] => {
  console.log(`[MockDB] filterByWhere: whereClause="${whereClause}", params=`, params);

  if (!whereClause || !params || params.length === 0) return rows;

  // 处理 LIKE 操作符
  const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+\?/);
  if (likeMatch) {
    const column = likeMatch[1];
    const pattern = params[0];
    // 转换 SQL LIKE 模式为正则表达式
    // % -> .*, _ -> .
    const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const result = rows.filter(row => {
      const rowValue = row[column] || '';
      return regex.test(String(rowValue));
    });
    console.log(`[MockDB] LIKE filter: column=${column}, pattern=${pattern}, result=${result.length} rows`);
    return result;
  }

  // 处理单个条件
  const singleMatch = whereClause.match(/^(\w+)\s*=\s*\?$/);
  if (singleMatch) {
    const column = singleMatch[1];
    const value = params[0];
    const result = rows.filter(row => {
      const rowValue = row[column];
      const matched = typeof rowValue === 'number' && typeof value === 'number'
        ? rowValue === value
        : String(rowValue) === String(value);
      console.log(`[MockDB] Single condition: ${column}="${rowValue}" ?= "${value}" -> ${matched}`);
      return matched;
    });
    console.log(`[MockDB] Single filter result: ${result.length} rows`);
    return result;
  }

  // 处理多个条件（使用 AND 分隔）
  const conditions = whereClause.split(/\s+AND\s+/i);
  console.log(`[MockDB] Multiple conditions:`, conditions);
  console.log(`[MockDB] Total rows before filter: ${rows.length}`);

  const result = rows.filter((row, rowIndex) => {
    console.log(`[MockDB] Checking row ${rowIndex}:`, row);
    let allMatched = true;

    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i].trim();
      const condMatch = cond.match(/(\w+)\s*=\s*\?/);

      if (condMatch) {
        const column = condMatch[1];
        const value = params[i];
        const rowValue = row[column];
        const matched = String(rowValue) === String(value);

        console.log(`[MockDB]   Condition ${i}: ${column}="${rowValue}" ?= "${value}" -> ${matched}`);

        if (!matched) {
          allMatched = false;
          console.log(`[MockDB]   Row ${rowIndex} rejected`);
          break;
        }
      }
    }

    if (allMatched) {
      console.log(`[MockDB]   Row ${rowIndex} accepted`);
    }

    return allMatched;
  });

  console.log(`[MockDB] Multiple filter result: ${result.length} rows`);
  return result;
};

const createMockDatabase = (): SQLite.SQLiteDatabase => {
  return {
    execAsync: async (sql: string) => {
      console.log('[MockDB] execAsync:', sql);
      // 处理 CREATE TABLE 语句
      if (sql.includes('CREATE TABLE')) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (match) {
          const tableName = match[1];
          if (!mockTables[tableName]) {
            mockTables[tableName] = [];
            console.log(`[MockDB] Created table: ${tableName}`);
          }
        }
      }
      // 处理 PRAGMA 语句
      if (sql.trim().startsWith('PRAGMA')) {
        console.log('[MockDB] PRAGMA:', sql);
      }
    },
    runAsync: async (sql: string, params?: any[]) => {
      console.log('[MockDB] runAsync:', sql, params);

      // 处理 INSERT 语句
      if (sql.trim().startsWith('INSERT INTO')) {
        // 提取表名和列名（使用更灵活的正则表达式）
        const tableMatch = sql.match(/INSERT INTO (\w+)/);
        const columnsMatch = sql.match(/INSERT INTO \w+ \((.*?)\)/s);

        if (tableMatch && columnsMatch) {
          const tableName = tableMatch[1];
          const columns = columnsMatch[1].split(',').map(c => c.trim());
          const row: any = {};
          params?.forEach((value, index) => {
            if (index < columns.length) {
              row[columns[index]] = value;
            }
          });

          // 确保表存在
          if (!mockTables[tableName]) {
            mockTables[tableName] = [];
            console.log(`[MockDB] Auto-created table: ${tableName}`);
          }

          mockTables[tableName].push(row);
          console.log(`[MockDB] Inserted into ${tableName}:`, row);
          console.log(`[MockDB] Table now has ${mockTables[tableName].length} rows`);
          return { changes: 1, lastInsertRowId: mockTables[tableName].length };
        } else {
          console.error('[MockDB] Failed to parse INSERT statement:', sql);
        }
      }

      // 处理 UPDATE 语句
      if (sql.trim().startsWith('UPDATE')) {
        const match = sql.match(/UPDATE (\w+) SET (.*?) WHERE (.*)/s);
        if (match) {
          const tableName = match[1];
          const setClause = match[2].trim();
          const whereClause = match[3].trim();
          const rows = mockTables[tableName] || [];

          // 解析 SET 子句（格式：column = ?, column = ?, ...）
          const setParts = setClause.split(',').map(p => p.trim());
          const columnNames = setParts.map(part => part.split('=')[0].trim());

          // 找到匹配的行
          let updatedCount = 0;
          if (whereClause && params) {
            const filtered = filterByWhere(rows, whereClause, params.slice(columnNames.length));
            filtered.forEach(row => {
              // 更新字段值
              columnNames.forEach((col, index) => {
                row[col] = params[index];
              });
              updatedCount++;
            });
          } else {
            updatedCount = rows.length;
          }
          console.log(`[MockDB] Updated ${updatedCount} rows in ${tableName}`);
          return { changes: updatedCount, lastInsertRowId: 0 };
        }
      }

      // 处理 DELETE 语句
      if (sql.trim().startsWith('DELETE')) {
        const match = sql.match(/DELETE FROM (\w+) WHERE (.*)/);
        if (match) {
          const tableName = match[1];
          const whereClause = match[2];
          const rows = mockTables[tableName] || [];

          if (whereClause && params) {
            const filtered = filterByWhere(rows, whereClause, params);
            // 从原数组中删除匹配的行
            filtered.forEach(row => {
              const index = rows.indexOf(row);
              if (index > -1) {
                rows.splice(index, 1);
              }
            });
            console.log(`[MockDB] Deleted ${filtered.length} rows from ${tableName}`);
            return { changes: filtered.length, lastInsertRowId: 0 };
          } else {
            const count = rows.length;
            mockTables[tableName] = [];
            console.log(`[MockDB] Cleared ${tableName} (${count} rows)`);
            return { changes: count, lastInsertRowId: 0 };
          }
        }
      }

      return { changes: 0, lastInsertRowId: 0 };
    },
    getAllAsync: async <T>(sql: string, params?: any[]): Promise<T[]> => {
      console.log('[MockDB] getAllAsync:', sql, params);

      // 处理 SELECT 语句
      if (sql.trim().startsWith('SELECT')) {
        const match = sql.match(/FROM (\w+)/);
        if (match) {
          const tableName = match[1];

          // 检查表是否存在
          if (!mockTables[tableName]) {
            console.log(`[MockDB] Table "${tableName}" does not exist! Available tables:`, Object.keys(mockTables));
            return [];
          }

          const results = mockTables[tableName] || [];

          // 提取 SELECT 指定的字段
          const selectMatch = sql.match(/SELECT (.+?) FROM/i);
          const selectClause = selectMatch ? selectMatch[1].trim() : '*';

          // 处理 WHERE 条件
          let filteredResults = [...results];
          // 改进正则表达式，更可靠地提取 WHERE 子句
          const whereMatch = sql.match(/WHERE (.+?)(?:\s+ORDER BY|\s+LIMIT|$)/is);
          if (whereMatch && params) {
            const whereClause = whereMatch[1].trim();
            console.log(`[MockDB] Detected WHERE clause: "${whereClause}"`);
            filteredResults = filterByWhere(results, whereClause, params);
          } else {
            console.log(`[MockDB] No WHERE clause detected or no params provided`);
          }

          // 处理 ORDER BY
          if (sql.includes('ORDER BY')) {
            const orderMatch = sql.match(/ORDER BY (\w+) (DESC|ASC)/);
            if (orderMatch) {
              const column = orderMatch[1];
              const direction = orderMatch[2];
              filteredResults.sort((a, b) => {
                const aVal = a[column] || '';
                const bVal = b[column] || '';
                if (direction === 'DESC') {
                  return aVal > bVal ? -1 : 1;
                } else {
                  return aVal < bVal ? -1 : 1;
                }
              });
              console.log(`[MockDB] ORDER BY: ${column} ${direction}`);
            }
          }

          // 处理 LIMIT
          const limitMatch = sql.match(/LIMIT (\d+)/);
          if (limitMatch) {
            const limit = parseInt(limitMatch[1], 10);
            filteredResults = filteredResults.slice(0, limit);
            console.log(`[MockDB] LIMIT: ${limit}`);
          }

          // 如果是 SELECT *，返回整行
          if (selectClause === '*') {
            console.log(`[MockDB] Selected ${filteredResults.length} rows from ${tableName}`);
            return filteredResults as T[];
          }

          // 如果是 COUNT 等聚合函数，特殊处理
          if (selectClause.includes('COUNT(*)') || selectClause.includes('count')) {
            const countResults = filteredResults.map(() => ({ count: filteredResults.length }));
            console.log(`[MockDB] Selected COUNT (${filteredResults.length}) from ${tableName}`);
            return countResults as T[];
          }

          // 否则只返回指定的字段
          const columns = selectClause.split(',').map(c => c.trim());
          const mappedResults = filteredResults.map(row => {
            const result: any = {};
            columns.forEach(col => {
              result[col] = row[col];
            });
            return result;
          });

          console.log(`[MockDB] Selected ${mappedResults.length} rows (${selectClause}) from ${tableName}`);
          return mappedResults as T[];
        }
      }

      return [];
    },
    getFirstAsync: async <T>(sql: string, params?: any[]): Promise<T | null> => {
      console.log('[MockDB] getFirstAsync:', sql, params);

      // 处理 SELECT 语句
      if (sql.trim().startsWith('SELECT')) {
        const match = sql.match(/FROM (\w+)/);
        if (match) {
          const tableName = match[1];

          // 检查表是否存在
          if (!mockTables[tableName]) {
            console.log(`[MockDB] Table "${tableName}" does not exist! Available tables:`, Object.keys(mockTables));
            return null;
          }

          const results = mockTables[tableName] || [];

          // 提取 SELECT 指定的字段
          const selectMatch = sql.match(/SELECT (.+?) FROM/i);
          if (selectMatch) {
            const selectClause = selectMatch[1].trim();

            // 处理 WHERE 条件
            let filteredResults = [...results];
            // 改进正则表达式，更可靠地提取 WHERE 子句
            const whereMatch = sql.match(/WHERE (.+?)(?:\s+ORDER BY|\s+LIMIT|$)/is);
            if (whereMatch && params) {
              const whereClause = whereMatch[1].trim();
              console.log(`[MockDB] Detected WHERE clause: "${whereClause}"`);
              filteredResults = filterByWhere(results, whereClause, params);
            } else {
              console.log(`[MockDB] No WHERE clause detected or no params provided`);
            }

            // 如果是 COUNT(*) 等聚合函数，始终返回计数
            if (selectClause.includes('COUNT(*)') || selectClause.includes('count')) {
              const result: any = { count: filteredResults.length };
              console.log(`[MockDB] COUNT result: ${result.count} rows`);
              return result as T;
            }

            // 如果有结果
            if (filteredResults.length > 0) {
              const row = filteredResults[0];

              // 如果是 SELECT *，返回整行
              if (selectClause === '*') {
                console.log(`[MockDB] Found first row (*) in ${tableName}:`, row);
                return row as T;
              }

              // 否则只返回指定的字段
              const columns = selectClause.split(',').map(c => c.trim());
              const result: any = {};
              columns.forEach(col => {
                result[col] = row[col];
              });
              console.log(`[MockDB] Found first row (${selectClause}) in ${tableName}:`, result);
              return result as T;
            }
          }
        }
      }

      console.log('[MockDB] No result found');
      return null;
    },
  } as unknown as SQLite.SQLiteDatabase;
};

// 数据库版本号（当表结构变化时递增）
const DB_VERSION = 2;

const migrateInboundAndInventoryRecordTables = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  const inboundTable = await database.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    ['inbound_records']
  );
  const inventoryTable = await database.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    ['inventory_check_records']
  );

  const inboundNeedsMigration = inboundTable?.sql?.includes('inbound_no TEXT NOT NULL UNIQUE') ?? false;
  const inventoryNeedsMigration = inventoryTable?.sql?.includes('check_no TEXT NOT NULL UNIQUE') ?? false;

  if (!inboundNeedsMigration && !inventoryNeedsMigration) {
    return;
  }

  console.log('[DB Migration] 修复入库/盘点记录表的单号唯一约束...');
  await database.execAsync('BEGIN TRANSACTION');

  try {
    if (inboundNeedsMigration) {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS inbound_records_new (
          id TEXT PRIMARY KEY,
          inbound_no TEXT NOT NULL,
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
      `);
      await database.execAsync(`
        INSERT INTO inbound_records_new (
          id, inbound_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
          quantity, in_date, notes, raw_content, created_at, package, version,
          productionDate, traceNo, sourceNo, customFields
        )
        SELECT
          id, inbound_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
          quantity, in_date, notes, raw_content, created_at, package, version,
          productionDate, traceNo, sourceNo, customFields
        FROM inbound_records;
      `);
      await database.execAsync('DROP TABLE inbound_records');
      await database.execAsync('ALTER TABLE inbound_records_new RENAME TO inbound_records');
    }

    if (inventoryNeedsMigration) {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS inventory_check_records_new (
          id TEXT PRIMARY KEY,
          check_no TEXT NOT NULL,
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
      `);
      await database.execAsync(`
        INSERT INTO inventory_check_records_new (
          id, check_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
          quantity, check_type, actual_quantity, check_date, notes, created_at, package,
          version, productionDate, traceNo, sourceNo, customFields
        )
        SELECT
          id, check_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
          quantity, check_type, actual_quantity, check_date, notes, created_at, package,
          version, productionDate, traceNo, sourceNo, customFields
        FROM inventory_check_records;
      `);
      await database.execAsync('DROP TABLE inventory_check_records');
      await database.execAsync('ALTER TABLE inventory_check_records_new RENAME TO inventory_check_records');
    }

    await database.execAsync('COMMIT');
    console.log('[DB Migration] 入库/盘点记录表约束修复完成');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    console.error('[DB Migration] 入库/盘点记录表约束修复失败:', error);
    throw error;
  }
};

// 初始化数据库
export const initDatabase = async (): Promise<void> => {
  console.log('[initDatabase] 开始初始化...');
  console.log('[initDatabase] 当前db状态', db ? '已初始化' : 'null');
  console.log('[initDatabase] 当前isInitializing', isInitializing);

  try {
    // Web 平台跳过数据库初始化（用于预览）
    if (isWebPlatform) {
      console.log('[Web Platform] Skipping database initialization (preview mode)');
      return;
    }

    // 防止重复初始化
    if (isInitializing) {
      console.log('[initDatabase] 数据库正在初始化中，等待完成...');
      if (initPromise) {
        await initPromise;
      }
      return;
    }

    // 修复：立即设置并发控制标志，防止竞态条件
    isInitializing = true;
    console.log('[initDatabase] 开始初始化数据库');

    // 检查是否已经初始化
    if (db) {
      console.log('[initDatabase] 数据库已初始化，直接返回');
      isInitializing = false;
      return;
    }

    // 创建初始化 Promise，用于并发调用等待
    initPromise = (async () => {
      try {
        await performDatabaseInitialization();
      } catch (error) {
        console.error('[initDatabase] 数据库初始化失败:', error);
        db = null;
        throw error;
      } finally {
        isInitializing = false;
        initPromise = null;
      }
    })();

    // 等待初始化完成
    await initPromise;
  } catch (error) {
    console.error('[initDatabase] 数据库初始化异常:', error);
    isInitializing = false;
    throw error;
  }
};

// 执行数据库初始化的核心逻辑（提取为独立函数，便于 Promise 管理）
const performDatabaseInitialization = async (): Promise<void> => {
  console.log('[performDatabaseInitialization] 开始执行初始化逻辑');

  // 如果已经初始化，先关闭旧连接
  if (db) {
    try {
      await db.closeAsync();
      console.log('[initDatabase] 关闭旧数据库连接');
    } catch (error) {
      console.warn('[initDatabase] 关闭旧数据库连接失败:', error);
    }
    db = null;
  }

  // 打开数据库（如果不存在会自动创建）
  console.log('[performDatabaseInitialization] 准备调用 openDatabaseAsync...');
  db = await SQLite.openDatabaseAsync('warehouse.db');
  console.log('[performDatabaseInitialization] openDatabaseAsync 完成，db对象:', db ? '已创建' : 'null');

  // 先创建 system_config 表（用于版本管理和安装ID）
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 检查安装 ID（存储在数据库中，避免 AsyncStorage 被清理导致数据丢失）
  const installIdResult = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM system_config WHERE key = ?',
    ['install_id']
  );

  if (!installIdResult) {
    // 首次运行，生成并保存安装 ID
    const newInstallId = `install_${Date.now()}`;
    await db.runAsync(
      'INSERT INTO system_config (key, value) VALUES (?, ?)',
      ['install_id', newInstallId]
    );
    console.log('[initDatabase] 首次运行，生成安装 ID:', newInstallId);
  } else {
    console.log('[initDatabase] 检测到现有安装，installId:', installIdResult.value);
  }

    // 检查数据库版本
    const versionResult = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM system_config WHERE key = ?',
      ['db_version']
    );
    const currentVersion = versionResult ? parseInt(versionResult.value, 10) : 0;

    console.log('[DB Version] 当前数据库版本:', currentVersion, '期望版本:', DB_VERSION);

    // 如果版本不匹配，删除所有表（让后续的CREATE语句重新创建）
    if (currentVersion !== DB_VERSION && currentVersion > 0) {
      console.log('[DB Version] 数据库版本不匹配，开始清理旧表...');

      const dropOrder = ['print_history', 'unpack_records', 'materials', 'orders',
                         'inventory_check_records', 'inbound_records', 'inventory_bindings',
                         'qr_code_rules', 'custom_fields', 'warehouses'];

      for (const tableName of dropOrder) {
        try {
          await db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
          console.log(`[DB Version] 删除表: ${tableName}`);
        } catch (error) {
          console.warn(`[DB Version] 删除表失败: ${tableName}`, error);
        }
      }

      console.log('[DB Version] 旧表清理完成，将创建新表...');
    }

    // 创建所有表
    await db.execAsync(`
      -- 性能优化配置
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 30000000000;
      PRAGMA page_size = 4096;
      PRAGMA foreign_keys = ON;

      -- 订单表
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_no TEXT NOT NULL UNIQUE,
        customer_name TEXT,
        warehouse_id TEXT,
        warehouse_name TEXT,
        created_at TEXT NOT NULL
      );

      -- 物料表
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

      -- 拆包记录表
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

      -- 打印历史表
      CREATE TABLE IF NOT EXISTS print_history (
        id TEXT PRIMARY KEY,
        unpack_record_ids TEXT NOT NULL,
        export_format TEXT NOT NULL,
        export_file_path TEXT,
        printed_at TEXT NOT NULL,
        print_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 二维码规则表
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

      -- 自定义字段表
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

      -- 仓库表
      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      -- 物料管理表（存货编码绑定）
      CREATE TABLE IF NOT EXISTS inventory_bindings (
        id TEXT PRIMARY KEY,
        scan_model TEXT NOT NULL UNIQUE,
        inventory_code TEXT NOT NULL UNIQUE,
        supplier TEXT,
        description TEXT,
        created_at TEXT NOT NULL
      );

      -- 入库记录表
      CREATE TABLE IF NOT EXISTS inbound_records (
        id TEXT PRIMARY KEY,
        inbound_no TEXT NOT NULL,
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

      -- 入库汇总表（按型号+版本号+入库日期每日汇总）
      CREATE TABLE IF NOT EXISTS inbound_summary (
        id TEXT PRIMARY KEY,
        warehouse_id TEXT NOT NULL,
        warehouse_name TEXT NOT NULL,
        inventory_code TEXT,
        scan_model TEXT NOT NULL,
        version TEXT,
        in_date TEXT NOT NULL,
        total_quantity INTEGER NOT NULL,
        sourceNo TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(warehouse_id, scan_model, version, in_date)
      );

      -- 盘点记录表
      CREATE TABLE IF NOT EXISTS inventory_check_records (
        id TEXT PRIMARY KEY,
        check_no TEXT NOT NULL,
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
    `);

    await migrateInboundAndInventoryRecordTables(db);

    // 初始化默认数据
    const isoDateTime = getISODateTime();

    // 检查是否已有默认仓库
    const defaultWarehouse = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM warehouses WHERE is_default = 1'
    );

    if (!defaultWarehouse) {
      await db.runAsync(
        'INSERT INTO warehouses (id, name, description, is_default, created_at) VALUES (?, ?, ?, ?, ?)',
        ['default_warehouse', '默认仓库', '系统默认创建的仓库', 1, isoDateTime]
      );
      console.log('创建默认仓库');
    }

    // 检查是否已有默认规则
    const defaultRule = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM qr_code_rules WHERE id = ?',
      ['default_jihai']
    );

    if (!defaultRule) {
      await db.runAsync(
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
      console.log('创建默认二维码规则');
    }

    // 设置数据库版本号
    await db.runAsync(
      'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)',
      ['db_version', DB_VERSION.toString()]
    );
    console.log('[initDatabase] 数据库版本已设置为:', DB_VERSION);

    console.log('[initDatabase] SQLite 数据库初始化成功');
};

// 强制重新初始化数据库（用于清除数据后）
export const reinitializeDatabase = async (): Promise<void> => {
  try {
    console.log('[reinitializeDatabase] 强制重新初始化数据库...');

    // 关闭现有连接
    if (db) {
      try {
        await db.closeAsync();
        console.log('[reinitializeDatabase] 关闭旧数据库连接');
      } catch (error) {
        console.warn('[reinitializeDatabase] 关闭旧数据库连接失败:', error);
      }
      db = null;
    }

    // 重置初始化状态
    isInitializing = false;
    initPromise = null;

    // 重新初始化
    await initDatabase();
    console.log('[reinitializeDatabase] 数据库重新初始化成功');
  } catch (error) {
    console.error('[reinitializeDatabase] 数据库重新初始化失败:', error);
    throw error;
  }
};

// ========== 订单相关函数 ==========

// 添加或更新订单
export const upsertOrder = async (
  orderNo: string, 
  customerName?: string,
  warehouse?: { id: string; name: string }
): Promise<void> => {
  try {
    // 🔥 强制初始化保护
    if (!db) {
      console.warn('[upsertOrder] 数据库未初始化，等待初始化...');
      await initDatabase();
      console.log('[upsertOrder] 数据库初始化完成');
    }

    const database = getDb();
    
    // 检查订单是否存在
    const existingOrder = await database.getFirstAsync<{ id: string; customer_name: string; warehouse_id: string; warehouse_name: string }>(
      'SELECT id, customer_name, warehouse_id, warehouse_name FROM orders WHERE order_no = ?',
      [orderNo]
    );
    
    if (existingOrder) {
      // 更新现有订单
      const updates: string[] = [];
      const params: any[] = [];

      if (customerName !== undefined && customerName !== '') {
        updates.push('customer_name = ?');
        params.push(customerName);
      }
      if (warehouse) {
        updates.push('warehouse_id = ?');
        updates.push('warehouse_name = ?');
        params.push(warehouse.id);
        params.push(warehouse.name);
      }
      
      params.push(orderNo);
      
      await database.runAsync(
        `UPDATE orders SET ${updates.join(', ')} WHERE order_no = ?`,
        params
      );
      
      // 如果更新了客户名称或仓库信息，同步更新物料
      if (customerName !== undefined || warehouse) {
        const materialUpdates: string[] = [];
        const materialParams: any[] = [];
        
        if (customerName !== undefined && customerName !== '') {
          materialUpdates.push('customer_name = ?');
          materialParams.push(customerName);
        }
        if (warehouse) {
          materialUpdates.push('warehouse_id = ?');
          materialUpdates.push('warehouse_name = ?');
          materialParams.push(warehouse.id);
          materialParams.push(warehouse.name);
        }
        
        if (materialUpdates.length > 0) {
          materialParams.push(orderNo);
          await database.runAsync(
            `UPDATE materials SET ${materialUpdates.join(', ')} WHERE order_no = ?`,
            materialParams
          );
          
          // 同步更新拆包记录
          await database.runAsync(
            `UPDATE unpack_records SET ${materialUpdates.join(', ')} WHERE order_no = ?`,
            materialParams
          );
        }
      }
    } else {
      // 创建新订单
      const newOrder: Order = {
        id: generateId(),
        order_no: orderNo,
        customer_name: customerName || '',
        created_at: getISODateTime(),
        warehouse_id: warehouse?.id || undefined,
        warehouse_name: warehouse?.name || undefined,
      };
      
      await database.runAsync(
        'INSERT INTO orders (id, order_no, customer_name, created_at, warehouse_id, warehouse_name) VALUES (?, ?, ?, ?, ?, ?)',
        [newOrder.id, newOrder.order_no, newOrder.customer_name, newOrder.created_at, newOrder.warehouse_id || null, newOrder.warehouse_name || null]
      );
    }
  } catch (error) {
    console.error('保存订单失败:', error);
    throw error;
  }
};

// 获取订单信息
export const getOrder = async (orderNo: string): Promise<Order | null> => {
  try {
    // 参数验证
    if (!orderNo || typeof orderNo !== 'string' || orderNo.trim() === '') {
      console.warn('[getOrder] 无效的 orderNo:', orderNo);
      return null;
    }

    const database = getDb();
    const result = await database.getFirstAsync<Order>(
      'SELECT * FROM orders WHERE order_no = ?',
      [orderNo.trim()]
    );
    return result || null;
  } catch (error) {
    console.error('[getOrder] 获取订单失败:', error);
    return null;
  }
};

// 获取所有订单
export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const database = getDb();
    return await database.getAllAsync<Order>('SELECT * FROM orders ORDER BY created_at DESC');
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return [];
  }
};

// 删除订单及其所有物料记录
export const deleteOrder = async (orderNo: string): Promise<void> => {
  try {
    const database = getDb();
    
    // 删除订单
    await database.runAsync('DELETE FROM orders WHERE order_no = ?', [orderNo]);
    
    // 删除关联的物料记录
    await database.runAsync('DELETE FROM materials WHERE order_no = ?', [orderNo]);
  } catch (error) {
    console.error('删除订单失败:', error);
    throw error;
  }
};

// 清理 7 天前的空订单（没有关联物料的订单）
export const cleanupOldEmptyOrders = async (): Promise<{ deletedCount: number }> => {
  try {
    console.log('[cleanupOldEmptyOrders] 开始清理 7 天前的空订单');
    const database = getDb();

    // 计算 7 天前的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getISODateTime(sevenDaysAgo);

    // 查找 7 天前的空订单（没有关联物料的订单）
    const emptyOrders = await database.getAllAsync<{ order_no: string }>(
      `SELECT o.order_no
       FROM orders o
       LEFT JOIN materials m ON o.order_no = m.order_no
       WHERE o.created_at < ?
         AND m.id IS NULL
       GROUP BY o.order_no`,
      [sevenDaysAgoStr]
    );

    console.log(`[cleanupOldEmptyOrders] 找到 ${emptyOrders.length} 个 7 天前的空订单`);

    if (emptyOrders.length === 0) {
      return { deletedCount: 0 };
    }

    // 删除这些空订单
    const orderNos = emptyOrders.map(o => o.order_no);
    const placeholders = orderNos.map(() => '?').join(',');

    const result = await database.runAsync(
      `DELETE FROM orders WHERE order_no IN (${placeholders})`,
      orderNos
    );

    console.log(`[cleanupOldEmptyOrders] 删除了 ${result.changes} 个空订单`);

    return { deletedCount: result.changes };
  } catch (error) {
    console.error('[cleanupOldEmptyOrders] 清理空订单失败:', error);
    return { deletedCount: 0 };
  }
};

// ========== 物料相关函数 ==========

// 🔥 新增：批量添加物料（使用事务，速度提升 10 倍）
export const addMaterialsBatch = async (materials: Array<{
  order_no: string;
  customer_name?: string;
  operation_type?: string;
  model: string;
  batch?: string;
  quantity?: number | string;
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  scanned_at?: string;
  raw_content: string;
  separator?: string;
  rule_id?: string;
  rule_name?: string;
  customFields?: Record<string, string>;
  warehouse_id?: string;
  warehouse_name?: string;
  inventory_code?: string;
}>): Promise<string[]> => {
  try {
    // 🔥 强制初始化保护
    if (!db) {
      console.warn('[addMaterialsBatch] 数据库未初始化，等待初始化...');
      await initDatabase();
      console.log('[addMaterialsBatch] 数据库初始化完成');
    }

    const database = getDb();
    console.log('[addMaterialsBatch] 开始批量添加，数量:', materials.length);

    // 🔥 使用事务，速度提升 10 倍
    await database.execAsync('BEGIN TRANSACTION');

    const materialIds: string[] = [];

    for (const material of materials) {
      // 参数验证
      if (!material.order_no || typeof material.order_no !== 'string') {
        throw new Error('无效的 order_no');
      }
      if (!material.model || typeof material.model !== 'string') {
        throw new Error('无效的 model');
      }
      if (!material.raw_content || typeof material.raw_content !== 'string') {
        throw new Error('无效的 raw_content');
      }

      const newMaterialId = generateId();

      await database.runAsync(
        `INSERT INTO materials (
          id, order_no, customer_name, operation_type, model, batch, quantity,
          package, version, productionDate, traceNo, sourceNo, scanned_at, raw_content,
          customFields, isUnpacked, original_quantity, remaining_quantity,
          warehouse_id, warehouse_name, inventory_code, rule_id, rule_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newMaterialId,
          material.order_no || '',
          material.customer_name || '',
          material.operation_type || 'inbound',
          material.model || '',
          material.batch || '',
          material.quantity != null ? parseInt(String(material.quantity), 10) : 0,
          material.package || '',
          material.version || '',
          material.productionDate || '',
          material.traceNo || '',
          material.sourceNo || '',
          material.scanned_at || getISODateTime(),
          material.raw_content,
          material.customFields ? jsonToString(material.customFields) : null,
          0,
          null,
          null,
          material.warehouse_id || null,
          material.warehouse_name || null,
          material.inventory_code || null,
          material.rule_id ? parseInt(material.rule_id, 10) : null,
          material.rule_name || null,
        ]
      );

      materialIds.push(newMaterialId);
    }

    // 🔥 提交事务
    await database.execAsync('COMMIT');

    console.log('[addMaterialsBatch] 批量添加完成，成功:', materialIds.length);
    return materialIds;
  } catch (error) {
    console.error('[addMaterialsBatch] 批量添加失败，执行回滚:', error);
    // 🔥 回滚事务
    try {
      if (db) {
        await db.execAsync('ROLLBACK');
      }
    } catch (rollbackError) {
      console.error('[addMaterialsBatch] 回滚失败:', rollbackError);
    }
    throw error;
  }
};

// 添加物料记录（完整版）
export const addMaterial = async (material: {
  order_no: string;
  customer_name: string;
  operation_type?: 'inbound' | 'outbound' | 'inventory';
  model: string;
  batch: string;
  quantity: number;
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  scanned_at?: string;
  raw_content: string;
  separator?: string;      // 扫码时使用的分隔符
  rule_id?: string;
  rule_name?: string;
  customFields?: Record<string, string>;
  isUnpacked?: boolean;
  original_quantity?: string;
  remaining_quantity?: string;
  // V3.0 新增字段
  warehouse_id?: string;
  warehouse_name?: string;
  inventory_code?: string;
}): Promise<string> => {
  try {
    // 🔍 测试：打印 db 状态
    console.log('[addMaterial] db状态', db ? '已初始化' : 'null');
    console.log('[addMaterial] 全局isInitializing', isInitializing);

    // 🔥 强制初始化保护：如果 db 为 null，等待初始化完成
    if (!db) {
      console.warn('[addMaterial] 数据库未初始化，等待初始化...');
      await initDatabase();
      console.log('[addMaterial] 数据库初始化完成');
    }

    const database = getDb();
    console.log('[addMaterial] 获取数据库连接成功');

    // 参数验证
    if (!material.order_no || typeof material.order_no !== 'string') {
      throw new Error('无效的 order_no');
    }
    // 🔥 临时修复：允许 model 为空，仅做类型检查
    if (typeof material.model !== 'string') {
      throw new Error('无效的 model');
    }
    if (!material.raw_content || typeof material.raw_content !== 'string') {
      throw new Error('无效的 raw_content');
    }

    const newMaterialId = generateId();

    await database.runAsync(
      `INSERT INTO materials (
        id, order_no, customer_name, operation_type, model, batch, quantity,
        package, version, productionDate, traceNo, sourceNo, scanned_at, raw_content,
        customFields, isUnpacked, original_quantity, remaining_quantity,
        warehouse_id, warehouse_name, inventory_code, rule_id, rule_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newMaterialId,
        material.order_no || '',
        material.customer_name || '',
        material.operation_type || 'inbound',
        material.model || '',
        material.batch || '',
        material.quantity != null ? parseInt(String(material.quantity), 10) : 0,
        material.package || '',
        material.version || '',
        material.productionDate || '',
        material.traceNo || '',
        material.sourceNo || '',
        material.scanned_at || getISODateTime(),
        material.raw_content,
        material.customFields ? jsonToString(material.customFields) : null,
        material.isUnpacked ? 1 : 0,
        material.original_quantity || null,
        material.remaining_quantity || null,
        material.warehouse_id || null,
        material.warehouse_name || null,
        material.inventory_code || null,
        material.rule_id ? parseInt(material.rule_id, 10) : null,
        material.rule_name || null,
      ]
    );

    return newMaterialId;
  } catch (error) {
    console.error('[addMaterial] 添加物料记录失败:', error);
    throw error;
  }
};

// 获取物料记录
export const getMaterial = async (id: string): Promise<MaterialRecord | null> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[getMaterial] 无效的 id:', id);
      return null;
    }

    const database = getDb();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM materials WHERE id = ?',
      [id.trim()]
    );

    if (!result) return null;

    // 转换 customFields
    return {
      ...result,
      customFields: stringToJson<Record<string, string>>(result.customFields),
      isUnpacked: result.isUnpacked === 1,
    };
  } catch (error) {
    console.error('[getMaterial] 获取物料记录失败:', error);
    return null;
  }
};

// 获取订单下的所有物料记录
export const getMaterialsByOrder = async (orderNo: string, warehouseId?: string): Promise<MaterialRecord[]> => {
  try {
    // 参数验证
    if (!orderNo || typeof orderNo !== 'string' || orderNo.trim() === '') {
      console.warn('[getMaterialsByOrder] 无效的 orderNo:', orderNo);
      return [];
    }

    const database = getDb();
    let sql = 'SELECT * FROM materials WHERE order_no = ?';
    const params: any[] = [orderNo.trim()];

    if (warehouseId && typeof warehouseId === 'string' && warehouseId.trim() !== '') {
      sql += ' AND warehouse_id = ?';
      params.push(warehouseId.trim());
    }

    sql += ' ORDER BY scanned_at DESC';

    const results = await database.getAllAsync<any>(sql, params);

    return results.map(r => ({
      ...r,
      customFields: stringToJson<Record<string, string>>(r.customFields),
      isUnpacked: r.isUnpacked === 1,
    }));
  } catch (error) {
    console.error('[getMaterialsByOrder] 获取订单物料失败:', error);
    return [];
  }
};

// 检查物料是否已存在
export const checkMaterialExists = async (
  orderNo: string,
  model: string,
  batch: string,
  sourceNo?: string,
  traceNo?: string,
  quantity?: string,
  warehouseId?: string  // 添加 warehouse_id 参数
): Promise<{ material: MaterialRecord | null; isUnpacked: boolean; canRescan: boolean }> => {
  try {
    const database = getDb();

    // 参数验证
    if (!orderNo || typeof orderNo !== 'string' || orderNo.trim() === '') {
      console.error('[checkMaterialExists] 无效的 orderNo:', orderNo);
      return { material: null, isUnpacked: false, canRescan: false };
    }

    // 只检测追踪码
    if (traceNo && typeof traceNo === 'string' && traceNo.trim() !== '') {
      const trimmedTraceNo = traceNo.trim();
      const trimmedOrderNo = orderNo.trim();

      // 构建查询条件
      let sql = 'SELECT * FROM materials WHERE order_no = ? AND traceNo = ?';
      const sqlParams: any[] = [trimmedOrderNo, trimmedTraceNo];

      // 只有当 warehouseId 存在且不为空字符串时才添加条件
      if (warehouseId && typeof warehouseId === 'string' && warehouseId.trim() !== '') {
        sql += ' AND warehouse_id = ?';
        sqlParams.push(warehouseId.trim());
      }

      console.log('[checkMaterialExists] SQL:', sql, 'Params:', sqlParams);

      // 检查同一订单下是否有相同追踪码
      const existingInSameOrder = await database.getFirstAsync<any>(sql, sqlParams);

      if (existingInSameOrder) {
        const material = {
          ...existingInSameOrder,
          customFields: stringToJson<Record<string, string>>(existingInSameOrder.customFields),
          isUnpacked: existingInSameOrder.isUnpacked === 1,
        };

        if (material.isUnpacked) {
          return { material, isUnpacked: true, canRescan: true };
        }
        return { material, isUnpacked: false, canRescan: false };
      }

      // 检查不同订单下是否有相同追踪码（需要考虑仓库）
      let otherOrderSql = 'SELECT * FROM materials WHERE order_no != ? AND traceNo = ?';
      const otherOrderParams: any[] = [trimmedOrderNo, trimmedTraceNo];

      // 只有当 warehouseId 存在且不为空字符串时才添加条件
      if (warehouseId && typeof warehouseId === 'string' && warehouseId.trim() !== '') {
        otherOrderSql += ' AND warehouse_id = ?';
        otherOrderParams.push(warehouseId.trim());
      }

      console.log('[checkMaterialExists] OtherOrder SQL:', otherOrderSql, 'Params:', otherOrderParams);

      const existingInOtherOrder = await database.getFirstAsync<any>(otherOrderSql, otherOrderParams);

      if (existingInOtherOrder) {
        const scanQty = quantity || '';
        const remainingQty = existingInOtherOrder.remaining_quantity || existingInOtherOrder.quantity;
        const material = {
          ...existingInOtherOrder,
          customFields: stringToJson<Record<string, string>>(existingInOtherOrder.customFields),
          isUnpacked: existingInOtherOrder.isUnpacked === 1,
        };

        if (material.isUnpacked && scanQty === remainingQty) {
          return { material: null, isUnpacked: false, canRescan: false };
        } else if (scanQty === material.quantity) {
          return { material, isUnpacked: false, canRescan: false };
        }
      }
    }

    return { material: null, isUnpacked: false, canRescan: false };
  } catch (error) {
    console.error('[checkMaterialExists] 检查物料重复失败:', error);
    return { material: null, isUnpacked: false, canRescan: false };
  }
};

// 获取所有物料记录
export const getAllMaterials = async (warehouseId?: string): Promise<MaterialRecord[]> => {
  try {
    const database = getDb();
    let sql = 'SELECT * FROM materials';
    const params: any[] = [];

    if (warehouseId) {
      sql += ' WHERE warehouse_id = ?';
      params.push(warehouseId);
    }

    sql += ' ORDER BY scanned_at DESC';

    const results = await database.getAllAsync<any>(sql, params);

    return results.map(r => ({
      ...r,
      customFields: stringToJson<Record<string, string>>(r.customFields),
      isUnpacked: r.isUnpacked === 1,
    }));
  } catch (error) {
    console.error('获取物料列表失败:', error);
    return [];
  }
};

// 搜索物料记录
export const searchMaterials = async (params: {
  operation_type?: 'inbound' | 'outbound' | 'inventory';
  orderNo?: string;
  exactOrderNo?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  model?: string;
  batch?: string;
  warehouse_id?: string;  // 添加 warehouse_id 参数
}): Promise<MaterialRecord[]> => {
  try {
    const database = getDb();
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (params.operation_type) {
      conditions.push('operation_type = ?');
      queryParams.push(params.operation_type);
    }

    if (params.exactOrderNo) {
      conditions.push('order_no = ?');
      queryParams.push(params.exactOrderNo);
    } else if (params.orderNo) {
      conditions.push('order_no LIKE ?');
      queryParams.push(`%${params.orderNo}%`);
    }

    if (params.customerName) {
      conditions.push('customer_name LIKE ?');
      queryParams.push(`%${params.customerName}%`);
    }

    if (params.warehouse_id) {
      conditions.push('warehouse_id = ?');
      queryParams.push(params.warehouse_id);
    }

    if (params.model) {
      conditions.push('model LIKE ?');
      queryParams.push(`%${params.model}%`);
    }

    if (params.batch) {
      conditions.push('batch LIKE ?');
      queryParams.push(`%${params.batch}%`);
    }

    if (params.startDate) {
      conditions.push('scanned_at >= ?');
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      const endDateTime = params.endDate + ' 23:59:59';
      conditions.push('scanned_at <= ?');
      queryParams.push(endDateTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM materials ${whereClause} ORDER BY scanned_at DESC`;

    const results = await database.getAllAsync<any>(sql, queryParams);

    return results.map(r => ({
      ...r,
      customFields: stringToJson<Record<string, string>>(r.customFields),
      isUnpacked: r.isUnpacked === 1,
    }));
  } catch (error) {
    console.error('搜索物料记录失败:', error);
    return [];
  }
};

// 删除物料记录
export const deleteMaterial = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteMaterial] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM materials WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteMaterial] 删除物料记录失败:', error);
    throw error;
  }
};

// 更新物料自定义字段
export const updateMaterialCustomFields = async (
  id: string,
  customFields: Record<string, string>
): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[updateMaterialCustomFields] 无效的 id:', id);
      return;
    }
    if (!customFields || typeof customFields !== 'object') {
      console.warn('[updateMaterialCustomFields] 无效的 customFields:', customFields);
      return;
    }

    const database = getDb();
    await database.runAsync(
      'UPDATE materials SET customFields = ? WHERE id = ?',
      [jsonToString(customFields), id.trim()]
    );
  } catch (error) {
    console.error('[updateMaterialCustomFields] 更新物料自定义字段失败:', error);
    throw error;
  }
};

// 更新物料数量
export const updateMaterialQuantity = async (
  id: string,
  newQuantity: number
): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[updateMaterialQuantity] 无效的 id:', id);
      return;
    }
    if (newQuantity == null || isNaN(newQuantity)) {
      console.warn('[updateMaterialQuantity] 无效的 newQuantity:', newQuantity);
      return;
    }

    const database = getDb();
    await database.runAsync(
      'UPDATE materials SET quantity = ? WHERE id = ?',
      [parseInt(String(newQuantity), 10) || 0, id.trim()]
    );
  } catch (error) {
    console.error('[updateMaterialQuantity] 更新物料数量失败:', error);
    throw error;
  }
};

// 更新物料信息
export const updateMaterial = async (
  id: string,
  updates: Partial<Pick<MaterialRecord, 'model' | 'batch' | 'quantity' | 'package' | 'version' | 'productionDate' | 'traceNo' | 'sourceNo' | 'customer_name' | 'remaining_quantity'>>
): Promise<void> => {
  try {
    const database = getDb();
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);

        // 确保 INTEGER 类型的字段传入 number 类型
        if (key === 'quantity' || key === 'isUnpacked' || key === 'rule_id') {
          values.push(Number(value));
        } else {
          values.push(value);
        }
      }
    });
    
    if (updateFields.length > 0) {
      values.push(id);
      await database.runAsync(
        `UPDATE materials SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  } catch (error) {
    console.error('更新物料信息失败:', error);
    throw error;
  }
};
// 这是 database-new.ts 的补充部分，包含剩余的所有函数
// 请将以下内容追加到 database-new.ts 文件末尾

// ========== 统计信息 ==========

// 获取本地日期字符串 (YYYY-MM-DD)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取统计信息
export const getStatistics = async (): Promise<{
  totalOrders: number;
  totalMaterials: number;
  totalQuantity: number;
  todayOrders: number;
  todayMaterials: number;
  todayQuantity: number;
}> => {
  try {
    const database = getDb();
    const today = getISODateTime().slice(0, 10).replace(/-/g, '/');
    
    // 订单统计
    const totalOrders = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM orders'
    );
    
    const todayOrders = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders WHERE created_at LIKE ?",
      [`${today}%`]
    );
    
    // 物料统计
    const totalMaterials = await database.getFirstAsync<{ count: number; sum: number }>(
      'SELECT COUNT(*) as count, SUM(CAST(quantity AS INTEGER)) as sum FROM materials'
    );
    
    const todayMaterials = await database.getFirstAsync<{ count: number; sum: number }>(
      "SELECT COUNT(*) as count, SUM(CAST(quantity AS INTEGER)) as sum FROM materials WHERE scanned_at LIKE ?",
      [`${today}%`]
    );
    
    return {
      totalOrders: totalOrders?.count || 0,
      totalMaterials: totalMaterials?.count || 0,
      totalQuantity: totalMaterials?.sum || 0,
      todayOrders: todayOrders?.count || 0,
      todayMaterials: todayMaterials?.count || 0,
      todayQuantity: todayMaterials?.sum || 0,
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      totalOrders: 0,
      totalMaterials: 0,
      totalQuantity: 0,
      todayOrders: 0,
      todayMaterials: 0,
      todayQuantity: 0,
    };
  }
};

// ========== 拆包记录相关函数 ==========

// 获取所有拆包记录
export const getAllUnpackRecords = async (warehouseId?: string): Promise<UnpackRecord[]> => {
  try {
    const database = getDb();
    let sql = 'SELECT * FROM unpack_records';
    const params: any[] = [];

    if (warehouseId) {
      sql += ' WHERE warehouse_id = ?';
      params.push(warehouseId);
    }

    sql += ' ORDER BY unpacked_at DESC';

    const results = await database.getAllAsync<any>(sql, params);
    return results as UnpackRecord[];
  } catch (error) {
    console.error('获取拆包记录失败:', error);
    return [];
  }
};

// 获取待打印的拆包记录
export const getPendingUnpackRecords = async (warehouseId?: string): Promise<UnpackRecord[]> => {
  try {
    const database = getDb();
    let sql = "SELECT * FROM unpack_records WHERE status = 'pending'";
    const params: any[] = [];

    if (warehouseId) {
      sql += ' AND warehouse_id = ?';
      params.push(warehouseId);
    }

    sql += ' ORDER BY unpacked_at DESC';

    const results = await database.getAllAsync<any>(sql, params);
    return results as UnpackRecord[];
  } catch (error) {
    console.error('获取待打印记录失败:', error);
    return [];
  }
};

// 获取已打印的拆包记录
export const getPrintedUnpackRecords = async (): Promise<UnpackRecord[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<any>(
      "SELECT * FROM unpack_records WHERE status = 'printed' ORDER BY unpacked_at DESC"
    );
    return results as UnpackRecord[];
  } catch (error) {
    console.error('获取已打印记录失败:', error);
    return [];
  }
};

// 添加拆包记录
export const addUnpackRecord = async (record: {
  original_material_id: string;
  order_no: string;
  customer_name: string;
  model: string;
  batch: string;
  package: string;
  version: string;
  warehouse_id?: string;
  warehouse_name?: string;
  inventory_code?: string;
  original_quantity: string;
  new_quantity: string;
  productionDate: string;
  traceNo: string;
  new_traceNo: string;
  sourceNo: string;
  label_type: 'shipped' | 'remaining';
  pair_id: string;
  status: 'pending' | 'printed';
  notes: string;
  unpacked_at?: string;
}): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    
    await database.runAsync(
      `INSERT INTO unpack_records (
        id, original_material_id, order_no, customer_name, model, batch, package, version,
        warehouse_id, warehouse_name, inventory_code, original_quantity, new_quantity,
        productionDate, traceNo, new_traceNo, sourceNo, label_type, pair_id, status,
        notes, unpacked_at, printed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.original_material_id,
        record.order_no,
        record.customer_name,
        record.model,
        record.batch,
        record.package,
        record.version,
        record.warehouse_id || null,
        record.warehouse_name || null,
        record.inventory_code || null,
        record.original_quantity,
        record.new_quantity,
        record.productionDate,
        record.traceNo,
        record.new_traceNo,
        record.sourceNo,
        record.label_type,
        record.pair_id,
        record.status,
        record.notes,
        record.unpacked_at || getISODateTime(),
        null,
        getISODateTime(),
        getISODateTime(),
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加拆包记录失败:', error);
    throw error;
  }
};

// 标记拆包记录为已打印
export const markUnpackRecordsAsPrinted = async (ids: string[]): Promise<void> => {
  try {
    const database = getDb();
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `UPDATE unpack_records SET status = 'printed', printed_at = ? WHERE id IN (${placeholders})`,
      [getISODateTime(), ...ids]
    );
  } catch (error) {
    console.error('标记拆包记录失败:', error);
    throw error;
  }
};

// 删除拆包记录
export const deleteUnpackRecord = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteUnpackRecord] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM unpack_records WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteUnpackRecord] 删除拆包记录失败:', error);
    throw error;
  }
};

// 删除多个拆包记录
export const deleteUnpackRecords = async (ids: string[]): Promise<void> => {
  try {
    const database = getDb();
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `DELETE FROM unpack_records WHERE id IN (${placeholders})`,
      ids
    );
  } catch (error) {
    console.error('删除拆包记录失败:', error);
    throw error;
  }
};

// 获取物料的拆包历史记录
export const getUnpackHistoryByMaterialId = async (materialId: string): Promise<UnpackRecord[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<any>(
      "SELECT * FROM unpack_records WHERE original_material_id = ? AND label_type = 'shipped' ORDER BY unpacked_at DESC",
      [materialId]
    );
    return results as UnpackRecord[];
  } catch (error) {
    console.error('获取拆包历史失败:', error);
    return [];
  }
};

// 获取追踪码的拆包历史记录
export const getUnpackHistoryByTraceNo = async (traceNo: string): Promise<UnpackRecord[]> => {
  try {
    // 参数验证
    if (!traceNo || typeof traceNo !== 'string' || traceNo.trim() === '') {
      console.warn('[getUnpackHistoryByTraceNo] 无效的 traceNo:', traceNo);
      return [];
    }

    const database = getDb();
    const results = await database.getAllAsync<any>(
      "SELECT * FROM unpack_records WHERE traceNo = ? AND label_type = 'shipped' ORDER BY unpacked_at DESC",
      [traceNo.trim()]
    );
    return results as UnpackRecord[];
  } catch (error) {
    console.error('[getUnpackHistoryByTraceNo] 获取拆包历史失败:', error);
    return [];
  }
};

// 获取下一个拆包序号
export const getNextUnpackIndex = async (traceNo: string): Promise<number> => {
  try {
    // 参数验证
    if (!traceNo || typeof traceNo !== 'string' || traceNo.trim() === '') {
      console.warn('[getNextUnpackIndex] 无效的 traceNo:', traceNo);
      return 1;
    }

    const trimmedTraceNo = traceNo.trim();
    const match = trimmedTraceNo.match(/^(.+)-(\d+)$/);

    if (match) {
      return parseInt(match[2], 10) + 1;
    } else {
      return 1;
    }
  } catch (error) {
    console.error('[getNextUnpackIndex] 获取拆包序号失败:', error);
    return 1;
  }
};

// ========== 打印历史相关函数 ==========

// 获取所有打印历史
export const getAllPrintHistory = async (): Promise<PrintHistory[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM print_history ORDER BY printed_at DESC'
    );
    
    return results.map(r => ({
      ...r,
      unpack_record_ids: stringToJson<string[]>(r.unpack_record_ids) || [],
    })) as PrintHistory[];
  } catch (error) {
    console.error('获取打印历史失败:', error);
    return [];
  }
};

// 添加打印历史
export const addPrintHistory = async (history: {
  unpack_record_ids: string[];
  export_format: 'csv' | 'excel' | 'json';
  export_file_path: string | null;
  printed_at?: string;
  print_count?: number;
}): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    
    await database.runAsync(
      `INSERT INTO print_history (
        id, unpack_record_ids, export_format, export_file_path, printed_at, print_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        jsonToString(history.unpack_record_ids),
        history.export_format,
        history.export_file_path,
        history.printed_at || getISODateTime(),
        history.print_count || 1,
        getISODateTime(),
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加打印历史失败:', error);
    throw error;
  }
};

// ========== 仓库相关函数 ==========

// 获取所有仓库
export const getAllWarehouses = async (): Promise<Warehouse[]> => {
  try {
    console.log('[getAllWarehouses] 开始获取仓库列表');
    const database = getDb();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM warehouses ORDER BY created_at DESC'
    );

    console.log(`[getAllWarehouses] 查询完成，返回 ${results.length} 条记录`);

    const mappedResults = results.map(r => ({
      ...r,
      is_default: r.is_default === 1,
    })) as Warehouse[];

    console.log('[getAllWarehouses] 返回数据:', JSON.stringify(mappedResults.map(w => ({ id: w.id, name: w.name, is_default: w.is_default }))));

    return mappedResults;
  } catch (error) {
    console.error('[getAllWarehouses] 获取仓库列表失败:', error);
    return [];
  }
};

// 获取默认仓库
export const getDefaultWarehouse = async (): Promise<Warehouse | null> => {
  try {
    const database = getDb();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM warehouses WHERE is_default = 1'
    );
    
    if (!result) return null;
    
    return {
      ...result,
      is_default: result.is_default === 1,
    } as Warehouse;
  } catch (error) {
    console.error('获取默认仓库失败:', error);
    return null;
  }
};

// 添加仓库
export const addWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'created_at'>): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    const isoDateTime = getISODateTime();

    // 如果设置为默认仓库，先取消其他仓库的默认状态
    if (warehouse.is_default) {
      await database.runAsync('UPDATE warehouses SET is_default = 0');
    }

    await database.runAsync(
      'INSERT INTO warehouses (id, name, description, is_default, created_at) VALUES (?, ?, ?, ?, ?)',
      [
        id,
        warehouse.name,
        warehouse.description || null,
        warehouse.is_default ? 1 : 0,
        isoDateTime,
      ]
    );

    return id;
  } catch (error) {
    console.error('添加仓库失败:', error);
    throw error;
  }
};

// 更新仓库
export const updateWarehouse = async (id: string, updates: Partial<Warehouse>): Promise<void> => {
  try {
    const database = getDb();
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'is_default' && value !== undefined) {
        updateFields.push('is_default = ?');
        values.push(value ? 1 : 0);
      } else if (key !== 'id' && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length > 0) {
      // 如果设置为默认仓库，先取消其他仓库的默认状态
      if (updates.is_default) {
        await database.runAsync('UPDATE warehouses SET is_default = 0 WHERE id != ?', [id]);
      }

      values.push(id);
      await database.runAsync(
        `UPDATE warehouses SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  } catch (error) {
    console.error('更新仓库失败:', error);
    throw error;
  }
};

// 删除仓库
export const deleteWarehouse = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteWarehouse] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.execAsync('BEGIN TRANSACTION');

    try {
      const trimmedId = id.trim();

      // 删除该仓库的所有相关数据
      // 1. 删除入库记录
      await database.runAsync('DELETE FROM inbound_records WHERE warehouse_id = ?', [trimmedId]);

      // 2. 删除盘点记录
      await database.runAsync('DELETE FROM inventory_check_records WHERE warehouse_id = ?', [trimmedId]);

      // 3. 删除订单及其关联的物料
      await database.runAsync('DELETE FROM materials WHERE warehouse_id = ?', [trimmedId]);
      await database.runAsync('DELETE FROM orders WHERE warehouse_id = ?', [trimmedId]);

      // 4. 删除拆包记录
      await database.runAsync('DELETE FROM unpack_records WHERE warehouse_id = ?', [trimmedId]);

      // 5. 最后删除仓库记录
      await database.runAsync('DELETE FROM warehouses WHERE id = ?', [trimmedId]);

      await database.execAsync('COMMIT');
      console.log(`[deleteWarehouse] 仓库 ${trimmedId} 及其所有数据已删除`);
    } catch (error) {
      await database.execAsync('ROLLBACK');
      console.error('[deleteWarehouse] 删除仓库数据失败，已回滚:', error);
      throw error;
    }
  } catch (error) {
    console.error('删除仓库失败:', error);
    throw error;
  }
};

// ========== 物料管理（存货编码绑定）相关函数 ==========

// 获取所有物料绑定
export const getAllInventoryBindings = async (): Promise<InventoryBinding[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<InventoryBinding>(
      'SELECT * FROM inventory_bindings ORDER BY created_at DESC'
    );
    return results;
  } catch (error) {
    console.error('获取物料绑定列表失败:', error);
    return [];
  }
};

// 根据扫描型号获取存货编码
export const getInventoryCodeByModel = async (scanModel: string): Promise<string | null> => {
  try {
    // 参数验证
    if (!scanModel || typeof scanModel !== 'string' || scanModel.trim() === '') {
      console.warn('[getInventoryCodeByModel] 无效的 scanModel:', scanModel);
      return null;
    }

    const database = getDb();
    const result = await database.getFirstAsync<{ inventory_code: string }>(
      'SELECT inventory_code FROM inventory_bindings WHERE scan_model = ?',
      [scanModel.trim()]
    );
    return result?.inventory_code || null;
  } catch (error) {
    console.error('[getInventoryCodeByModel] 获取存货编码失败:', error);
    return null;
  }
};

// 根据扫描型号获取供应商
export const getSupplierByModel = async (scanModel: string): Promise<string | null> => {
  try {
    const database = getDb();
    const result = await database.getFirstAsync<{ supplier: string }>(
      'SELECT supplier FROM inventory_bindings WHERE scan_model = ?',
      [scanModel]
    );
    return result?.supplier || null;
  } catch (error) {
    console.error('获取供应商失败:', error);
    return null;
  }
};

// 添加物料绑定
export const addInventoryBinding = async (binding: Omit<InventoryBinding, 'id' | 'created_at'>): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    const isoDateTime = getISODateTime();
    
    await database.runAsync(
      'INSERT INTO inventory_bindings (id, scan_model, inventory_code, supplier, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        binding.scan_model,
        binding.inventory_code,
        binding.supplier || null,
        binding.description || null,
        isoDateTime,
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加物料绑定失败:', error);
    throw error;
  }
};

// 更新物料绑定
export const updateInventoryBinding = async (id: string, updates: Partial<InventoryBinding>): Promise<void> => {
  try {
    const database = getDb();
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length > 0) {
      values.push(id);
      await database.runAsync(
        `UPDATE inventory_bindings SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  } catch (error) {
    console.error('更新物料绑定失败:', error);
    throw error;
  }
};

// 删除物料绑定
export const deleteInventoryBinding = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteInventoryBinding] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM inventory_bindings WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteInventoryBinding] 删除物料绑定失败:', error);
    throw error;
  }
};

// 批量导入物料绑定
export const importInventoryBindings = async (bindings: Array<{ scan_model: string; inventory_code: string; supplier?: string; description?: string }>): Promise<number> => {
  try {
    const database = getDb();
    let importedCount = 0;
    const skippedCodes: string[] = [];
    
    for (const binding of bindings) {
      // 检查是否已存在（存货编码唯一）
      const existing = await database.getFirstAsync<{ id: string }>(
        'SELECT id FROM inventory_bindings WHERE inventory_code = ?',
        [binding.inventory_code]
      );
      
      if (existing) {
        skippedCodes.push(binding.inventory_code);
        continue;
      }
      
      // 检查扫描型号是否已存在
      const existingModel = await database.getFirstAsync<{ id: string }>(
        'SELECT id FROM inventory_bindings WHERE scan_model = ?',
        [binding.scan_model]
      );
      
      if (existingModel) {
        skippedCodes.push(binding.scan_model);
        continue;
      }
      
      // 插入新记录
      await database.runAsync(
        'INSERT INTO inventory_bindings (id, scan_model, inventory_code, supplier, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          generateId(),
          binding.scan_model,
          binding.inventory_code,
          binding.supplier || null,
          binding.description || null,
          getISODateTime(),
        ]
      );
      
      importedCount++;
    }
    
    return importedCount;
  } catch (error) {
    console.error('批量导入物料绑定失败:', error);
    throw error;
  }
};

// ========== 入库记录相关函数 ==========

// 生成入库单号
export const generateInboundNo = async (): Promise<string> => {
  try {
    if (!db) {
      console.warn('[generateInboundNo] 数据库未初始化，等待初始化...');
      await initDatabase();
    }

    const database = getDb();
    const today = getLocalDateString();
    const todayPrefix = `RK-${today}`;
    
    // 查询今日已有的入库记录数
    const result = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM inbound_records WHERE inbound_no LIKE ?",
      [`${todayPrefix}%`]
    );
    
    const count = (result?.count || 0) + 1;
    const sequence = String(count).padStart(3, '0');
    
    return `${todayPrefix}-${sequence}`;
  } catch (error) {
    console.error('生成入库单号失败:', error);
    return `RK-${getLocalDateString()}-001`;
  }
};

// 获取所有入库记录
export const getAllInboundRecords = async (warehouseId?: string): Promise<InboundRecord[]> => {
  try {
    const database = getDb();
    let sql = 'SELECT * FROM inbound_records';
    const params: any[] = [];

    if (warehouseId) {
      sql += ' WHERE warehouse_id = ?';
      params.push(warehouseId);
    }

    sql += ' ORDER BY created_at DESC';

    const results = await database.getAllAsync<any>(sql, params);

    return results.map(r => ({
      ...r,
      customFields: stringToJson<Record<string, string>>(r.customFields),
    })) as InboundRecord[];
  } catch (error) {
    console.error('获取入库记录失败:', error);
    return [];
  }
};

// 添加入库记录
export const addInboundRecord = async (record: Omit<InboundRecord, 'id' | 'created_at'>): Promise<string> => {
  try {
    if (!db) {
      console.warn('[addInboundRecord] 数据库未初始化，等待初始化...');
      await initDatabase();
    }

    const database = getDb();
    const id = generateId();

    await database.runAsync(
      `INSERT INTO inbound_records (
        id, inbound_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
        quantity, in_date, notes, raw_content, created_at, package, version,
        productionDate, traceNo, sourceNo, customFields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.inbound_no,
        record.warehouse_id,
        record.warehouse_name,
        record.inventory_code || null,
        record.scan_model,
        record.batch || null,
        parseInt(String(record.quantity), 10) || 0,  // quantity: INTEGER，确保转换为number
        record.in_date,
        record.notes || null,
        record.rawContent || null,
        getISODateTime(),
        record.package || null,
        record.version || null,
        record.productionDate || null,
        record.traceNo || null,
        record.sourceNo || null,
        record.customFields ? jsonToString(record.customFields) : null,
      ]
    );

    return id;
  } catch (error) {
    console.error('添加入库记录失败:', error);
    throw error;
  }
};

// 更新入库汇总表（按型号+版本号+入库日期每日汇总）
export const updateInboundSummary = async (warehouseId: string): Promise<void> => {
  try {
    const database = getDb();

    // 查询该仓库的所有入库记录，按型号+版本号+入库日期分组汇总
    const summaryData = await database.getAllAsync<{
      warehouse_id: string;
      warehouse_name: string;
      inventory_code: string;
      scan_model: string;
      version: string;
      in_date: string;
      total_quantity: number;
      sourceNo: string;
      notes: string;
    }>(
      `SELECT
        warehouse_id,
        warehouse_name,
        inventory_code,
        scan_model,
        version,
        in_date,
        SUM(quantity) as total_quantity,
        sourceNo,
        notes
       FROM inbound_records
       WHERE warehouse_id = ?
       GROUP BY warehouse_id, scan_model, version, in_date
       ORDER BY in_date DESC, scan_model, version`,
      [warehouseId]
    );

    // 删除该仓库的旧汇总数据
    await database.runAsync('DELETE FROM inbound_summary WHERE warehouse_id = ?', [warehouseId]);

    // 插入新的汇总数据
    const now = getISODateTime();
    for (const row of summaryData) {
      const id = generateId();
      await database.runAsync(
        `INSERT INTO inbound_summary (
          id, warehouse_id, warehouse_name, inventory_code, scan_model, version,
          in_date, total_quantity, sourceNo, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          row.warehouse_id,
          row.warehouse_name,
          row.inventory_code || null,
          row.scan_model,
          row.version || null,
          row.in_date,
          row.total_quantity,
          row.sourceNo || null,
          row.notes || null,
          now,
          now,
        ]
      );
    }

    console.log(`[updateInboundSummary] 更新仓库 ${warehouseId} 的汇总数据，共 ${summaryData.length} 条记录`);
  } catch (error) {
    console.error('[updateInboundSummary] 更新入库汇总表失败:', error);
    throw error;
  }
};

// 获取入库汇总数据
export const getInboundSummary = async (warehouseId?: string, startDate?: string, endDate?: string): Promise<any[]> => {
  try {
    const database = getDb();

    let sql = 'SELECT * FROM inbound_summary WHERE 1=1';
    const params: any[] = [];

    if (warehouseId) {
      sql += ' AND warehouse_id = ?';
      params.push(warehouseId);
    }

    if (startDate) {
      sql += ' AND in_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND in_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY in_date DESC, scan_model, version';

    const result = await database.getAllAsync(sql, params);
    return result;
  } catch (error) {
    console.error('[getInboundSummary] 获取入库汇总数据失败:', error);
    throw error;
  }
};

// 删除入库记录
export const deleteInboundRecord = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteInboundRecord] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM inbound_records WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteInboundRecord] 删除入库记录失败:', error);
    throw error;
  }
};

// 清空所有入库记录
export const clearAllInboundRecords = async (): Promise<void> => {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM inbound_records');
  } catch (error) {
    console.error('清空入库记录失败:', error);
    throw error;
  }
};

// ========== 盘点记录相关函数 ==========

// 生成盘点单号
export const generateCheckNo = async (): Promise<string> => {
  try {
    if (!db) {
      console.warn('[generateCheckNo] 数据库未初始化，等待初始化...');
      await initDatabase();
    }

    const database = getDb();
    const today = getLocalDateString();
    const todayPrefix = `PD-${today}`;
    
    // 查询今日已有的盘点记录数
    const result = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM inventory_check_records WHERE check_no LIKE ?",
      [`${todayPrefix}%`]
    );
    
    const count = (result?.count || 0) + 1;
    const sequence = String(count).padStart(3, '0');
    
    return `${todayPrefix}-${sequence}`;
  } catch (error) {
    console.error('生成盘点单号失败:', error);
    return `PD-${getLocalDateString()}-001`;
  }
};

// 获取所有盘点记录
export const getAllInventoryCheckRecords = async (warehouseId?: string): Promise<InventoryCheckRecord[]> => {
  try {
    const database = getDb();
    let sql = 'SELECT * FROM inventory_check_records';
    const params: any[] = [];

    if (warehouseId) {
      sql += ' WHERE warehouse_id = ?';
      params.push(warehouseId);
    }

    sql += ' ORDER BY created_at DESC';

    const results = await database.getAllAsync<any>(sql, params);

    return results.map(r => ({
      ...r,
      customFields: stringToJson<Record<string, string>>(r.customFields),
    })) as InventoryCheckRecord[];
  } catch (error) {
    console.error('获取盘点记录失败:', error);
    return [];
  }
};

// 添加盘点记录
export const addInventoryCheckRecord = async (record: Omit<InventoryCheckRecord, 'id' | 'created_at'>): Promise<string> => {
  try {
    if (!db) {
      console.warn('[addInventoryCheckRecord] 数据库未初始化，等待初始化...');
      await initDatabase();
    }

    const database = getDb();
    const id = generateId();
    
    await database.runAsync(
      `INSERT INTO inventory_check_records (
        id, check_no, warehouse_id, warehouse_name, inventory_code, scan_model, batch,
        quantity, check_type, actual_quantity, check_date, notes, created_at, package,
        version, productionDate, traceNo, sourceNo, customFields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.check_no,
        record.warehouse_id,
        record.warehouse_name,
        record.inventory_code,
        record.scan_model,
        record.batch,
        parseInt(String(record.quantity), 10) || 0,  // quantity: INTEGER，确保转换为number
        record.check_type,
        record.actual_quantity !== null && record.actual_quantity !== undefined ? parseInt(String(record.actual_quantity), 10) : null,  // actual_quantity: INTEGER，确保转换为number
        record.check_date,
        record.notes || null,
        getISODateTime(),
        record.package || null,
        record.version || null,
        record.productionDate || null,
        record.traceNo || null,
        record.sourceNo || null,
        record.customFields ? jsonToString(record.customFields) : null,
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加盘点记录失败:', error);
    throw error;
  }
};

// 删除盘点记录
export const deleteInventoryCheckRecord = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteInventoryCheckRecord] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM inventory_check_records WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteInventoryCheckRecord] 删除盘点记录失败:', error);
    throw error;
  }
};

// 清空所有盘点记录
export const clearAllInventoryCheckRecords = async (): Promise<void> => {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM inventory_check_records');
  } catch (error) {
    console.error('清空盘点记录失败:', error);
    throw error;
  }
};

// ========== 二维码规则相关函数 ==========

// 获取所有规则
export const getAllRules = async (): Promise<QRCodeRule[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM qr_code_rules ORDER BY created_at DESC'
    );
    
    return results.map(r => ({
      ...r,
      fieldOrder: stringToJson<string[]>(r.field_order) || [],
      isActive: r.is_active === 1,
      matchConditions: stringToJson<MatchCondition[]>(r.match_conditions),
    })) as QRCodeRule[];
  } catch (error) {
    console.error('获取规则列表失败:', error);
    return [];
  }
};

// 获取启用的规则
export const getActiveRules = async (): Promise<QRCodeRule[]> => {
  try {
    const rules = await getAllRules();
    return rules.filter(r => r.isActive);
  } catch (error) {
    console.error('获取启用规则失败:', error);
    return [];
  }
};

// 添加规则
export const addRule = async (rule: Omit<QRCodeRule, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    const isoDateTime = getISODateTime();
    
    await database.runAsync(
      `INSERT INTO qr_code_rules (
        id, name, description, separator, field_order, custom_field_ids, is_active,
        supplier_name, match_conditions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rule.name,
        rule.description || null,
        rule.separator,
        jsonToString(rule.fieldOrder),
        rule.customFieldIds ? jsonToString(rule.customFieldIds) : null,
        rule.isActive ? 1 : 0,
        rule.supplierName || null,
        rule.matchConditions ? jsonToString(rule.matchConditions) : null,
        isoDateTime,
        isoDateTime,
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加规则失败:', error);
    throw error;
  }
};

// 更新规则
export const updateRule = async (id: string, updates: Partial<QRCodeRule>): Promise<void> => {
  try {
    const database = getDb();
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'isActive' && value !== undefined) {
        updateFields.push('is_active = ?');
        values.push(value ? 1 : 0);
      } else if (key === 'fieldOrder' && value !== undefined) {
        updateFields.push('field_order = ?');
        values.push(jsonToString(value));
      } else if (key === 'customFieldIds' && value !== undefined) {
        updateFields.push('custom_field_ids = ?');
        values.push(jsonToString(value));
      } else if (key === 'matchConditions' && value !== undefined) {
        updateFields.push('match_conditions = ?');
        values.push(jsonToString(value));
      } else if (
        key !== 'id' &&
        key !== 'created_at' &&
        key !== 'updated_at' &&
        key !== 'isActive' &&
        key !== 'fieldOrder' &&
        key !== 'customFieldIds' &&
        key !== 'matchConditions' &&
        value !== undefined
      ) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(getISODateTime());
      values.push(id);
      await database.runAsync(
        `UPDATE qr_code_rules SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  } catch (error) {
    console.error('更新规则失败:', error);
    throw error;
  }
};

// 删除规则
export const deleteRule = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteRule] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM qr_code_rules WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteRule] 删除规则失败:', error);
    throw error;
  }
};

// 根据ID获取规则
export const getRuleById = async (id: string): Promise<QRCodeRule | null> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[getRuleById] 无效的 id:', id);
      return null;
    }

    const database = getDb();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM qr_code_rules WHERE id = ?',
      [id.trim()]
    );

    if (!result) return null;

    return {
      ...result,
      fieldOrder: stringToJson<string[]>(result.field_order) || [],
      isActive: result.is_active === 1,
      matchConditions: stringToJson<MatchCondition[]>(result.match_conditions),
    } as QRCodeRule;
  } catch (error) {
    console.error('获取规则失败:', error);
    return null;
  }
};

// ========== 自定义字段相关函数 ==========

// 初始化默认自定义字段
export const initDefaultCustomFields = async (): Promise<void> => {
  // SQLite 已在 initDatabase 中创建表，无需额外初始化
};

// 获取所有自定义字段
export const getAllCustomFields = async (): Promise<CustomField[]> => {
  try {
    const database = getDb();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM custom_fields ORDER BY sort_order ASC'
    );
    
    return results.map(r => ({
      ...r,
      required: r.required === 1,
      options: stringToJson<string[]>(r.options),
    })) as CustomField[];
  } catch (error) {
    console.error('获取自定义字段列表失败:', error);
    return [];
  }
};

// 添加自定义字段
export const addCustomField = async (field: Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'sortOrder'>): Promise<string> => {
  try {
    const database = getDb();
    const id = generateId();
    const isoDateTime = getISODateTime();
    
    // 获取当前最大排序值
    const maxResult = await database.getFirstAsync<{ max: number }>(
      'SELECT MAX(sort_order) as max FROM custom_fields'
    );
    const maxSort = maxResult?.max || 0;
    
    await database.runAsync(
      'INSERT INTO custom_fields (id, name, type, required, options, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        field.name,
        field.type,
        field.required ? 1 : 0,
        field.options ? jsonToString(field.options) : null,
        maxSort + 1,
        isoDateTime,
        isoDateTime,
      ]
    );
    
    return id;
  } catch (error) {
    console.error('添加自定义字段失败:', error);
    throw error;
  }
};

// 更新自定义字段
export const updateCustomField = async (id: string, updates: Partial<CustomField>): Promise<void> => {
  try {
    const database = getDb();
    const updateFields: string[] = [];
    const values: any[] = [getISODateTime()]; // updated_at
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'required' && value !== undefined) {
        updateFields.push('required = ?');
        values.push(value ? 1 : 0);
      } else if (key === 'options' && value !== undefined) {
        updateFields.push('options = ?');
        values.push(jsonToString(value));
      } else if (
        key !== 'id' &&
        key !== 'created_at' &&
        key !== 'updated_at' &&
        key !== 'required' &&
        key !== 'options' &&
        key !== 'sortOrder' &&
        value !== undefined
      ) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(id);
      await database.runAsync(
        `UPDATE custom_fields SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  } catch (error) {
    console.error('更新自定义字段失败:', error);
    throw error;
  }
};

// 删除自定义字段
export const deleteCustomField = async (id: string): Promise<void> => {
  try {
    // 参数验证
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[deleteCustomField] 无效的 id:', id);
      return;
    }

    const database = getDb();
    await database.runAsync('DELETE FROM custom_fields WHERE id = ?', [id.trim()]);
  } catch (error) {
    console.error('[deleteCustomField] 删除自定义字段失败:', error);
    throw error;
  }
};

// 重新排序自定义字段
export const reorderCustomFields = async (fieldIds: string[]): Promise<void> => {
  try {
    const database = getDb();
    
    for (let i = 0; i < fieldIds.length; i++) {
      await database.runAsync(
        'UPDATE custom_fields SET sort_order = ? WHERE id = ?',
        [i, fieldIds[i]]
      );
    }
  } catch (error) {
    console.error('重新排序自定义字段失败:', error);
    throw error;
  }
};

// ========== 二维码解析相关函数（逻辑部分，不涉及存储） ==========

// 支持的括号分隔符格式
const BRACKET_PAIRS: Record<string, string> = {
  '{': '}',
  '(': ')',
  '[': ']',
  '<': '>',
};

// 检测预设括号格式并返回左括号
const detectBracketFormat = (str: string): string | null => {
  for (const left of Object.keys(BRACKET_PAIRS)) {
    const right = BRACKET_PAIRS[left];
    if (str.startsWith(left) && str.includes(right + left)) {
      return left;
    }
  }
  return null;
};

// 解析预设括号格式
const splitByBracket = (str: string, leftBracket: string): string[] => {
  const rightBracket = BRACKET_PAIRS[leftBracket];
  let s = str.trim();
  if (s.startsWith(leftBracket)) s = s.slice(1);
  if (s.endsWith(rightBracket)) s = s.slice(0, -1);
  return s.split(rightBracket + leftBracket).map(p => p.trim()).filter(p => p.length > 0);
};

// 根据二维码内容自动识别规则
export const detectRule = async (content: string): Promise<QRCodeRule | null> => {
  try {
    const rules = await getActiveRules();
    
    // 从规则中提取所有唯一的分隔符
    const ruleSeparators = [...new Set(rules.map(r => r.separator))];
    const commonSeparators = ['||', '|', ',', '*', '#', ';', ':', '\t'];
    const allSeparators = [...ruleSeparators, ...commonSeparators];
    const uniqueSeparators = [...new Set(allSeparators)];
    
    // 检测是否是 URL
    const isURL = (str: string): boolean => {
      const lower = str.toLowerCase();
      return lower.startsWith('http://') ||
             lower.startsWith('https://') ||
             lower.startsWith('ftp://') ||
             lower.startsWith('sftp://');
    };
    
    // 计算每种分隔符能拆分出多少字段
    const separatorPartsCount: { separator: string; count: number; parts: string[] }[] = [];
    
    // 优先检测预设括号格式
    const bracketLeft = detectBracketFormat(content);
    if (bracketLeft) {
      const parts = splitByBracket(content, bracketLeft);
      if (parts.length >= 2) {
        separatorPartsCount.push({
          separator: bracketLeft + BRACKET_PAIRS[bracketLeft],
          count: parts.length,
          parts,
        });
      }
    }
    
    // 检测其他分隔符
    for (const sep of uniqueSeparators) {
      if ((sep === '/' || sep === '//') && isURL(content)) continue;
      
      const parts = content.split(sep).map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length >= 2) {
        separatorPartsCount.push({ separator: sep, count: parts.length, parts });
      }
    }
    
    // 按字段数量降序排列
    separatorPartsCount.sort((a, b) => b.count - a.count);
    
    // 优先匹配有识别条件的规则
    for (const { separator, count, parts } of separatorPartsCount) {
      const rulesWithConditions = rules.filter(r =>
        r.separator === separator &&
        r.matchConditions &&
        r.matchConditions.length > 0
      );
      
      for (const rule of rulesWithConditions) {
        let ruleFieldCount = rule.fieldOrder?.length || 0;
        if (ruleFieldCount !== count) continue;
        
        const allMatch = rule.matchConditions!.every(condition => {
          if (condition.fieldIndex < 0 || condition.fieldIndex >= parts.length) return false;
          return parts[condition.fieldIndex].includes(condition.keyword);
        });
        
        if (allMatch) {
          return rule;
        }
      }
    }
    
    // 走原有逻辑（兼容没有识别条件的规则）
    for (const { separator, count } of separatorPartsCount) {
      const matchingRules = rules.filter(r => r.separator === separator);
      if (matchingRules.length === 0) continue;
      
      const exactMatch = matchingRules.find(r =>
        (r.fieldOrder?.length || 0) === count
      );
      
      if (exactMatch) {
        return exactMatch;
      }
      
      const closestRules = matchingRules
        .filter(r => (r.fieldOrder?.length || 0) <= count)
        .sort((a, b) => (b.fieldOrder?.length || 0) - (a.fieldOrder?.length || 0));
      
      if (closestRules.length > 0) {
        return closestRules[0];
      }
    }
    
    // 没有匹配的规则，尝试自动识别
    if (separatorPartsCount.length > 0) {
      const best = separatorPartsCount[0];
      return {
        id: 'auto_detect',
        name: '自动识别',
        description: `自动识别的分隔符: ${best.separator}`,
        separator: best.separator,
        fieldOrder: AVAILABLE_FIELDS.slice(0, Math.min(best.count, AVAILABLE_FIELDS.length)),
        isActive: true,
        created_at: getISODateTime(),
        updated_at: getISODateTime(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('识别规则失败:', error);
    return null;
  }
};

// 使用规则解析二维码内容
export const parseWithRule = (
  content: string,
  rule: QRCodeRule
): {
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
} => {
  let parts: string[];
  
  // 检测是否为括号分隔符
  const bracketLeft = detectBracketFormat(content);
  if (bracketLeft) {
    parts = splitByBracket(content, bracketLeft);
  } else {
    parts = content.split(rule.separator).map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // 提取标准字段和自定义字段
  const standardFields: Record<string, string> = {};
  const customFields: Record<string, string> = {};
  
  rule.fieldOrder.forEach((fieldName, index) => {
    if (index < parts.length) {
      if (isCustomField(fieldName)) {
        customFields[getCustomFieldId(fieldName)] = parts[index];
      } else {
        standardFields[fieldName] = parts[index];
      }
    }
  });
  
  return { standardFields, customFields };
};

// ========== 清空数据相关函数 ==========

// 清空所有业务数据（保留配置）
export const clearAllBusinessData = async (): Promise<void> => {
  try {
    const database = getDb();
    // 清空业务数据
    await database.runAsync('DELETE FROM orders');
    await database.runAsync('DELETE FROM materials');
    await database.runAsync('DELETE FROM unpack_records');
    await database.runAsync('DELETE FROM print_history');
    await database.runAsync('DELETE FROM inbound_records');
    await database.runAsync('DELETE FROM inbound_summary');
    await database.runAsync('DELETE FROM inventory_check_records');
    // 清空解析规则和自定义字段（配置数据）
    await database.runAsync('DELETE FROM qr_code_rules');
    await database.runAsync('DELETE FROM custom_fields');
    // 保留：warehouses、inventory_bindings、system_config
  } catch (error) {
    console.error('清空业务数据失败:', error);
    throw error;
  }
};

// 清空所有配置数据（V3.0）- 只清空配置，不清空业务数据
export const clearAllConfigData = async (): Promise<void> => {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM qr_code_rules');
    await database.runAsync('DELETE FROM custom_fields');
    await database.runAsync('DELETE FROM inventory_bindings');
    await database.runAsync('DELETE FROM warehouses');
  } catch (error) {
    console.error('清空配置数据失败:', error);
    throw error;
  }
};

// 清空所有数据（V3.0）
export const clearAllDataV3 = async (): Promise<void> => {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM orders');
    await database.runAsync('DELETE FROM materials');
    await database.runAsync('DELETE FROM unpack_records');
    await database.runAsync('DELETE FROM print_history');
    await database.runAsync('DELETE FROM inbound_records');
    await database.runAsync('DELETE FROM inventory_check_records');
    await database.runAsync('DELETE FROM inventory_bindings');
    await database.runAsync('DELETE FROM warehouses');
  } catch (error) {
    console.error('清空所有数据失败:', error);
    throw error;
  }
};

// 清空所有数据（包括配置）
export const clearAllData = async (): Promise<void> => {
  try {
    await clearAllDataV3();
    const database = getDb();
    await database.runAsync('DELETE FROM qr_code_rules');
    await database.runAsync('DELETE FROM custom_fields');
  } catch (error) {
    console.error('清空所有数据失败:', error);
    throw error;
  }
};

// ========== 备份和恢复相关函数 ==========

// 导出备份数据
export const exportBackupData = async (): Promise<BackupData> => {
  try {
    const backup: BackupData = {
      version: CURRENT_DATA_VERSION,
      timestamp: getISODateTime(),
      backupTime: getISODateTime(),
      // 只导出配置数据
      rules: await getAllRules(),
      customFields: await getAllCustomFields(),
      // V3.0 新增
      inventoryBindings: await getAllInventoryBindings(),
      warehouses: await getAllWarehouses(),
      stats: {
        rules: (await getAllRules()).length,
        customFields: (await getAllCustomFields()).length,
        inventoryBindings: (await getAllInventoryBindings()).length,
        warehouses: (await getAllWarehouses()).length,
        hasSyncConfig: !!(await AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG)),
      },
      // 同步服务器配置
      syncConfig: JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG)) || 'null'),
    };
    return backup;
  } catch (error) {
    console.error('导出备份数据失败:', error);
    throw error;
  }
};

// 导入备份数据
export const importBackupData = async (backup: BackupData): Promise<{
  success: boolean;
  message: string;
  stats?: {
    rules: number;
    customFields: number;
    inventoryBindings: number;
    warehouses: number;
    hasSyncConfig?: boolean;
  };
}> => {
  try {
    // 1. 检查程序中是否有配置数据
    const currentStats = await getConfigStats();
    const hasConfigData =
      currentStats.warehouses > 0 ||
      currentStats.rules > 0 ||
      currentStats.customFields > 0 ||
      currentStats.inventoryBindings > 0;

    // 2. 如果有配置数据，先清空所有配置数据（不影响业务数据）
    if (hasConfigData) {
      console.log('程序中已有配置数据，先清空配置数据');
      await clearAllConfigData();
    } else {
      console.log('程序为空，直接导入配置');
    }

    // 3. 导入仓库（因为物料绑定依赖仓库）
    if (backup.warehouses && backup.warehouses.length > 0) {
      for (const warehouse of backup.warehouses) {
        try {
          await addWarehouse(warehouse);
        } catch (e) {
          console.error('导入仓库失败:', warehouse, e);
          throw new Error(`导入仓库失败: ${warehouse.name} - ${e}`);
        }
      }
    }

    // 4. 导入解析规则
    if (backup.rules && backup.rules.length > 0) {
      const database = getDb();
      for (const rule of backup.rules) {
        try {
          await database.runAsync(
            `INSERT OR REPLACE INTO qr_code_rules (
              id, name, description, separator, field_order, custom_field_ids,
              is_active, supplier_name, match_conditions, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rule.id,
              rule.name,
              rule.description || '',
              rule.separator || '',
              JSON.stringify(rule.fieldOrder || []),
              JSON.stringify(rule.customFieldIds || []),
              rule.isActive ? 1 : 0,
              rule.supplierName || '',
              JSON.stringify(rule.matchConditions || []),
              rule.created_at || getISODateTime(),
              rule.updated_at || getISODateTime(),
            ]
          );
        } catch (e) {
          console.error('导入解析规则失败:', rule, e);
          throw new Error(`导入解析规则失败: ${rule.name} - ${e}`);
        }
      }
    }

    // 5. 导入自定义字段
    if (backup.customFields && backup.customFields.length > 0) {
      const database = getDb();
      for (const field of backup.customFields) {
        try {
          await database.runAsync(
            `INSERT OR REPLACE INTO custom_fields (
              id, name, type, required, options, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              field.id,
              field.name,
              field.type,
              field.required ? 1 : 0,
              JSON.stringify(field.options || []),
              field.sortOrder || 0,
              field.created_at || getISODateTime(),
              field.updated_at || getISODateTime(),
            ]
          );
        } catch (e) {
          console.error('导入自定义字段失败:', field, e);
          throw new Error(`导入自定义字段失败: ${field.name} - ${e}`);
        }
      }
    }

    // 6. 导入物料绑定
    if (backup.inventoryBindings && backup.inventoryBindings.length > 0) {
      for (const binding of backup.inventoryBindings) {
        try {
          await addInventoryBinding(binding);
        } catch (e) {
          console.error('导入物料绑定失败:', binding, e);
          throw new Error(`导入物料绑定失败: ${binding.model} - ${e}`);
        }
      }
    }

    // 7. 导入同步服务器配置
    if (backup.syncConfig) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(backup.syncConfig));
      } catch (e) {
        console.error('导入同步配置失败:', e);
        // 同步配置导入失败不影响整体，跳过
      }
    }

    return {
      success: true,
      message: '配置导入成功',
      stats: {
        rules: backup.rules?.length || 0,
        customFields: backup.customFields?.length || 0,
        inventoryBindings: backup.inventoryBindings?.length || 0,
        warehouses: backup.warehouses?.length || 0,
        hasSyncConfig: !!backup.syncConfig,
      },
    };
  } catch (error) {
    console.error('导入备份数据失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '数据导入失败',
    };
  }
};

// ========== 配置统计相关函数 ==========

export const getConfigStats = async (): Promise<{
  rules: number;
  customFields: number;
  inventoryBindings?: number;
  warehouses?: number;
}> => {
  try {
    const database = getDb();
    const rules = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM qr_code_rules'
    );
    const customFields = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM custom_fields'
    );
    const warehouses = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM warehouses'
    );
    const inventoryBindings = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM inventory_bindings'
    );

    return {
      rules: rules?.count || 0,
      customFields: customFields?.count || 0,
      warehouses: warehouses?.count || 0,
      inventoryBindings: inventoryBindings?.count || 0,
    };
  } catch (error) {
    console.error('获取配置统计失败:', error);
    return {
      rules: 0,
      customFields: 0,
      warehouses: 0,
      inventoryBindings: 0,
    };
  }
};

// ========== 导出统计相关函数 ==========

export const getTodayExportCount = async (type: ExportType): Promise<number> => {
  try {
    // SQLite 中使用 system_config 表存储统计
    const database = getDb();
    const today = getLocalDateString();
    const key = `export_count_${type}_${today}`;
    
    const result = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM system_config WHERE key = ?',
      [key]
    );
    
    return result ? parseInt(result.value, 10) : 0;
  } catch (error) {
    console.error('获取导出统计失败:', error);
    return 0;
  }
};

export const incrementExportCount = async (type: ExportType): Promise<number> => {
  try {
    const database = getDb();
    const today = getLocalDateString();
    const key = `export_count_${type}_${today}`;

    const current = await getTodayExportCount(type);
    const nextCount = current + 1;

    await database.runAsync(
      'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)',
      [key, nextCount.toString()]
    );

    return nextCount;
  } catch (error) {
    console.error('更新导出统计失败:', error);
    return 0;
  }
};

// ========== 数据库文件备份/恢复 ==========

// 获取数据库文件路径
const getDatabaseFilePath = (): string => {
  // Expo SQLite 将数据库文件存储在应用的文档目录下
  // 路径格式: <documentDirectory>/SQLite/warehouse.db
  const documentDirectory = FS.documentDirectory;
  return `${documentDirectory}SQLite/warehouse.db`;
};

// 导出数据库文件
export const exportDatabaseFile = async (): Promise<{
  success: boolean;
  message: string;
  filePath?: string;
}> => {
  try {
    if (isWebPlatform) {
      return {
        success: false,
        message: 'Web 平台不支持数据库文件备份',
      };
    }

    // 确保所有数据已写入磁盘
    const database = getDb();
    if (!database) {
      return {
        success: false,
        message: '数据库未初始化',
      };
    }

    // 关闭数据库连接，确保数据持久化
    await database.closeAsync();
    db = null;

    // 等待一下，确保文件写入完成
    await new Promise(resolve => setTimeout(resolve, 500));

    const dbFilePath = getDatabaseFilePath();

    // 检查数据库文件是否存在
    const fileInfo = await FS.getInfoAsync(dbFilePath);
    if (!fileInfo.exists) {
      console.error('数据库文件不存在:', dbFilePath);
      // 重新打开数据库
      db = await SQLite.openDatabaseAsync('warehouse.db');
      return {
        success: false,
        message: '数据库文件不存在',
      };
    }

    // 生成备份文件名（包含时间戳）
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const backupFileName = `warehouse_backup_${timestamp}.db`;
    const backupDir = `${FS.documentDirectory}backups`;

    // 确保备份目录存在
    const dirInfo = await FS.getInfoAsync(backupDir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(backupDir, { intermediates: true });
    }

    const backupFilePath = `${backupDir}/${backupFileName}`;

    // 复制数据库文件到备份目录
    await FS.copyAsync({
      from: dbFilePath,
      to: backupFilePath,
    });

    // 重新打开数据库
    db = await SQLite.openDatabaseAsync('warehouse.db');

    return {
      success: true,
      message: '数据库文件导出成功',
      filePath: backupFilePath,
    };
  } catch (error) {
    console.error('导出数据库文件失败:', error);

    // 尝试重新打开数据库
    try {
      if (!db) {
        db = await SQLite.openDatabaseAsync('warehouse.db');
      }
    } catch (e) {
      console.error('重新打开数据库失败:', e);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : '导出数据库文件失败',
    };
  }
};

// 恢复数据库文件
export const importDatabaseFile = async (): Promise<{
  success: boolean;
  message: string;
  stats?: {
    orders: number;
    materials: number;
    rules: number;
    warehouses: number;
  };
}> => {
  try {
    if (isWebPlatform) {
      return {
        success: false,
        message: 'Web 平台不支持数据库文件恢复',
      };
    }

    // Android 对 MIME 类型有严格限制，使用多种类型尝试
    // 优先使用通配符，确保能选择所有文件
    let documentType: string | string[] = '*/*';

    const Platform = require('react-native').Platform;
    if (Platform.OS === 'android') {
      // Android 上使用多种 MIME 类型，提高兼容性
      documentType = [
        '*/*',  // 允许所有文件
        'application/x-sqlite3',
        'application/vnd.sqlite3',
        'application/octet-stream',
      ];
    } else {
      // iOS 上可以使用 SQLite 类型
      documentType = 'application/x-sqlite3';
    }

    // 使用文档选择器选择备份文件
    const result = await DocumentPicker.getDocumentAsync({
      type: documentType,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        message: '未选择文件',
      };
    }

    const sourceFileUri = result.assets[0].uri;

    // 验证文件扩展名必须是 .db
    if (!sourceFileUri.toLowerCase().endsWith('.db')) {
      return {
        success: false,
        message: '请选择 .db 格式的数据库文件',
      };
    }

    // 关闭当前数据库连接
    const database = getDb();
    if (database) {
      await database.closeAsync();
    }
    db = null;

    // 等待一下，确保数据库完全关闭
    await new Promise(resolve => setTimeout(resolve, 500));

    const dbFilePath = getDatabaseFilePath();
    const dbBackupPath = `${dbFilePath}.backup`;

    try {
      // 1. 备份当前数据库文件（如果存在）
      const currentDbInfo = await FS.getInfoAsync(dbFilePath);
      if (currentDbInfo.exists) {
        await FS.copyAsync({
          from: dbFilePath,
          to: dbBackupPath,
        });
      }

      // 2. 删除当前数据库文件
      await FS.deleteAsync(dbFilePath, { idempotent: true });

      // 3. 复制新数据库文件
      await FS.copyAsync({
        from: sourceFileUri,
        to: dbFilePath,
      });

      // 4. 重新打开数据库
      db = await SQLite.openDatabaseAsync('warehouse.db');

      // 5. 验证数据库是否可用，获取统计数据
      const orders = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM orders'
      );
      const materials = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM materials'
      );
      const rules = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM qr_code_rules'
      );
      const warehouses = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM warehouses'
      );

      // 删除备份文件
      await FS.deleteAsync(dbBackupPath, { idempotent: true });

      return {
        success: true,
        message: '数据库文件恢复成功',
        needRestart: true,  // 标记需要重启应用
        stats: {
          orders: orders?.count || 0,
          materials: materials?.count || 0,
          rules: rules?.count || 0,
          warehouses: warehouses?.count || 0,
        },
      };
    } catch (restoreError) {
      console.error('恢复数据库失败，尝试回滚:', restoreError);

      // 恢复失败，尝试回滚到备份
      const backupInfo = await FS.getInfoAsync(dbBackupPath);
      if (backupInfo.exists) {
        await FS.deleteAsync(dbFilePath, { idempotent: true });
        await FS.copyAsync({
          from: dbBackupPath,
          to: dbFilePath,
        });
        await FS.deleteAsync(dbBackupPath, { idempotent: true });
      }

      // 重新打开数据库
      db = await SQLite.openDatabaseAsync('warehouse.db');

      return {
        success: false,
        message: `恢复失败，已回滚到原数据库: ${restoreError instanceof Error ? restoreError.message : '未知错误'}`,
      };
    }
  } catch (error) {
    console.error('导入数据库文件失败:', error);

    // 尝试重新打开数据库
    try {
      if (!db) {
        db = await SQLite.openDatabaseAsync('warehouse.db');
      }
    } catch (e) {
      console.error('重新打开数据库失败:', e);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : '导入数据库文件失败',
    };
  }
};
