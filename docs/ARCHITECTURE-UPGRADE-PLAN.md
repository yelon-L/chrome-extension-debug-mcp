# 架构升级计划：融合chrome-devtools-mcp优秀设计
## 打造业界最强Chrome扩展调试MCP

**规划日期**: 2025-10-10  
**实施周期**: 5周  
**预期收益**: 性能提升3倍，代码减少40%，AI调试效率提升80%

---

## 🎯 核心目标

### 融合两者优势

**chrome-devtools-mcp的架构优势**:
- ✅ 声明式Response Builder
- ✅ 自动上下文收集
- ✅ 智能等待机制
- ✅ 统一输出格式

**chrome-extension-debug-mcp的专业性**:
- ✅ 扩展深度调试
- ✅ 性能影响分析
- ✅ 安全审计能力
- ✅ VIP工具链优化

---

## 📋 5周实施路线图

### Week 1: Response Builder核心重构

#### 1.1 扩展ExtensionResponse类 (Day 1-2)

**参考**: `chrome-devtools-mcp/src/McpResponse.ts`

```typescript
// src/utils/ExtensionResponse.ts (升级版)

export class ExtensionResponse implements Response {
  // ============ 新增：自动上下文标志 ============
  #includeSnapshot = false;
  #includeTabs = false;
  #includeExtensionStatus = false;
  #includeConsole = false;
  #includeNetwork = false;
  #includePerformance = false;
  
  // ============ 新增：自动收集方法 ============
  setIncludeSnapshot(value: boolean): void {
    this.#includeSnapshot = value;
  }
  
  setIncludeTabs(value: boolean): void {
    this.#includeTabs = value;
  }
  
  setIncludeExtensionStatus(value: boolean, extensionId?: string): void {
    this.#includeExtensionStatus = value;
    this.extensionId = extensionId;
  }
  
  // ============ 核心：自动处理流程 ============
  async handle(
    toolName: string, 
    context: {
      pageManager: PageManager,
      extensionHandler: ExtensionHandler,
      // ...
    }
  ): Promise<ToolResult> {
    // 1. 根据标志自动收集数据
    if (this.#includeSnapshot) {
      await this.collectSnapshot(context.pageManager);
    }
    
    if (this.#includeTabs) {
      await this.collectTabs(context.pageManager);
    }
    
    if (this.#includeExtensionStatus && this.extensionId) {
      await this.collectExtensionStatus(
        context.extensionHandler, 
        this.extensionId
      );
    }
    
    if (this.#includeConsole) {
      await this.collectConsoleLogs(context.pageManager);
    }
    
    if (this.#includeNetwork) {
      await this.collectNetworkRequests(context);
    }
    
    // 2. 统一格式化输出
    return this.format(toolName, context);
  }
  
  // ============ 新增：数据收集方法 ============
  private async collectSnapshot(pageManager: PageManager): Promise<void> {
    const page = pageManager.getCurrentPage();
    if (!page) return;
    
    try {
      // 使用Puppeteer原生API (参考chrome-devtools-mcp)
      const snapshot = await page.accessibility.snapshot();
      if (snapshot) {
        this.context.snapshot = this.formatA11ySnapshot(snapshot);
        this.context.snapshotId = this.generateSnapshotId();
        this.context.uidMap = this.buildUidMap(snapshot);
      }
    } catch (error) {
      console.error('[ExtensionResponse] Snapshot collection failed:', error);
    }
  }
  
  private async collectTabs(pageManager: PageManager): Promise<void> {
    try {
      this.context.tabs = await pageManager.listTabs();
    } catch (error) {
      console.error('[ExtensionResponse] Tabs collection failed:', error);
    }
  }
  
  private async collectExtensionStatus(
    handler: ExtensionHandler, 
    extensionId: string
  ): Promise<void> {
    try {
      const contexts = await handler.listExtensionContexts({ extensionId });
      const logs = await handler.getExtensionLogs({ extensionId });
      
      this.context.extensionStatus = {
        id: extensionId,
        contexts: contexts.contexts || [],
        recentLogs: logs.logs?.slice(-5) || []
      };
    } catch (error) {
      console.error('[ExtensionResponse] Extension status collection failed:', error);
    }
  }
  
  // ============ 新增：A11y Snapshot格式化 ============
  private formatA11ySnapshot(node: any, depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    
    if (node.role) {
      const uid = this.generateUid(node);
      let line = `${indent}[${uid}] ${node.role}`;
      
      if (node.name) line += `: ${node.name}`;
      if (node.value) line += ` = ${node.value}`;
      
      lines.push(line);
    }
    
    if (node.children) {
      for (const child of node.children) {
        lines.push(this.formatA11ySnapshot(child, depth + 1));
      }
    }
    
    return lines.join('\n');
  }
  
  private generateUid(node: any): string {
    // 生成稳定的UID：snapshotId_nodeIndex
    const nodeIndex = this.context.uidCounter++;
    return `${this.context.snapshotId}_${nodeIndex}`;
  }
  
  private buildUidMap(snapshot: any): Map<string, any> {
    const map = new Map();
    const traverse = (node: any) => {
      if (node.uid) {
        map.set(node.uid, node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(snapshot);
    return map;
  }
  
  // ============ 增强：format方法 ============
  format(toolName: string, context: any): ToolResult {
    const response = [`# ${toolName} response`];
    
    // 用户自定义消息
    if (this.messages.length > 0) {
      response.push(...this.messages);
    }
    
    // ============ 新增：智能状态检测 ============
    
    // 检测Dialog
    if (context.dialog) {
      response.push('');
      response.push('## ⚠️ Open Dialog Detected');
      response.push(`Type: ${context.dialog.type}`);
      response.push(`Message: ${context.dialog.message}`);
      response.push('**Action Required**: Use `handle_dialog` to dismiss or accept it.');
    }
    
    // 检测Service Worker状态
    if (this.#includeExtensionStatus && this.context.extensionStatus) {
      const swContext = this.context.extensionStatus.contexts.find(
        c => c.type === 'service_worker'
      );
      if (swContext && !swContext.active) {
        response.push('');
        response.push('## ⚠️ Service Worker Inactive');
        response.push('The extension Service Worker is dormant.');
        response.push('**Suggestion**: Use `wait_for_extension_ready` to activate it.');
      }
    }
    
    // 检测网络模拟状态
    if (context.networkConditions) {
      response.push('');
      response.push('## Network Emulation');
      response.push(`Emulating: ${context.networkConditions}`);
      response.push(`Timeout adjusted: ${context.navigationTimeout}ms`);
    }
    
    // 检测CPU限制状态
    if (context.cpuThrottling && context.cpuThrottling > 1) {
      response.push('');
      response.push('## CPU Throttling');
      response.push(`Slowdown: ${context.cpuThrottling}x`);
      response.push(`Timeout multiplied by: ${context.cpuThrottling}x`);
    }
    
    // ============ 自动包含的上下文 ============
    
    // Tabs列表
    if (this.#includeTabs && this.context.tabs) {
      response.push('');
      response.push('## Open Tabs');
      this.context.tabs.forEach((tab, i) => {
        const selected = tab.active ? ' [selected]' : '';
        response.push(`${i}: ${tab.url}${selected}`);
      });
    }
    
    // 页面快照
    if (this.#includeSnapshot && this.context.snapshot) {
      response.push('');
      response.push('## Page Snapshot');
      response.push(this.context.snapshot);
      response.push('');
      response.push('**Tip**: Use UIDs (e.g., `1_5`) to interact with elements via:');
      response.push('- `click_by_uid`');
      response.push('- `fill_by_uid`');
      response.push('- `hover_by_uid`');
    }
    
    // 扩展状态
    if (this.#includeExtensionStatus && this.context.extensionStatus) {
      response.push('');
      response.push('## Extension Status');
      response.push(`ID: ${this.context.extensionStatus.id}`);
      response.push('Contexts:');
      this.context.extensionStatus.contexts.forEach(ctx => {
        response.push(`  - ${ctx.type}: ${ctx.active ? '✅ Active' : '⏸️ Inactive'}`);
      });
      
      if (this.context.extensionStatus.recentLogs.length > 0) {
        response.push('Recent Logs:');
        this.context.extensionStatus.recentLogs.forEach(log => {
          response.push(`  [${log.level}] ${log.message}`);
        });
      }
    }
    
    // Console消息
    if (this.#includeConsole && this.context.consoleLogs) {
      response.push('');
      response.push('## Console Messages');
      if (this.context.consoleLogs.length > 0) {
        this.context.consoleLogs.forEach(log => {
          response.push(`[${log.type}] ${log.text}`);
        });
      } else {
        response.push('<no console messages>');
      }
    }
    
    // 网络请求
    if (this.#includeNetwork && this.context.networkRequests) {
      response.push('');
      response.push('## Network Requests');
      if (this.context.networkRequests.length > 0) {
        this.context.networkRequests.forEach(req => {
          response.push(`${req.method} ${req.url} - ${req.status}`);
        });
      } else {
        response.push('<no network requests>');
      }
    }
    
    // ============ VIP建议系统 (保留) ============
    if (this.suggestions.length > 0) {
      response.push('');
      response.push('## 💡 Suggested Next Actions');
      
      const critical = this.suggestions.filter(s => s.priority === 'CRITICAL');
      const high = this.suggestions.filter(s => s.priority === 'HIGH');
      const medium = this.suggestions.filter(s => s.priority === 'MEDIUM');
      
      if (critical.length > 0) {
        response.push('**🔴 Critical:**');
        critical.forEach(s => {
          response.push(`- ${s.action}: \`${s.toolName}\``);
          response.push(`  Reason: ${s.reason}`);
        });
      }
      
      if (high.length > 0) {
        response.push('**🟠 High Priority:**');
        high.forEach(s => {
          response.push(`- ${s.action}: \`${s.toolName}\``);
        });
      }
      
      if (medium.length > 0) {
        response.push('**🟡 Consider:**');
        medium.forEach(s => {
          response.push(`- ${s.action}: \`${s.toolName}\``);
        });
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: response.join('\n')
      }]
    };
  }
}
```

#### 1.2 重构ChromeDebugServer (Day 3)

```typescript
// src/ChromeDebugServer.ts (升级版)

