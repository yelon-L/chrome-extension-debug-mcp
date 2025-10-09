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
export {};
//# sourceMappingURL=main.d.ts.map