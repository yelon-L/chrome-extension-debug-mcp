/**
 * Remote Transport Implementation for Chrome Debug MCP
 *
 * Supports both SSE (Server-Sent Events) and Streamable HTTP
 * for remote MCP connections.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { RemoteMCPConfig } from '../types/index.js';
export declare class RemoteTransport {
    private server;
    private config;
    private httpServer?;
    private chromeDebugServer?;
    constructor(server: Server, config?: RemoteMCPConfig);
    /**
     * Set reference to ChromeDebugServer for tool execution
     */
    setChromeDebugServer(chromeDebugServer: any): void;
    /**
     * Start HTTP server with SSE and Streamable HTTP support
     */
    startHTTPServer(): Promise<void>;
    /**
     * Handle Server-Sent Events (SSE) connection
     */
    private handleSSE;
    /**
     * Handle Streamable HTTP requests
     */
    private handleStreamableHTTP;
    /**
     * Process incoming JSON-RPC message through MCP server
     */
    private processMessage;
    /**
     * Get actual server tools from ChromeDebugServer
     */
    private getActualServerTools;
    /**
     * Call actual server tool using ChromeDebugServer methods
     */
    private callActualServerTool;
    /**
     * Get server tools (simplified - fallback)
     */
    private getServerTools;
    /**
     * Call server tool (simplified - fallback)
     */
    private callServerTool;
    /**
     * Set CORS headers
     */
    private setCORSHeaders;
    /**
     * Handle health check endpoint
     */
    private handleHealthCheck;
    /**
     * Handle 404 Not Found
     */
    private handleNotFound;
    /**
     * Stop the HTTP server
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=RemoteTransport.d.ts.map