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
  // Browser state
  browser: any | null;
  selectedPageIndex: number;
  pages: Page[];
  
  // Extension state
  extensionCache: Map<string, any>;
  currentExtensionContext: string | null;
  
  // Debug state
  consoleLogs: string[];
  connectionHealth: 'healthy' | 'unhealthy' | 'recovering';
  
  // Session state
  sessionId: string;
  startTime: number;
  lastActivity: number;
}

/**
 * Unified context that all tools and handlers can access
 */
export class McpContext {
  // Core managers and handlers
  public readonly chromeManager: ChromeManager;
  public readonly pageManager: PageManager;
  public readonly interactionHandler: InteractionHandler;
  public readonly evaluationHandler: EvaluationHandler;
  public readonly extensionHandler: ExtensionHandler;
  
  // Centralized state
  private state: ContextState;
  
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
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now()
    };
    
    this.setupStateSync();
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Set up synchronization between managers and centralized state
   */
  private setupStateSync(): void {
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
      this.state.connectionHealth = health.status as any;
      
      // Update activity timestamp
      this.state.lastActivity = Date.now();
    }, 1000); // Check every second
  }
  
  /**
   * Update cached pages list
   */
  private async updatePagesCache(): Promise<void> {
    try {
      if (this.state.browser) {
        this.state.pages = await this.state.browser.pages();
      }
    } catch (error) {
      console.error('[McpContext] Failed to update pages cache:', error);
    }
  }
  
  /**
   * Get current context state (read-only)
   */
  getState(): Readonly<ContextState> {
    return { ...this.state };
  }
  
  /**
   * Get session information
   */
  getSessionInfo(): {
    sessionId: string;
    uptime: number;
    lastActivity: number;
    connectionHealth: string;
  } {
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
  getCurrentPage(): Page | null {
    if (this.state.pages.length === 0) return null;
    const index = Math.max(0, Math.min(this.state.selectedPageIndex, this.state.pages.length - 1));
    return this.state.pages[index] || null;
  }
  
  /**
   * Set selected page index
   */
  setSelectedPageIndex(index: number): void {
    if (index >= 0 && index < this.state.pages.length) {
      this.state.selectedPageIndex = index;
      // PageManager doesn't have setActivePageIndex, just update local state
    }
  }
  
  /**
   * Get extension cache
   */
  getExtensionCache(): ReadonlyMap<string, any> {
    return this.state.extensionCache;
  }
  
  /**
   * Update extension cache
   */
  updateExtensionCache(extensionId: string, data: any): void {
    this.state.extensionCache.set(extensionId, {
      ...data,
      lastUpdated: Date.now()
    });
  }
  
  /**
   * Get current extension context
   */
  getCurrentExtensionContext(): string | null {
    return this.state.currentExtensionContext;
  }
  
  /**
   * Set current extension context
   */
  setCurrentExtensionContext(extensionId: string | null): void {
    this.state.currentExtensionContext = extensionId;
  }
  
  /**
   * Add console log
   */
  addConsoleLog(log: string): void {
    this.state.consoleLogs.push(`[${new Date().toISOString()}] ${log}`);
    
    // Keep only last 1000 logs to prevent memory issues
    if (this.state.consoleLogs.length > 1000) {
      this.state.consoleLogs = this.state.consoleLogs.slice(-1000);
    }
  }
  
  /**
   * Get console logs
   */
  getConsoleLogs(): string[] {
    return [...this.state.consoleLogs];
  }
  
  /**
   * Clear console logs
   */
  clearConsoleLogs(): void {
    this.state.consoleLogs = [];
  }
  
  /**
   * Check if browser is connected
   */
  isBrowserConnected(): boolean {
    return this.state.browser?.isConnected() === true;
  }
  
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
  } {
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Clear caches
      this.state.extensionCache.clear();
      this.state.consoleLogs = [];
      
      // Cleanup managers
      if (this.chromeManager.getCdpClient()) {
        await this.chromeManager.getCdpClient()?.close();
      }
      
      console.error('[McpContext] Cleanup completed');
    } catch (error) {
      console.error('[McpContext] Error during cleanup:', error);
    }
  }
}
