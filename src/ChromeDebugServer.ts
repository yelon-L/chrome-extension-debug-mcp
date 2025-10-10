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

// Import utilities
import { Mutex } from './utils/Mutex.js';

// Import tool definitions
import { quickDebugTools } from './tools/quick-debug-tools.js';
import { harTools } from './tools/har-tools.js';

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
  
  // Tool execution mutex to prevent concurrent access conflicts
  private toolMutex: Mutex;
  
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

    // Initialize tool mutex for concurrent access protection
    this.toolMutex = new Mutex();
    
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
          description: 'Enhanced extension logs analysis with structured filtering, extension info, and professional reporting format',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: { 
                type: 'string',
                description: 'Filter logs by specific extension ID'
              },
              sourceTypes: {
                type: 'array',
                items: { type: 'string', enum: ['background','content_script','popup','options','service_worker','page','extension'] },
                description: 'Filter by log source types'
              },
              level: {
                type: 'array',
                items: { type: 'string', enum: ['error','warn','info','log','debug'] },
                description: 'Filter by log levels'
              },
              since: { 
                type: 'number',
                description: 'Filter logs since timestamp (ms)'
              },
              tabId: {
                type: 'string',
                description: 'Filter content script logs by tab ID'
              },
              clear: { 
                type: 'boolean',
                description: 'Clear logs after retrieving'
              }
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
          name: 'list_extension_contexts',
          description: 'Week 2: List all contexts (background, content scripts, popup, options, devtools) for Chrome extensions with detailed status analysis',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Optional specific extension ID to analyze. If not provided, analyzes all extensions.'
              }
            }
          }
        },
        {
          name: 'switch_extension_context',
          description: 'Week 2 Day 8-10: Switch to a specific extension context (background, content_script, popup, options, devtools) with capability detection',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to switch context for'
              },
              contextType: {
                type: 'string',
                enum: ['background', 'content_script', 'popup', 'options', 'devtools'],
                description: 'Type of context to switch to'
              },
              tabId: {
                type: 'string',
                description: 'Required for content_script context type'
              },
              targetId: {
                type: 'string', 
                description: 'Optional direct target ID'
              }
            },
            required: ['extensionId', 'contextType']
          }
        },
        {
          name: 'inspect_extension_storage',
          description: 'Week 2 Day 11-12: Inspect and monitor Chrome extension storage (local, sync, session, managed) with usage quotas and capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to inspect storage for'
              },
              storageTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['local', 'sync', 'session', 'managed']
                },
                description: 'Storage types to inspect (defaults to all)'
              },
              keys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific storage keys to retrieve (optional, defaults to all)'
              },
              watch: {
                type: 'boolean',
                description: 'Enable storage change monitoring (optional, defaults to false)'
              }
            },
            required: ['extensionId']
          }
        },
        {
          name: 'content_script_status',
          description: 'Enhanced content script status analysis with comprehensive injection detection, conflict analysis, and performance monitoring',
          inputSchema: {
            type: 'object',
            properties: { 
              tabId: { 
                type: 'string',
                description: 'Specific tab ID to analyze' 
              },
              extensionId: {
                type: 'string',
                description: 'Optional extension ID filter'
              },
              checkAllTabs: {
                type: 'boolean',
                description: 'Check content script status across all open tabs'
              }
            }
          }
        },
        {
          name: 'monitor_extension_messages',
          description: 'Week 3: Monitor extension message passing in real-time, track runtime.sendMessage, tabs.sendMessage and message responses',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to monitor messages for'
              },
              duration: {
                type: 'number',
                description: 'Monitoring duration in milliseconds (default: 30000)'
              },
              messageTypes: {
                type: 'array',
                items: { type: 'string', enum: ['runtime', 'tabs', 'external'] },
                description: 'Message types to monitor (default: [\"runtime\", \"tabs\"])'
              },
              includeResponses: {
                type: 'boolean',
                description: 'Include message responses in monitoring (default: true)'
              }
            },
            required: ['extensionId']
          }
        },
        {
          name: 'track_extension_api_calls',
          description: 'Week 3: Track Chrome extension API calls with performance monitoring, memory usage analysis, and error tracking',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to track API calls for'
              },
              apiCategories: {
                type: 'array',
                items: { type: 'string', enum: ['storage', 'tabs', 'runtime', 'permissions', 'webRequest', 'alarms'] },
                description: 'API categories to track (default: [\"storage\", \"tabs\", \"runtime\"])'
              },
              duration: {
                type: 'number',
                description: 'Tracking duration in milliseconds (default: 30000)'
              },
              includeResults: {
                type: 'boolean',
                description: 'Include API call results in tracking (default: true)'
              }
            },
            required: ['extensionId']
          }
        },
        {
          name: 'test_extension_on_multiple_pages',
          description: 'Week 4: Batch test extension behavior across multiple pages with comprehensive analysis, performance monitoring and automated reporting',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to test across multiple pages'
              },
              testUrls: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of URLs to test the extension on'
              },
              testCases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    checkInjection: { type: 'boolean' },
                    checkAPICalls: { type: 'boolean' },
                    checkStorage: { type: 'boolean' },
                    checkMessages: { type: 'boolean' },
                    customScript: { type: 'string' },
                    expectedResults: { type: 'object' }
                  },
                  required: ['name', 'description']
                },
                description: 'Custom test cases to execute on each page'
              },
              timeout: {
                type: 'number',
                description: 'Timeout for each page test in milliseconds (default: 30000)'
              },
              concurrency: {
                type: 'number',
                description: 'Number of concurrent page tests (default: 3)'
              },
              includePerformance: {
                type: 'boolean',
                description: 'Include performance analysis in results (default: true)'
              },
              generateReport: {
                type: 'boolean',
                description: 'Generate detailed test report (default: true)'
              }
            },
            required: ['extensionId', 'testUrls']
          }
        },
        {
          name: 'analyze_extension_performance',
          description: 'Phase 1 Performance: Analyze extension performance impact with Chrome Tracing, calculate CPU/memory usage, execution time, Core Web Vitals impact, and provide optimization recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to analyze performance for'
              },
              testUrl: {
                type: 'string',
                description: 'URL to test extension performance on'
              },
              duration: {
                type: 'number',
                description: 'Performance trace recording duration in milliseconds (default: 3000)'
              },
              iterations: {
                type: 'number',
                description: 'Number of test iterations for averaging (default: 1)'
              },
              includeScreenshots: {
                type: 'boolean',
                description: 'Include screenshots in trace recording (default: false)'
              },
              waitForIdle: {
                type: 'boolean',
                description: 'Wait for network idle before measuring (default: true)'
              }
            },
            required: ['extensionId', 'testUrl']
          }
        },
        // Quick Debug Tools
        ...quickDebugTools,
        // HAR Export Tools
        ...harTools,
      ],
    }));

    // Handler for executing tools - this is pure routing with mutex protection
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments || {};
      
      // Acquire mutex to prevent concurrent tool execution
      const guard = await this.toolMutex.acquire();
      const startTime = Date.now();
      
      try {
        log(`🔒 [Mutex] Tool '${request.params.name}' acquired lock`);
        
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
          case 'list_extension_contexts':
            return await this.handleListExtensionContexts(args as any);
          case 'switch_extension_context':
            return await this.handleSwitchExtensionContext(args as any);
          case 'inspect_extension_storage':
            return await this.handleInspectExtensionStorage(args as any);
          case 'monitor_extension_messages':
            return await this.handleMonitorExtensionMessages(args as any);
          case 'track_extension_api_calls':
            return await this.handleTrackExtensionAPICalls(args as any);
          case 'track_extension_network':
            return await this.handleTrackExtensionNetwork(args as any);
          case 'analyze_extension_performance':
            return await this.handleAnalyzeExtensionPerformance(args as any);
          case 'test_extension_on_multiple_pages':
            return await this.handleTestExtensionOnMultiplePages(args as any);
          // Quick Debug Tools
          case 'quick_extension_debug':
            return await this.handleQuickExtensionDebug(args as any);
          case 'quick_performance_check':
            return await this.handleQuickPerformanceCheck(args as any);
          // HAR Export Tool
          case 'export_extension_network_har':
            return await this.handleExportExtensionNetworkHAR(args as any);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        log(`❌ [Mutex] Tool '${request.params.name}' failed:`, error);
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        log(`🔓 [Mutex] Tool '${request.params.name}' released lock (${duration}ms)`);
        guard.dispose();
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
    return { content: [{ type: 'text', text: JSON.stringify(tabs) }] };
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
    const result = await this.extensionHandler.listExtensions(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleGetExtensionLogs(args: any) {
    const result = await this.extensionHandler.getExtensionLogs(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleInjectContentScript(args: any) {
    const result = await this.extensionHandler.injectContentScript(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleContentScriptStatus(args: any) {
    const result = await this.extensionHandler.contentScriptStatus(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleListExtensionContexts(args: any) {
    const result = await this.extensionHandler.listExtensionContexts(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleSwitchExtensionContext(args: any) {
    const result = await this.extensionHandler.switchExtensionContext(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleInspectExtensionStorage(args: any) {
    const result = await this.extensionHandler.inspectExtensionStorage(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  // ===== Week 3 高级调试功能处理器 =====

  public async handleMonitorExtensionMessages(args: any) {
    const result = await this.extensionHandler.monitorExtensionMessages(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleTrackExtensionAPICalls(args: any) {
    const result = await this.extensionHandler.trackExtensionAPICalls(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  public async handleTestExtensionOnMultiplePages(args: any) {
    const result = await this.extensionHandler.testExtensionOnMultiplePages(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  // ===== Phase 1 性能分析功能处理器 =====

  public async handleTrackExtensionNetwork(args: any) {
    const result = await this.extensionHandler.trackExtensionNetwork(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleAnalyzeExtensionPerformance(args: any) {
    const result = await this.extensionHandler.analyzeExtensionPerformance(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }

  // ===== 快捷调试工具处理器 =====

  public async handleQuickExtensionDebug(args: any) {
    const result = await this.extensionHandler.quickExtensionDebug(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleQuickPerformanceCheck(args: any) {
    const result = await this.extensionHandler.quickPerformanceCheck(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleExportExtensionNetworkHAR(args: any) {
    const result = await this.extensionHandler.exportExtensionNetworkHAR(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
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
