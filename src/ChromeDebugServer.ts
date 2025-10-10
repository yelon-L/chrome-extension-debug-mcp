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
  InitializeRequestSchema,
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
import { ExtensionResponse } from './utils/ExtensionResponse.js';
import { DOMSnapshotHandler } from './handlers/DOMSnapshotHandler.js';
import { WaitForHelper } from './utils/WaitForHelper.js';

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
import { SuggestionEngine } from './utils/SuggestionEngine.js';
import { MetricsCollector } from './utils/MetricsCollector.js';
import { MetricsPersistence } from './utils/MetricsPersistence.js';

// Import tool definitions
import { quickDebugTools } from './tools/quick-debug-tools.js';
import { harTools } from './tools/har-tools.js';

// Import configurations
import { TOOL_RESPONSE_CONFIGS, getToolConfig } from './configs/tool-response-configs.js';

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

  // VIP: Suggestion Engine & Metrics
  private suggestionEngine: SuggestionEngine;
  private metricsCollector: MetricsCollector;
  private metricsPersistence: MetricsPersistence;

  // Architecture Upgrade: Snapshot & Auto-wait
  private snapshotHandler: DOMSnapshotHandler;
  private waitForHelper?: WaitForHelper;

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
    
    // Phase 2.1: Initialize Context
    this.mcpContext = new McpContext();
    
    // VIP: Initialize Suggestion Engine & Metrics
    this.suggestionEngine = new SuggestionEngine();
    this.metricsCollector = new MetricsCollector();
    this.metricsPersistence = new MetricsPersistence();

    // Architecture Upgrade: Initialize Snapshot Handler first (needed by UID Handler)
    this.snapshotHandler = new DOMSnapshotHandler();
    
    // Phase 2.1: Initialize UID Handler with snapshotHandler
    this.uidHandler = new UIDInteractionHandler(this.pageManager, this.mcpContext, this.snapshotHandler);
    
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
    // Handler for initialization (required by MCP protocol)
    this.server.setRequestHandler(InitializeRequestSchema, async () => ({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'chrome-extension-debug-mcp',
        version: '4.0.0',
      },
    }));

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
    return await this.buildToolResponse('get_console_logs', logs, 'list');
  }

  public async handleEvaluate(args: EvaluateArgs) {
    return await this.evaluationHandler.evaluate(args);
  }

  public async handleClick(args: ClickArgs) {
    return this.executeToolWithResponse('click', async (response) => {
      try {
        const page = this.pageManager.getCurrentPage();
        
        // Execute click
        await this.interactionHandler.click(args);
        
        // TODO: WaitForHelper integration (needs protocolTimeout adjustment)
        // Phase 1.5: Optimize WaitForHelper to avoid protocol timeouts
        // const waitHelper = WaitForHelper.create(page);
        // await waitHelper.waitForEventsAfterAction(...)
        
        // Add small delay to allow page to settle
        if (page) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        response.appendLine(`✅ Successfully clicked: ${args.selector}`);
        response.setIncludeSnapshot(true);  // Auto-attach new snapshot
        response.setIncludeTabs(true);       // Auto-attach tabs
      } catch (error) {
        response.appendLine(`❌ Click failed: ${error.message}`);
        throw error;
      }
    });
  }

  public async handleType(args: TypeArgs) {
    return this.executeToolWithResponse('type', async (response) => {
      await this.interactionHandler.type(args);
      response.appendLine(`✅ Typed text into: ${args.selector}`);
      response.setIncludeTabs(true);
    });
  }

  public async handleScreenshot(args: ScreenshotArgs) {
    return this.executeToolWithResponse('screenshot', async (response) => {
      const result = await this.interactionHandler.screenshot(args);
      // Screenshot returns base64 image, keep original format
      response.appendLine('Screenshot captured successfully');
      if (result.content && result.content[0]) {
        response.appendLine('```');
        response.appendLine(result.content[0].text);
        response.appendLine('```');
      }
      response.setIncludeTabs(true);
    });
  }

  public async handleListTabs() {
    return this.executeToolWithResponse('list_tabs', async (response) => {
      const tabs = await this.pageManager.listTabs();
      response.appendLine(`Found ${tabs.length} tab(s)`);
      response.setIncludeTabs(true);  // Auto-attach tabs list
    });
  }

  public async handleNewTab(args: NewTabArgs) {
    return this.executeToolWithResponse('new_tab', async (response) => {
      const result = await this.pageManager.createNewTab(args.url);
      response.appendLine(`✅ New tab created`);
      response.appendLine(`Tab ID: ${result.id}`);
      response.appendLine(`URL: ${result.url}`);
      response.setIncludeTabs(true);  // Show updated tabs list
    });
  }

  public async handleSwitchTab(args: SwitchTabArgs) {
    return this.executeToolWithResponse('switch_tab', async (response) => {
      const result = await this.pageManager.switchToTab(args.tabId);
      response.appendLine(`✅ Switched to tab ${args.tabId}`);
      response.appendLine(result.message);
      response.setIncludeTabs(true);  // Show current tabs
    });
  }

  public async handleCloseTab(args: CloseTabArgs) {
    return this.executeToolWithResponse('close_tab', async (response) => {
      await this.pageManager.closeTab(args.tabId);
      response.appendLine(`✅ Closed tab ${args.tabId}`);
      response.setIncludeTabs(true);  // Show remaining tabs
    });
  }

  public async handleListExtensions(args: any) {
    return this.executeToolWithResponse('list_extensions', async (response) => {
      const extensions = await this.extensionHandler.listExtensions(args);
      
      if (extensions.length === 0) {
        response.appendLine('No extensions found');
      } else {
        response.appendLine(`Found ${extensions.length} extension(s):`);
        for (const ext of extensions) {
          const status = ext.enabled ? '✅' : '⚠️';
          response.appendLine(`${status} ${ext.name} (${ext.version}) - ${ext.id}`);
        }
      }
      
      response.setIncludeTabs(true);  // Auto-attach tabs list
      
      // Auto-generate suggestions
      if (extensions.length > 0) {
        const firstExtension = extensions[0];
        response.addSuggestions([
          {
            priority: 'HIGH',
            action: 'Check extension logs for errors',
            toolName: 'get_extension_logs',
            args: { extensionId: firstExtension.id },
            reason: 'Identify potential issues',
            estimatedImpact: 'High'
          },
          {
            priority: 'MEDIUM',
            action: 'Inspect extension storage',
            toolName: 'inspect_extension_storage',
            args: { extensionId: firstExtension.id },
            reason: 'View stored data',
            estimatedImpact: 'Medium'
          }
        ]);
      }
    });
  }

  public async handleGetExtensionLogs(args: any) {
    return this.executeToolWithResponse('get_extension_logs', async (response) => {
      const result = await this.extensionHandler.getExtensionLogs(args);
      
      if (result.logs && Array.isArray(result.logs)) {
        response.appendLine(`Found ${result.logs.length} log(s)`);
        result.logs.slice(0, 10).forEach((log: any) => {
          response.appendLine(`[${log.level}] ${log.source}: ${log.message}`);
        });
        if (result.logs.length > 10) {
          response.appendLine(`... and ${result.logs.length - 10} more logs`);
        }
      } else {
        response.appendLine('No logs found');
      }
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
      response.setIncludeTabs(true);
    });
  }

  public async handleInjectContentScript(args: any) {
    return this.executeToolWithResponse('inject_content_script', async (response) => {
      const result = await this.extensionHandler.injectContentScript(args);
      response.appendLine(result.success ? '✅ Content script injected' : '❌ Injection failed');
      if (result.message) response.appendLine(result.message);
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
      response.setIncludeTabs(true);
    });
  }

  public async handleContentScriptStatus(args: any) {
    return this.executeToolWithResponse('content_script_status', async (response) => {
      const result = await this.extensionHandler.contentScriptStatus(args);
      
      response.appendLine(`Extension: ${args.extensionId}`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
      response.setIncludeTabs(true);
    });
  }

  public async handleListExtensionContexts(args: any) {
    return this.executeToolWithResponse('list_extension_contexts', async (response) => {
      const result = await this.extensionHandler.listExtensionContexts(args);
      
      response.appendLine('Extension Contexts:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleSwitchExtensionContext(args: any) {
    return this.executeToolWithResponse('switch_extension_context', async (response) => {
      const result = await this.extensionHandler.switchExtensionContext(args);
      response.appendLine(result.success ? `✅ Switched to ${args.contextType}` : '❌ Switch failed');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleInspectExtensionStorage(args: any) {
    return this.executeToolWithResponse('inspect_extension_storage', async (response) => {
      const result = await this.extensionHandler.inspectExtensionStorage(args);
      
      response.appendLine('Extension Storage:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== Week 3 高级调试功能处理器 =====

  public async handleMonitorExtensionMessages(args: any) {
    return this.executeToolWithResponse('monitor_extension_messages', async (response) => {
      const result = await this.extensionHandler.monitorExtensionMessages(args);
      
      response.appendLine(`Monitored ${args.duration || 30000}ms`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleTrackExtensionAPICalls(args: any) {
    return this.executeToolWithResponse('track_extension_api_calls', async (response) => {
      const result = await this.extensionHandler.trackExtensionAPICalls(args);
      
      response.appendLine(`Tracked ${args.duration || 30000}ms`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleTestExtensionOnMultiplePages(args: any) {
    return this.executeToolWithResponse('test_extension_on_multiple_pages', async (response) => {
      const result = await this.extensionHandler.testExtensionOnMultiplePages(args);
      
      response.appendLine(`Tested on ${args.testUrls.length} page(s)`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== Phase 1 性能分析功能处理器 =====

  public async handleTrackExtensionNetwork(args: any) {
    return this.executeToolWithResponse('track_extension_network', async (response) => {
      const result = await this.extensionHandler.trackExtensionNetwork(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // Phase 1.3: Network Monitoring Enhancement Handlers
  public async handleListExtensionRequests(args: any) {
    return this.executeToolWithResponse('list_extension_requests', async (response) => {
      const result = this.extensionHandler.listExtensionRequests(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleGetExtensionRequestDetails(args: any) {
    return this.executeToolWithResponse('get_extension_request_details', async (response) => {
      const result = this.extensionHandler.getExtensionRequestDetails(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleExportExtensionNetworkHAR(args: any) {
    return this.executeToolWithResponse('export_extension_network_har', async (response) => {
      const result = await this.extensionHandler.exportExtensionNetworkHAR(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleAnalyzeExtensionNetwork(args: any) {
    return this.executeToolWithResponse('analyze_extension_network', async (response) => {
      const result = this.extensionHandler.analyzeExtensionNetwork(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleAnalyzeExtensionPerformance(args: any) {
    return this.executeToolWithResponse('analyze_extension_performance', async (response) => {
      const result = await this.extensionHandler.analyzeExtensionPerformance(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handlePerformanceGetInsights(args: { insightName: string }) {
    return this.executeToolWithResponse('performance_get_insights', async (response) => {
      const result = await this.extensionHandler.getPerformanceInsight(args.insightName);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
    });
  }

  public async handlePerformanceListInsights(args: any) {
    return this.executeToolWithResponse('performance_list_insights', async (response) => {
      const result = await this.extensionHandler.listPerformanceInsights();
      response.appendLine('```json');
      response.appendLine(JSON.stringify({ insights: result }, null, 2));
      response.appendLine('```');
    });
  }

  // ===== Phase 1.2: Emulation工具处理器 =====

  public async handleEmulateCPU(args: { rate: number; extensionId?: string }) {
    return this.executeToolWithResponse('emulate_cpu', async (response) => {
      const result = await this.extensionHandler.emulateCPU(args);
      response.appendLine(result.success ? `✅ CPU throttle: ${args.rate}x` : `❌ CPU emulation failed`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
    });
  }

  public async handleEmulateNetwork(args: { condition: any; extensionId?: string }) {
    return this.executeToolWithResponse('emulate_network', async (response) => {
      const result = await this.extensionHandler.emulateNetwork(args);
      response.appendLine(result.success ? `✅ Network: ${JSON.stringify(args.condition)}` : `❌ Network emulation failed`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
    });
  }

  public async handleTestExtensionConditions(args: {
    extensionId: string;
    testUrl: string;
    timeout?: number;
  }) {
    return this.executeToolWithResponse('test_extension_conditions', async (response) => {
      const result = await this.extensionHandler.testUnderConditions(args);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== Phase 2.1: DOM Snapshot & UID Locator Handlers =====

  public async handleTakeSnapshot(args: any) {
    return this.executeToolWithResponse('take_snapshot', async (response) => {
      const result = await this.uidHandler.takeSnapshot(args);
      
      if (result.success && result.textRepresentation) {
        response.appendLine(`✅ Snapshot captured (${result.elementCount || 0} elements)`);
        response.appendLine('');
        response.appendLine('## Page Snapshot');
        response.appendLine(result.textRepresentation);
        response.appendLine('');
        response.appendLine('**Tip**: Use UIDs to interact with elements:');
        response.appendLine('- `click_by_uid(uid="1_5")`');
        response.appendLine('- `fill_by_uid(uid="1_5", value="text")`');
        response.appendLine('- `hover_by_uid(uid="1_5")`');
      } else {
        response.appendLine('❌ Snapshot failed');
        if (result.error) response.appendLine(`Error: ${result.error}`);
      }
      
      response.setIncludeTabs(true);
    });
  }

  public async handleClickByUid(args: any) {
    return this.executeToolWithResponse('click_by_uid', async (response) => {
      const result = await this.uidHandler.clickByUid(args);
      response.appendLine(result.success ? `✅ Clicked UID: ${args.uid}` : `❌ Click failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleFillByUid(args: any) {
    return this.executeToolWithResponse('fill_by_uid', async (response) => {
      const result = await this.uidHandler.fillByUid(args);
      response.appendLine(result.success ? `✅ Filled UID: ${args.uid}` : `❌ Fill failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleHoverByUid(args: any) {
    return this.executeToolWithResponse('hover_by_uid', async (response) => {
      const result = await this.uidHandler.hoverByUid(args);
      response.appendLine(result.success ? `✅ Hovered UID: ${args.uid}` : `❌ Hover failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  // ===== Phase 2.2: Advanced Interaction Handlers =====

  public async handleHoverElement(args: any) {
    return this.executeToolWithResponse('hover_element', async (response) => {
      const result = await this.advancedInteractionHandler.hoverElement(args);
      response.appendLine(result.success ? `✅ Hovered: ${args.selector}` : `❌ Hover failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleDragElement(args: any) {
    return this.executeToolWithResponse('drag_element', async (response) => {
      const result = await this.advancedInteractionHandler.dragElement(args);
      response.appendLine(result.success ? `✅ Dragged: ${args.selector}` : `❌ Drag failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleFillForm(args: any) {
    return this.executeToolWithResponse('fill_form', async (response) => {
      const result = await this.advancedInteractionHandler.fillForm(args);
      response.appendLine(result.success ? `✅ Filled ${result.filledCount || 0} field(s)` : `❌ Fill failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleUploadFile(args: any) {
    return this.executeToolWithResponse('upload_file', async (response) => {
      const result = await this.advancedInteractionHandler.uploadFile(args);
      response.appendLine(result.success ? `✅ Uploaded: ${args.filePath}` : `❌ Upload failed`);
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleDialog(args: any) {
    return this.executeToolWithResponse('handle_dialog', async (response) => {
      const result = await this.advancedInteractionHandler.handleDialog(args);
      response.appendLine(`Dialog ${args.action}:`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  // ===== Phase 2.3: Smart Wait Handlers =====

  public async handleWaitForElement(args: any) {
    return this.executeToolWithResponse('wait_for_element', async (response) => {
      const result = await this.waitHelper.waitForElement(args);
      response.appendLine(result.success ? `✅ Element found (${result.strategy})` : `❌ Wait failed`);
      response.appendLine(`Duration: ${result.duration}ms`);
      if (result.timedOut) response.appendLine('⚠️ Timed out');
      if (result.error) response.appendLine(`Error: ${result.error}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleWaitForExtensionReady(args: any) {
    return this.executeToolWithResponse('wait_for_extension_ready', async (response) => {
      const result = await this.waitHelper.waitForExtensionReady(args);
      response.appendLine(result.success ? `✅ Extension ready` : `❌ Extension not ready`);
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== Phase 3: Developer Tools Handlers =====

  public async handleCheckExtensionPermissions(args: any) {
    return this.executeToolWithResponse('check_extension_permissions', async (response) => {
      const result = await this.developerToolsHandler.checkExtensionPermissions(args);
      response.appendLine('🔐 Extension Permissions Analysis:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleAuditExtensionSecurity(args: any) {
    return this.executeToolWithResponse('audit_extension_security', async (response) => {
      const result = await this.developerToolsHandler.auditExtensionSecurity(args);
      response.appendLine('🛡️ Extension Security Audit:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  public async handleCheckExtensionUpdates(args: any) {
    return this.executeToolWithResponse('check_extension_updates', async (response) => {
      const result = await this.developerToolsHandler.checkExtensionUpdates(args);
      response.appendLine('🔄 Extension Updates Check:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== 快捷调试工具处理器 =====

  public async handleQuickExtensionDebug(args: any) {
    return this.executeToolWithResponse('quick_extension_debug', async (response) => {
      const result = await this.extensionHandler.quickExtensionDebug(args);
      response.appendLine('🚀 Quick Extension Debug Results:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
      response.setIncludeTabs(true);
    });
  }

  public async handleQuickPerformanceCheck(args: any) {
    return this.executeToolWithResponse('quick_performance_check', async (response) => {
      const result = await this.extensionHandler.quickPerformanceCheck(args);
      response.appendLine('⚡ Quick Performance Check Results:');
      response.appendLine('```json');
      response.appendLine(JSON.stringify(result, null, 2));
      response.appendLine('```');
      response.setIncludeExtensionStatusAuto(true, args.extensionId);
    });
  }

  // ===== VIP: Response Builder & Metrics Integration =====

  /**
   * Architecture Upgrade: Unified tool execution with Response Builder
   * This is the chrome-devtools-mcp pattern
   */
  private async executeToolWithResponse(
    toolName: string,
    handler: (response: ExtensionResponse) => Promise<void>
  ): Promise<any> {
    const startTime = Date.now();
    const response = new ExtensionResponse(toolName);
    
    try {
      // 1. Execute tool logic
      await handler(response);
      
      // 2. Auto-collect context and format
      const result = await response.handle(toolName, {
        pageManager: this.pageManager,
        extensionHandler: this.extensionHandler,
        snapshotHandler: this.snapshotHandler,
        chromeManager: this.chromeManager
      });
      
      // 3. Record metrics
      this.metricsCollector.recordToolUsage(toolName, startTime, true);
      
      return result;
    } catch (error) {
      this.metricsCollector.recordToolUsage(toolName, startTime, false);
      response.appendLine(`Error: ${error.message}`);
      return await response.handle(toolName, {
        pageManager: this.pageManager,
        extensionHandler: this.extensionHandler,
        snapshotHandler: this.snapshotHandler,
        chromeManager: this.chromeManager
      });
    }
  }

  /**
   * Build tool response with configuration-driven context and suggestions
   */
  private async buildToolResponse(
    toolName: string,
    data: any,
    format: 'list' | 'detailed' | 'analysis' | 'json' = 'json',
    context?: { extensionId?: string }
  ): Promise<any> {
    const startTime = Date.now();
    const config = getToolConfig(toolName);
    
    // If no config or not using Response Builder, return JSON
    if (!config || !config.useResponseBuilder) {
      this.metricsCollector.recordToolUsage(toolName, startTime, true);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    
    const response = new ExtensionResponse();
    
    // Format main content
    await this.formatToolData(response, toolName, data, format);
    
    // Apply context configuration
    await response.applyContextConfig(config, {
      mcpContext: this.mcpContext,
      pageManager: this.pageManager,
      extensionHandler: this.extensionHandler
    });
    
    // Generate and apply suggestions
    if (config.suggestionRules.enabled) {
      const suggestions = await this.suggestionEngine.generateSuggestions(
        toolName,
        data,
        {
          extensionId: context?.extensionId,
          toolResult: data
        }
      );
      
      response.addSuggestions(suggestions);
      
      // Record suggestions for metrics
      this.metricsCollector.recordSuggestionsGiven(
        toolName,
        suggestions.map(s => s.toolName)
      );
    }
    
    // Record metrics
    if (config.metrics.trackUsage) {
      this.metricsCollector.recordToolUsage(toolName, startTime, true);
    }
    
    return await response.build(toolName, this.mcpContext);
  }

  /**
   * Format tool data into response
   */
  private async formatToolData(
    response: ExtensionResponse,
    toolName: string,
    data: any,
    format: 'list' | 'detailed' | 'analysis' | 'json'
  ): Promise<void> {
    if (format === 'json') {
      response.appendLine('```json');
      response.appendLine(JSON.stringify(data, null, 2));
      response.appendLine('```');
      return;
    }
    
    // List format
    if (format === 'list' && Array.isArray(data)) {
      response.appendLine(`Found ${data.length} item(s):`);
      response.appendLine('');
      data.forEach((item, i) => {
        if (typeof item === 'object') {
          const key = item.name || item.id || item.title || item.url || `Item ${i + 1}`;
          response.appendLine(`${i + 1}. ${key}`);
        } else {
          response.appendLine(`${i + 1}. ${item}`);
        }
      });
      return;
    }
    
    // Detailed format
    if (format === 'detailed') {
      if (typeof data === 'object' && !Array.isArray(data)) {
        for (const [key, value] of Object.entries(data)) {
          response.appendLine(`**${key}**: ${JSON.stringify(value)}`);
        }
      } else {
        response.appendLine(JSON.stringify(data, null, 2));
      }
      return;
    }
    
    // Analysis format
    if (format === 'analysis') {
      response.appendLine('## Analysis Results');
      response.appendLine('');
      if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          response.appendLine(`### ${key}`);
          response.appendLine(JSON.stringify(value, null, 2));
          response.appendLine('');
        }
      }
      return;
    }
  }

  /**
   * Save metrics on cleanup
   */
  private async saveMetricsOnCleanup(): Promise<void> {
    try {
      const metrics = this.metricsCollector.exportMetrics();
      await this.metricsPersistence.appendMetrics(metrics);
      console.log('[ChromeDebugServer] Metrics saved successfully');
    } catch (error) {
      console.error('[ChromeDebugServer] Failed to save metrics:', error);
    }
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

  // ===== Phase 2: New Tools Handlers =====

  public async handleWaitFor(args: { text: string; timeout?: number }) {
    return this.executeToolWithResponse('wait_for', async (response) => {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        throw new Error('No active page');
      }

      const timeout = args.timeout || 5000;
      
      try {
        // Use Puppeteer's built-in waitForFunction with race conditions
        await page.waitForFunction(
          (text) => {
            // Search for text in aria-label or text content
            const elements = Array.from(document.querySelectorAll('*'));
            for (const el of elements) {
              if (el.getAttribute('aria-label')?.includes(text) ||
                  el.textContent?.includes(text)) {
                return true;
              }
            }
            return false;
          },
          { timeout },
          args.text
        );

        response.appendLine(`✅ Found text: "${args.text}"`);
        response.setIncludeSnapshot(true);
        response.setIncludeTabs(true);
      } catch (error) {
        response.appendLine(`❌ Timeout waiting for: "${args.text}"`);
        throw error;
      }
    });
  }

  public async handleNavigatePageHistory(args: { direction: 'back' | 'forward'; steps?: number }) {
    return this.executeToolWithResponse('navigate_page_history', async (response) => {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        throw new Error('No active page');
      }

      const steps = args.steps || 1;
      
      for (let i = 0; i < steps; i++) {
        if (args.direction === 'back') {
          await page.goBack({ waitUntil: 'networkidle2' });
        } else {
          await page.goForward({ waitUntil: 'networkidle2' });
        }
      }

      response.appendLine(`✅ Navigated ${args.direction} ${steps} step(s)`);
      response.appendLine(`Current URL: ${page.url()}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleResizePage(args: { width?: number; height?: number; preset?: string }) {
    return this.executeToolWithResponse('resize_page', async (response) => {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        throw new Error('No active page');
      }

      let width = args.width;
      let height = args.height;

      // Handle presets
      if (args.preset) {
        const presets: Record<string, { width: number; height: number }> = {
          mobile: { width: 375, height: 667 },
          tablet: { width: 768, height: 1024 },
          desktop: { width: 1920, height: 1080 },
          fullhd: { width: 1920, height: 1080 },
          '4k': { width: 3840, height: 2160 }
        };
        const preset = presets[args.preset];
        if (preset) {
          width = preset.width;
          height = preset.height;
        }
      }

      if (!width || !height) {
        throw new Error('Must provide width/height or preset');
      }

      await page.setViewport({ width, height });

      response.appendLine(`✅ Viewport resized to ${width}x${height}`);
      if (args.preset) response.appendLine(`Preset: ${args.preset}`);
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  public async handleRunScript(args: { script: string; uid?: string; returnValue?: boolean }) {
    return this.executeToolWithResponse('run_script', async (response) => {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        throw new Error('No active page');
      }

      let result;

      if (args.uid) {
        // Get element by UID and pass to script
        const snapshot = this.mcpContext.getCurrentSnapshot();
        if (!snapshot || !snapshot.uidMap) {
          throw new Error('No snapshot available. Run take_snapshot first.');
        }

        const elementHandle = snapshot.uidMap.get(args.uid);
        if (!elementHandle) {
          throw new Error(`Element with UID ${args.uid} not found`);
        }

        result = await page.evaluate(
          (el, script) => {
            const element = el;
            return eval(script);
          },
          elementHandle,
          args.script
        );
      } else {
        result = await page.evaluate(args.script);
      }

      response.appendLine('✅ Script executed');
      if (args.returnValue !== false && result !== undefined) {
        response.appendLine('');
        response.appendLine('**Result:**');
        response.appendLine('```json');
        response.appendLine(JSON.stringify(result, null, 2));
        response.appendLine('```');
      }
      response.setIncludeSnapshot(true);
      response.setIncludeTabs(true);
    });
  }

  /**
   * Performs cleanup when shutting down the server.
   */
  async cleanup() {
    // Save metrics before cleanup
    await this.saveMetricsOnCleanup();
    
    await this.chromeManager.cleanup();
    await this.pageManager.cleanup();
    
    if (this.remoteTransport) {
      await this.remoteTransport.stop();
    }
    
    await this.server.close();
  }
}
