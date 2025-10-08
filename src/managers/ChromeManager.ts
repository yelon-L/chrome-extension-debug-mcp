/**
 * Chrome Connection Management Module
 * Handles Chrome launching, CDP connection, and console monitoring
 */

import * as puppeteer from 'puppeteer';
import type { Client } from 'chrome-remote-interface';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { LaunchChromeArgs, AttachArgs, ConsoleAPICalledEvent, ExtensionLogEntry } from '../types/index.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[ChromeManager]', ...args);

export class ChromeManager {
  private browser: puppeteer.Browser | null = null;
  private cdpClient: Client | null = null;
  private consoleLogs: string[] = [];
  private structuredLogs: ExtensionLogEntry[] = []; // 新增结构化日志存储
  private attachedSessions: Set<string> = new Set();
  private targetInfo: Map<string, any> = new Map(); // 存储目标信息

  constructor() {}

  getBrowser(): puppeteer.Browser | null {
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
      const launchOptions: puppeteer.PuppeteerLaunchOptions = {
        headless: false,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
          '--remote-debugging-port=9222',
          '--disable-web-security',
          '--no-sandbox'
        ]
      } as puppeteer.PuppeteerLaunchOptions;

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
    const host = args.host || 'localhost';
    const port = args.port || 9222;
    
    try {
      // Connect Puppeteer to existing browser
      // Support IPv6 host by bracketing in URL form
      const hostForUrl = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
      const url = `http://${hostForUrl}:${port}`;
      this.browser = await puppeteer.connect({ browserURL: url, defaultViewport: null });

      // Ensure at least one page exists for debugging
      const pages = await this.browser.pages();
      if (pages.length === 0) {
        log('No pages found, creating a blank page for debugging');
        await this.browser.newPage();
      }
      
      // Attach CDP raw client to the same endpoint
      const CDP = (await import('chrome-remote-interface')).default;
      // Pass raw host (unbracketed) to CRI; it should handle IPv6 literal hostnames
      this.cdpClient = await CDP({ host, port });

      // Enable console monitoring and logging
      await this.setupConsoleMonitoring();
      
      // Set up target discovery for extensions
      await this.setupTargetDiscovery();

      // Hook Puppeteer page console logs for all existing and future pages
      await this.hookPuppeteerConsole();
      
      return `Successfully attached to Chrome at ${host}:${port}`;
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to attach to Chrome: ${error}`);
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
          await this.cdpClient!.send('Runtime.enable', undefined, sessionId);
          await this.cdpClient!.send('Console.enable', undefined, sessionId);

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
        p.on('console', (msg) => {
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
      this.browser.on('targetcreated', async (target) => {
        try {
          if (target.type() !== 'page') return;
          const p = await target.page();
          if (!p) return;
          // @ts-ignore
          if ((p as any)._mcpConsoleHooked) return;
          // @ts-ignore
          (p as any)._mcpConsoleHooked = true;
          p.on('console', (msg) => {
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
  private async injectUserscript(page: puppeteer.Page, userscriptPath: string): Promise<void> {
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
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.cdpClient) {
      await this.cdpClient.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.cdpClient = null;
    this.consoleLogs = [];
    this.structuredLogs = [];
    this.attachedSessions.clear();
    this.targetInfo.clear();
  }
}