export class ChromeDebugServer {
  // ============ 新增：统一工具处理流程 ============
  private async executeToolWithResponse(
    toolName: string,
    handler: (response: ExtensionResponse) => Promise<void>
  ): Promise<ToolResult> {
    const response = new ExtensionResponse(toolName);
    
    try {
      // 1. 执行工具逻辑
      await handler(response);
      
      // 2. 自动收集上下文并格式化
      return await response.handle(toolName, {
        pageManager: this.pageManager,
        extensionHandler: this.extensionHandler,
        chromeManager: this.chromeManager,
        // ...
      });
    } catch (error) {
      response.appendResponseLine(`Error: ${error.message}`);
      return response.build();
    }
  }
  
  // ============ 示例：重构后的工具 ============
  
  async handleClick(args: ClickArgs): Promise<ToolResult> {
    return this.executeToolWithResponse('click', async (response) => {
      await this.interactionHandler.click(args);
      response.appendResponseLine('Successfully clicked');
      response.setIncludeSnapshot(true);  // 自动附加新snapshot
      response.setIncludeTabs(true);      // 自动附加tabs
    });
  }
  
  async handleListExtensions(args: any): Promise<ToolResult> {
    return this.executeToolWithResponse('list_extensions', async (response) => {
      const extensions = await this.extensionHandler.listExtensions(args);
      
      if (extensions.length === 0) {
        response.appendResponseLine('No extensions found');
      } else {
        response.appendResponseLine(`Found ${extensions.length} extension(s):`);
        extensions.forEach(ext => {
          response.appendResponseLine(`✅ ${ext.name} (${ext.id})`);
        });
      }
      
      response.setIncludeSnapshot(false); // 不需要snapshot
      response.setIncludeTabs(true);      // 但需要tabs列表
      
      // 自动建议下一步
      if (extensions.length > 0) {
        response.addSuggestion({
          priority: 'HIGH',
          action: 'Check extension logs for errors',
          toolName: 'get_extension_logs',
          args: { extensionId: extensions[0].id },
          reason: 'Identify potential issues',
          estimatedImpact: 'High'
        });
      }
    });
  }
  
