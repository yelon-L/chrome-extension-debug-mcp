#!/usr/bin/env node
/**
 * Simplified Chrome Debug MCP Server for Stdio Transport
 *
 * This is a streamlined version focused solely on stdio transport,
 * removing HTTP/SSE complexities and following Chrome DevTools MCP design patterns.
 */
import { type CLIOptions } from './utils/cli.js';
/**
 * Simplified Chrome Debug MCP Server for Stdio-only use
 */
declare class ChromeDebugStdioServer {
    private server;
    private toolMutex;
    private chromeManager;
    private pageManager;
    private interactionHandler;
    private evaluationHandler;
    private extensionHandler;
    private options;
    constructor(options: CLIOptions);
    private setupToolHandlers;
    start(): Promise<void>;
    cleanup(): Promise<void>;
}
export { ChromeDebugStdioServer };
//# sourceMappingURL=stdio-server.d.ts.map