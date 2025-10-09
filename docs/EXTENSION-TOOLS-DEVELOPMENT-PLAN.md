# Chrome扩展调试工具开发计划

## 🎯 总体规划：9个专业化工具

### 📊 工具优先级矩阵

| 工具名称 | 优先级 | 复杂度 | 开发时间 | 依赖关系 |
|---------|--------|--------|----------|----------|
| `get_extension_logs` (增强) | P0 | 低 | 1天 | 无 |
| `content_script_status` (增强) | P0 | 中 | 2天 | 无 |
| `list_extension_contexts` | P1 | 中 | 3天 | 无 |
| `switch_extension_context` | P1 | 高 | 3天 | list_extension_contexts |
| `inspect_extension_storage` | P1 | 中 | 2天 | 无 |
| `monitor_extension_messages` | P2 | 高 | 4天 | switch_extension_context |
| `track_extension_api_calls` | P2 | 高 | 4天 | monitor_extension_messages |
| `test_extension_on_multiple_pages` | P3 | 中 | 2天 | content_script_status |
| `list_extensions` (已完成) | ✅ | - | - | - |

## 📅 4周开发时间表

### Week 1: 基础增强 (P0)
**目标**: 完善现有工具，建立基础能力

#### Day 1-2: `get_extension_logs` 增强
**需求分析**:
```typescript
interface ExtensionLogsArgs {
  extensionId?: string;
  sourceTypes?: ('background' | 'content_script' | 'popup' | 'options' | 'service_worker')[];
  level?: ('error' | 'warn' | 'info' | 'log' | 'debug')[];
  since?: number; // timestamp
  tabId?: string; // 过滤特定tab的content script日志
  clear?: boolean;
}

interface ExtensionLogsResponse {
  logs: Array<{
    timestamp: number;
    level: string;
    message: string;
    source: string; // 'background' | 'content_script' | 'popup' | etc.
    extensionId: string;
    tabId?: string; // 如果是content script
    url?: string;   // 页面URL
  }>;
  totalCount: number;
  filteredCount: number;
}
```

**技术实现**:
1. 扩展ChromeManager的日志收集器
2. 添加日志分类标记
3. 实现时间戳过滤
4. 添加扩展ID关联

#### Day 3-4: `content_script_status` 增强
**需求分析**:
```typescript
interface ContentScriptStatusArgs {
  tabId?: string;
  extensionId?: string;
  checkAllTabs?: boolean;
}

interface ContentScriptStatusResponse {
  results: Array<{
    tabId: string;
    url: string;
    extensionId: string;
    injectionStatus: {
      injected: boolean;
      scriptCount: number;
      cssCount: number;
      errors: string[];
      performance: {
        injectionTime: number;
        domReadyTime: number;
      };
    };
    domModifications: {
      elementsAdded: number;
      elementsRemoved: number;
      styleChanges: number;
    };
    conflicts: Array<{
      type: 'css' | 'js' | 'dom';
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }>;
}
```

**技术实现**:
1. 增强DOM分析脚本
2. 添加性能监控
3. 实现冲突检测算法
4. 批量tab检查支持

### Week 2: 上下文管理 (P1)
**目标**: 实现扩展多上下文调试能力

#### Day 5-7: `list_extension_contexts`
**需求分析**:
```typescript
interface ListExtensionContextsArgs {
  extensionId?: string; // 不传则列出所有扩展的上下文
}

interface ExtensionContext {
  extensionId: string;
  extensionName: string;
  manifestVersion: number;
  contexts: {
    background?: {
      type: 'page' | 'service_worker';
      targetId: string;
      url: string;
      active: boolean;
      lastActivity: number;
    };
    contentScripts: Array<{
      tabId: string;
      targetId: string;
      url: string;
      frameId: number;
      injected: boolean;
      isolated: boolean;
    }>;
    popup?: {
      targetId: string;
      url: string;
      open: boolean;
      windowId?: string;
    };
    options?: {
      targetId: string;
      url: string;
      open: boolean;
      tabId?: string;
    };
    devtools?: Array<{
      targetId: string;
      inspectedTabId: string;
      url: string;
    }>;
  };
}
```

