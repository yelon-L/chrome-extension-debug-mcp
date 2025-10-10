#!/usr/bin/env node
/**
 * Chrome Debug MCP Server - Stdio Transport Entry Point
 * 
 * This entry point uses the full ChromeDebugServer with stdio transport,
 * supporting all 47 MCP tools.
 * 
 * Usage:
 *   npm run start:stdio
 *   node build/stdio-server.js --port 9222
 * 
 * @module StdioServer
 * @version 4.0.0
 */

import { ChromeDebugServer } from './ChromeDebugServer.js';
import { parseArguments, logStartupMessage } from './utils/cli.js';

async function main() {
  const version = '4.0.0';
  
  // Parse command-line arguments
  const options = parseArguments(version);
  
  // Log startup message with configuration
  logStartupMessage(options, version);

  // Create server instance
  const server = new ChromeDebugServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[Stdio] Received SIGINT, shutting down...');
    await server.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[Stdio] Received SIGTERM, shutting down...');
    await server.cleanup();
    process.exit(0);
  });

  try {
    // Start server with stdio transport (supports all 47 tools)
    await server.run('stdio');
  } catch (error) {
    console.error('[Stdio] Failed to start server:', error);
    await server.cleanup();
    process.exit(1);
  }
}

// Run if this file is executed directly
// Cross-platform check using pathToFileURL
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { ChromeDebugServer };
