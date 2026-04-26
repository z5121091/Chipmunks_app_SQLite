# 优化实施进度记录

## 第一阶段（已完成）✅

### 方案 1：仓库选择引导
- **状态**：✅ 已完成
- **修改文件**：
  - ✅ `client/components/WarehouseGuide.tsx`（新建）
  - ✅ `client/constants/config.ts`（添加 STORAGE_KEYS.WAREHOUSE_GUIDE_SHOWN）
  - ✅ `client/screens/inventory/index.tsx`（添加引导逻辑）
  - ✅ `client/screens/inbound/index.tsx`（添加引导逻辑）
- **功能**：
  - 首次使用时显示引导对话框（2步）
  - 引导完成后自动标记（不再显示）
  - 已有数据时不显示引导
  - 可跳过引导

### 方案 B：错误提示分类
- **状态**：✅ 已完成（部分）
- **修改文件**：
  - ✅ `client/utils/errorTypes.ts`（新建）
  - ✅ `client/screens/inventory/index.tsx`（导入错误分类函数）
  - ✅ `client/screens/inbound/index.tsx`（导入错误分类函数）
- **功能**：
  - 错误分类：格式、绑定、保存、重复、网络、权限、未知
  - 详细的错误说明
  - 提供解决建议和操作按钮
  - 支持路由跳转

---

## 第二阶段（待实施）⏳

### 重复检测逻辑 - 方案 3：自定义

#### 技术实现
需要新增的代码：

**A. 数据结构（在 `constants/config.ts`）**
```typescript
// 重复检测策略配置
export type DuplicateStrategy = 'strict' | 'loose' | 'custom';

export interface DuplicateDetectionConfig {
  strategy: DuplicateStrategy;
  fields: {
    traceNo: boolean;        // 追踪码
    model: boolean;          // 型号
    batch: boolean;          // 批次
    version: boolean;        // 版本
    model_batch: boolean;    // 型号+批次组合
  };
}

export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  strategy: 'custom',
  fields: {
    traceNo: true,
    model: false,
    batch: false,
    version: false,
    model_batch: false,
  },
};
```

**B. 存储配置（在 `constants/config.ts`）**
```typescript
export const STORAGE_KEYS = {
  // ... 现有 key
  DUPLICATE_CONFIG: 'duplicate_detection_config',
};
```

**C. 检测函数（新建 `utils/duplicateDetector.ts`）**
```typescript
export function isDuplicate(
  newScan: any,
  existingScans: any[],
  config: DuplicateDetectionConfig
): boolean {
  // 1. 严格模式（优先检测追踪码）
  if (config.strategy === 'strict') {
    if (newScan.traceNo) {
      return existingScans.some(r => r.traceNo === newScan.traceNo);
    }
    return existingScans.some(r =>
      r.model === newScan.model &&
      r.batch === newScan.batch &&
      r.version === newScan.version
    );
  }

  // 2. 自定义模式（按配置的字段检测）
  if (config.strategy === 'custom') {
    const checks: boolean[] = [];

    if (config.fields.traceNo && newScan.traceNo) {
      checks.push(existingScans.some(r => r.traceNo === newScan.traceNo));
    }

    if (config.fields.model) {
      checks.push(existingScans.some(r => r.model === newScan.model));
    }

    if (config.fields.batch) {
      checks.push(existingScans.some(r => r.batch === newScan.batch));
    }

    if (config.fields.version) {
      checks.push(existingScans.some(r => r.version === newScan.version));
    }

    if (config.fields.model_batch) {
      checks.push(existingScans.some(r =>
        r.model === newScan.model &&
        r.batch === newScan.batch
      ));
    }

    return checks.some(Boolean);
  }

  // 3. 宽松模式（只检测追踪码）
  return newScan.traceNo ? existingScans.some(r => r.traceNo === newScan.traceNo) : false;
}
```

**D. 页面配置界面（新建 `screens/settings/duplicate-config.tsx`）**
```typescript
// 简单配置界面
// - 选择策略（严格/宽松/自定义）
// - 自定义模式下勾选要检测的字段
// - 保存到 AsyncStorage
```

**E. 修改现有页面**：
```typescript
// inventory/index.tsx
// inbound/index.tsx
// outbound/index.tsx
// 需要加载配置并传入检测函数
```

#### 潜在 BUG 和风险
| 风险点 | 风险等级 | 可能的问题 | 缓解方案 |
|--------|---------|-----------|---------|
| **配置读取失败** | 🟡 中 | AsyncStorage 读取失败，使用默认配置 | ✅ 添加 try-catch，使用 DEFAULT_DUPLICATE_CONFIG 兜底 |
| **字段为空值** | 🟡 中 | traceNo 为空字符串 "" 时，误判 | ✅ 使用 `newScan.traceNo &&` 判断真值 |
| **性能问题** | 🟢 低 | 多次 `some()` 循环可能影响性能 | ✅ 优化算法，一次循环完成多个检查 |
| **配置不兼容** | 🟡 中 | 旧版本数据没有 config，导致报错 | ✅ 添加版本检查，自动迁移旧配置 |
| **误判重复** | 🟡 中 | 自定义配置下可能误判不同产品 | ✅ 在配置界面添加说明，警告用户 |
| **漏判重复** | 🟡 中 | 配置不当导致重复入库 | ✅ 默认使用安全配置（严格模式） |

