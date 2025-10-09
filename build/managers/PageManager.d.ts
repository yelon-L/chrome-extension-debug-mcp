/**
 * Page Management Module
 * Handles Chrome page lifecycle and tab switching
 */
type Browser = any;
type Page = any;
export declare class PageManager {
    private browser;
    private currentPage;
    private tabIdToPage;
    private pageToTabId;
    private tabIdCounter;
    constructor();
    setBrowser(browser: Browser): void;
    getBrowser(): Browser | null;
    getCurrentPage(): Page | null;
    getTabIdToPageMap(): Map<string, Page>;
    getPageToTabIdMap(): WeakMap<Page, string>;
    /**
     * Ensure all pages have stable tab IDs
     */
    ensureTabIds(): Promise<void>;
    /**
     * Get the currently active page with simplified logic (P0 Fix)
     *
     * BUGFIX P0: Simplified logic - trust currentPage set by switchToTab
     * This fixes the tab switching context mismatch issue where evaluate
     * was executing on the wrong page.
     */
    getActivePage(): Promise<Page>;
    /**
     * Switch to a specific tab with robust verification and retry
     */
    switchToTab(tabId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Create a new tab
     */
    createNewTab(url?: string): Promise<{
        id: string;
        url: string;
    }>;
    /**
     * Close a tab
     */
    closeTab(tabId: string): Promise<void>;
    /**
     * List all tabs
     */
    listTabs(): Promise<Array<{
        id: string;
        url: string;
        title: string;
        active: boolean;
    }>>;
    /**
     * Clean up resources
     */
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=PageManager.d.ts.map