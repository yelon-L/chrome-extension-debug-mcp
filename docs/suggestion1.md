# Chrome Debug MCP - ExtensionDetector 问题分析报告

> **分析日期**: 2025-10-10 19:06  
> **问题**: `list_extensions` 返回 `version: "unknown"`，无法获取完整扩展信息

---

## 🔍 问题现象

### 当前输出
```json
{
  "id": "lnidiajhkakibgicoamnbmfedgpmpafj",
  "name": "Service Worker chrome-extension://lnidiajhkakibgicoamnbmfedgpmpafj/background/index.js",
  "version": "unknown",
  "description": "Detected from target info",
  "url": "chrome-extension://lnidiajhkakibgicoamnbmfedgpmpafj/background/index.js",
  "type": "service_worker",
  "enabled": true
}
```

### 期望输出
```json
{
  "id": "lnidiajhkakibgicoamnbmfedgpmpafj",
  "name": "Video SRT Ext MVP",
  "version": "0.5.0",
  "description": "MVP: Step-by-step video subtitle extraction and real-time ASR",
  "url": "chrome-extension://lnidiajhkakibgicoamnbmfedgpmpafj/background/index.js",
  "type": "service_worker",
  "enabled": true
}
```

---

## 🐛 根本原因分析

### 问题1: Context隔离导致manifest.json无法访问

**位置**: `/home/p/workspace/chrome-debug-mcp/src/handlers/extension/ExtensionDetector.ts:106-132`

**代码**:
```typescript
const manifestResult = await cdpClient.Runtime.evaluate({
  expression: `
    (async () => {
      try {
        const response = await fetch('chrome-extension://${extensionId}/manifest.json');
        const manifest = await response.json();
        return { 
          name: manifest.name, 
          version: manifest.version,
          description: manifest.description 
        };
      } catch (e) {
        return null;
      }
    })()
  `,
  awaitPromise: true,
  timeout: 3000
});
```

**问题**:
1. ❌ `Runtime.evaluate` 在**页面context**中执行，不是扩展context
2. ❌ 页面context受CORS限制，无法访问 `chrome-extension://` URL
3. ❌ 即使有`switch_extension_context`，evaluate仍在页面执行

**验证**:
```bash
# 测试1: 在页面context执行
evaluate("fetch('chrome-extension://xxx/manifest.json')")
# 结果: Failed to fetch (CORS error)

# 测试2: 切换到扩展context后执行
switch_extension_context(extensionId, 'background')
evaluate("fetch('chrome-extension://xxx/manifest.json')")
# 结果: 仍然在页面context，Failed to fetch
```

---

### 问题2: chrome.management API不可用

**位置**: `/home/p/workspace/chrome-debug-mcp/src/handlers/extension/ExtensionDetector.ts:171-187`

**代码**:
```typescript
const result = await cdpClient.Runtime.evaluate({
  expression: `
    new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.management) {
        chrome.management.get('${extensionId}', (ext) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve({ name: ext.name, version: ext.version });
          }
        });
      } else {
        resolve(null);
      }
    })
  `,
  awaitPromise: true,
  returnByValue: true
});
```

**问题**:
1. ❌ `chrome.management` API需要 `"management"` 权限
2. ❌ 普通页面context没有chrome.management
3. ❌ 即使在扩展context，也需要显式声明权限

**Chrome限制**:
```json
// manifest.json
{
  "permissions": ["management"]  // 必需，但扩展未声明
}
```

---

### 问题3: Target信息不完整

**位置**: `/home/p/workspace/chrome-debug-mcp/src/handlers/extension/ExtensionDetector.ts:135-146`

**代码**:
```typescript
const { targetInfos } = await cdpClient.Target.getTargets();
const extensionTarget = targetInfos.find((target: any) => 
  target.url && target.url.includes(extensionId) && target.title
);

if (extensionTarget && extensionTarget.title !== 'chrome-extension') {
  return {
    name: extensionTarget.title,
    version: 'unknown',
    description: 'Detected from target info'
  };
}
```

**问题**:
1. ⚠️ `target.title` 是Service Worker路径，不是扩展名称
2. ⚠️ `Target.getTargets()` 不返回manifest信息
3. ⚠️ 无法通过CDP API直接获取扩展元数据

**实际数据**:
```javascript
{
  type: 'service_worker',
  title: 'Service Worker chrome-extension://xxx/background/index.js',  // ❌ 不是扩展名
  url: 'chrome-extension://xxx/background/index.js',
  targetId: 'xxx'
  // ❌ 没有 name, version, description 字段
}
```

---

