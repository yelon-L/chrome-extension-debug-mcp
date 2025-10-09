/**
 * Page Management Module
 * Handles Chrome page lifecycle and tab switching
 */
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
const DEBUG = true;
const log = (...args) => DEBUG && console.error('[PageManager]', ...args);
export class PageManager {
    constructor() {
        this.browser = null;
        this.currentPage = null;
        this.tabIdToPage = new Map();
        this.pageToTabId = new WeakMap();
        this.tabIdCounter = 0;
    }
    setBrowser(browser) {
        this.browser = browser;
        this.ensureTabIds();
    }
    getBrowser() {
        return this.browser;
    }
    getCurrentPage() {
        return this.currentPage;
    }
    getTabIdToPageMap() {
        return this.tabIdToPage;
    }
    getPageToTabIdMap() {
        return this.pageToTabId;
    }
    /**
     * Ensure all pages have stable tab IDs
     */
    async ensureTabIds() {
        if (!this.browser)
            return;
        try {
            const pages = await this.browser.pages();
            for (const p of pages) {
                if (!this.pageToTabId.has(p)) {
                    const id = `tab_${++this.tabIdCounter}`;
                    this.pageToTabId.set(p, id);
                    this.tabIdToPage.set(id, p);
                }
            }
        }
        catch (error) {
            log('Error ensuring tab IDs:', error);
        }
    }
    /**
     * Get the currently active page with simplified logic (P0 Fix)
     *
     * BUGFIX P0: Simplified logic - trust currentPage set by switchToTab
     * This fixes the tab switching context mismatch issue where evaluate
     * was executing on the wrong page.
     */
    async getActivePage() {
        if (!this.browser) {
            throw new McpError(ErrorCode.InternalError, 'Chrome is not running. Call launch_chrome first.');
        }
        // Strategy 1: If currentPage exists and is not closed, use it directly
        // This trusts the switchToTab's bringToFront() operation
        if (this.currentPage && !this.currentPage.isClosed()) {
            try {
                // Simple accessibility check - just verify we can get the URL
                const url = this.currentPage.url();
                log(`✅ Using current page: ${url}`);
                return this.currentPage;
            }
            catch (error) {
                log(`❌ Current page not accessible: ${error}`);
                this.currentPage = null;
            }
        }
        // Strategy 2: currentPage is not available, select first accessible page
        const pages = await this.browser.pages();
        if (!pages.length) {
            throw new McpError(ErrorCode.InternalError, 'No pages available');
        }
        log(`🔍 Searching for accessible page among ${pages.length} pages`);
        for (const page of pages) {
            if (!page.isClosed()) {
                try {
                    const url = page.url();
                    const title = await page.title();
                    // Set as current and return
                    this.currentPage = page;
                    await this.ensureTabIds();
                    log(`✅ Selected page: "${title}" (${url})`);
                    return this.currentPage;
                }
                catch (error) {
                    log(`❌ Page not accessible: ${error}`);
                    continue;
                }
            }
        }
        throw new McpError(ErrorCode.InternalError, 'No accessible pages found');
    }
    /**
     * Switch to a specific tab with robust verification and retry
     */
    async switchToTab(tabId) {
        const page = this.tabIdToPage.get(tabId);
        if (!page) {
            throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${tabId}`);
        }
        if (page.isClosed()) {
            throw new McpError(ErrorCode.InvalidParams, `Tab ${tabId} has been closed`);
        }
        // Robust tab switching with verification and retry
        let retries = 3;
        let lastError = null;
        while (retries > 0) {
            try {
                // Step 1: Bring page to front
                await page.bringToFront();
                // Step 2: Wait for activation (P0 Fix: increased from 100ms to 200ms)
                await new Promise(resolve => setTimeout(resolve, 200));
                // Step 3: Verify the switch worked by testing page access
                const title = await page.title();
                const url = page.url();
                // Step 4: Double-verify with a simple evaluate
                const testResult = await page.evaluate(() => {
                    return {
                        title: document.title,
                        url: location.href,
                        readyState: document.readyState
                    };
                });
                // Step 5: Verify results match
                if (testResult.title === title && testResult.url === url) {
                    // SUCCESS: Update currentPage and return
                    this.currentPage = page;
                    log(`✅ Successfully switched to ${tabId}: "${title}" (${url})`);
                    return { success: true, message: `switched:${tabId}` };
                }
                else {
                    throw new Error(`Page verification failed: expected ${title}@${url}, got ${testResult.title}@${testResult.url}`);
                }
            }
            catch (error) {
                lastError = error;
                retries--;
                log(`❌ Switch attempt failed (${retries} retries left): ${error}`);
                if (retries > 0) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        // All retries failed
        log(`🚫 Failed to switch to tab ${tabId} after all retries: ${lastError}`);
        throw new McpError(ErrorCode.InternalError, `Failed to switch tab after 3 attempts: ${lastError}`);
    }
    /**
     * Create a new tab
     */
    async createNewTab(url) {
        if (!this.browser) {
            throw new McpError(ErrorCode.InternalError, 'Chrome is not running.');
        }
        const page = await this.browser.newPage();
        const id = `tab_${++this.tabIdCounter}`;
        this.pageToTabId.set(page, id);
        this.tabIdToPage.set(id, page);
        this.currentPage = page;
        if (url) {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
        }
        return { id, url: page.url() };
    }
    /**
     * Close a tab
     */
    async closeTab(tabId) {
        const page = this.tabIdToPage.get(tabId);
        if (!page) {
            throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${tabId}`);
        }
        await page.close({ runBeforeUnload: false });
        this.tabIdToPage.delete(tabId);
        this.pageToTabId.delete(page);
        if (this.currentPage === page) {
            this.currentPage = null;
            // Pick another page if available
            if (this.browser) {
                const pages = await this.browser.pages();
                this.currentPage = pages[0] || null;
            }
        }
    }
    /**
     * List all tabs
     */
    async listTabs() {
        if (!this.browser) {
            throw new McpError(ErrorCode.InternalError, 'Chrome is not running.');
        }
        const pages = await this.browser.pages();
        await this.ensureTabIds();
        const list = await Promise.all(pages.map(async (p) => {
            const id = this.pageToTabId.get(p) || `tab_${++this.tabIdCounter}`;
            if (!this.pageToTabId.has(p)) {
                this.pageToTabId.set(p, id);
                this.tabIdToPage.set(id, p);
            }
            const url = p.url();
            let title = '';
            try {
                title = await p.title();
            }
            catch { }
            const active = (this.currentPage === p);
            return { id, url, title, active };
        }));
        return list;
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = null;
        this.currentPage = null;
        this.tabIdToPage.clear();
    }
}
//# sourceMappingURL=PageManager.js.map