  async handleGetExtensionLogs(args: GetExtensionLogsArgs): Promise<ToolResult> {
    return this.executeToolWithResponse('get_extension_logs', async (response) => {
      const logs = await this.extensionHandler.getExtensionLogs(args);
      
      if (logs.logs.length === 0) {
        response.appendResponseLine('No logs found');
      } else {
        response.appendResponseLine(`Found ${logs.logs.length} log(s):`);
        logs.logs.slice(-10).forEach(log => {
          response.appendResponseLine(`[${log.level}] ${log.message}`);
        });
      }
      
      response.setIncludeExtensionStatus(true, args.extensionId); // 自动附加扩展状态
      
      // 检测错误并建议
      const errors = logs.logs.filter(l => l.level === 'error');
      if (errors.length > 0) {
        response.addSuggestion({
          priority: 'CRITICAL',
          action: 'Investigate errors in content script',
          toolName: 'content_script_status',
          args: { extensionId: args.extensionId },
          reason: `Found ${errors.length} error(s)`,
          estimatedImpact: 'High'
        });
      }
    });
  }
}
```

### Week 2: take_snapshot优化与自动等待

#### 2.1 简化take_snapshot (Day 1-2)

**参考**: `chrome-devtools-mcp/src/tools/snapshot.ts`

```typescript
// src/handlers/DOMSnapshotHandler.ts (全新实现)

