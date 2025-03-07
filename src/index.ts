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
import CDP from 'chrome-remote-interface';
import type { Client } from 'chrome-remote-interface';
import * as puppeteer from 'puppeteer';
import { toolDefinitions } from './tool-definitions.js';
import {
  ClickArgs,
  TypeArgs,
  SelectArgs,
  HoverArgs,
  WaitForSelectorArgs,
  ScreenshotArgs,
  NavigateArgs,
  GetTextArgs,
  GetAttributeArgs,
  SetViewportArgs
} from './types/puppeteer-tools.js';
import {
  handleClick,
  handleType,
  handleSelect,
  handleHover,
  handleWaitForSelector,
  handleScreenshot,
  handleNavigate,
  handleGetText,
  handleGetAttribute,
  handleSetViewport,
  isClickArgs,
  isTypeArgs,
  isSelectArgs,
  isHoverArgs,
  isWaitForSelectorArgs,
  isScreenshotArgs,
  isNavigateArgs,
  isGetTextArgs,
  isGetAttributeArgs,
  isSetViewportArgs
} from './handlers/puppeteer-handlers.js';

interface ConsoleAPICalledEvent {
  type: string;
  args: Array<{
    value?: any;
    description?: string;
  }>;
}
import { readFile } from 'fs/promises';
import { join } from 'path';

// Enable verbose logging for debugging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[Chrome Debug MCP]', ...args);

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
}

/**
 * Main server class that handles Chrome debugging and MCP communication
 */
class ChromeDebugServer {
  private server: Server;
  private browser: puppeteer.Browser | null = null;
  private cdpClient: Client | null = null;
  private consoleLogs: string[] = [];
  private activePage: puppeteer.Page | null = null;

  /**
   * Gets the active page, throwing an error if Chrome isn't running or no page is active
   */
  private async getActivePage(): Promise<puppeteer.Page> {
    if (!this.browser) {
      throw new McpError(
        ErrorCode.InternalError,
        'Chrome is not running. Call launch_chrome first.'
      );
    }

    if (!this.activePage) {
      const pages = await this.browser.pages();
      this.activePage = pages[0];
      if (!this.activePage) {
        throw new McpError(
          ErrorCode.InternalError,
          'No active page found'
        );
      }
    }

    return this.activePage;
  }

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
      tools: toolDefinitions,
    }));

    // Handler for executing tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments || {};
      
      switch (request.params.name) {
        case 'launch_chrome':
          return this.handleLaunchChrome(args as LaunchChromeArgs);
        case 'get_console_logs':
          return this.handleGetConsoleLogs(args as GetConsoleLogsArgs);
        case 'evaluate':
          return this.handleEvaluate(args as EvaluateArgs);
        case 'click':
          if (!isClickArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid click arguments');
          return handleClick(await this.getActivePage(), args);
        case 'type':
          if (!isTypeArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid type arguments');
          return handleType(await this.getActivePage(), args);
        case 'select':
          if (!isSelectArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid select arguments');
          return handleSelect(await this.getActivePage(), args);
        case 'hover':
          if (!isHoverArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid hover arguments');
          return handleHover(await this.getActivePage(), args);
        case 'wait_for_selector':
          if (!isWaitForSelectorArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid wait_for_selector arguments');
          return handleWaitForSelector(await this.getActivePage(), args);
        case 'screenshot':
          if (!isScreenshotArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid screenshot arguments');
          return handleScreenshot(await this.getActivePage(), args);
        case 'navigate':
          if (!isNavigateArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid navigate arguments');
          return handleNavigate(await this.getActivePage(), args);
        case 'get_text':
          if (!isGetTextArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid get_text arguments');
          return handleGetText(await this.getActivePage(), args);
        case 'get_attribute':
          if (!isGetAttributeArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid get_attribute arguments');
          return handleGetAttribute(await this.getActivePage(), args);
        case 'set_viewport':
          if (!isSetViewportArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid set_viewport arguments');
          return handleSetViewport(await this.getActivePage(), args);
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

      // Set up CDP client for advanced debugging capabilities
      this.cdpClient = await CDP();
      
      // Enable console monitoring
      await this.cdpClient.Console.enable();
      await this.cdpClient.Runtime.enable();
      
      // Set up console message capture
      this.cdpClient.Runtime.consoleAPICalled((params: ConsoleAPICalledEvent) => {
        const { type, args } = params;
        const text = args.map((arg: { value?: any; description?: string }) => arg.value || arg.description).join(' ');
        this.consoleLogs.push(`[${type}] ${text}`);
        log('Console message:', type, text);
      });

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