## 💡 解决方案

### 方案1: 使用CDP的Target.attachToTarget + Runtime.evaluate（推荐）

**原理**: 附加到扩展的Service Worker target，在其context中执行代码

**实现**:
```typescript
async getExtensionFullInfo(extensionId: string): Promise<any> {
  try {
    const cdpClient = this.chromeManager.getCdpClient();
    if (!cdpClient) return null;

    // 1. 找到扩展的Service Worker target
    const { targetInfos } = await cdpClient.Target.getTargets();
    const swTarget = targetInfos.find((t: any) => 
      t.type === 'service_worker' && 
      t.url && 
      t.url.includes(extensionId)
    );

    if (!swTarget) {
      return null;
    }

    // 2. 附加到该target
    const { sessionId } = await cdpClient.Target.attachToTarget({
      targetId: swTarget.targetId,
      flatten: true
    });

    // 3. 在Service Worker context中获取manifest
    const result = await cdpClient.Runtime.evaluate({
      expression: `
        (() => {
          try {
            // Service Worker中chrome.runtime.getManifest()应该可用
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
              const manifest = chrome.runtime.getManifest();
              return {
                name: manifest.name,
                version: manifest.version,
                description: manifest.description
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })()
      `,
      contextId: undefined,  // 使用默认context
      returnByValue: true
    });

    // 4. 分离session
    await cdpClient.Target.detachFromTarget({ sessionId });

    return result.result?.value || null;

  } catch (error) {
    console.error('Failed to get extension info:', error);
    return null;
  }
}
```

**优势**:
- ✅ 在正确的context中执行（Service Worker）
- ✅ 可以访问chrome.runtime.getManifest()
- ✅ 不受CORS限制
- ✅ 无需额外权限

**注意**:
- ⚠️ 需要Service Worker已初始化
- ⚠️ MV2扩展使用background page，需要额外处理

---

### 方案2: 读取扩展文件系统（备选）

**原理**: 通过CDP的IO domain读取manifest.json文件

**实现**:
```typescript
async getExtensionManifest(extensionId: string): Promise<any> {
  try {
    const cdpClient = this.chromeManager.getCdpClient();
    if (!cdpClient) return null;

    // 1. 构造manifest路径
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;

    // 2. 尝试通过Network domain获取
    const response = await cdpClient.Network.getResponseBody({
      requestId: 'xxx'  // 需要先intercept请求
    });

    // 注意: 这个方法比较复杂，需要配置Network interception
    return JSON.parse(response.body);

  } catch (error) {
    return null;
  }
}
```

**劣势**:
- ❌ 需要配置Network interception
- ❌ 复杂度高
- ❌ 不如方案1直接

---

### 方案3: 使用chrome.debugger API（终极方案）

**原理**: 通过chrome.debugger API直接控制扩展

**前提**: chrome-debug-mcp本身作为Chrome扩展运行

**实现**:
```typescript
// 需要chrome-debug-mcp改造为Chrome扩展
chrome.debugger.attach({ extensionId }, '1.3', () => {
  chrome.debugger.sendCommand({ extensionId }, 'Runtime.evaluate', {
    expression: 'chrome.runtime.getManifest()'
  }, (result) => {
    console.log('Manifest:', result);
  });
});
```

**劣势**:
- ❌ 需要重构chrome-debug-mcp
- ❌ 增加复杂度
- ❌ 不适合当前架构

---

## 🔧 推荐修复

### 修改文件: `/home/p/workspace/chrome-debug-mcp/src/handlers/extension/ExtensionDetector.ts`

**修改点1**: 改进 `getExtensionFullInfo` 方法

```typescript
async getExtensionFullInfo(extensionId: string): Promise<any> {
  try {
    const cdpClient = this.chromeManager.getCdpClient();
    if (!cdpClient) return null;

    // 找到扩展的Service Worker target
    const { targetInfos } = await cdpClient.Target.getTargets();
    const swTarget = targetInfos.find((t: any) => 
      t.type === 'service_worker' && 
      t.url && 
      t.url.includes(extensionId)
    );

    if (!swTarget) {
      log('No service worker found for extension:', extensionId);
      return null;
    }

    // 附加到Service Worker target
    let sessionId: string | undefined;
    try {
      const attachResult = await cdpClient.Target.attachToTarget({
        targetId: swTarget.targetId,
        flatten: true
      });
      sessionId = attachResult.sessionId;

      // 在Service Worker context中执行
      const result = await cdpClient.Runtime.evaluate({
        expression: `
          (() => {
            try {
              if (typeof chrome !== 'undefined' && chrome.runtime) {
                if (chrome.runtime.getManifest) {
                  const manifest = chrome.runtime.getManifest();
                  return {
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    manifest_version: manifest.manifest_version
                  };
                }
              }
              return null;
            } catch (e) {
              return { error: e.message };
            }
          })()
        `,
        returnByValue: true,
        awaitPromise: false
      });

      // 立即分离
      if (sessionId) {
        await cdpClient.Target.detachFromTarget({ sessionId });
      }

      if (result.result?.value && !result.result.value.error) {
        return result.result.value;
      }

      log('Failed to get manifest from service worker:', result);
      return null;

    } catch (e) {
      log('Error attaching to service worker:', e);
      if (sessionId) {
        try {
          await cdpClient.Target.detachFromTarget({ sessionId });
        } catch (detachError) {
          // Ignore detach errors
        }
      }
      return null;
    }

  } catch (error) {
    log('Failed to get extension info:', error);
    return null;
  }
}
```

**修改点2**: 添加fallback逻辑

```typescript
async listExtensions(args: ListExtensionsArgs): Promise<any[]> {
  // ... 现有代码 ...

  for (const target of extensionTargets) {
    if (target.url) {
      const match = target.url.match(/chrome-extension:\/\/([a-z]{32})/);
      if (match) {
        const extensionId = match[1];
        if (!extensionIds.has(extensionId)) {
          extensionIds.add(extensionId);
          
          // 尝试获取完整信息
          const extInfo = await this.getExtensionFullInfo(extensionId);
          
          extensions.push({
            id: extensionId,
            name: extInfo?.name || this.extractNameFromTitle(target.title) || 'Unknown Extension',
            version: extInfo?.version || 'unknown',
            description: extInfo?.description || '',
            manifestVersion: extInfo?.manifest_version || (target.type === 'service_worker' ? 3 : 2),
            url: target.url,
            type: target.type,
            title: target.title || 'Unknown Extension',
            targetId: target.targetId,
            enabled: extInfo?.enabled !== false
          });
        }
      }
    }
  }

  return extensions;
}

// 新增辅助方法
private extractNameFromTitle(title: string): string | null {
  if (!title) return null;
  
  // "Service Worker chrome-extension://xxx/background/index.js" -> null
  if (title.includes('Service Worker') || title.includes('chrome-extension')) {
    return null;
  }
  
  return title;
}
```

---

## 🧪 测试验证

### 测试步骤

1. **修改ExtensionDetector.ts**
   ```bash
   cd /home/p/workspace/chrome-debug-mcp
   # 应用上述修改
   ```

2. **重新构建**
   ```bash
   npm run build
   ```

3. **重启MCP服务器**
   ```bash
   # 重启Cascade或重新加载MCP
   ```

4. **测试**
   ```typescript
   // 通过MCP调用
   mcp1_list_extensions()
   ```

### 预期结果

```json
{
  "id": "lnidiajhkakibgicoamnbmfedgpmpafj",
  "name": "Video SRT Ext MVP",
  "version": "0.5.0",
  "description": "MVP: Step-by-step video subtitle extraction and real-time ASR",
  "manifestVersion": 3,
  "url": "chrome-extension://lnidiajhkakibgicoamnbmfedgpmpafj/background/index.js",
  "type": "service_worker",
  "enabled": true
}
```

---

## 📊 影响范围

### 受影响的文件
- ✅ `/home/p/workspace/chrome-debug-mcp/src/handlers/extension/ExtensionDetector.ts`

### 受影响的功能
- ✅ `list_extensions` - 将返回完整扩展信息
- ✅ Extension context switching - 更准确的上下文信息
- ✅ Extension debugging - 更好的扩展识别

### 向后兼容性
- ✅ 完全兼容：fallback到现有逻辑
- ✅ 无breaking changes

---

## 🎯 总结

### 核心问题
1. ❌ `Runtime.evaluate` 默认在页面context执行
2. ❌ 页面context无法访问 `chrome-extension://` URL（CORS）
3. ❌ 未使用 `Target.attachToTarget` 切换到扩展context

### 解决方案
1. ✅ 使用 `Target.attachToTarget` 附加到Service Worker
2. ✅ 在Service Worker context中调用 `chrome.runtime.getManifest()`
3. ✅ 添加fallback和错误处理

### 预期效果
- ✅ `list_extensions` 返回完整信息（name, version, description）
- ✅ 准确识别MV3扩展
- ✅ 提升扩展调试体验

---

**报告生成时间**: 2025-10-10 19:06  
**分析者**: AI Assistant  
**状态**: 待修复