export class DOMSnapshotHandler {
  private snapshotIdCounter = 1;
  
  /**
   * 使用Puppeteer原生Accessibility API
   * 参考: chrome-devtools-mcp
   */
  async takeSnapshot(args: TakeSnapshotArgs): Promise<void> {
    // 工具本身不返回任何内容
    // 只设置Response Builder的flag
    // 实际收集在ExtensionResponse.handle()中完成
    
    // 这个方法现在只需要：
    // response.setIncludeSnapshot(true);
  }
  
  /**
   * 在ExtensionResponse中调用
   */
  async createTextSnapshot(page: Page): Promise<{
    snapshot: string;
    snapshotId: string;
    uidMap: Map<string, any>;
  }> {
    const snapshotId = String(this.snapshotIdCounter++);
    
    // 使用Puppeteer原生API
    const axSnapshot = await page.accessibility.snapshot();
    
    if (!axSnapshot) {
      throw new Error('Failed to create accessibility snapshot');
    }
    
    // 构建UID映射
    const uidMap = new Map<string, any>();
    let uidCounter = 0;
    
    // 遍历并添加UID
    const addUids = (node: any, parentUid?: string): any => {
      const uid = `${snapshotId}_${uidCounter++}`;
      const enrichedNode = {
        ...node,
        uid,
        parentUid
      };
      
      uidMap.set(uid, enrichedNode);
      
      if (node.children) {
        enrichedNode.children = node.children.map(
          child => addUids(child, uid)
        );
      }
      
      return enrichedNode;
    };
    
    const enrichedSnapshot = addUids(axSnapshot);
    
    // 格式化为文本
    const formatted = this.formatA11ySnapshot(enrichedSnapshot);
    
    return {
      snapshot: formatted,
      snapshotId,
      uidMap
    };
  }
  
