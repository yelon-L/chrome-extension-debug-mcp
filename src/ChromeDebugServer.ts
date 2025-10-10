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
import { UIDInteractionHandler } from './handlers/UIDInteractionHandler.js';
import { AdvancedInteractionHandler } from './handlers/AdvancedInteractionHandler.js';
import { WaitHelper } from './utils/WaitHelper.js';
import { DeveloperToolsHandler } from './handlers/DeveloperToolsHandler.js';
import { McpContext } from './context/McpContext.js';

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
  
  // Phase 2.1: Snapshot & UID Interaction
  private mcpContext: McpContext;
  public uidHandler: UIDInteractionHandler;
  
  // Phase 2.2: Advanced Interaction
  public advancedInteractionHandler: AdvancedInteractionHandler;
  
  // Phase 2.3: Smart Wait
  public waitHelper: WaitHelper;
  
  // Phase 3: Developer Tools
  public developerToolsHandler: DeveloperToolsHandler;

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
    
    // Phase 2.1: Initialize Context and UID Handler
    this.mcpContext = new McpContext();
    this.uidHandler = new UIDInteractionHandler(this.pageManager, this.mcpContext);
    
    // Phase 2.2: Initialize Advanced Interaction Handler
    this.advancedInteractionHandler = new AdvancedInteractionHandler(this.pageManager, this.mcpContext);
    
    // Phase 2.3: Initialize Wait Helper
    this.waitHelper = new WaitHelper(this.pageManager, this.mcpContext);
    
    // Phase 3: Initialize Developer Tools Handler
    this.developerToolsHandler = new DeveloperToolsHandler(this.chromeManager, this.pageManager);

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
        {
          name: 'performance_get_insights',
          description: 'Get specific Performance Insight from the last recorded trace. Available insights: DocumentLatency, LCPBreakdown, CLSCulprits, RenderBlocking, SlowCSSSelector, INPBreakdown, ThirdParties, Viewport',
          inputSchema: {
            type: 'object',
            properties: {
              insightName: {
                type: 'string',
                description: 'Name of the insight to retrieve (e.g., "LCPBreakdown", "DocumentLatency")'
              }
            },
            required: ['insightName']
          }
        },
        {
          name: 'performance_list_insights',
          description: 'List all available Performance Insights from the last recorded trace',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        // Phase 1.2: Device Emulation Tools
        {
          name: 'emulate_cpu',
          description: 'Emulate CPU throttling to test extension performance on slower devices (1x = no throttling, 4x = 4 times slower, up to 20x)',
          inputSchema: {
            type: 'object',
            properties: {
              rate: {
                type: 'number',
                description: 'CPU slowdown multiplier (1-20). 1=no throttling, 4=low-end mobile, 6=very slow device'
              },
              extensionId: {
                type: 'string',
                description: 'Optional: Extension ID for context'
              }
            },
            required: ['rate']
          }
        },
        {
          name: 'emulate_network',
          description: 'Emulate network conditions to test extension under different connection speeds. Supports presets: "Fast 3G", "Slow 3G", "4G", "Offline", "No throttling" or custom conditions',
          inputSchema: {
            type: 'object',
            properties: {
              condition: {
                oneOf: [
                  {
                    type: 'string',
                    enum: ['Fast 3G', 'Slow 3G', '4G', 'Offline', 'No throttling'],
                    description: 'Network condition preset'
                  },
                  {
                    type: 'object',
                    properties: {
                      downloadThroughput: {
                        type: 'number',
                        description: 'Download speed in bytes/second (-1 for unlimited)'
                      },
                      uploadThroughput: {
                        type: 'number',
                        description: 'Upload speed in bytes/second (-1 for unlimited)'
                      },
                      latency: {
                        type: 'number',
                        description: 'Network latency in milliseconds'
                      }
                    },
                    required: ['downloadThroughput', 'uploadThroughput', 'latency']
                  }
                ]
              },
              extensionId: {
                type: 'string',
                description: 'Optional: Extension ID for context'
              }
            },
            required: ['condition']
          }
        },
        {
          name: 'test_extension_conditions',
          description: 'Batch test extension functionality under multiple device/network conditions. Tests 7 predefined conditions: Optimal, Good 4G, Fast 3G, Slow 3G, Slow Device+Poor Network, Offline, CPU Intensive',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to test'
              },
              testUrl: {
                type: 'string',
                description: 'URL to test the extension on'
              },
              timeout: {
                type: 'number',
                description: 'Timeout for each test in milliseconds (default: 30000)'
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
          // Phase 1.3: Network Monitoring Enhancement (4 tools)
          case 'list_extension_requests':
            return await this.handleListExtensionRequests(args as any);
          case 'get_extension_request_details':
            return await this.handleGetExtensionRequestDetails(args as any);
          case 'export_extension_network_har':
            return await this.handleExportExtensionNetworkHAR(args as any);
          case 'analyze_extension_network':
            return await this.handleAnalyzeExtensionNetwork(args as any);
          case 'analyze_extension_performance':
            return await this.handleAnalyzeExtensionPerformance(args as any);
          case 'performance_get_insights':
            return await this.handlePerformanceGetInsights(args as any);
          case 'performance_list_insights':
            return await this.handlePerformanceListInsights(args as any);
          // Phase 1.2: Emulation Tools
          case 'emulate_cpu':
            return await this.handleEmulateCPU(args as any);
          case 'emulate_network':
            return await this.handleEmulateNetwork(args as any);
          case 'test_extension_conditions':
            return await this.handleTestExtensionConditions(args as any);
          case 'test_extension_on_multiple_pages':
            return await this.handleTestExtensionOnMultiplePages(args as any);
          // Phase 2.1: DOM Snapshot & UID Locator Tools
          case 'take_snapshot':
            return await this.handleTakeSnapshot(args as any);
          case 'click_by_uid':
            return await this.handleClickByUid(args as any);
          case 'fill_by_uid':
            return await this.handleFillByUid(args as any);
          case 'hover_by_uid':
            return await this.handleHoverByUid(args as any);
          // Phase 2.2: Advanced Interaction Tools
          case 'hover_element':
            return await this.handleHoverElement(args as any);
          case 'drag_element':
            return await this.handleDragElement(args as any);
          case 'fill_form':
            return await this.handleFillForm(args as any);
          case 'upload_file':
            return await this.handleUploadFile(args as any);
          case 'handle_dialog':
            return await this.handleDialog(args as any);
          // Phase 2.3: Smart Wait Tools
          case 'wait_for_element':
            return await this.handleWaitForElement(args as any);
          case 'wait_for_extension_ready':
            return await this.handleWaitForExtensionReady(args as any);
          // Phase 3: Developer Tools
          case 'check_extension_permissions':
            return await this.handleCheckExtensionPermissions(args as any);
          case 'audit_extension_security':
            return await this.handleAuditExtensionSecurity(args as any);
          case 'check_extension_updates':
            return await this.handleCheckExtensionUpdates(args as any);
          // Quick Debug Tools
          case 'quick_extension_debug':
            return await this.handleQuickExtensionDebug(args as any);
          case 'quick_performance_check':
            return await this.handleQuickPerformanceCheck(args as any);
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

  // Phase 1.3: Network Monitoring Enhancement Handlers
  public async handleListExtensionRequests(args: any) {
    const result = this.extensionHandler.listExtensionRequests(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleGetExtensionRequestDetails(args: any) {
    const result = this.extensionHandler.getExtensionRequestDetails(args);
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

  public async handleAnalyzeExtensionNetwork(args: any) {
    const result = this.extensionHandler.analyzeExtensionNetwork(args);
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

  public async handlePerformanceGetInsights(args: { insightName: string }) {
    const result = await this.extensionHandler.getPerformanceInsight(args.insightName);
    return {
      content: [{ type: 'text', text: result }]
    };
  }

  public async handlePerformanceListInsights(args: any) {
    const result = await this.extensionHandler.listPerformanceInsights();
    return {
      content: [{ type: 'text', text: JSON.stringify({ insights: result }, null, 2) }]
    };
  }

  // ===== Phase 1.2: Emulation工具处理器 =====

  public async handleEmulateCPU(args: { rate: number; extensionId?: string }) {
    const result = await this.extensionHandler.emulateCPU(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleEmulateNetwork(args: { condition: any; extensionId?: string }) {
    const result = await this.extensionHandler.emulateNetwork(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleTestExtensionConditions(args: {
    extensionId: string;
    testUrl: string;
    timeout?: number;
  }) {
    const result = await this.extensionHandler.testUnderConditions(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  // ===== Phase 2.1: DOM Snapshot & UID Locator Handlers =====

  public async handleTakeSnapshot(args: any) {
    const result = await this.uidHandler.takeSnapshot(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleClickByUid(args: any) {
    const result = await this.uidHandler.clickByUid(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleFillByUid(args: any) {
    const result = await this.uidHandler.fillByUid(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleHoverByUid(args: any) {
    const result = await this.uidHandler.hoverByUid(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  // ===== Phase 2.2: Advanced Interaction Handlers =====

  public async handleHoverElement(args: any) {
    const result = await this.advancedInteractionHandler.hoverElement(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleDragElement(args: any) {
    const result = await this.advancedInteractionHandler.dragElement(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleFillForm(args: any) {
    const result = await this.advancedInteractionHandler.fillForm(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleUploadFile(args: any) {
    const result = await this.advancedInteractionHandler.uploadFile(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleDialog(args: any) {
    const result = await this.advancedInteractionHandler.handleDialog(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  // ===== Phase 2.3: Smart Wait Handlers =====

  public async handleWaitForElement(args: any) {
    const result = await this.waitHelper.waitForElement(args);
    return {
      content: [{ type: 'text', text: JSON.stringify({
        success: result.success,
        strategy: result.strategy,
        duration: result.duration,
        timedOut: result.timedOut,
        error: result.error
      }, null, 2) }]
    };
  }

  public async handleWaitForExtensionReady(args: any) {
    const result = await this.waitHelper.waitForExtensionReady(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  // ===== Phase 3: Developer Tools Handlers =====

  public async handleCheckExtensionPermissions(args: any) {
    const result = await this.developerToolsHandler.checkExtensionPermissions(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleAuditExtensionSecurity(args: any) {
    const result = await this.developerToolsHandler.auditExtensionSecurity(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  public async handleCheckExtensionUpdates(args: any) {
    const result = await this.developerToolsHandler.checkExtensionUpdates(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
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
