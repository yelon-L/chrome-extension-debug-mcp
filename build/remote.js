#!/usr/bin/env node
/**
 * Chrome Debug MCP Server - Remote Transport Entry Point
 *
 * This entry point starts the Chrome Debug MCP server with remote transport
 * support (SSE and Streamable HTTP), allowing remote MCP clients to connect.
 *
 * Usage:
 *   npm run start:remote
 *   npm run dev:remote
 *
 * Environment Variables:
 *   - MCP_PORT: Port to listen on (default: 3000)
 *   - MCP_HOST: Host to bind to (default: localhost)
 *   - MCP_CORS_ORIGIN: CORS origin (default: *)
 *
 * @module RemoteMCPServer
 * @version 2.1.0
 */
import { ChromeDebugServer } from './ChromeDebugServer.js';
// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const hostArg = args.find(arg => arg.startsWith('--host='));
const corsArg = args.find(arg => arg.startsWith('--cors='));
// Configuration from environment and command line
const config = {
    port: parseInt(portArg?.split('=')[1] || process.env.MCP_PORT || '31232'),
    host: hostArg?.split('=')[1] || process.env.MCP_HOST || 'localhost',
    cors: {
        origin: corsArg?.split('=')[1] || process.env.MCP_CORS_ORIGIN || '*',
        credentials: true
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};
// Create and start server instance
const server = new ChromeDebugServer();
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.error('[RemoteMCP] Received SIGINT, shutting down gracefully...');
    await server.cleanup();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.error('[RemoteMCP] Received SIGTERM, shutting down gracefully...');
    await server.cleanup();
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('[RemoteMCP] Uncaught exception:', error);
    await server.cleanup();
    process.exit(1);
});
process.on('unhandledRejection', async (reason, promise) => {
    console.error('[RemoteMCP] Unhandled rejection at:', promise, 'reason:', reason);
    await server.cleanup();
    process.exit(1);
});
// Start the server with remote transport
console.error('[RemoteMCP] Starting Chrome Debug MCP Server v2.1 (Remote Transport)...');
console.error(`[RemoteMCP] Configuration:`, {
    port: config.port,
    host: config.host,
    cors: config.cors?.origin,
    endpoints: {
        health: `http://${config.host}:${config.port}/health`,
        sse: `http://${config.host}:${config.port}/sse`,
        http: `http://${config.host}:${config.port}/message`
    }
});
server.run('http', config).catch(async (error) => {
    console.error('[RemoteMCP] Failed to start server:', error);
    await server.cleanup();
    process.exit(1);
});
//# sourceMappingURL=remote.js.map