/**
 * Chrome Connection Management Module
 * Handles Chrome launching, CDP connection, and console monitoring
 */

import puppeteer from 'puppeteer-core';
// 使用any类型避免puppeteer版本冲突
type Browser = any;
type Page = any;
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { readFile } from 'fs/promises';
import { LaunchChromeArgs, AttachArgs, ConsoleAPICalledEvent, ExtensionLogEntry } from '../types/index.js';

// Chrome Remote Interface types
interface Client {
  close(): Promise<void>;
  send(method: string, params?: any): Promise<any>;
  on(event: string, handler: (params: any) => void): void;
  Target: any;
  Runtime: any;
  Page: any;
  Console: any;
}

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[ChromeManager]', ...args);

export class ChromeManager {
  private browser: Browser | null = null;
  private cdpClient: Client | null = null;

  // 增强WebSocket连接管理
  private connectionRetryCount: Map<string, number> = new Map();
  private maxRetries: number = 3;

  /**
   * 安全的CDP操作执行，包含重试机制
   */
  async executeCdpOperation<T>(operation: () => Promise<T>, operationName: string = 'CDP Operation'): Promise<T> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        if (!this.cdpClient) {
          throw new Error('CDP client not available');
        }

        const result = await operation();
        
        // 重置重试计数
        this.connectionRetryCount.set(operationName, 0);
        return result;

      } catch (error) {
        retryCount++;
        const errorMsg = (error as Error).message;
        
        log(`⚠️  ${operationName} failed (attempt ${retryCount}/${maxRetries}): ${errorMsg}`);
        
        // 检查是否是连接相关错误
        if (errorMsg.includes('WebSocket') || errorMsg.includes('CLOSED') || errorMsg.includes('not open')) {
          this.connectionHealth = 'unhealthy';
          
          if (retryCount < maxRetries) {
            log(`🔄 Retrying ${operationName} in 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.attemptReconnect();
          }
        } else {
          // 非连接错误，直接抛出
          throw error;
        }
        
        if (retryCount === maxRetries) {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${errorMsg}`);
        }
      }
    }
    
    throw new Error(`Unexpected error in ${operationName}`);
  }
  private consoleLogs: string[] = [];
  private structuredLogs: ExtensionLogEntry[] = []; // 新增结构化日志存储
  private attachedSessions: Set<string> = new Set();
  private targetInfo: Map<string, any> = new Map(); // 存储目标信息
  
  // 🔑 关键添加：Chrome生命周期管理
  private isOwnedByMCP: boolean = false; // 标记Chrome是否由MCP启动
  private connectionType: 'attach' | 'launch' | null = null;
  private chromeProcessPid: number | null = null;
  
  // 新增：连接稳定性优化
  private connectionHealth: 'healthy' | 'unhealthy' | 'recovering' = 'unhealthy';
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private lastHealthCheck: number = 0;
  private connectionConfig: { host: string; port: number } | null = null;
  private extensionCache: Map<string, any> = new Map(); // 扩展缓存

  constructor() {}

  getBrowser(): Browser | null {
    return this.browser;
  }

  getCdpClient(): Client | null {
    return this.cdpClient;
  }

  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  getStructuredLogs(): ExtensionLogEntry[] {
    return [...this.structuredLogs];
  }

  clearConsoleLogs(): void {
    this.consoleLogs = [];
    this.structuredLogs = [];
  }

  // 新增：获取连接健康状态
  getConnectionHealth(): { 
    status: string; 
    lastCheck: number; 
    reconnectAttempts: number;
    uptime: number;
  } {
    return {
      status: this.connectionHealth,
      lastCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.lastHealthCheck ? Date.now() - this.lastHealthCheck : 0
    };
  }

  // 新增：Chrome端口智能发现
  async discoverChromePort(startPort: number = 9222): Promise<number> {
    const maxPort = startPort + 10;
    log(`🔍 [Port Discovery] Scanning ports ${startPort}-${maxPort} for Chrome debug interface...`);
    
    for (let port = startPort; port <= maxPort; port++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`http://localhost:${port}/json/version`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json() as any;
          log(`✅ [Port Discovery] Found Chrome on port ${port}: ${data.Browser}`);
          return port;
        }
      } catch (error) {
        // 继续尝试下一个端口
        continue;
      }
    }
    
    throw new Error(`❌ [Port Discovery] No Chrome debug instance found on ports ${startPort}-${maxPort}`);
  }

  // 新增：连接健康检查
  private async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.cdpClient) {
        log('⚠️  [Health Check] CDP client not available');
        return false;
      }

      // 使用轻量级API检查连接
      const startTime = Date.now();
      await this.cdpClient.Target.getTargets();
      const latency = Date.now() - startTime;
      
      this.lastHealthCheck = Date.now();
      
      if (latency > 5000) {
        log(`⚠️  [Health Check] High latency detected: ${latency}ms`);
        return false;
      }
      
      log(`✅ [Health Check] Connection healthy (${latency}ms)`);
      return true;
    } catch (error) {
      log(`❌ [Health Check] Failed: ${error}`);
      return false;
    }
  }

  // 新增：自动重连机制
  private async attemptReconnect(): Promise<void> {
    if (this.connectionHealth === 'recovering') {
      log('🔄 [Auto Recovery] Recovery already in progress');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log(`❌ [Auto Recovery] Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.connectionHealth = 'recovering';
    this.reconnectAttempts++;
    
    try {
      log(`🔄 [Auto Recovery] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      
      if (this.connectionConfig) {
        // 清理现有连接
        await this.cleanup();
        
        // 等待一段时间再重连
        await new Promise(resolve => setTimeout(resolve, 2000 * this.reconnectAttempts));
        
        // 重新连接
        await this.attachToChromeEnhanced(this.connectionConfig);
        
        this.connectionHealth = 'healthy';
        this.reconnectAttempts = 0;
        log('✅ [Auto Recovery] Reconnection successful');
      }
    } catch (error) {
      log(`❌ [Auto Recovery] Reconnect attempt ${this.reconnectAttempts} failed: ${error}`);
      this.connectionHealth = 'unhealthy';
    }
  }

  // 新增：启动健康监控
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.performHealthCheck();
      
      if (!isHealthy && this.connectionHealth === 'healthy') {
        log('⚠️  [Health Monitor] Connection degraded, initiating recovery...');
        this.connectionHealth = 'unhealthy';
        await this.attemptReconnect();
      } else if (isHealthy && this.connectionHealth !== 'healthy') {
        this.connectionHealth = 'healthy';
        this.reconnectAttempts = 0;
        log('✅ [Health Monitor] Connection restored');
      }
    }, 5000); // 每5秒检查一次

    log('🔄 [Health Monitor] Started connection monitoring (5s interval)');
  }


  /**
   * Launch Chrome with specified configurations
   */
  async launchChrome(args: LaunchChromeArgs): Promise<string> {
    try {
      // Close existing browser if any
      if (this.browser) {
        await this.browser.close();
      }

      // Configure Chrome launch options
      const launchOptions: any = {
        headless: false,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
          '--remote-debugging-port=9222',
          '--disable-web-security',
          '--no-sandbox'
        ]
      };

      // Configure user data directory if specified
      if (args?.userDataDir) {
        log('Using custom user data directory:', args.userDataDir);
        launchOptions.userDataDir = args.userDataDir;
      } else {
        log('Using default Chrome profile');
      }

      // Configure extension loading if requested
      if (args?.loadExtension) {
        log('Loading extension from:', args.loadExtension);
        launchOptions.args?.push(`--load-extension=${args.loadExtension}`);
      }

      if (args?.disableExtensionsExcept) {
        log('Disabling extensions except:', args.disableExtensionsExcept);
        launchOptions.args?.push(`--disable-extensions-except=${args.disableExtensionsExcept}`);
      }

      // Use specific Chrome executable if provided
      if (args?.executablePath) {
        log('Using custom Chrome executable:', args.executablePath);
        launchOptions.executablePath = args.executablePath;
      } else {
        log('Using bundled Chrome executable');
      }

      // Handle automation mode configuration
      if (args?.disableAutomationControlled) {
        log('Disabling automation controlled mode');
        if (!launchOptions.ignoreDefaultArgs) {
          launchOptions.ignoreDefaultArgs = [];
        }
        if (Array.isArray(launchOptions.ignoreDefaultArgs)) {
          launchOptions.ignoreDefaultArgs.push('--enable-automation');
        }
      }

      // Launch Chrome using Puppeteer
      this.browser = await puppeteer.launch(launchOptions);

      const pages = await this.browser.pages();
      const page = pages[0];

      // Set up CDP client for advanced debugging capabilities
      await this.setupCdpClient();

      // Hook Puppeteer page console logs as a fallback and for redundancy
      await this.hookPuppeteerConsole();

      if (args?.url) {
        // Navigate to specified URL
        log('Navigating to target URL...');
        await page.goto(args.url, { waitUntil: 'networkidle0' });
        
        // Handle userscript injection if requested
        if (args?.userscriptPath) {
          await this.injectUserscript(page, args.userscriptPath);
        }
      }

      // Get Chrome version info
      const version = await this.browser.version();
      
      // Build detailed status message
      let statusMessage = `Chrome launched successfully in debug mode\n${version}`;
      
      statusMessage += args?.executablePath
        ? `\nUsing custom executable: ${args.executablePath}`
        : '\nUsing bundled Chrome';
        
      statusMessage += args?.userDataDir
        ? `\nUsing custom user data directory: ${args.userDataDir}`
        : '\nUsing default Chrome profile';
      
      if (args?.loadExtension) {
        statusMessage += `\nLoaded extension: ${args.loadExtension}`;
      }
      
      if (args?.disableExtensionsExcept) {
        statusMessage += `\nDisabled extensions except: ${args.disableExtensionsExcept}`;
      }
      
      if (args?.disableAutomationControlled) {
        statusMessage += '\nAutomation controlled mode disabled';
      }
      
      if (args?.userscriptPath) {
        statusMessage += `\nInjected userscript: ${args.userscriptPath}`;
      }
      
      return statusMessage;
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to launch Chrome: ${error}`);
    }
  }

  /**
   * Attach to an existing Chrome instance
   */
  async attachToChrome(args: AttachArgs): Promise<string> {
    // 使用增强版本替代原有逻辑
    return this.attachToChromeEnhanced(args);
  }

  /**
   * 增强版Chrome连接 - 包含自动重试、健康检查、端口发现
   */
  async attachToChromeEnhanced(args: AttachArgs): Promise<string> {
    let host = args.host || 'localhost';
    let port = args.port;
    
    // 🔑 重要：标记这是连接到现有Chrome，不是MCP启动的
    this.isOwnedByMCP = false;
    this.connectionType = 'attach';
    
    // 智能端口发现
    if (!port) {
      try {
        port = await this.discoverChromePort();
        log(`🔍 [Enhanced Attach] Auto-discovered Chrome on port ${port}`);
      } catch (error) {
        port = 9222; // 回退到默认端口
        log(`⚠️  [Enhanced Attach] Port discovery failed, using default: ${port}`);
      }
    }

    // 保存连接配置用于重连
    this.connectionConfig = { host, port };
    
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(`🔄 [Enhanced Attach] Connection attempt ${attempt}/${maxRetries} to ${host}:${port}...`);
        
        // 预连接健康检查
        await this.preConnectionCheck(host, port);
        
        // Connect Puppeteer to existing browser with timeout configuration
        const hostForUrl = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
        const url = `http://${hostForUrl}:${port}`;
        this.browser = await puppeteer.connect({ 
          browserURL: url, 
          defaultViewport: null,
          protocolTimeout: 10000, // 10-second protocol timeout (borrowed from Chrome DevTools MCP)
          targetFilter: (target) => {
            // Filter out Chrome internal pages for better performance
            const ignoredPrefixes = ['chrome://', 'chrome-untrusted://', 'devtools://'];
            if (target.url() === 'chrome://newtab/') return true;
            return !ignoredPrefixes.some(prefix => target.url().startsWith(prefix));
          }
        });

        log('✅ [Enhanced Attach] Puppeteer connected with 10s protocol timeout');

        // Ensure at least one page exists for debugging
        const pages = await this.browser.pages();
        if (pages.length === 0) {
          log('📄 [Enhanced Attach] No pages found, creating debug page...');
          await this.browser.newPage();
        }
        
        // Attach CDP raw client to the same endpoint with timeout
        const CDP = (await import('chrome-remote-interface')).default;
        this.cdpClient = await CDP({ 
          host, 
          port
        });

        // Enable console monitoring and logging
        await this.setupConsoleMonitoring();
        
        // Set up target discovery for extensions with caching
        await this.setupTargetDiscovery();
        await this.setupTargetDiscoveryEnhanced();

        // Hook Puppeteer page console logs for all existing and future pages
        await this.hookPuppeteerConsole();
        
        // 启动健康监控
        this.startHealthMonitoring();
        
        // 预热扩展缓存
        await this.warmupExtensionCache();
        
        this.connectionHealth = 'healthy';
        this.reconnectAttempts = 0;
        
        const statusMessage = `🚀 [Enhanced Attach] Successfully connected with optimizations:
        ✅ Host: ${host}:${port}
        ✅ Health monitoring: Active (5s interval)
        ✅ Auto-reconnect: Enabled (max ${this.maxReconnectAttempts} attempts)
        ✅ Extension cache: Preloaded
        ✅ Connection attempt: ${attempt}/${maxRetries}`;
        
        log(statusMessage);
        return statusMessage;
        
      } catch (error) {
        lastError = error as Error;
        log(`❌ [Enhanced Attach] Attempt ${attempt} failed: ${error}`);
        
        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // 递增延迟
          log(`⏳ [Enhanced Attach] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new McpError(ErrorCode.InternalError, 
      `Failed to attach to Chrome after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // 新增：预连接检查
  private async preConnectionCheck(host: string, port: number): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${host}:${port}/json/version`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Chrome debug interface not responding (HTTP ${response.status})`);
      }
      
      const data = await response.json() as any;
      log(`✅ [Pre-check] Chrome ${data.Browser} is accessible`);
    } catch (error) {
      throw new Error(`Pre-connection check failed: ${error}`);
    }
  }

  /**
   * Set up CDP client and console monitoring
   */
  private async setupCdpClient(): Promise<void> {
    const CDP = (await import('chrome-remote-interface')).default;
    this.cdpClient = await CDP();

    if (!this.cdpClient) {
      throw new Error('CDP client not initialized');
    }

    await this.setupConsoleMonitoring();
    await this.setupTargetDiscovery();
  }

  /**
   * Set up console monitoring
   */
  private async setupConsoleMonitoring(): Promise<void> {
    if (!this.cdpClient) return;

    await this.cdpClient.Console.enable();
    await this.cdpClient.Runtime.enable();
    await this.cdpClient.Page.enable();

    // Track execution contexts for Content Script detection
    const executionContexts = new Map();

    // Monitor execution context creation (including Content Scripts)
    this.cdpClient.Runtime.executionContextCreated(({ context }: any) => {
      executionContexts.set(context.id, context);
      log(`New execution context: ${context.name} (${context.origin}) [${context.id}]`);
      
      // Detect Content Script contexts
      const isContentScript = context.auxData?.type === 'isolated' || 
                             context.name.includes('content_script') ||
                             context.origin.startsWith('chrome-extension://');
      if (isContentScript) {
        log(`Detected Content Script context: ${context.name}`);
      }
    });

    // Monitor execution context destruction
    this.cdpClient.Runtime.executionContextDestroyed(({ executionContextId }: any) => {
      executionContexts.delete(executionContextId);
      log(`Execution context destroyed: ${executionContextId}`);
    });

    // Clear contexts on navigation
    this.cdpClient.Runtime.executionContextsCleared(() => {
      log('All execution contexts cleared (navigation)');
      executionContexts.clear();
    });

    // Enhanced console message handling with execution context awareness
    this.cdpClient.Runtime.consoleAPICalled((params: ConsoleAPICalledEvent) => {
      const { type, args, executionContextId, stackTrace, timestamp } = params;
      
      // Get execution context info
      const context = executionContexts.get(executionContextId);
      let contextLabel = 'page';
      let extensionId: string | undefined;
      let url: string | undefined;
      
      if (context) {
        url = context.origin;
        // Identify different execution context types
        if (context.auxData?.type === 'isolated') {
          contextLabel = 'content_script';
        } else if (context.name.includes('content_script')) {
          contextLabel = 'content_script';
        } else if (context.origin.startsWith('chrome-extension://')) {
          contextLabel = 'extension';
          // Extract extension ID from URL
          const match = context.origin.match(/chrome-extension:\/\/([a-z]+)/);
          if (match) extensionId = match[1];
        }
      }

      // Check stack trace for extension URLs
      if (stackTrace && stackTrace.callFrames.length > 0) {
        const frame = stackTrace.callFrames[0];
        if (frame.url.startsWith('chrome-extension://')) {
          contextLabel = 'content_script';
          const match = frame.url.match(/chrome-extension:\/\/([a-z]+)/);
          if (match) extensionId = match[1];
          url = frame.url;
        }
      }

      const text = args.map((arg: { value?: any; description?: string }) => arg.value || arg.description).join(' ');
      
      // 保存原有格式的日志
      this.consoleLogs.push(`[${contextLabel}][${type}] ${text}`);
      
      // 保存结构化日志
      const structuredLog: ExtensionLogEntry = {
        timestamp: timestamp || Date.now(),
        level: type,
        message: text,
        source: contextLabel,
        extensionId,
        url,
        contextType: contextLabel
      };
      this.structuredLogs.push(structuredLog);
      
      log(`Console [${contextLabel}/${executionContextId}]:`, type, text);
    });
  }

  /**
   * Set up target discovery for extensions
   */
  private async setupTargetDiscovery(): Promise<void> {
    if (!this.cdpClient) return;

    try {
      const { Target } = this.cdpClient;
      await Target.setDiscoverTargets({ discover: true });

      // Attach helper: given targetId, attach with flatten=true and enable Runtime/Console for that session
      const attachToTarget = async (targetId: string, label: string) => {
        try {
          const { sessionId } = await Target.attachToTarget({ targetId, flatten: true });
          if (!sessionId || this.attachedSessions.has(sessionId)) return;
          this.attachedSessions.add(sessionId);

          // Enable Console/Runtime in the attached session
          await this.cdpClient!.send('Runtime.enable');
          await this.cdpClient!.send('Console.enable');

          // Listen for events from this sessionId and aggregate logs
          this.cdpClient!.on('event', (msg: any) => {
            if (msg.sessionId !== sessionId) return;
            if (msg.method === 'Runtime.consoleAPICalled') {
              const params = msg.params as ConsoleAPICalledEvent;
              const text = params.args
                .map((arg: { value?: any; description?: string }) => arg.value ?? arg.description)
                .join(' ');
              const type = (params as any).type || 'log';
              const timestamp = params.timestamp || Date.now();
              
              // 保存原有格式的日志
              this.consoleLogs.push(`[${label}][${type}] ${text}`);
              
              // 保存结构化日志
              const targetInfo = this.targetInfo.get(targetId);
              let extensionId: string | undefined;
              if (targetInfo?.url?.startsWith('chrome-extension://')) {
                const match = targetInfo.url.match(/chrome-extension:\/\/([a-z]+)/);
                if (match) extensionId = match[1];
              }
              
              const structuredLog: ExtensionLogEntry = {
                timestamp,
                level: type,
                message: text,
                source: label,
                extensionId,
                url: targetInfo?.url,
                contextType: label
              };
              this.structuredLogs.push(structuredLog);
              
              log(`[${label}] console:`, type, text);
            }
          });
        } catch (e) {
          log('Failed to attach to target', targetId, e);
        }
      };

      // Handle new targets as they appear
      Target.targetCreated(async ({ targetInfo }: any) => {
        try {
          const url: string = targetInfo.url || '';
          const type: string = targetInfo.type || '';
          const id: string = targetInfo.targetId;
          
          // 保存目标信息供日志使用
          this.targetInfo.set(id, targetInfo);
          
          // Attach to extension pages and service workers
          if (url.startsWith('chrome-extension://')) {
            await attachToTarget(id, 'extension');
          } else if (type === 'service_worker') {
            await attachToTarget(id, 'service_worker');
          } else if (type === 'page') {
            await attachToTarget(id, 'page');
          }
        } catch (e) {
          log('targetCreated handler error:', e);
        }
      });

      // Proactively query existing targets and attach if needed
      const targets = await Target.getTargets();
      for (const info of targets.targetInfos || []) {
        const url: string = info.url || '';
        const type: string = info.type || '';
        
        // 保存目标信息供日志使用
        this.targetInfo.set(info.targetId, info);
        
        if (url.startsWith('chrome-extension://')) {
          await attachToTarget(info.targetId, 'extension');
        } else if (type === 'service_worker') {
          await attachToTarget(info.targetId, 'service_worker');
        } else if (type === 'page') {
          await attachToTarget(info.targetId, 'page');
        }
      }
    } catch (e) {
      log('Target discovery/attachment setup failed:', e);
    }
  }

  /**
   * Hook Puppeteer page console events to aggregate logs (page/content_script)
   * This complements CDP-based session logging and ensures we capture page logs reliably.
   */
  private async hookPuppeteerConsole(): Promise<void> {
    if (!this.browser) return;
    try {
      const pages = await this.browser.pages();
      for (const p of pages) {
        // Avoid duplicate listeners
        // @ts-ignore
        if ((p as any)._mcpConsoleHooked) continue;
        // @ts-ignore
        (p as any)._mcpConsoleHooked = true;
        p.on('console', (msg: any) => {
          try {
            const type = msg.type();
            const text = msg.text();
            const url = p.url();
            
            // 保存原有格式的日志
            this.consoleLogs.push(`[page][${type}] ${text}`);
            
            // 保存结构化日志
            let extensionId: string | undefined;
            if (url.startsWith('chrome-extension://')) {
              const match = url.match(/chrome-extension:\/\/([a-z]+)/);
              if (match) extensionId = match[1];
            }
            
            const structuredLog: ExtensionLogEntry = {
              timestamp: Date.now(),
              level: type,
              message: text,
              source: 'page',
              extensionId,
              url,
              contextType: 'page'
            };
            this.structuredLogs.push(structuredLog);
            
            log('[page] console:', type, text);
          } catch {}
        });
      }

      // Hook future pages
      this.browser.on('targetcreated', async (target: any) => {
        try {
          if (target.type() !== 'page') return;
          const p = await target.page();
          if (!p) return;
          // @ts-ignore
          if ((p as any)._mcpConsoleHooked) return;
          // @ts-ignore
          (p as any)._mcpConsoleHooked = true;
          p.on('console', (msg: any) => {
            try {
              const type = msg.type();
              const text = msg.text();
              const url = p.url();
              
              // 保存原有格式的日志
              this.consoleLogs.push(`[page][${type}] ${text}`);
              
              // 保存结构化日志
              let extensionId: string | undefined;
              if (url.startsWith('chrome-extension://')) {
                const match = url.match(/chrome-extension:\/\/([a-z]+)/);
                if (match) extensionId = match[1];
              }
              
              const structuredLog: ExtensionLogEntry = {
                timestamp: Date.now(),
                level: type,
                message: text,
                source: 'page',
                extensionId,
                url,
                contextType: 'page'
              };
              this.structuredLogs.push(structuredLog);
              
              log('[page] console:', type, text);
            } catch {}
          });
        } catch {}
      });
    } catch (e) {
      log('hookPuppeteerConsole failed:', e);
    }
  }

  /**
   * Inject userscript into a page
   */
  private async injectUserscript(page: any, userscriptPath: string): Promise<void> {
    let scriptContent = '';
    try {
      log('Reading userscript from:', userscriptPath);
      scriptContent = await readFile(userscriptPath, 'utf8');
    } catch (error) {
      log('Error reading userscript:', error);
      throw new McpError(ErrorCode.InternalError, `Failed to read userscript: ${error}`);
    }
    
    // Inject Greasemonkey-style functions and userscript
    log('Injecting GM functions and userscript');
    await page.evaluate((content: string) => {
      try {
        // Define GM_ functions that userscripts can use
        const gmFunctionsScript = `
          // Store values persistently
          window.GM_setValue = function(key, value) {
            localStorage.setItem('GM_' + key, JSON.stringify(value));
          };

          // Retrieve stored values
          window.GM_getValue = function(key, defaultValue) {
            const value = localStorage.getItem('GM_' + key);
            return value ? JSON.parse(value) : defaultValue;
          };

          // Make HTTP requests (simplified implementation)
          window.GM_xmlhttpRequest = function(details) {
            fetch(details.url)
              .then(r => r.text())
              .then(text => details.onload?.({ responseText: text }))
              .catch(err => details.onerror?.(err));
          };

          // Add CSS to the page
          window.GM_addStyle = function(css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
          };

          // Open URL in new tab
          window.GM_openInTab = function(url) {
            window.open(url, '_blank');
          };

          // Register menu commands (stub implementation)
          window.GM_registerMenuCommand = function(name, fn) {
            // Stub for menu command registration
          };

          // Initialize API key if needed
          if (!localStorage.getItem('GM_nzbgeekApiKey')) {
            localStorage.setItem('GM_nzbgeekApiKey', JSON.stringify('CuJU1bkXcsvYmuXjpK9HtyjTimWw8Zm0'));
          }
        `;

        // Inject GM functions
        const gmScript = document.createElement('script');
        gmScript.textContent = gmFunctionsScript;
        document.head.appendChild(gmScript);

        // Inject userscript if provided
        if (content) {
          const userScript = document.createElement('script');
          userScript.textContent = content;
          document.head.appendChild(userScript);
          console.log('[Chrome Debug MCP] GM functions and userscript injected successfully');
        } else {
          console.log('[Chrome Debug MCP] GM functions injected successfully (no userscript provided)');
        }
      } catch (error) {
        console.error('[Chrome Debug MCP] Failed to inject userscript:', error);
      }
    }, scriptContent);
  }

  /**
   * 🔑 安全清理：只关闭MCP启动的Chrome，不干扰用户Chrome
   */
  async cleanup(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.cdpClient) {
        await this.cdpClient.close();
        this.cdpClient = null;
      }

      if (this.browser) {
        if (this.isOwnedByMCP) {
          // 🔑 只关闭MCP启动的Chrome
          log(`🛑 [Cleanup] Closing MCP-owned Chrome (${this.connectionType}, PID: ${this.chromeProcessPid || 'unknown'})`);
          await this.browser.close();
          log('✅ [Cleanup] Successfully closed MCP-owned Chrome');
        } else {
          // 🔑 用户的Chrome，只断开连接，不关闭
          log(`🔌 [Cleanup] Disconnecting from user's Chrome (${this.connectionType}) - NOT closing it`);
          await this.browser.disconnect();
          log('✅ [Cleanup] Safely disconnected from user\'s Chrome (it continues running)');
        }
        this.browser = null;
      }

      // 重置生命周期状态
      this.isOwnedByMCP = false;
      this.connectionType = null;
      this.chromeProcessPid = null;

      this.consoleLogs = [];
      this.structuredLogs = [];
      this.attachedSessions.clear();
      this.targetInfo.clear();
      this.extensionCache.clear();
      
      log('✅ [Cleanup] Resources cleaned up successfully');
    } catch (error) {
      log(`⚠️  [Cleanup] Error during cleanup: ${error}`);
    }
  }

  // 新增：增强目标发现（带缓存）
  private async setupTargetDiscoveryEnhanced(): Promise<void> {
    if (!this.cdpClient) return;

    try {
      // 获取所有目标并缓存扩展信息
      const targets = await this.cdpClient.Target.getTargets();
      const extensions = targets.targetInfos?.filter((target: any) => 
        target.type === 'service_worker' && 
        target.url.startsWith('chrome-extension://')
      ) || [];

      // 缓存扩展目标信息
      for (const ext of extensions) {
        const extensionId = this.extractExtensionId(ext.url);
        if (extensionId) {
          this.extensionCache.set(extensionId, {
            targetId: ext.targetId,
            url: ext.url,
            title: ext.title,
            type: ext.type,
            lastUpdated: Date.now()
          });
        }
        this.targetInfo.set(ext.targetId, ext);
      }

      log(`🚀 [Enhanced Discovery] Cached ${extensions.length} extension targets`);

      // 监听新目标创建
      this.cdpClient.Target.targetCreated(({ targetInfo }: any) => {
        if (targetInfo.type === 'service_worker' && 
            targetInfo.url.startsWith('chrome-extension://')) {
          const extensionId = this.extractExtensionId(targetInfo.url);
          if (extensionId) {
            this.extensionCache.set(extensionId, {
              targetId: targetInfo.targetId,
              url: targetInfo.url,
              title: targetInfo.title,
              type: targetInfo.type,
              lastUpdated: Date.now()
            });
            log(`🆕 [Enhanced Discovery] New extension target cached: ${extensionId}`);
          }
          this.targetInfo.set(targetInfo.targetId, targetInfo);
        }
      });

      // 监听目标销毁
      this.cdpClient.Target.targetDestroyed(({ targetId }: any) => {
        if (this.targetInfo.has(targetId)) {
          const target = this.targetInfo.get(targetId);
          if (target?.url.startsWith('chrome-extension://')) {
            const extensionId = this.extractExtensionId(target.url);
            if (extensionId) {
              this.extensionCache.delete(extensionId);
              log(`🗑️  [Enhanced Discovery] Extension target removed: ${extensionId}`);
            }
          }
          this.targetInfo.delete(targetId);
        }
      });

      await this.cdpClient.Target.setDiscoverTargets({ discover: true });
      log('✅ [Enhanced Discovery] Target discovery enabled with caching');

    } catch (error) {
      log(`❌ [Enhanced Discovery] Setup failed: ${error}`);
    }
  }

  // 新增：预热扩展缓存
  private async warmupExtensionCache(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // 强制刷新目标列表
      if (this.cdpClient) {
        const targets = await this.cdpClient.Target.getTargets();
        const extensionTargets = targets.targetInfos?.filter((t: any) => 
          t.type === 'service_worker' && 
          t.url.startsWith('chrome-extension://')
        ) || [];

        // 预加载扩展上下文信息
        for (const target of extensionTargets) {
          const extensionId = this.extractExtensionId(target.url);
          if (extensionId && !this.extensionCache.has(extensionId)) {
            this.extensionCache.set(extensionId, {
              targetId: target.targetId,
              url: target.url,
              title: target.title,
              type: target.type,
              lastUpdated: Date.now()
            });
          }
        }

        const duration = Date.now() - startTime;
        log(`🔥 [Cache Warmup] Preloaded ${extensionTargets.length} extensions in ${duration}ms`);
      }
    } catch (error) {
      log(`⚠️  [Cache Warmup] Failed: ${error}`);
    }
  }

  // 新增：获取缓存的扩展列表
  getCachedExtensions(): Array<{ 
    id: string; 
    targetId: string; 
    url: string; 
    title: string; 
    type: string; 
    lastUpdated: number;
  }> {
    const extensions = [];
    for (const [id, info] of this.extensionCache.entries()) {
      extensions.push({ id, ...info });
    }
    return extensions;
  }

  // 辅助方法：从URL提取扩展ID
  private extractExtensionId(url: string): string | null {
    const match = url.match(/chrome-extension:\/\/([a-z]+)/);
    return match ? match[1] : null;
  }
}