**技术实现**:
1. 扩展Target.getTargets()分析逻辑
2. 实现扩展上下文分类算法
3. 添加扩展manifest读取
4. 实现上下文状态检测

#### Day 8-10: `switch_extension_context`
**需求分析**:
```typescript
interface SwitchExtensionContextArgs {
  extensionId: string;
  contextType: 'background' | 'content_script' | 'popup' | 'options' | 'devtools';
  tabId?: string; // content_script时需要
  targetId?: string; // 直接指定targetId
}

interface SwitchExtensionContextResponse {
  success: boolean;
  currentContext: {
    extensionId: string;
    contextType: string;
    targetId: string;
    url: string;
    tabId?: string;
  };
  capabilities: {
    canEvaluate: boolean;
    canInjectScript: boolean;
    canAccessStorage: boolean;
    chromeAPIs: string[]; // 可用的Chrome API列表
  };
}
```

**技术实现**:
1. 实现CDP target切换机制
2. 添加上下文能力检测
3. 实现Chrome API可用性检查
4. 建立上下文会话管理

#### Day 11-12: `inspect_extension_storage`
**需求分析**:
```typescript
interface InspectExtensionStorageArgs {
  extensionId: string;
  storageTypes?: ('local' | 'sync' | 'session' | 'managed')[];
  keys?: string[]; // 指定key，不传则返回所有
  watch?: boolean; // 是否开启实时监控
}

interface ExtensionStorageData {
  extensionId: string;
  storageData: {
    local?: Record<string, any>;
    sync?: Record<string, any>;
    session?: Record<string, any>;
    managed?: Record<string, any>;
  };
  usage: {
    local: { usedBytes: number; maxBytes: number };
    sync: { usedBytes: number; maxBytes: number };
  };
  recentChanges?: Array<{
    timestamp: number;
    storageType: string;
    operation: 'set' | 'remove' | 'clear';
    key: string;
    oldValue?: any;
    newValue?: any;
  }>;
}
```

**技术实现**:
1. 在扩展上下文中执行storage API
2. 实现storage使用量计算
3. 添加storage变更监听
4. 实现跨存储类型查询

### Week 3: 高级调试 (P2) - ✅ **已完成**
**目标**: 实现消息传递和API调用监控

**📋 当前状态**: 100%完成，所有功能已实现并集成到系统中

**✅ 已完成**:
- ExtensionMessageTracker类完整实现
- 消息监控功能完整开发
- API调用追踪功能完整实现  
- Frame有效性检查机制（从Week 2延续优化）
- Chrome扩展API类型兼容性问题完全解决
- evaluate()脚本中的chrome API类型问题解决
- 消息拦截机制优化和稳定性保证
- monitor_extension_messages工具完整集成
- track_extension_api_calls工具完整实现
- Enhanced Test Extension创建用于全面功能验证

**🎯 功能价值实现**:
- 填补Chrome DevTools MCP扩展调试空白
- 实时消息传递监控能力
- API调用级别性能分析和瓶颈识别
- 独特的扩展开发调试竞争优势

#### Day 13-16: `monitor_extension_messages`
**需求分析**:
```typescript
interface MonitorExtensionMessagesArgs {
  extensionId: string;
  duration?: number; // 监控时长(ms)，不传则持续监控
  messageTypes?: ('runtime' | 'tabs' | 'external')[];
  includeResponses?: boolean;
}

interface ExtensionMessage {
  timestamp: number;
  id: string;
  type: 'runtime' | 'tabs' | 'external';
  direction: 'send' | 'receive';
  source: {
    contextType: 'background' | 'content_script' | 'popup' | 'options';
    tabId?: string;
    frameId?: number;
  };
  target: {
    contextType: 'background' | 'content_script' | 'popup' | 'options';
    tabId?: string;
    extensionId?: string; // 外部消息时
  };
  message: any;
  response?: {
    timestamp: number;
    success: boolean;
    data?: any;
    error?: string;
  };
}
```

**技术实现**:
1. 注入消息拦截代码到各上下文
2. 实现消息路径追踪
3. 添加响应关联机制
4. 建立实时消息流监控

