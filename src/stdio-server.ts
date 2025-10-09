#!/usr/bin/env node
/**
 * Simplified Chrome Debug MCP Server for Stdio Transport
 * 
 * This is a streamlined version focused solely on stdio transport,
 * removing HTTP/SSE complexities and following Chrome DevTools MCP design patterns.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ChromeManager } from './managers/ChromeManager.js';
import { PageManager } from './managers/PageManager.js';
import { InteractionHandler } from './handlers/InteractionHandler.js';
import { EvaluationHandler } from './handlers/EvaluationHandler.js';
import { ExtensionHandler } from './handlers/ExtensionHandler.js';
import { Mutex } from './utils/Mutex.js';
import { parseArguments, logStartupMessage, type CLIOptions } from './utils/cli.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[StdioServer]', ...args);

/**
 * Simplified Chrome Debug MCP Server for Stdio-only use
 */
class ChromeDebugStdioServer {
  private server: Server;
  private toolMutex: Mutex;
  
  // Core components
  private chromeManager: ChromeManager;
  private pageManager: PageManager;
  private interactionHandler: InteractionHandler;
  private evaluationHandler: EvaluationHandler;
  private extensionHandler: ExtensionHandler;
  
  private options: CLIOptions;

  constructor(options: CLIOptions) {
    this.options = options;
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'chrome-debug-stdio',
        version: '2.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tool mutex for concurrent access protection
    this.toolMutex = new Mutex();
    
    // Initialize core components
    this.chromeManager = new ChromeManager();
    this.pageManager = new PageManager();
    this.interactionHandler = new InteractionHandler(this.pageManager);
    this.evaluationHandler = new EvaluationHandler(this.pageManager);
    this.extensionHandler = new ExtensionHandler(this.chromeManager, this.pageManager);

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // Register core tools with simplified schema
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: 'attach_to_chrome',
          description: 'Connect to existing Chrome instance with enhanced stability',
          inputSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', default: 'localhost' },
              port: { type: 'number', default: 9222 }
            }
          }
        },
        {
          name: 'list_extensions',
          description: 'List installed Chrome extensions with caching',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'evaluate',
          description: 'Execute JavaScript in current page context',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string' }
            },
            required: ['expression']
          }
        }
      ]
    }));

    // Tool execution with mutex protection
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const guard = await this.toolMutex.acquire();
      const startTime = Date.now();
      
      try {
        log(`🔒 [Mutex] Tool '${request.params.name}' acquired lock`);
        
        const args = request.params.arguments || {};
        
        switch (request.params.name) {
          case 'attach_to_chrome':
            const result = await this.chromeManager.attachToChrome(args);
            const browser = this.chromeManager.getBrowser();
            if (browser) {
              this.pageManager.setBrowser(browser);
            }
            return { content: [{ type: 'text', text: result }] };
            
          case 'list_extensions':
            return await this.extensionHandler.listExtensions(args);
            
          case 'evaluate':
            return await this.evaluationHandler.evaluate(args);
            
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
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

  async start(): Promise<void> {
    try {
      log('🚀 Starting simplified stdio server...');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      log('✅ Stdio server connected with enhanced features');
      log('🎯 Features: Mutex protection, 10s timeout, Target filtering');
      
    } catch (error) {
      log('❌ Failed to start stdio server:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.chromeManager.getCdpClient()) {
        await this.chromeManager.getCdpClient()?.close();
      }
      log('✅ Stdio server cleanup completed');
    } catch (error) {
      log('⚠️  Error during cleanup:', error);
    }
  }
}

// Main execution
async function main() {
  const version = '2.1.0';
  const options = parseArguments(version);
  
  // Force stdio transport for this server
  options.transport = 'stdio';
  
  logStartupMessage(options, version);
  
  const server = new ChromeDebugStdioServer(options);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[Main] Received SIGINT, shutting down...');
    await server.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[Main] Received SIGTERM, shutting down...');
    await server.cleanup();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('[Main] Failed to start server:', error);
    await server.cleanup();
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ChromeDebugStdioServer };
