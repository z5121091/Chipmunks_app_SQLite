# 版本号管理指南

## 📋 版本号存储位置

**唯一配置源**: `client/version.json`

```json
{
  "version": "2.1.2",
  "versionCode": 15,
  "buildNumber": 15,
  "appName": "掌上仓库",
  "companyName": "上海花栗鼠科技有限公司",
  "companyWebsite": "http://www.chipmunks.com.cn/",
  "author": "zx5121091"
}
```

## 🔄 自动同步机制

所有以下文件会自动从 `version.json` 读取版本号：

| 文件 | 读取方式 |
|------|----------|
| `client/app.config.ts` | `import versionConfig from './version.json'` |
| `client/screens/settings/index.tsx` | `import { APP_VERSION_DISPLAY } from '@/constants/version'` |
| `package.json` (根目录) | 运行 `pnpm sync-version` 同步 |
| `client/package.json` | 运行 `pnpm sync-version` 同步 |
| `server/package.json` | 运行 `pnpm sync-version` 同步 |

## 📝 更新版本号的步骤

### 方法一：修改 version.json 后同步

1. 修改 `client/version.json` 中的版本号
2. 运行同步命令：
   ```bash
   pnpm sync-version
   ```

### 方法二：直接运行脚本

```bash
# 先修改 client/version.json，然后运行：
node scripts/sync-version.js
```

## ⚠️ 注意事项

1. **不要**直接修改 `package.json` 中的版本号，它们会自动同步
2. **不要**直接修改 `app.config.ts` 或 `settings/index.tsx` 中的版本号
3. **只需修改** `client/version.json` 文件，其他地方会自动读取

## 🔍 验证版本号一致性

```bash
# 检查所有版本号是否一致
pnpm sync-version
```

输出示例：
```
📦 当前版本: 2.1.2 (versionCode: 15)
📱 应用名称: 掌上仓库

⏭️  无需更新: package.json
⏭️  无需更新: client/package.json
⏭️  无需更新: server/package.json

✅ 所有版本号已保持一致！
```

## 📂 文件结构

```
client/
├── version.json          # ← 唯一配置源
├── app.config.ts         # 自动读取 version.json
├── constants/
│   └── version.ts        # 导出版本常量供其他组件使用
└── screens/settings/
    └── index.tsx         # 显示版本号

scripts/
└── sync-version.js       # 同步脚本

package.json              # 通过 sync-version 同步
client/package.json       # 通过 sync-version 同步
server/package.json       # 通过 sync-version 同步
```