  private formatA11ySnapshot(node: any, depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    
    if (node.role) {
      let line = `${indent}[${node.uid}] ${node.role}`;
      
      if (node.name) {
        line += `: ${node.name}`;
      }
      
      if (node.value) {
        line += ` = "${node.value}"`;
      }
      
      // 添加有用的属性
      const attrs: string[] = [];
      if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
      if (node.disabled) attrs.push('disabled');
      if (node.focused) attrs.push('focused');
      if (node.pressed !== undefined) attrs.push(`pressed=${node.pressed}`);
      
      if (attrs.length > 0) {
        line += ` (${attrs.join(', ')})`;
      }
      
      lines.push(line);
    }
    
    if (node.children) {
      for (const child of node.children) {
        lines.push(this.formatA11ySnapshot(child, depth + 1));
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * 根据UID获取元素
   */
  async getElementByUid(
    page: Page, 
    uid: string, 
    uidMap: Map<string, any>
  ): Promise<ElementHandle<Element>> {
    const node = uidMap.get(uid);
    if (!node) {
      throw new Error(`No element found with UID: ${uid}`);
    }
    
    // 使用CDP获取元素
    const handle = await node.elementHandle();
    if (!handle) {
      throw new Error(`Element not found in DOM: ${uid}`);
    }
    
    return handle;
  }
}
```

**改进效果**:
- ✅ 代码从200行→80行
- ✅ 执行时间从超时→<1秒
- ✅ 复用Puppeteer优化的API

#### 2.2 实现waitForEventsAfterAction (Day 3-4)

**参考**: `chrome-devtools-mcp/src/WaitForHelper.ts`

```typescript
// src/utils/WaitForHelper.ts (全新实现)

export class WaitForHelper {
  private abortController = new AbortController();
  private page: Page;
  private stableDomTimeout: number;
  private stableDomFor: number;
  private expectNavigationIn: number;
  private navigationTimeout: number;
  
  constructor(
    page: Page,
    cpuTimeoutMultiplier: number,
    networkTimeoutMultiplier: number
  ) {
    this.page = page;
    this.stableDomTimeout = 3000 * cpuTimeoutMultiplier;
    this.stableDomFor = 100 * cpuTimeoutMultiplier;
    this.expectNavigationIn = 100 * cpuTimeoutMultiplier;
    this.navigationTimeout = 3000 * networkTimeoutMultiplier;
  }
  
  /**
   * 核心方法：执行操作并等待DOM稳定
   * 参考: chrome-devtools-mcp
   */
  async waitForEventsAfterAction(
    action: () => Promise<unknown>
  ): Promise<void> {
    // 1. 监听导航开始
    const navigationFinished = this.waitForNavigationStarted()
      .then(navigationStarted => {
        if (navigationStarted) {
          return this.page.waitForNavigation({
            timeout: this.navigationTimeout,
            signal: this.abortController.signal
          });
        }
        return;
      })
      .catch(error => {
        console.error('[WaitForHelper] Navigation wait error:', error);
      });
    
    try {
      // 2. 执行操作
      await action();
    } catch (error) {
      // 清理pending promises
      this.abortController.abort();
      throw error;
    }
    
    try {
      // 3. 等待导航完成
      await navigationFinished;
      
      // 4. 等待DOM稳定
      await this.waitForStableDom();
    } catch (error) {
      console.error('[WaitForHelper] Stable DOM wait error:', error);
    } finally {
      this.abortController.abort();
    }
  }
  
  /**
   * 等待导航开始
   */
  private async waitForNavigationStarted(): Promise<boolean> {
    const navigationStartedPromise = new Promise<boolean>(resolve => {
      const cdpSession = (this.page as any)._client();
      
      const listener = (event: any) => {
        // 忽略same-document导航
        if (
          [
            'historySameDocument',
            'historyDifferentDocument',
            'sameDocument'
          ].includes(event.navigationType)
        ) {
          resolve(false);
          return;
        }
        
        resolve(true);
      };
      
      cdpSession.on('Page.frameStartedNavigating', listener);
      
      this.abortController.signal.addEventListener('abort', () => {
        resolve(false);
        cdpSession.off('Page.frameStartedNavigating', listener);
      });
    });
    
    return await Promise.race([
      navigationStartedPromise,
      this.timeout(this.expectNavigationIn).then(() => false)
    ]);
  }
  
  /**
   * 等待DOM稳定 (使用MutationObserver)
   */
  private async waitForStableDom(): Promise<void> {
    const stableDomObserver = await this.page.evaluateHandle(
      (timeout: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        
        function callback() {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            domObserver.resolver.resolve();
            domObserver.observer.disconnect();
          }, timeout);
        }
        
        const domObserver = {
          resolver: Promise.withResolvers<void>(),
          observer: new MutationObserver(callback)
        };
        
        // 初始启动timeout
        callback();
        
        domObserver.observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        return domObserver;
      },
      this.stableDomFor
    );
    
    // 监听abort信号
    this.abortController.signal.addEventListener('abort', async () => {
      try {
        await stableDomObserver.evaluate(observer => {
          observer.observer.disconnect();
          observer.resolver.resolve();
        });
        await stableDomObserver.dispose();
      } catch {
        // 忽略清理错误
      }
    });
    
    // 等待DOM稳定或超时
    return Promise.race([
      stableDomObserver.evaluate(async observer => {
        return await observer.resolver.promise;
      }),
      this.timeout(this.stableDomTimeout).then(() => {
        throw new Error('DOM stabilization timeout');
      })
    ]);
  }
  
  private timeout(time: number): Promise<void> {
    return new Promise<void>(res => {
      const id = setTimeout(res, time);
      this.abortController.signal.addEventListener('abort', () => {
        res();
        clearTimeout(id);
      });
    });
  }
}
```

#### 2.3 集成到所有交互工具 (Day 5)

```typescript
// src/handlers/AdvancedInteractionHandler.ts (升级版)

export class AdvancedInteractionHandler {
  
