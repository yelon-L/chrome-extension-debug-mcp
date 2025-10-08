#!/usr/bin/env node
/**
 * Chrome Debug MCP Server - Modular Entry Point
 * 
 * This is the new modular entry point for the Chrome Debug MCP server.
 * The original index.ts has been refactored into multiple modules for better
 * maintainability and testability.
 * 
 * Architecture:
 * - ChromeDebugServer: Main orchestrator (no business logic)
 * - ChromeManager: Handles Chrome launching and CDP connections
 * - PageManager: Handles page lifecycle and tab switching
 * - InteractionHandler: Handles user interactions (click, type, screenshot)
 * - EvaluationHandler: Handles JavaScript execution
 * 
 * @module ChromeDebugMCP
 * @version 2.0.0
 */

import { ChromeDebugServer } from './ChromeDebugServer.js';

// Create and start server instance
const server = new ChromeDebugServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('[Main] Received SIGINT, shutting down gracefully...');
  await server.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[Main] Received SIGTERM, shutting down gracefully...');
  await server.cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[Main] Uncaught exception:', error);
  await server.cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
  await server.cleanup();
  process.exit(1);
});

// Start the server
console.error('[Main] Starting Chrome Debug MCP Server v2.0 (Modular Architecture)...');
server.run().catch(async (error) => {
  console.error('[Main] Failed to start server:', error);
  await server.cleanup();
  process.exit(1);
});
