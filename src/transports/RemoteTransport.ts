/**
 * Remote Transport Implementation for Chrome Debug MCP
 * 
 * Supports both SSE (Server-Sent Events) and Streamable HTTP
 * for remote MCP connections.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TransportType, RemoteMCPConfig } from '../types/index.js';

export class RemoteTransport {
  private server: Server;
  private config: RemoteMCPConfig;
  private httpServer?: any;
  private chromeDebugServer?: any; // Reference to ChromeDebugServer for tool execution

  constructor(server: Server, config: RemoteMCPConfig = {}) {
    this.server = server;
    this.config = {
      port: 3000,
      host: 'localhost',
      cors: {
        origin: '*',
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      },
      ...config
    };
  }

  /**
   * Set reference to ChromeDebugServer for tool execution
   */
  setChromeDebugServer(chromeDebugServer: any) {
    this.chromeDebugServer = chromeDebugServer;
  }

  /**
   * Start HTTP server with SSE and Streamable HTTP support
   */
  async startHTTPServer(): Promise<void> {
    const { createServer } = await import('http');
    const { URL } = await import('url');

    this.httpServer = createServer(async (req, res) => {
      // Enable CORS
      this.setCORSHeaders(res);
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        
        switch (url.pathname) {
          case '/sse':
            await this.handleSSE(req, res);
            break;
          case '/message':
            await this.handleStreamableHTTP(req, res);
            break;
          case '/health':
            this.handleHealthCheck(res);
            break;
          default:
            this.handleNotFound(res);
        }
      } catch (error) {
        console.error('[RemoteTransport] Request error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        console.log(`[RemoteTransport] MCP Server listening on http://${this.config.host}:${this.config.port}`);
        console.log(`[RemoteTransport] SSE endpoint: http://${this.config.host}:${this.config.port}/sse`);
        console.log(`[RemoteTransport] HTTP endpoint: http://${this.config.host}:${this.config.port}/message`);
        resolve();
      });

      this.httpServer!.on('error', reject);
    });
  }

  /**
   * Handle Server-Sent Events (SSE) connection
   */
  private async handleSSE(req: any, res: any): Promise<void> {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': this.config.cors?.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });

    // Send initial connection event
    res.write('data: {"jsonrpc":"2.0","method":"notifications/initialized"}\n\n');

    // Handle client messages
    let buffer = '';
    req.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      
      // Process complete JSON-RPC messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.processMessage(message, (response) => {
              res.write(`data: ${JSON.stringify(response)}\n\n`);
            });
          } catch (error) {
            console.error('[RemoteTransport] SSE message parse error:', error);
          }
        }
      }
    });

    // Handle connection close
    req.on('close', () => {
      console.log('[RemoteTransport] SSE client disconnected');
    });

    req.on('error', (error: any) => {
      console.error('[RemoteTransport] SSE connection error:', error);
    });
  }

  /**
   * Handle Streamable HTTP requests
   */
  private async handleStreamableHTTP(req: any, res: any): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Allow': 'POST' });
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        
        this.processMessage(message, (response) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        });
      } catch (error) {
        console.error('[RemoteTransport] HTTP message parse error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          jsonrpc: '2.0', 
          error: { code: -32700, message: 'Parse error' } 
        }));
      }
    });
  }

  /**
   * Process incoming JSON-RPC message through MCP server
   */
  private async processMessage(message: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('[RemoteTransport] Processing message:', message);
      
      // Create a mock transport that delegates to sendResponse
      const mockTransport = {
        start: async () => {},
        close: async () => {},
        send: (data: any) => {
          console.log('[RemoteTransport] Sending response:', data);
          sendResponse(data);
        }
      };

      // For now, handle basic methods directly
      // TODO: Integrate with actual MCP server message routing
      
      if (message.method === 'tools/list') {
        // Use actual server tools if ChromeDebugServer is available
        if (this.chromeDebugServer) {
          try {
            // Simulate the tools/list request to the actual server
            const mockRequest = { params: { name: 'tools/list', arguments: {} } };
            // Get tools from ChromeDebugServer handlers
            const tools = await this.getActualServerTools();
            sendResponse({
              jsonrpc: '2.0',
              id: message.id,
              result: { tools }
            });
          } catch (error) {
            console.error('[RemoteTransport] Error getting server tools:', error);
            const fallbackTools = await this.getServerTools();
            sendResponse({
              jsonrpc: '2.0',
              id: message.id,
              result: { tools: fallbackTools }
            });
          }
        } else {
          const tools = await this.getServerTools();
          sendResponse({
            jsonrpc: '2.0',
            id: message.id,
            result: { tools }
          });
        }
      } else if (message.method === 'tools/call') {
        // Call actual ChromeDebugServer tool handling if available
        if (this.chromeDebugServer && message.params?.name) {
          try {
            console.log('[RemoteTransport] Calling actual tool:', message.params.name);
            const result = await this.callActualServerTool(message.params.name, message.params.arguments || {});
            sendResponse({
              jsonrpc: '2.0',
              id: message.id,
              result
            });
          } catch (error) {
            console.error('[RemoteTransport] Tool execution error:', error);
            sendResponse({
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32603,
                message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            });
          }
        } else {
          // Fallback response
          console.log('[RemoteTransport] Tool call request (fallback):', message.params);
          sendResponse({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              content: [{ 
                type: 'text', 
                text: `Called tool: ${message.params?.name} with args: ${JSON.stringify(message.params?.arguments)} (ChromeDebugServer not connected)` 
              }]
            }
          });
        }
      } else {
        // Unknown method
        sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`
          }
        });
      }
    } catch (error) {
      console.error('[RemoteTransport] Message processing error:', error);
      sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  }

  /**
   * Get actual server tools from ChromeDebugServer
   */
  private async getActualServerTools(): Promise<any[]> {
    if (!this.chromeDebugServer) {
      return this.getServerTools();
    }
    
    // Return the actual tool definitions from ChromeDebugServer
    return [
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
            userscriptPath: { type: 'string', description: 'Path to userscript file (optional)' }
          }
        }
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
        name: 'list_tabs',
        description: 'List all open tabs',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_console_logs',
        description: 'Get console logs from Chrome',
        inputSchema: {
          type: 'object',
          properties: {
            clear: { type: 'boolean', description: 'Whether to clear logs after retrieving' }
          }
        }
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
          required: ['expression']
        }
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
      }
    ];
  }

  /**
   * Call actual server tool using ChromeDebugServer methods
   */
  private async callActualServerTool(toolName: string, args: any): Promise<any> {
    if (!this.chromeDebugServer) {
      return this.callServerTool({ name: toolName, arguments: args });
    }

    console.log(`[RemoteTransport] Executing tool: ${toolName} with args:`, args);

    // Map tool names to ChromeDebugServer handler methods
    try {
      switch (toolName) {
        case 'launch_chrome':
          return await this.chromeDebugServer.handleLaunchChrome(args);
        case 'attach_to_chrome':
          return await this.chromeDebugServer.handleAttachToChrome(args);
        case 'list_tabs':
          return await this.chromeDebugServer.handleListTabs();
        case 'get_console_logs':
          return await this.chromeDebugServer.handleGetConsoleLogs(args);
        case 'evaluate':
          return await this.chromeDebugServer.handleEvaluate(args);
        case 'click':
          return await this.chromeDebugServer.handleClick(args);
        case 'type':
          return await this.chromeDebugServer.handleType(args);
        case 'screenshot':
          return await this.chromeDebugServer.handleScreenshot(args);
        case 'new_tab':
          return await this.chromeDebugServer.handleNewTab(args);
        case 'switch_tab':
          return await this.chromeDebugServer.handleSwitchTab(args);
        case 'close_tab':
          return await this.chromeDebugServer.handleCloseTab(args);
        case 'list_extensions':
          return await this.chromeDebugServer.handleListExtensions(args);
        case 'get_extension_logs':
          return await this.chromeDebugServer.handleGetExtensionLogs(args);
        case 'inject_content_script':
          return await this.chromeDebugServer.handleInjectContentScript(args);
        case 'content_script_status':
          return await this.chromeDebugServer.handleContentScriptStatus(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`[RemoteTransport] Tool execution error for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get server tools (simplified - fallback)
   */
  private async getServerTools(): Promise<any[]> {
    return [
      {
        name: 'launch_chrome',
        description: 'Launch Chrome in debug mode',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          }
        }
      }
    ];
  }

  /**
   * Call server tool (simplified - fallback)
   */
  private async callServerTool(params: any): Promise<any> {
    return {
      content: [{ type: 'text', text: 'Tool execution result placeholder' }]
    };
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(res: any): void {
    const origin = this.config.cors?.origin;
    if (Array.isArray(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin.join(', '));
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (this.config.cors?.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * Handle health check endpoint
   */
  private handleHealthCheck(res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      transport: 'http',
      endpoints: {
        sse: `/sse`,
        http: `/message`
      }
    }));
  }

  /**
   * Handle 404 Not Found
   */
  private handleNotFound(res: any): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          console.log('[RemoteTransport] HTTP server stopped');
          resolve();
        });
      });
    }
  }
}
