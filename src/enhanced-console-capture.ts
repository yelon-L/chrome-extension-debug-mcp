/**
 * 增强的 Console 日志捕获实现
 * 解决 Content Script 日志无法获取的问题
 */

interface ExecutionContext {
  id: number;
  origin: string;
  name: string;
  auxData?: {
    isDefault?: boolean;
    type?: string;
    frameId?: string;
  };
}

interface ConsoleAPICalledEvent {
  type: string;
  args: Array<{ value?: any; description?: string; type?: string }>;
  executionContextId: number;
  timestamp: number;
  stackTrace?: {
    callFrames: Array<{
      functionName: string;
      scriptId: string;
      url: string;
      lineNumber: number;
      columnNumber: number;
    }>;
  };
}

export class EnhancedConsoleCapture {
  private cdpClient: any;
  private consoleLogs: string[] = [];
  private executionContexts: Map<number, ExecutionContext> = new Map();
  private attachedSessions: Set<string> = new Set();

  constructor(cdpClient: any) {
    this.cdpClient = cdpClient;
  }

  async initialize() {
    // 启用必要的 CDP 域
    await this.cdpClient.Runtime.enable();
    await this.cdpClient.Console.enable();
    await this.cdpClient.Page.enable();

    // 监听执行上下文创建
    this.cdpClient.Runtime.executionContextCreated(({ context }: { context: ExecutionContext }) => {
      this.executionContexts.set(context.id, context);
      console.log(`新执行上下文: ${context.name} (${context.origin}) [${context.id}]`);
      
      // 识别 Content Script 上下文
      if (context.auxData?.type === 'isolated' || context.name.includes('content_script')) {
        console.log(`发现 Content Script 上下文: ${context.name}`);
      }
    });

    // 监听执行上下文销毁
    this.cdpClient.Runtime.executionContextDestroyed(({ executionContextId }: { executionContextId: number }) => {
      this.executionContexts.delete(executionContextId);
      console.log(`执行上下文销毁: ${executionContextId}`);
    });

    // 监听执行上下文清除（页面导航时）
    this.cdpClient.Runtime.executionContextsCleared(() => {
      console.log('所有执行上下文已清除（页面导航）');
      this.executionContexts.clear();
    });

    // 增强的 console 消息监听
    this.cdpClient.Runtime.consoleAPICalled((params: ConsoleAPICalledEvent) => {
      this.handleConsoleMessage(params, 'page');
    });

    // 监听页面导航，重新设置监听
    this.cdpClient.Page.loadEventFired(() => {
      console.log('页面加载完成，重新初始化执行上下文');
      // 页面加载后，Content Script 可能会被注入
      setTimeout(() => this.detectContentScripts(), 1000);
    });
  }

  // 处理 console 消息的增强版本
  private handleConsoleMessage(params: ConsoleAPICalledEvent, source: string) {
    const { type, args, executionContextId, timestamp, stackTrace } = params;
    
    // 获取执行上下文信息
    const context = this.executionContexts.get(executionContextId);
    let contextLabel = source;
    
    if (context) {
      // 识别不同类型的执行上下文
      if (context.auxData?.type === 'isolated') {
        contextLabel = 'content_script';
      } else if (context.name.includes('content_script')) {
        contextLabel = 'content_script';
      } else if (context.auxData?.isDefault) {
        contextLabel = 'page';
      } else if (context.origin.startsWith('chrome-extension://')) {
        contextLabel = 'extension';
      }
    }

    // 解析消息内容
    const text = args.map((arg: any) => {
      if (arg.value !== undefined) return arg.value;
      if (arg.description !== undefined) return arg.description;
      return String(arg);
    }).join(' ');

    // 添加堆栈跟踪信息（如果有）
    let stackInfo = '';
    if (stackTrace && stackTrace.callFrames.length > 0) {
      const frame = stackTrace.callFrames[0];
      if (frame.url.startsWith('chrome-extension://')) {
        contextLabel = 'content_script'; // 通过堆栈跟踪确认是扩展脚本
        stackInfo = ` @${frame.url}:${frame.lineNumber}`;
      }
    }

    // 格式化日志条目
    const logEntry = `[${contextLabel}][${type}] ${text}${stackInfo}`;
    this.consoleLogs.push(logEntry);
    
    console.log(`Console [${contextLabel}/${executionContextId}]:`, type, text);
  }

  // 主动检测 Content Scripts
  private async detectContentScripts() {
    try {
      // 执行代码来检测是否有 Content Scripts
      const result = await this.cdpClient.Runtime.evaluate({
        expression: `
          // 检测常见的 Content Script 标识
          {
            hasContentScript: window.chrome && window.chrome.runtime,
            extensionId: window.chrome && window.chrome.runtime && window.chrome.runtime.id,
            scripts: document.querySelectorAll('script[src*="chrome-extension"]').length,
            timestamp: Date.now()
          }
        `,
        returnByValue: true
      });

      if (result.result.value.hasContentScript) {
        console.log('检测到 Content Script:', result.result.value);
        this.consoleLogs.push(`[detection] Content Script detected: ${JSON.stringify(result.result.value)}`);
      }
    } catch (error) {
      console.log('Content Script 检测失败:', error);
    }
  }

  // 为新的目标设置监听
  async setupTargetConsoleCapture(sessionId: string, targetType: string) {
    if (this.attachedSessions.has(sessionId)) return;
    this.attachedSessions.add(sessionId);

    try {
      // 在会话中启用必要的域
      await this.cdpClient.send('Runtime.enable', {}, sessionId);
      await this.cdpClient.send('Console.enable', {}, sessionId);
      await this.cdpClient.send('Page.enable', {}, sessionId);

      // 监听该会话的 console 消息
      this.cdpClient.on('event', (message: any) => {
        if (message.sessionId !== sessionId) return;
        
        if (message.method === 'Runtime.consoleAPICalled') {
          this.handleConsoleMessage(message.params, targetType);
        } else if (message.method === 'Runtime.executionContextCreated') {
          const context = message.params.context;
          this.executionContexts.set(context.id, context);
          console.log(`新执行上下文 [${targetType}]: ${context.name}`);
        }
      });

    } catch (error) {
      console.log(`设置 ${targetType} 会话监听失败:`, error);
    }
  }

  // 获取所有日志
  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  // 清除日志
  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  // 获取执行上下文信息
  getExecutionContexts(): ExecutionContext[] {
    return Array.from(this.executionContexts.values());
  }
}
