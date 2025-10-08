#!/usr/bin/env node
/**
 * Chrome Debug MCP Server
 * 
 * This server provides a Model Context Protocol (MCP) interface for controlling Chrome
 * through the Chrome DevTools Protocol (CDP) and Puppeteer. It allows:
 * - Launching Chrome with various configurations
 * - Injecting userscripts with GM_ function support
 * - Loading Chrome extensions
 * - Capturing console logs
 * - Evaluating JavaScript in the browser context
 * 
 * @module ChromeDebugMCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  Request
} from '@modelcontextprotocol/sdk/types.js';
import type { Client } from 'chrome-remote-interface';
import * as puppeteer from 'puppeteer';

interface ConsoleAPICalledEvent {
  type: string;
  args: { value?: any; description?: string }[];
  timestamp: number;
  executionContextId: number;
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
import { readFile } from 'fs/promises';
import { join } from 'path';

// Enable verbose logging for debugging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[Chrome Debug MCP]', ...args);

/**
 * Structure for console messages captured from Chrome
 */
interface ConsoleMessage {
  /** The type of console message (log, warn, error, etc.) */
  type: string;
  /** The actual message content */
  text: string;
}

/**
 * Arguments for launching Chrome with specific configurations
 */
interface LaunchChromeArgs {
  /** URL to navigate to after launch */
  url?: string;
  /** Path to a specific Chrome executable (uses bundled Chrome if not provided) */
  executablePath?: string;
  /** Path to a specific user data directory (optional, uses default Chrome profile if not provided) */
  userDataDir?: string;
  /** Path to an unpacked Chrome extension to load */
  loadExtension?: string;
  /** Path to extension that should remain enabled while others are disabled */
  disableExtensionsExcept?: string;
  /** Whether to disable Chrome's "Automation Controlled" banner */
  disableAutomationControlled?: boolean;
  /** Path to a userscript file to inject into the page */
  userscriptPath?: string;
}

/**
 * Arguments for retrieving console logs
 */
interface GetConsoleLogsArgs {
  /** Whether to clear the logs after retrieving them */
  clear?: boolean;
}

/**
 * Arguments for evaluating JavaScript in Chrome
 */
interface EvaluateArgs {
  /** JavaScript code to evaluate in the browser context */
  expression?: string;
  /** Optional tab to evaluate in */
  tabId?: string;
}

// New tool args
interface AttachArgs { host?: string; port?: number; }
interface ListExtensionsArgs {}
interface GetExtensionLogsArgs { extensionId?: string; sourceTypes?: Array<'page'|'extension'|'service_worker'|'content_script'>; since?: number; clear?: boolean; }
interface ReloadExtensionArgs { extensionId: string; }
interface InjectContentScriptArgs { extensionId: string; tabId: string; code?: string; files?: string[]; }
interface ContentScriptStatusArgs { tabId: string; }

/**
 * Main server class that handles Chrome debugging and MCP communication
 */
class ChromeDebugServer {
  private server: Server;
  private browser: puppeteer.Browser | null = null;
  private cdpClient: Client | null = null;
  private consoleLogs: string[] = [];
  private attachedSessions: Set<string> = new Set();
  private currentPage: puppeteer.Page | null = null;
  private tabIdToPage: Map<string, puppeteer.Page> = new Map();
  private pageToTabId: WeakMap<puppeteer.Page, string> = new WeakMap();
  private tabIdCounter = 0;