  async click(args: ClickArgs): Promise<void> {
    const page = this.pageManager.getCurrentPage();
    const waitHelper = new WaitForHelper(page, 1, 1);
    
    // 使用waitForEventsAfterAction包装操作
    await waitHelper.waitForEventsAfterAction(async () => {
      await page.click(args.selector);
    });
    
    // 操作完成，DOM已稳定，可以安全获取snapshot
  }
  
  async fill(args: FillArgs): Promise<void> {
    const page = this.pageManager.getCurrentPage();
    const waitHelper = new WaitForHelper(page, 1, 1);
    
    await waitHelper.waitForEventsAfterAction(async () => {
      await page.type(args.selector, args.value);
    });
  }
  
  async hover(args: HoverArgs): Promise<void> {
    const page = this.pageManager.getCurrentPage();
    const waitHelper = new WaitForHelper(page, 1, 1);
    
    await waitHelper.waitForEventsAfterAction(async () => {
      await page.hover(args.selector);
    });
  }
  
  // ... 其他交互工具类似
}
```

### Week 3: 缺失工具补全

#### 3.1 wait_for工具 (Day 1)

**参考**: `chrome-devtools-mcp/src/tools/snapshot.ts`

```typescript
// src/tools/standard-tools.ts (新增)

{
  name: 'wait_for',
  description: 'Wait for the specified text to appear on the selected page',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to appear on the page'
      },
      timeout: {
        type: 'number',
        description: 'Maximum wait time in milliseconds',
        default: 5000
      }
    },
    required: ['text']
  }
}

// Handler
async handleWaitFor(args: WaitForArgs): Promise<ToolResult> {
  return this.executeToolWithResponse('wait_for', async (response) => {
    const page = this.pageManager.getCurrentPage();
    const frames = page.frames();
    
    // 使用Puppeteer Locator API
    const locator = Locator.race(
      frames.flatMap(frame => [
        frame.locator(`aria/${args.text}`),
        frame.locator(`text/${args.text}`)
      ])
    );
    
    if (args.timeout) {
      locator.setTimeout(args.timeout);
    }
    
    await locator.wait();
    
    response.appendResponseLine(`Element with text "${args.text}" found.`);
    response.setIncludeSnapshot(true); // 自动附加找到的元素
  });
}
```

#### 3.2 navigate_page_history (Day 2)

```typescript
{
  name: 'navigate_page_history',
  description: 'Navigate the currently selected page back or forward in history',
  inputSchema: {
    type: 'object',
    properties: {
      navigate: {
        type: 'string',
        enum: ['back', 'forward'],
        description: 'Direction to navigate'
      },
      timeout: {
        type: 'number',
        description: 'Navigation timeout in milliseconds',
        default: 10000
      }
    },
    required: ['navigate']
  }
}

async handleNavigatePageHistory(args: NavigateHistoryArgs): Promise<ToolResult> {
  return this.executeToolWithResponse('navigate_page_history', async (response) => {
    const page = this.pageManager.getCurrentPage();
    
    try {
      if (args.navigate === 'back') {
        await page.goBack({ timeout: args.timeout });
      } else {
        await page.goForward({ timeout: args.timeout });
      }
      response.appendResponseLine(`Successfully navigated ${args.navigate}`);
    } catch {
      response.appendResponseLine(
        `Unable to navigate ${args.navigate} in currently selected page.`
      );
    }
    
    response.setIncludeSnapshot(true);
    response.setIncludeTabs(true);
  });
}
```

#### 3.3 resize_page (Day 3)

```typescript
{
  name: 'resize_page',
  description: 'Resize the selected page viewport',
  inputSchema: {
    type: 'object',
    properties: {
      width: { type: 'number', description: 'Page width' },
      height: { type: 'number', description: 'Page height' }
    },
    required: ['width', 'height']
  }
}

