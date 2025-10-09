/**
 * Unified MCP Context for Chrome Debug operations
 * Centralizes all state management following Chrome DevTools MCP patterns
 */
import type { Page } from 'puppeteer-core';
import { ChromeManager } from '../managers/ChromeManager.js';
import { PageManager } from '../managers/PageManager.js';
import { InteractionHandler } from '../handlers/InteractionHandler.js';
import { EvaluationHandler } from '../handlers/EvaluationHandler.js';
import { ExtensionHandler } from '../handlers/ExtensionHandler.js';
export interface ContextState {
    browser: any | null;
    selectedPageIndex: number;
    pages: Page[];
    extensionCache: Map<string, any>;
    currentExtensionContext: string | null;
    consoleLogs: string[];
    connectionHealth: 'healthy' | 'unhealthy' | 'recovering';
    sessionId: string;
    startTime: number;
    lastActivity: number;
}
/**
 * Unified context that all tools and handlers can access
 */
export declare class McpContext {
    readonly chromeManager: ChromeManager;
    readonly pageManager: PageManager;
    readonly interactionHandler: InteractionHandler;
    readonly evaluationHandler: EvaluationHandler;
    readonly extensionHandler: ExtensionHandler;
    private state;
    constructor();
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Set up synchronization between managers and centralized state
     */
    private setupStateSync;
    /**
     * Update cached pages list
     */
    private updatePagesCache;
    /**
     * Get current context state (read-only)
     */
    getState(): Readonly<ContextState>;
    /**
     * Get session information
     */
    getSessionInfo(): {
        sessionId: string;
        uptime: number;
        lastActivity: number;
        connectionHealth: string;
    };
    /**
     * Get current page
     */
    getCurrentPage(): Page | null;
    /**
     * Set selected page index
     */
    setSelectedPageIndex(index: number): void;
    /**
     * Get extension cache
     */
    getExtensionCache(): ReadonlyMap<string, any>;
    /**
     * Update extension cache
     */
    updateExtensionCache(extensionId: string, data: any): void;
    /**
     * Get current extension context
     */
    getCurrentExtensionContext(): string | null;
    /**
     * Set current extension context
     */
    setCurrentExtensionContext(extensionId: string | null): void;
    /**
     * Add console log
     */
    addConsoleLog(log: string): void;
    /**
     * Get console logs
     */
    getConsoleLogs(): string[];
    /**
     * Clear console logs
     */
    clearConsoleLogs(): void;
    /**
     * Check if browser is connected
     */
    isBrowserConnected(): boolean;
    /**
     * Get diagnostic information
     */
    getDiagnostics(): {
        sessionInfo: ReturnType<McpContext['getSessionInfo']>;
        browserConnected: boolean;
        pagesCount: number;
        extensionsCached: number;
        consoleLogs: number;
        connectionHealth: any;
    };
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=McpContext.d.ts.map