#### 代码影响
- **修改文件数**：5 个
- **代码量变化**：+480 行
- **兼容性**：✅ 向后兼容

#### 稳定性评估
| 评估项 | 评分 | 说明 |
|--------|------|------|
| **崩溃风险** | 🟢 低 | 纯逻辑修改，不涉及底层 API |
| **数据风险** | 🟡 中 | 配置不当可能导致重复/漏判 |
| **性能风险** | 🟢 低 | 简单的数组遍历 |
| **兼容性风险** | 🟡 中 | 需要处理旧版本升级 |
| **回归风险** | 🟡 中 | 3 个页面都要修改 |

---

## 第三阶段（可选）⏸️

### 错误提示优化 - 方案 A：分级错误提示 + 解决建议

#### 技术实现
需要修改的代码：

**A. 扩展 Toast 接口（修改 `utils/toast.tsx`）**
```typescript
// 原接口
showToast(text: string, type?: ToastType)

// 新接口
showToast(
  title: string,
  type: ToastType,
  options?: {
    message?: string;       // 详细说明
    action?: string;        // 按钮文字
    onPress?: () => void;   // 按钮回调
    code?: string;          // 错误代码
  }
)
```

**影响分析**：
- ❌ **重大影响**：需要修改 Toast 组件的 UI（添加按钮）
- ❌ **影响所有页面**：所有 showToast 调用都要适配
- 🟡 **工作量**：较大（约 500+ 行）

#### 潜在 BUG 和风险
| 风险点 | 风险等级 | 可能的问题 | 缓解方案 |
|--------|---------|-----------|---------|
| **接口不兼容** | 🔴 高 | 旧代码调用 `showToast(text, type)` 会报错 | ✅ 重载函数，保持向后兼容 |
| **按钮点击无响应** | 🟡 中 | onPress 未正确绑定 | ✅ 添加 PropTypes 检查 |
| **UI 错位** | 🟡 中 | 按钮位置影响扫码 | ✅ 使用 Modal 弹窗，避免遮挡 |
| **性能问题** | 🟢 低 | 多次创建 Modal | ✅ 使用单例模式 |

#### 代码影响
- **修改文件数**：11+ 个
- **代码量变化**：+800 行
- **兼容性**：❌ **不兼容**

#### 稳定性评估
| 评估项 | 评分 | 说明 |
|--------|------|------|
| **崩溃风险** | 🟡 中 | 修改核心组件，可能影响所有页面 |
| **数据风险** | 🟢 低 | 不涉及数据操作 |
| **性能风险** | 🟢 低 | Modal 创建开销小 |
| **兼容性风险** | 🔴 高 | 不向后兼容，需要大量适配 |
| **回归风险** | 🔴 高 | 影响所有使用 Toast 的页面 |

#### 建议
- ❌ **不推荐**：风险大，工作量大
- 🤔 **可选**：后续作为增强功能
- ⏳ **暂不实施**：先观察第一阶段的效果

---

## 总结对比

| 优化项 | 可行性 | 稳定性 | 风险 | 工作量 | 优先级 | 建议 | 状态 |
|--------|--------|--------|------|--------|--------|------|------|
| **重复检测（自定义）** | ✅ | ✅ | 🟡 中 | +480 行 | ⭐⭐⭐⭐⭐ | ✅ 推荐 | ⏳ 待实施 |
| **错误提示（方案 A）** | ✅ | ⚠️ | 🔴 高 | +800 行 | ⭐⭐ | ❌ 不推荐 | ⏸️ 暂不实施 |
| **错误提示（方案 B）** | ✅ | ✅ | 🟢 低 | +300 行 | ⭐⭐⭐ | ✅ 推荐 | ✅ 已完成 |
| **仓库引导（方案 1）** | ✅ | ✅ | 🟢 低 | +250 行 | ⭐⭐⭐⭐ | ✅ 推荐 | ✅ 已完成 |

---

## 下一步计划

### 验证阶段（当前任务）
1. ✅ 静态检查
2. ⏳ 服务启动测试
3. ⏳ 功能完整性测试
4. ⏳ 边界场景测试
5. ⏳ 回归测试

### 后续阶段
1. 第二阶段：重复检测逻辑优化
2. 第三阶段：错误提示优化（方案 A）
3. 持续优化：根据用户反馈调整