async handleResizePage(args: ResizePageArgs): Promise<ToolResult> {
  return this.executeToolWithResponse('resize_page', async (response) => {
    const page = this.pageManager.getCurrentPage();
    
    await page.setViewport({
      width: args.width,
      height: args.height
    });
    
    response.appendResponseLine(
      `Page resized to ${args.width}x${args.height}`
    );
    response.setIncludeSnapshot(true);
  });
}
```

#### 3.4 run_script (Day 4-5)

```typescript
{
  name: 'run_script',
  description: 'Execute a custom JavaScript function on the page',
  inputSchema: {
    type: 'object',
    properties: {
      function: {
        type: 'string',
        description: 'JavaScript function to execute (as string)'
      },
      args: {
        type: 'array',
        description: 'Array of UID references to pass as arguments',
        items: {
          type: 'object',
          properties: {
            uid: { type: 'string' }
          }
        }
      }
    },
    required: ['function']
  }
}

async handleRunScript(args: RunScriptArgs): Promise<ToolResult> {
  return this.executeToolWithResponse('run_script', async (response) => {
    const page = this.pageManager.getCurrentPage();
    const fn = await page.evaluateHandle(`(${args.function})`);
    
    const handles: JSHandle<unknown>[] = [fn];
    
    try {
      // 获取UID对应的元素
      for (const el of args.args ?? []) {
        const element = await this.snapshotHandler.getElementByUid(
          page, 
          el.uid, 
          this.context.uidMap
        );
        handles.push(element);
      }
      
      // 执行函数
      const result = await page.evaluate(
        async (fn, ...args) => {
          return JSON.stringify(await fn(...args));
        },
        ...handles
      );
      
      response.appendResponseLine('Script executed successfully');
      response.appendResponseLine('```json');
      response.appendResponseLine(result);
      response.appendResponseLine('```');
      
      response.setIncludeSnapshot(true);
    } finally {
      for (const handle of handles) {
        await handle.dispose();
      }
    }
  });
}
```

### Week 4: 全工具集成与优化

#### 4.1 批量重构工具 (Day 1-3)

**重构47个工具使用新架构**:

| 工具类别 | 工具数量 | Response配置 |
|----------|----------|-------------|
| Browser Control | 5 | `setIncludeTabs(true)` |
| Extension Debugging | 10 | `setIncludeExtensionStatus(true, extensionId)` |
| DOM Interaction | 12 | `setIncludeSnapshot(true)` |
| Performance | 6 | `setIncludePerformance(true)` |
| Network | 4 | `setIncludeNetwork(true)` |
| Quick Tools | 3 | 多个flag组合 |

#### 4.2 性能优化 (Day 4-5)

1. **并行化quick_extension_debug**
```typescript
async handleQuickExtensionDebug(args: QuickDebugArgs): Promise<ToolResult> {
  return this.executeToolWithResponse('quick_extension_debug', async (response) => {
    // 并行执行子检查
    const [logs, contexts, storage] = await Promise.all([
      this.extensionHandler.getExtensionLogs({ extensionId: args.extensionId }),
      this.extensionHandler.listExtensionContexts({ extensionId: args.extensionId }),
      this.extensionHandler.inspectExtensionStorage({ extensionId: args.extensionId })
    ]);
    
    response.appendResponseLine('## Quick Debug Results');
    response.appendResponseLine(`Logs: ${logs.logs.length}`);
    response.appendResponseLine(`Contexts: ${contexts.contexts.length}`);
    response.appendResponseLine(`Storage items: ${Object.keys(storage.data).length}`);
    
    response.setIncludeExtensionStatus(true, args.extensionId);
  });
}
```

2. **智能超时配置**
```typescript
// src/utils/TimeoutConfig.ts
export class TimeoutConfig {
  static getTimeout(
    toolName: string, 
    cpuMultiplier: number = 1, 
    networkMultiplier: number = 1
  ): number {
    const baseTimeouts: Record<string, number> = {
      'take_snapshot': 5000,
      'click': 3000,
      'navigate_page': 10000,
      'inspect_extension_storage': 15000,
      // ...
    };
    
    const base = baseTimeouts[toolName] || 10000;
    return base * cpuMultiplier * networkMultiplier;
  }
}
```

### Week 5: 测试与文档

#### 5.1 完整测试 (Day 1-3)

```javascript
// test/test-architecture-upgrade.js