  constructor() {
    // Initialize MCP server with basic configuration
    this.server = new Server(
      {
        name: 'chrome-debug-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  /**
   * Sets up handlers for all supported MCP tools.
   * This includes tool listing and execution of individual tools.
   * 
   * @private
   */
  private setupToolHandlers() {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'attach_to_chrome',
          description: 'Attach to an existing Chrome with remote debugging enabled',
          inputSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'Remote debugging host', default: 'localhost' },
              port: { type: 'number', description: 'Remote debugging port', default: 9222 }
            }
          }
        },
        {
          name: 'list_extensions',
          description: 'List extension and service worker targets',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_extension_logs',
          description: 'Get aggregated logs filtered for extensions/content scripts',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: { type: 'string' },
              sourceTypes: { type: 'array', items: { type: 'string', enum: ['page','extension','service_worker','content_script'] } },
              since: { type: 'number' },
              clear: { type: 'boolean' }
            }
          }
        },
        {
          name: 'reload_extension',
          description: 'Reload an MV3 extension via its Service Worker',
          inputSchema: { type: 'object', properties: { extensionId: { type: 'string' } }, required: ['extensionId'] }
        },
        {
          name: 'inject_content_script',
          description: 'Execute chrome.scripting.executeScript from the extension SW into a tab',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: { type: 'string' },
              tabId: { type: 'string' },
              code: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } }
            },
            required: ['extensionId','tabId']
          }
        },
        {
          name: 'content_script_status',
          description: 'Diagnose whether a tab has content scripts injected',
          inputSchema: { type: 'object', properties: { tabId: { type: 'string' } }, required: ['tabId'] }
        },
        {
          name: 'launch_chrome',
          description: 'Launch Chrome in debug mode',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to navigate to (optional)',
              },
              executablePath: {
                type: 'string',
                description: 'Path to Chrome executable (optional, uses bundled Chrome if not provided)',
              },
              userDataDir: {
                type: 'string',
                description: 'Path to a specific user data directory (optional, uses default Chrome profile if not provided)',
              },
              loadExtension: {
                type: 'string',
                description: 'Path to unpacked extension directory to load (optional)',
              },
              disableExtensionsExcept: {
                type: 'string',
                description: 'Path to extension that should remain enabled while others are disabled (optional)',
              },
              disableAutomationControlled: {
                type: 'boolean',
                description: 'Disable Chrome\'s "Automation Controlled" mode (optional, default: false)',
              },
              userscriptPath: {
                type: 'string',
                description: 'Path to userscript file to inject (optional)',
              },
            },
          },
        },
        {
          name: 'get_console_logs',
          description: 'Get console logs from Chrome',
          inputSchema: {
            type: 'object',
            properties: {
              clear: {
                type: 'boolean',
                description: 'Whether to clear logs after retrieving',
              },
            },
          },
        },
        {
          name: 'evaluate',
          description: 'Evaluate JavaScript in Chrome',
          inputSchema: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'JavaScript code to evaluate',
              },
            },
            required: ['expression'],
          },
        },
        {
          name: 'click',
          description: 'Click an element specified by selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of the element to click' },
              delay: { type: 'number', description: 'Delay in ms between mousedown and mouseup' },
              button: { type: 'string', enum: ['left','middle','right'], description: 'Mouse button' },
              clickCount: { type: 'number', description: 'Number of clicks' }
            },
            required: ['selector']
          }
        },
        {
          name: 'type',
          description: 'Type text into an input/textarea specified by selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              text: { type: 'string' },
              delay: { type: 'number' },
              clear: { type: 'boolean', description: 'Clear existing value before typing' }
            },
            required: ['selector','text']
          }
        },
        {
          name: 'screenshot',
          description: 'Take a screenshot of the page or a specific element',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to save the screenshot' },
              fullPage: { type: 'boolean' },
              selector: { type: 'string', description: 'Element selector to capture' },
              clip: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              },
              returnBase64: { type: 'boolean', description: 'Return image as base64 in response' }
            }
          }
        },
        {
          name: 'list_tabs',
          description: 'List all open tabs',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'new_tab',
          description: 'Open a new tab optionally with URL',
          inputSchema: {
            type: 'object',
            properties: { url: { type: 'string' } }
          }
        },
        {
          name: 'switch_tab',
          description: 'Switch to a tab by tabId',
          inputSchema: {
            type: 'object',
            properties: { tabId: { type: 'string' } },
            required: ['tabId']
          }
        },
        {
          name: 'close_tab',
          description: 'Close a tab by tabId',
          inputSchema: {
            type: 'object',
            properties: { tabId: { type: 'string' } },
            required: ['tabId']
          }
        },
      ],
    }));

    // Handler for executing tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments || {};
      
      switch (request.params.name) {
        case 'attach_to_chrome':
          return this.handleAttachToChrome(args as AttachArgs);
        case 'list_extensions':
          return this.handleListExtensions();
        case 'get_extension_logs':
          return this.handleGetExtensionLogs(args as GetExtensionLogsArgs);
        case 'reload_extension':
          return this.handleReloadExtension(args as unknown as ReloadExtensionArgs);
        case 'inject_content_script':
          return this.handleInjectContentScript(args as unknown as InjectContentScriptArgs);
        case 'content_script_status':
          return this.handleContentScriptStatus(args as unknown as ContentScriptStatusArgs);
        case 'launch_chrome':
          return this.handleLaunchChrome(args as LaunchChromeArgs);
        case 'get_console_logs':
          return this.handleGetConsoleLogs(args as GetConsoleLogsArgs);
        case 'evaluate':
          return this.handleEvaluate(args as EvaluateArgs);
        case 'click':
          return this.handleClick(args as any);
        case 'type':
          return this.handleType(args as any);
        case 'screenshot':
          return this.handleScreenshot(args as any);
        case 'list_tabs':
          return this.handleListTabs();
        case 'new_tab':
          return this.handleNewTab(args as any);
        case 'switch_tab':
          return this.handleSwitchTab(args as any);
        case 'close_tab':
          return this.handleCloseTab(args as any);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Handles the launch_chrome tool request.
   * This launches Chrome with specified configurations and sets up CDP connection.
   * 
   * @param args - Configuration options for launching Chrome
   * @returns MCP response with launch status
   * @throws McpError if launch fails
   * @private
   */
  private async handleLaunchChrome(args: LaunchChromeArgs): Promise<any> {
    try {
      // Close existing browser if any
      if (this.browser) {
        await this.browser.close();
      }

      // Configure Chrome launch options
      const launchOptions: puppeteer.PuppeteerLaunchOptions = {
        headless: false,
        ignoreDefaultArgs: ['--disable-extensions'],  // Prevent Puppeteer from disabling extensions
        args: [
          '--remote-debugging-port=9222',  // Enable CDP
          '--disable-web-security',        // Allow cross-origin requests
          '--no-sandbox'                   // Required for some environments
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
      this.currentPage = page;
      this.ensureTabIds();

      // Set up CDP client for advanced debugging capabilities
      const CDP = (await import('chrome-remote-interface')).default;
      this.cdpClient = await CDP();

      // Enable console monitoring on the default target (current page)
      if (!this.cdpClient) {
        throw new Error('CDP client not initialized');
      }

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
        const { type, args, executionContextId, stackTrace } = params;
        
        // Get execution context info
        const context = executionContexts.get(executionContextId);
        let contextLabel = 'page';
        
        if (context) {
          // Identify different execution context types
          if (context.auxData?.type === 'isolated') {
            contextLabel = 'content_script';
          } else if (context.name.includes('content_script')) {
            contextLabel = 'content_script';
          } else if (context.origin.startsWith('chrome-extension://')) {
            contextLabel = 'extension';
          }
        }

        // Check stack trace for extension URLs
        if (stackTrace && stackTrace.callFrames.length > 0) {
          const frame = stackTrace.callFrames[0];
          if (frame.url.startsWith('chrome-extension://')) {
            contextLabel = 'content_script';
          }
        }

        const text = args.map((arg: { value?: any; description?: string }) => arg.value || arg.description).join(' ');
        this.consoleLogs.push(`[${contextLabel}][${type}] ${text}`);
        log(`Console [${contextLabel}/${executionContextId}]:`, type, text);
      });

      // Monitor page load events to detect Content Script injection
      this.cdpClient.Page.loadEventFired(() => {
        log('Page load event fired, checking for Content Scripts');
        // Delay to allow Content Scripts to be injected
        setTimeout(async () => {
          try {
            if (!this.cdpClient) return;
            const result = await this.cdpClient.Runtime.evaluate({
              expression: `
                ({
                  hasContentScript: !!(window.chrome && window.chrome.runtime),
                  extensionId: window.chrome && window.chrome.runtime && window.chrome.runtime.id,
                  timestamp: Date.now()
                })
              `,
              returnByValue: true
            });
            
            if (result.result.value.hasContentScript) {
              log('Content Script detected:', result.result.value);
              this.consoleLogs.push(`[detection] Content Script active: extension ${result.result.value.extensionId}`);
            }
          } catch (error) {
            log('Content Script detection failed:', error);
          }
        }, 1000);
      });

      // Discover and attach to extension-related targets to capture their console logs
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
                this.consoleLogs.push(`[${label}][${type}] ${text}`);
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
            // Attach to extension pages and service workers
            if (url.startsWith('chrome-extension://')) {
              await attachToTarget(id, 'extension');
            } else if (type === 'service_worker') {
              await attachToTarget(id, 'service_worker');
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
          if (url.startsWith('chrome-extension://')) {
            await attachToTarget(info.targetId, 'extension');
          } else if (type === 'service_worker') {
            await attachToTarget(info.targetId, 'service_worker');
          }
        }
      } catch (e) {
        log('Target discovery/attachment setup failed:', e);
      }

      if (args?.url) {
        // Navigate to specified URL
        log('Navigating to target URL...');
        await page.goto(args.url, { waitUntil: 'networkidle0' });
        
        // Handle userscript injection if requested
        let scriptContent = '';
        if (args?.userscriptPath) {
          try {
            log('Reading userscript from:', args.userscriptPath);
            scriptContent = await readFile(args.userscriptPath, 'utf8');
          } catch (error) {
            log('Error reading userscript:', error);
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to read userscript: ${error}`
            );
          }
        }
        
        // Inject Greasemonkey-style functions and userscript
        log('Injecting GM functions' + (scriptContent ? ' and userscript' : ''));
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

      // Get Chrome version info
      const version = await this.browser.version();
      
      // Build detailed status message
      let statusMessage = `Chrome launched successfully in debug mode\n${version}`;
      
      // Add configuration details to status
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
      
      return {
        content: [
          {
            type: 'text',
            text: statusMessage,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to launch Chrome: ${error}`
      );
    }
  }

  // Attach to an existing Chrome instance via remote debugging
  private async handleAttachToChrome(args: AttachArgs) {
    const host = args.host || 'localhost';
    const port = args.port || 9222;
    try {
      // Connect Puppeteer to existing browser
      const url = `http://${host}:${port}`;
      this.browser = await puppeteer.connect({ browserURL: url, defaultViewport: null });
      const pages = await this.browser.pages();
      this.currentPage = pages[0] || null;
      this.ensureTabIds();

      // Attach CDP raw client to the same endpoint
      const CDP = (await import('chrome-remote-interface')).default;
      this.cdpClient = await CDP({ host, port });

      // Enable console monitoring and logging
      await this.cdpClient.Runtime.enable();
      await this.cdpClient.Console.enable();
      await this.cdpClient.Page.enable();

      // Set up console logging (simplified version of launch_chrome logic)
      const executionContexts = new Map();
      
      this.cdpClient.Runtime.executionContextCreated(({ context }: any) => {
        executionContexts.set(context.id, context);
        log(`New execution context: ${context.name} (${context.origin}) [${context.id}]`);
      });
      
      this.cdpClient.Runtime.consoleAPICalled((params: any) => {
        const { type, args, executionContextId, stackTrace } = params;
        const context = executionContexts.get(executionContextId);
        let contextLabel = 'page';
        
        if (context) {
          if (context.auxData?.type === 'isolated') {
            contextLabel = 'content_script';
          } else if (context.name.includes('content_script')) {
            contextLabel = 'content_script';
          } else if (context.origin.startsWith('chrome-extension://')) {
            contextLabel = 'extension';
          }
        }
        
        if (stackTrace && stackTrace.callFrames.length > 0) {
          const frame = stackTrace.callFrames[0];
          if (frame.url.startsWith('chrome-extension://')) {
            contextLabel = 'content_script';
          }
        }
        
        const text = args.map((arg: any) => arg.value || arg.description).join(' ');
        this.consoleLogs.push(`[${contextLabel}][${type}] ${text}`);
        log(`Console [${contextLabel}/${executionContextId}]:`, type, text);
      });
      
      // Set up target discovery for extensions
      try {
        const { Target } = this.cdpClient;
        await Target.setDiscoverTargets({ discover: true });
        
        const attachToTarget = async (targetId: string, label: string) => {
          try {
            const { sessionId } = await Target.attachToTarget({ targetId, flatten: true });
            if (!sessionId || this.attachedSessions.has(sessionId)) return;
            this.attachedSessions.add(sessionId);
            
            await this.cdpClient!.send('Runtime.enable', undefined, sessionId);
            await this.cdpClient!.send('Console.enable', undefined, sessionId);
            
            this.cdpClient!.on('event', (msg: any) => {
              if (msg.sessionId !== sessionId) return;
              if (msg.method === 'Runtime.consoleAPICalled') {
                const params = msg.params;
                const text = params.args
                  .map((arg: any) => arg.value ?? arg.description)
                  .join(' ');
                const type = params.type || 'log';
                this.consoleLogs.push(`[${label}][${type}] ${text}`);
                log(`[${label}] console:`, type, text);
              }
            });
          } catch (e) {
            log('Failed to attach to target', targetId, e);
          }
        };
        
        Target.targetCreated(async ({ targetInfo }: any) => {
          try {
            const url: string = targetInfo.url || '';
            const type: string = targetInfo.type || '';
            const id: string = targetInfo.targetId;
            if (url.startsWith('chrome-extension://')) {
              await attachToTarget(id, 'extension');
            } else if (type === 'service_worker') {
              await attachToTarget(id, 'service_worker');
            }
          } catch (e) {
            log('targetCreated handler error:', e);
          }
        });
        
        const targets = await Target.getTargets();
        for (const info of targets.targetInfos || []) {
          const url: string = info.url || '';
          const type: string = info.type || '';
          if (url.startsWith('chrome-extension://')) {
            await attachToTarget(info.targetId, 'extension');
          } else if (type === 'service_worker') {
            await attachToTarget(info.targetId, 'service_worker');
          }
        }
      } catch (e) {
        log('Target discovery setup failed:', e);
      }

      return { content: [{ type: 'text', text: `attached:${host}:${port}` }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Attach failed: ${e}`);
    }
  }

  // List extension and service worker targets
  private async handleListExtensions() {
    if (!this.cdpClient) throw new McpError(ErrorCode.InternalError, 'CDP not initialized');
    try {
      const { Target } = this.cdpClient;
      const res = await Target.getTargets();
      const items = (res.targetInfos || []).filter((t: any) => t.url?.startsWith('chrome-extension://') || t.type === 'service_worker')
        .map((t: any) => ({ id: t.targetId, type: t.type, url: t.url }));
      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `List extensions failed: ${e}`);
    }
  }

  // Get aggregated extension logs with simple filtering
  private async handleGetExtensionLogs(args: GetExtensionLogsArgs) {
    if (!this.browser) throw new McpError(ErrorCode.InternalError, 'Chrome is not running.');
    const sourceTypes = args.sourceTypes && args.sourceTypes.length ? args.sourceTypes : ['extension','service_worker','content_script','page'];
    const logs = this.consoleLogs.filter(line => {
      const src = (line.match(/^\[(.*?)\]/)?.[1]) || '';
      const matchSource = sourceTypes.includes(src as any) || (src === 'page' && sourceTypes.includes('page'));
      const matchExt = args.extensionId ? line.includes(`chrome-extension://${args.extensionId}`) || line.includes(args.extensionId) : true;
      return matchSource && matchExt;
    });
    if (args.clear) this.consoleLogs = [];
    return { content: [{ type: 'text', text: logs.join('\n') || 'No logs' }] };
  }

  // Reload an MV3 extension by executing chrome.runtime.reload() in its SW session
  private async handleReloadExtension(args: ReloadExtensionArgs) {
    if (!this.cdpClient) throw new McpError(ErrorCode.InternalError, 'CDP not initialized');
    const { Target } = this.cdpClient;
    try {
      const res = await Target.getTargets();
      const sw = (res.targetInfos || []).find((t: any) => t.type === 'service_worker' && t.url?.includes(args.extensionId));
      if (!sw) throw new Error('Service worker not found for extension');
      const { sessionId } = await Target.attachToTarget({ targetId: sw.targetId, flatten: true });
      await this.cdpClient.send('Runtime.enable', undefined, sessionId);
      const evalRes = await this.cdpClient.send('Runtime.evaluate', { expression: 'chrome.runtime.reload(); "reloaded"' }, sessionId);
      return { content: [{ type: 'text', text: 'reloaded' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Reload extension failed: ${e}`);
    }
  }

  // Execute chrome.scripting.executeScript to inject content script into a tab
  private async handleInjectContentScript(args: InjectContentScriptArgs) {
    if (!this.cdpClient) throw new McpError(ErrorCode.InternalError, 'CDP not initialized');
    const { Target } = this.cdpClient;
    try {
      // Get the real Chrome tab ID from the Puppeteer page
      const page = this.tabIdToPage.get(args.tabId);
      if (!page) throw new Error(`Tab ${args.tabId} not found`);
      
      // Get the page URL to match with Chrome tabs
      const pageUrl = page.url();
      const pageTitle = await page.title();
      log('Looking for Chrome tab with URL:', pageUrl, 'Title:', pageTitle);
      
      log('Injecting into tab:', args.tabId, 'Page URL:', pageUrl);
      
      const res = await Target.getTargets();
      const sw = (res.targetInfos || []).find((t: any) => t.type === 'service_worker' && t.url?.includes(args.extensionId));
      if (!sw) throw new Error('Service worker not found for extension');
      const { sessionId } = await Target.attachToTarget({ targetId: sw.targetId, flatten: true });
      await this.cdpClient.send('Runtime.enable', undefined, sessionId);
      
      // Build the script injection parameters according to Chrome Scripting API
      let injectionParams = '';
      if (args.code) {
        // Escape the code properly for injection as a function
        const escapedCode = args.code
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'") 
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        
        // Create a proper function that executes the code
        injectionParams = `func: function() { 
          try {
            ${args.code}
          } catch (e) {
            console.error('[CS-INJECT] Execution error:', e);
          }
        }`;
      } else if (args.files && args.files.length) {
        // Use files for file-based injection
        injectionParams = `files: ${JSON.stringify(args.files)}`;
      } else {
        throw new Error('Either code or files must be provided');
      }
      
      const expression = `
        (async () => {
          try {
            console.log('[SW] Starting injection process');
            console.log('[SW] chrome.scripting available:', !!(chrome && chrome.scripting));
            console.log('[SW] chrome.tabs available:', !!(chrome && chrome.tabs));
            
            if (!chrome?.scripting?.executeScript) {
              throw new Error('chrome.scripting.executeScript not available');
            }
            
            if (!chrome?.tabs?.query) {
              throw new Error('chrome.tabs.query not available');
            }
            
            // Get page info to help identify the tab
            const targetUrl = ${JSON.stringify(pageUrl)};
            const targetTitle = ${JSON.stringify(pageTitle)};
            console.log('[SW] Looking for tab with URL:', targetUrl);
            console.log('[SW] Expected title:', targetTitle);
            
            // First try to find by URL
            let tabs = await chrome.tabs.query({ url: targetUrl });
            console.log('[SW] Found tabs by URL:', tabs.length);
            
            // If no exact URL match, try by title (works better for data URLs)
            if (tabs.length === 0) {
              const allTabs = await chrome.tabs.query({});
              console.log('[SW] Total tabs:', allTabs.length);
              
              // Look for tabs with matching title
              if (targetTitle) {
                console.log('[SW] Looking for title:', targetTitle);
                tabs = allTabs.filter(tab => tab.title === targetTitle);
                console.log('[SW] Found tabs by title:', tabs.length);
              }
              
              // If still no match, try the most recent tab (as fallback)
              if (tabs.length === 0) {
                console.log('[SW] Using most recent tab as fallback');
                const sortedTabs = allTabs.sort((a, b) => (b.id || 0) - (a.id || 0));
                if (sortedTabs.length > 0) {
                  tabs = [sortedTabs[0]];
                }
              }
            }
            
            if (tabs.length === 0) {
              throw new Error('No suitable tab found for injection');
            }
            
            const targetTab = tabs[0];
            console.log('[SW] Target tab ID:', targetTab.id);
            
            const result = await chrome.scripting.executeScript({ 
              target: { tabId: targetTab.id }, 
              ${injectionParams}
            });
            console.log('[SW] Injection result:', result);
            return 'injected to tab ' + targetTab.id;
          } catch (error) {
            console.error('[SW] Injection failed:', error.message);
            throw error;
          }
        })();`;
      
      const evalResult = await this.cdpClient.send('Runtime.evaluate', { 
        expression, 
        awaitPromise: true,
        returnByValue: true 
      }, sessionId);
      
      if (evalResult.exceptionDetails) {
        throw new Error(`SW execution failed: ${evalResult.exceptionDetails.exception?.description || 'Unknown error'}`);
      }
      
      return { content: [{ type: 'text', text: evalResult.result?.value || 'injected' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Inject content script failed: ${e}`);
    }
  }

  // Diagnose whether content script is active in a tab
  private async handleContentScriptStatus(args: ContentScriptStatusArgs) {
    const page = this.tabIdToPage.get(args.tabId);
    if (!page) throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
    try {
      const res = await page.evaluate(() => {
        // 检查Chrome Extension API是否可用
        const hasChromeRuntime = !!(window as any).chrome && !!(window as any).chrome.runtime;
        
        // 检查各种可能的MCP注入标记
        const mcpMarkers = {
          mcpExtensionTest: !!document.getElementById('mcp-extension-test'),
          mcpInjectionMarker: !!document.getElementById('mcp-injection-marker'),
          mcpLocalhostTest: !!document.getElementById('mcp-localhost-test'),
          dataMcpInjected: document.body.getAttribute('data-mcp-injected') === 'true',
          dataMcpLocalhostTest: document.body.getAttribute('data-mcp-localhost-test') === 'success'
        };
        
        // 检查扩展相关脚本标签
        const extensionScripts = Array.from(document.scripts)
          .filter(s => (s as HTMLScriptElement).src.includes('chrome-extension://')).length;
        
        // 检查页面标题是否被修改
        const titleModified = document.title.includes('MCP') || document.title.includes('MCP-');
        
        // 检查背景样式是否被修改
        const backgroundModified = document.body.style.backgroundColor !== '' || 
                                 document.body.style.background !== '';
        
        // 统计所有注入证据
        const injectionEvidence = Object.values(mcpMarkers).filter(Boolean).length;
        const hasAnyMcpMarker = injectionEvidence > 0;
        
        return {
          hasChromeRuntime,
          extensionScripts,
          mcpMarkers,
          titleModified,
          backgroundModified,
          injectionEvidence,
          hasAnyMcpMarker,
          currentTitle: document.title,
          bodyAttributes: {
            dataMcpInjected: document.body.getAttribute('data-mcp-injected'),
            dataMcpLocalhostTest: document.body.getAttribute('data-mcp-localhost-test')
          }
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Content script status failed: ${e}`);
    }
  }

  // Ensure each puppeteer.Page has a stable tabId mapping
  private ensureTabIds() {
    if (!this.browser) return;
    this.browser.pages().then(pages => {
      for (const p of pages) {
        if (!this.pageToTabId.get(p)) {
          const id = `tab_${++this.tabIdCounter}`;
          this.pageToTabId.set(p, id);
          this.tabIdToPage.set(id, p);
        }
      }
    }).catch(() => {});
  }

  private async getActivePage(): Promise<puppeteer.Page> {
    if (this.currentPage) return this.currentPage;
    if (!this.browser) {
      throw new McpError(ErrorCode.InternalError, 'Chrome is not running. Call launch_chrome first.');
    }
    const pages = await this.browser.pages();
    if (!pages.length) {
      throw new McpError(ErrorCode.InternalError, 'No pages available');
    }
    this.currentPage = pages[0];
    this.ensureTabIds();
    return this.currentPage;
  }

  private async handleClick(args: { selector: string; delay?: number; button?: 'left'|'middle'|'right'; clickCount?: number; }) {
    const page = await this.getActivePage();
    try {
      await page.waitForSelector(args.selector, { timeout: 10000, visible: true });
      await page.click(args.selector, {
        delay: args.delay,
        button: (args.button as any) || 'left',
        clickCount: args.clickCount || 1,
      } as any);
      return { content: [{ type: 'text', text: 'clicked' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Click failed: ${e}`);
    }
  }

  private async handleType(args: { selector: string; text: string; delay?: number; clear?: boolean; }) {
    const page = await this.getActivePage();
    try {
      const el = await page.waitForSelector(args.selector, { timeout: 10000 });
      if (!el) throw new Error('Element not found');
      await el.click({ clickCount: 1 });
      if (args.clear) {
        // Try to clear value
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
      }
      await page.type(args.selector, args.text, { delay: args.delay });
      return { content: [{ type: 'text', text: 'typed' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Type failed: ${e}`);
    }
  }

  private async handleScreenshot(args: { path?: string; fullPage?: boolean; selector?: string; clip?: {x:number;y:number;width:number;height:number}; returnBase64?: boolean; }) {
    const page = await this.getActivePage();
    try {
      let buffer: Buffer | undefined;
      if (args.selector) {
        const el = await page.waitForSelector(args.selector, { timeout: 10000, visible: true });
        if (!el) throw new Error('Element not found');
        buffer = await el.screenshot({ encoding: 'binary' }) as Buffer;
      } else {
        buffer = await page.screenshot({ fullPage: !!args.fullPage, clip: args.clip as any, encoding: 'binary' }) as Buffer;
      }
      if (args.path) {
        const fs = await import('fs');
        await fs.promises.writeFile(args.path, buffer);
      }
      const base64 = args.returnBase64 ? buffer.toString('base64') : undefined;
      return { content: [{ type: 'text', text: base64 ? base64 : (args.path ? `saved:${args.path}` : 'screenshot taken') }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Screenshot failed: ${e}`);
    }
  }

  private async handleListTabs() {
    if (!this.browser) throw new McpError(ErrorCode.InternalError, 'Chrome is not running.');
    const pages = await this.browser.pages();
    this.ensureTabIds();
    const list = await Promise.all(pages.map(async (p) => {
      const id = this.pageToTabId.get(p) || `tab_${++this.tabIdCounter}`;
      if (!this.pageToTabId.get(p)) {
        this.pageToTabId.set(p, id);
        this.tabIdToPage.set(id, p);
      }
      const url = p.url();
      let title = '';
      try { title = await p.title(); } catch {}
      const active = (this.currentPage === p);
      return { id, url, title, active };
    }));
    return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
  }

  private async handleNewTab(args: { url?: string }) {
    if (!this.browser) throw new McpError(ErrorCode.InternalError, 'Chrome is not running.');
    const page = await this.browser.newPage();
    const id = `tab_${++this.tabIdCounter}`;
    this.pageToTabId.set(page, id);
    this.tabIdToPage.set(id, page);
    this.currentPage = page;
    if (args?.url) {
      await page.goto(args.url, { waitUntil: 'domcontentloaded' });
    }
    return { content: [{ type: 'text', text: JSON.stringify({ id, url: page.url() }) }] };
  }

  private async handleSwitchTab(args: { tabId: string }) {
    const page = this.tabIdToPage.get(args.tabId);
    if (!page) throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
    this.currentPage = page;
    return { content: [{ type: 'text', text: `switched:${args.tabId}` }] };
  }

  private async handleCloseTab(args: { tabId: string }) {
    const page = this.tabIdToPage.get(args.tabId);
    if (!page) throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
    await page.close({ runBeforeUnload: false });
    this.tabIdToPage.delete(args.tabId);
    this.pageToTabId.delete(page);
    if (this.currentPage === page) {
      this.currentPage = null;
      // pick another page if available
      if (this.browser) {
        const pages = await this.browser.pages();
        this.currentPage = pages[0] || null;
      }
    }
    return { content: [{ type: 'text', text: `closed:${args.tabId}` }] };
  }

  /**
   * Handles the get_console_logs tool request.
   * Returns captured console messages and optionally clears the log.
   * 
   * @param args - Configuration for log retrieval
   * @returns MCP response with console logs
   * @throws McpError if Chrome is not running
   * @private
   */
  private async handleGetConsoleLogs(args: GetConsoleLogsArgs) {
    if (!this.browser) {
      throw new McpError(
        ErrorCode.InternalError,
        'Chrome is not running. Call launch_chrome first.'
      );
    }

    const logs = [...this.consoleLogs];
    if (args?.clear) {
      this.consoleLogs = [];
    }

    return {
      content: [
        {
          type: 'text',
          text: logs.join('\n') || 'No console logs available',
        },
      ],
    };
  }

  /**
   * Handles the evaluate tool request.
   * Executes JavaScript code in the browser context and returns the result.
   * 
   * @param args - JavaScript code to evaluate
   * @returns MCP response with evaluation result
   * @throws McpError if Chrome is not running or evaluation fails
   * @private
   */
  private async handleEvaluate(args: EvaluateArgs) {
    if (!this.browser || !this.cdpClient) {
      throw new McpError(
        ErrorCode.InternalError,
        'Chrome is not running. Call launch_chrome first.'
      );
    }

    if (!args?.expression) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Expression is required'
      );
    }

    try {
      const result = await this.cdpClient.Runtime.evaluate({
        expression: args.expression,
        returnByValue: true,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Evaluation failed: ${error}`
      );
    }
  }

  /**
   * Starts the MCP server using stdio transport.
   * This allows the server to communicate with the MCP client through standard input/output.
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Chrome Debug MCP server running on stdio');
  }

  /**
   * Performs cleanup when shutting down the server.
   * Closes Chrome and CDP connections gracefully.
   */
  async cleanup() {
    if (this.cdpClient) {
      await this.cdpClient.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    await this.server.close();
  }
}

// Create and start server instance
const server = new ChromeDebugServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.cleanup();
  process.exit(0);
});

// Start the server
server.run().catch(console.error);