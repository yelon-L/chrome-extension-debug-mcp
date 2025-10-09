import type { Page } from 'puppeteer';
interface PageManager {
    listTabs(): Promise<Array<{
        id: string;
        url: string;
        title: string;
        active: boolean;
    }>>;
    getTabIdToPageMap(): Map<string, Page>;
}
interface ChromeManager {
}
export interface ContentScriptStatusResult {
    tabId: string;
    url: string;
    title: string;
    extensionId?: string;
    injectionStatus: 'injected' | 'not_injected' | 'error';
    details: {
        scriptPresent: boolean;
        domModifications: {
            elementsAdded: number;
            elementsRemoved: number;
            styleChanges: number;
        };
        conflicts: Array<{
            type: string;
            description: string;
        }>;
        extensionMarkers: string[];
        globalVariables: string[];
    };
    error?: string;
}
export interface ContentScriptDetectionResult {
    tabId: string;
    extensionId?: string;
    detectedExtensionId?: string | null;
    injectionStatus: string;
    domModifications: {
        elementsAdded?: number;
        elementsRemoved: number;
        styleChanges: number;
    };
    conflicts: any[];
    extensionMarkers: string[];
    globalVariables: string[];
}
export declare class ExtensionContentScript {
    private chromeManager;
    private pageManager;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 注入内容脚本到指定标签页
     */
    injectContentScript(params: {
        tabId?: string;
        code?: string;
        files?: string[];
        extensionId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    private log;
    /**
     * 检查内容脚本的状态
     */
    contentScriptStatus(params: {
        tabId?: string;
        extensionId?: string;
        checkAllTabs?: boolean;
    }): Promise<{
        results: ContentScriptStatusResult[];
    }>;
    /**
     * 检查页面和Frame是否有效
     */
    private isPageValid;
    /**
     * 公共方法：检查特定扩展在标签页中是否有内容脚本
     */
    hasContentScriptInTab(extensionId: string, tabId: string): Promise<boolean>;
    /**
     * 验证内容脚本在特定页面中的存在
     */
    private verifyContentScript;
    /**
     * 分析标签页中的内容脚本
     */
    private analyzeContentScriptInTab;
}
export {};
//# sourceMappingURL=ExtensionContentScript.d.ts.map