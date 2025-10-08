/**
 * Modularized Chrome Debug MCP Server
 * 
 * This is the main server class that orchestrates all modules
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import remote transport
import { RemoteTransport } from './transports/RemoteTransport.js';

// Import modular components
import { ChromeManager } from './managers/ChromeManager.js';
import { PageManager } from './managers/PageManager.js';
import { InteractionHandler } from './handlers/InteractionHandler.js';
import { EvaluationHandler } from './handlers/EvaluationHandler.js';
import { ExtensionHandler } from './handlers/ExtensionHandler.js';

// Import types
import {
  LaunchChromeArgs,
  AttachArgs,
  GetConsoleLogsArgs,
  EvaluateArgs,
  ClickArgs,
  TypeArgs,
  ScreenshotArgs,
  NewTabArgs,
  SwitchTabArgs,
  CloseTabArgs,
  TransportType,
  RemoteMCPConfig,
} from './types/index.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[ChromeDebugServer]', ...args);

/**
 * Main Chrome Debug MCP Server class
 * 
 * This class follows the orchestrator pattern - it coordinates between
 * different modules but doesn't implement business logic itself.
 */
export class ChromeDebugServer {
  private server: Server;
  private remoteTransport?: RemoteTransport;
  
  // Module instances
  private chromeManager: ChromeManager;
  private pageManager: PageManager;
  private interactionHandler: InteractionHandler;
  private evaluationHandler: EvaluationHandler;
  private extensionHandler: ExtensionHandler;