async function testArchitectureUpgrade() {
  console.log('🧪 Testing Architecture Upgrade...\n');
  
  // 1. 测试Response Builder自动化
  console.log('1️⃣ Testing Response Builder Automation');
  const clickResult = await callTool('click', { selector: '#button' });
  assert(clickResult.content[0].text.includes('## Page Snapshot'));
  assert(clickResult.content[0].text.includes('## Open Tabs'));
  console.log('✅ Response Builder works\n');
  
  // 2. 测试take_snapshot性能
  console.log('2️⃣ Testing take_snapshot Performance');
  const start = Date.now();
  await callTool('take_snapshot', {});
  const duration = Date.now() - start;
  assert(duration < 2000, 'Snapshot should complete in <2s');
  console.log(`✅ Snapshot completed in ${duration}ms\n`);
  
  // 3. 测试waitForEventsAfterAction
  console.log('3️⃣ Testing Auto-wait Mechanism');
  await callTool('click', { selector: '#ajax-button' });
  const snapshot = await callTool('take_snapshot', {});
  assert(snapshot.content[0].text.includes('ajax-result'));
  console.log('✅ Auto-wait works\n');
  
  // 4. 测试新工具
  console.log('4️⃣ Testing New Tools');
  await callTool('wait_for', { text: 'Welcome' });
  await callTool('navigate_page_history', { navigate: 'back' });
  await callTool('resize_page', { width: 1920, height: 1080 });
  console.log('✅ New tools work\n');
  
  // 5. 测试智能提示
  console.log('5️⃣ Testing Smart Suggestions');
  const result = await callTool('list_extensions', {});
  assert(result.content[0].text.includes('💡 Suggested Next Actions'));
  console.log('✅ Smart suggestions work\n');
  
  console.log('🎉 All tests passed!');
}
```

#### 5.2 文档更新 (Day 4-5)

1. **工具使用指南**
2. **架构设计文档**
3. **性能优化最佳实践**
4. **故障排除手册**

---

## 📊 预期成果

### 性能提升

| 指标 | 升级前 | 升级后 | 提升 |
|------|--------|--------|------|
| take_snapshot执行时间 | 超时 | <1秒 | ∞ |
| 平均响应时间 | 2384ms | <500ms | 4.8倍 |
| 成功率 | 81.8% | 95%+ | +13.2% |
| 代码总量 | 基线 | -40% | 大幅简化 |

### 功能完整性

- ✅ **47个现有工具** - 全部升级
- ✅ **4个新工具** - 补全缺失
- ✅ **统一输出格式** - 100%一致
- ✅ **自动上下文** - 无需手动

### 开发效率

- ✅ **新工具开发时间**: 减少70%
- ✅ **维护成本**: 降低60%
- ✅ **Bug修复速度**: 提升3倍

---

## 🎯 验收标准

### Phase 1 (Week 1)
- [ ] 所有47个工具使用ExtensionResponse
- [ ] 输出格式100%统一
- [ ] 代码review通过

### Phase 2 (Week 2)
- [ ] take_snapshot<2秒完成
- [ ] 所有交互工具使用auto-wait
- [ ] 无超时失败

### Phase 3 (Week 3)
- [ ] 4个新工具实现完成
- [ ] 单元测试覆盖率>80%
- [ ] 集成测试全部通过

### Phase 4 (Week 4)
- [ ] 性能提升达标
- [ ] 成功率>95%
- [ ] 压力测试通过

### Phase 5 (Week 5)
- [ ] 文档完整
- [ ] 示例代码完备
- [ ] 用户验收通过

---

## 📝 下一步行动

1. **批准计划** - Review并批准此实施计划
2. **Week 1启动** - 开始Response Builder重构
3. **每周Review** - 检查进度和调整计划
4. **最终验收** - Week 5完成验收

---

*规划完成时间: 2025-10-10*  
*预计完成时间: 2025-11-14*  
*项目负责人: Chrome Extension Debug MCP Team*