#### Day 17-20: `track_extension_api_calls`
**需求分析**:
```typescript
interface TrackExtensionAPICallsArgs {
  extensionId: string;
  apiCategories?: ('storage' | 'tabs' | 'runtime' | 'permissions' | 'webRequest' | 'alarms')[];
  duration?: number;
  includeResults?: boolean;
}

interface ExtensionAPICall {
  timestamp: number;
  id: string;
  api: string; // 'chrome.storage.local.get'
  category: string; // 'storage'
  context: {
    type: 'background' | 'content_script' | 'popup' | 'options';
    tabId?: string;
    frameId?: number;
  };
  parameters: any[];
  result?: {
    timestamp: number;
    success: boolean;
    data?: any;
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
  };
  performance: {
    duration: number; // API调用耗时
    memoryBefore: number;
    memoryAfter: number;
  };
}
```

**技术实现**:
1. 实现Chrome API代理包装
2. 添加API调用性能监控
3. 实现错误捕获和分析
4. 建立API使用统计

### Week 4: 批量测试 (P3)
**目标**: 实现扩展行为批量验证

#### Day 21-22: `test_extension_on_multiple_pages`
**需求分析**:
```typescript
interface TestExtensionOnMultiplePagesArgs {
  extensionId: string;
  testUrls: string[];
  testCases?: Array<{
    name: string;
    description: string;
    checkInjection?: boolean;
    checkAPICalls?: boolean;
    checkStorage?: boolean;
    customScript?: string; // 自定义验证脚本
  }>;
  timeout?: number; // 每个页面的测试超时
}

interface ExtensionTestResult {
  extensionId: string;
  summary: {
    totalPages: number;
    passedPages: number;
    failedPages: number;
    duration: number;
  };
  pageResults: Array<{
    url: string;
    tabId: string;
    status: 'passed' | 'failed' | 'timeout';
    injectionStatus: any; // 来自content_script_status
    apiCallsCount: number;
    storageOperations: number;
    testCaseResults: Array<{
      name: string;
      passed: boolean;
      error?: string;
      details?: any;
    }>;
    performance: {
      loadTime: number;
      injectionTime: number;
      testDuration: number;
    };
  }>;
  recommendations: string[];
}
```

**技术实现**:
1. 实现并发页面测试框架
2. 集成之前实现的所有检测功能
3. 添加自定义测试脚本支持
4. 实现测试报告生成

## 🏗️ 架构设计更新

### 新增模块结构
```
src/handlers/
├── ExtensionHandler.ts (现有，需要增强)
├── ExtensionContextHandler.ts (新增)
├── ExtensionStorageHandler.ts (新增)
├── ExtensionMonitorHandler.ts (新增)
└── ExtensionTestHandler.ts (新增)

src/utils/
├── ExtensionAnalyzer.ts (新增)
├── MessageInterceptor.ts (新增)
├── APITracker.ts (新增)
└── ContextManager.ts (新增)
```

### 数据层设计
```typescript
// 新增类型定义
src/types/extension.ts

export interface ExtensionContext { ... }
export interface ExtensionMessage { ... }
export interface ExtensionAPICall { ... }
export interface ExtensionTestCase { ... }
```

## 🧪 测试策略

### 单元测试
- 每个新handler的独立功能测试
- 工具类的算法逻辑测试
- 错误处理边界测试

### 集成测试
- 扩展调试完整流程测试
- 多上下文切换测试
- 消息传递监控测试

### 端到端测试
- 使用test-extension进行完整验证
- 多种扩展类型测试(MV2/MV3)
- 性能影响测试

## 📈 质量保证

### 代码质量
- TypeScript严格模式
- ESLint + Prettier
- 单元测试覆盖率 > 80%

### 文档完善
- 每个工具的详细API文档
- 扩展调试最佳实践指南
- 常见问题排查手册

### 性能监控
- 工具执行时间监控
- 内存使用量监控
- Chrome性能影响分析

---

## 🚀 开始实施

现在开始实施第一个功能：`get_extension_logs` 增强
