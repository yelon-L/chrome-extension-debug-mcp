/**
 * Unified MCP Context for Chrome Debug operations
 * Centralizes all state management following Chrome DevTools MCP patterns
 */
import { ChromeManager } from '../managers/ChromeManager.js';
import { PageManager } from '../managers/PageManager.js';
import { InteractionHandler } from '../handlers/InteractionHandler.js';
import { EvaluationHandler } from '../handlers/EvaluationHandler.js';
import { ExtensionHandler } from '../handlers/ExtensionHandler.js';
import { SnapshotGenerator } from '../utils/SnapshotGenerator.js';
/**
 * Unified context that all tools and handlers can access
 */
export class McpContext {
    // Core managers and handlers
    chromeManager;
    pageManager;
    interactionHandler;
    evaluationHandler;
    extensionHandler;
    // Centralized state
    state;
    constructor() {
        // Initialize managers
        this.chromeManager = new ChromeManager();
        this.pageManager = new PageManager();
        this.interactionHandler = new InteractionHandler(this.pageManager);
        this.evaluationHandler = new EvaluationHandler(this.pageManager);
        this.extensionHandler = new ExtensionHandler(this.chromeManager, this.pageManager);
        // Initialize state
        this.state = {
            browser: null,
            selectedPageIndex: 0,
            pages: [],
            extensionCache: new Map(),
            currentExtensionContext: null,
            consoleLogs: [],
            connectionHealth: 'unhealthy',
            currentSnapshot: null,
            snapshotGenerator: null,
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            lastActivity: Date.now()
        };
        this.setupStateSync();
    }
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set up synchronization between managers and centralized state
     */
    setupStateSync() {
        // Sync browser state changes
        setInterval(() => {
            const browser = this.chromeManager.getBrowser();
            if (browser !== this.state.browser) {
                this.state.browser = browser;
                if (browser) {
                    this.pageManager.setBrowser(browser);
                    this.updatePagesCache().catch(console.error);
                }
            }
            // Update connection health
            const health = this.chromeManager.getConnectionHealth();
            this.state.connectionHealth = health.status;
            // Update activity timestamp
            this.state.lastActivity = Date.now();
        }, 1000); // Check every second
    }
    /**
     * Update cached pages list
     */
    async updatePagesCache() {
        try {
            if (this.state.browser) {
                this.state.pages = await this.state.browser.pages();
            }
        }
        catch (error) {
            console.error('[McpContext] Failed to update pages cache:', error);
        }
    }
    /**
     * Get current context state (read-only)
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get session information
     */
    getSessionInfo() {
        return {
            sessionId: this.state.sessionId,
            uptime: Date.now() - this.state.startTime,
            lastActivity: this.state.lastActivity,
            connectionHealth: this.state.connectionHealth
        };
    }
    /**
     * Get current page
     */
    getCurrentPage() {
        if (this.state.pages.length === 0)
            return null;
        const index = Math.max(0, Math.min(this.state.selectedPageIndex, this.state.pages.length - 1));
        return this.state.pages[index] || null;
    }
    /**
     * Set selected page index
     */
    setSelectedPageIndex(index) {
        if (index >= 0 && index < this.state.pages.length) {
            this.state.selectedPageIndex = index;
            // PageManager doesn't have setActivePageIndex, just update local state
        }
    }
    /**
     * Get extension cache
     */
    getExtensionCache() {
        return this.state.extensionCache;
    }
    /**
     * Update extension cache
     */
    updateExtensionCache(extensionId, data) {
        this.state.extensionCache.set(extensionId, {
            ...data,
            lastUpdated: Date.now()
        });
    }
    /**
     * Get current extension context
     */
    getCurrentExtensionContext() {
        return this.state.currentExtensionContext;
    }
    /**
     * Set current extension context
     */
    setCurrentExtensionContext(extensionId) {
        this.state.currentExtensionContext = extensionId;
    }
    /**
     * Add console log
     */
    addConsoleLog(log) {
        this.state.consoleLogs.push(`[${new Date().toISOString()}] ${log}`);
        // Keep only last 1000 logs to prevent memory issues
        if (this.state.consoleLogs.length > 1000) {
            this.state.consoleLogs = this.state.consoleLogs.slice(-1000);
        }
    }
    /**
     * Get console logs
     */
    getConsoleLogs() {
        return [...this.state.consoleLogs];
    }
    /**
     * Clear console logs
     */
    clearConsoleLogs() {
        this.state.consoleLogs = [];
    }
    /**
     * Check if browser is connected
     */
    isBrowserConnected() {
        return this.state.browser?.isConnected() === true;
    }
    /**
     * Get diagnostic information
     */
    getDiagnostics() {
        return {
            sessionInfo: this.getSessionInfo(),
            browserConnected: this.isBrowserConnected(),
            pagesCount: this.state.pages.length,
            extensionsCached: this.state.extensionCache.size,
            consoleLogs: this.state.consoleLogs.length,
            connectionHealth: this.chromeManager.getConnectionHealth()
        };
    }
    /**
     * Phase 2.1: Set current snapshot
     */
    setCurrentSnapshot(snapshot) {
        this.state.currentSnapshot = snapshot;
    }
    /**
     * Phase 2.1: Get current snapshot
     */
    getCurrentSnapshot() {
        return this.state.currentSnapshot;
    }
    /**
     * Phase 2.1: Get or create snapshot generator
     */
    getOrCreateSnapshotGenerator(page) {
        if (!this.state.snapshotGenerator) {
            this.state.snapshotGenerator = new SnapshotGenerator(page);
        }
        return this.state.snapshotGenerator;
    }
    /**
     * Phase 2.1: Get snapshot generator
     */
    getSnapshotGenerator() {
        return this.state.snapshotGenerator;
    }
    /**
     * Phase 2.1: Clear snapshot
     */
    clearSnapshot() {
        this.state.currentSnapshot = null;
        if (this.state.snapshotGenerator) {
            this.state.snapshotGenerator.clear();
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            // Clear caches
            this.state.extensionCache.clear();
            this.state.consoleLogs = [];
            // Clear snapshots
            this.clearSnapshot();
            this.state.snapshotGenerator = null;
            // Cleanup managers
            if (this.chromeManager.getCdpClient()) {
                await this.chromeManager.getCdpClient()?.close();
            }
            console.error('[McpContext] Cleanup completed');
        }
        catch (error) {
            console.error('[McpContext] Error during cleanup:', error);
        }
    }
}
//# sourceMappingURL=McpContext.js.map