  constructor() {
    // Initialize MCP server with basic configuration
    this.server = new Server(
      {
        name: 'chrome-debug-mcp',
        version: '2.0.0', // Updated version for modular architecture
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize modules
    this.chromeManager = new ChromeManager();
    this.pageManager = new PageManager();
    this.interactionHandler = new InteractionHandler(this.pageManager);
    this.evaluationHandler = new EvaluationHandler(this.pageManager);
    this.extensionHandler = new ExtensionHandler(this.chromeManager, this.pageManager);

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  /**
   * Sets up handlers for all supported MCP tools.
   * This method only handles routing - business logic is in modules.
   */
  private setupToolHandlers() {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'launch_chrome',
          description: 'Launch Chrome in debug mode',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to (optional)' },
              executablePath: { type: 'string', description: 'Path to Chrome executable (optional)' },
              userDataDir: { type: 'string', description: 'Path to user data directory (optional)' },
              loadExtension: { type: 'string', description: 'Path to unpacked extension directory (optional)' },
              disableExtensionsExcept: { type: 'string', description: 'Path to extension to keep enabled (optional)' },
              disableAutomationControlled: { type: 'boolean', description: 'Disable automation controlled mode (optional)' },
              userscriptPath: { type: 'string', description: 'Path to userscript file (optional)' },
            },
          },
        },
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
          name: 'get_console_logs',
          description: 'Get console logs from Chrome',
          inputSchema: {
            type: 'object',
            properties: {
              clear: { type: 'boolean', description: 'Whether to clear logs after retrieving' },
            },
          },
        },
        {
          name: 'evaluate',
          description: 'Evaluate JavaScript in Chrome',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'JavaScript code to evaluate' },
              tabId: { type: 'string', description: 'Optional specific tab ID to evaluate in' }
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
              clickCount: { type: 'number', description: 'Number of clicks' },
              tabId: { type: 'string', description: 'Optional specific tab ID to click on' }
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
              clear: { type: 'boolean', description: 'Clear existing value before typing' },
              tabId: { type: 'string', description: 'Optional specific tab ID to type into' }
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
              returnBase64: { type: 'boolean', description: 'Return image as base64 in response' },
              tabId: { type: 'string', description: 'Optional specific tab ID to capture from' }
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
        {
          name: 'list_extensions',
          description: 'List extension targets (extension pages and service workers)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_extension_logs',
          description: 'Get extension-related console logs with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: { type: 'string' },
              sourceTypes: {
                type: 'array',
                items: { type: 'string', enum: ['page','extension','service_worker','content_script'] }
              },
              since: { type: 'number' },
              clear: { type: 'boolean' }
            }
          }
        },
        {
          name: 'inject_content_script',
          description: 'Inject content script code or files into a tab',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: { type: 'string' },
              tabId: { type: 'string' },
              code: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } }
            },
            required: ['tabId']
          }
        },
        {
          name: 'content_script_status',
          description: 'Probe DOM to check if MVP content script UI is present',
          inputSchema: {
            type: 'object',
            properties: { tabId: { type: 'string' } },
            required: ['tabId']
          }
        },
      ],
    }));

    // Handler for executing tools - this is pure routing
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments || {};
      
      try {
        switch (request.params.name) {
          case 'launch_chrome':
            return await this.handleLaunchChrome(args as LaunchChromeArgs);
          case 'attach_to_chrome':
            return await this.handleAttachToChrome(args as AttachArgs);
          case 'get_console_logs':
            return await this.handleGetConsoleLogs(args as GetConsoleLogsArgs);
          case 'evaluate':
            return await this.handleEvaluate(args as EvaluateArgs);
          case 'click':
            return await this.handleClick(args as unknown as ClickArgs);
          case 'type':
            return await this.handleType(args as unknown as TypeArgs);
          case 'screenshot':
            return await this.handleScreenshot(args as unknown as ScreenshotArgs);
          case 'list_tabs':
            return await this.handleListTabs();
          case 'new_tab':
            return await this.handleNewTab(args as unknown as NewTabArgs);
          case 'switch_tab':
            return await this.handleSwitchTab(args as unknown as SwitchTabArgs);
          case 'close_tab':
            return await this.handleCloseTab(args as unknown as CloseTabArgs);
          case 'list_extensions':
            return await this.handleListExtensions(args as any);
          case 'get_extension_logs':
            return await this.handleGetExtensionLogs(args as any);
          case 'inject_content_script':
            return await this.handleInjectContentScript(args as any);
          case 'content_script_status':
            return await this.handleContentScriptStatus(args as any);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        log(`Error handling ${request.params.name}:`, error);
        throw error;
      }
    });
  }

  // ===== ORCHESTRATION METHODS =====
  // These methods only coordinate between modules, no business logic

  public async handleLaunchChrome(args: LaunchChromeArgs) {
    const statusMessage = await this.chromeManager.launchChrome(args);
    
    // Set up page manager with the new browser
    const browser = this.chromeManager.getBrowser();
    if (browser) {
      this.pageManager.setBrowser(browser);
    }
    
    return {
      content: [{ type: 'text', text: statusMessage }],
    };
  }

  public async handleAttachToChrome(args: AttachArgs) {
    const statusMessage = await this.chromeManager.attachToChrome(args);
    
    // Set up page manager with the attached browser
    const browser = this.chromeManager.getBrowser();
    if (browser) {
      this.pageManager.setBrowser(browser);
    }
    
    return {
      content: [{ type: 'text', text: statusMessage }],
    };
  }

  public async handleGetConsoleLogs(args: GetConsoleLogsArgs) {
    const logs = this.chromeManager.getConsoleLogs();
    if (args?.clear) {
      this.chromeManager.clearConsoleLogs();
    }
    return {
      content: [{ type: 'text', text: logs.join('\n') || 'No console logs available' }],
    };
  }

  public async handleEvaluate(args: EvaluateArgs) {
    return await this.evaluationHandler.evaluate(args);
  }

  public async handleClick(args: ClickArgs) {
    return await this.interactionHandler.click(args);
  }

  public async handleType(args: TypeArgs) {
    return await this.interactionHandler.type(args);
  }

  public async handleScreenshot(args: ScreenshotArgs) {
    return await this.interactionHandler.screenshot(args);
  }

  public async handleListTabs() {
    const tabs = await this.pageManager.listTabs();
    return { content: [{ type: 'text', text: JSON.stringify(tabs, null, 2) }] };
  }

  public async handleNewTab(args: NewTabArgs) {
    const result = await this.pageManager.createNewTab(args.url);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  public async handleSwitchTab(args: SwitchTabArgs) {
    const result = await this.pageManager.switchToTab(args.tabId);
    return { content: [{ type: 'text', text: result.message }] };
  }

  public async handleCloseTab(args: CloseTabArgs) {
    await this.pageManager.closeTab(args.tabId);
    return { content: [{ type: 'text', text: `closed:${args.tabId}` }] };
  }

  public async handleListExtensions(args: any) {
    return await this.extensionHandler.listExtensions(args);
  }

  public async handleGetExtensionLogs(args: any) {
    return await this.extensionHandler.getExtensionLogs(args);
  }

  public async handleInjectContentScript(args: any) {
    return await this.extensionHandler.injectContentScript(args);
  }

  public async handleContentScriptStatus(args: any) {
    return await this.extensionHandler.contentScriptStatus(args);
  }

  /**
   * Starts the MCP server with specified transport mode.
   */
  async run(transportType: TransportType = 'stdio', config?: RemoteMCPConfig) {
    log(`Starting MCP server with transport: ${transportType}`);
    
    if (transportType === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Chrome Debug MCP server (v2.0 - Modular) running on stdio');
    } else {
      // Remote transport (SSE or HTTP)
      this.remoteTransport = new RemoteTransport(this.server, config);
      // Set reference to this server for actual tool execution
      this.remoteTransport.setChromeDebugServer(this);
      await this.remoteTransport.startHTTPServer();
      console.error(`Chrome Debug MCP server (v2.0 - Modular) running with ${transportType} transport`);
    }
  }

  /**
   * Performs cleanup when shutting down the server.
   */
  async cleanup() {
    await this.chromeManager.cleanup();
    await this.pageManager.cleanup();
    
    if (this.remoteTransport) {
      await this.remoteTransport.stop();
    }
    
    await this.server.close();
  }
}
