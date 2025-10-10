import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
export class ExtensionContentScript {
    chromeManager;
    pageManager;
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
    }
    /**
     * 注入内容脚本到指定标签页
     */
    async injectContentScript(params) {
        const { tabId, code, files, extensionId } = params;
        this.log('Injecting content script', params);
        try {
            if (!code && !files) {
                return { success: false, message: 'Either code or files must be provided' };
            }
            const tabs = await this.pageManager.listTabs();
            const targetTabs = tabId ? tabs.filter((tab) => tab.id === tabId) : tabs;
            if (targetTabs.length === 0) {
                return { success: false, message: `Tab ${tabId} not found` };
            }
            const results = [];
            for (const tab of targetTabs) {
                const page = this.pageManager.getTabIdToPageMap().get(tab.id);
                if (!page)
                    continue;
                try {
                    if (!(await this.isPageValid(page))) {
                        results.push({ tabId: tab.id, success: false, reason: 'Page invalid' });
                        continue;
                    }
                    let injectionResult;
                    if (code) {
                        injectionResult = await page.evaluate(code);
                    }
                    else if (files) {
                        // 注入文件逻辑
                        injectionResult = await page.addScriptTag({ path: files[0] });
                    }
                    results.push({ tabId: tab.id, success: true, result: injectionResult });
                }
                catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    results.push({ tabId: tab.id, success: false, error: errorMsg });
                }
            }
            return {
                success: results.some(r => r.success),
                message: `Injected into ${results.filter(r => r.success).length}/${results.length} tabs`,
                details: results
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to inject content script: ${error}`);
        }
    }
    log = (message, ...args) => {
        console.log(`[ExtensionContentScript] ${message}`, ...args);
    };
    /**
     * 检查内容脚本的状态
     */
    async contentScriptStatus(params) {
        const { tabId, extensionId, checkAllTabs } = params;
        this.log('Checking content script status', params);
        try {
            const results = [];
            const tabs = await this.pageManager.listTabs();
            const targetTabs = checkAllTabs ? tabs : tabs.filter((tab) => !tabId || tab.id === tabId);
            for (const tab of targetTabs) {
                try {
                    const page = this.pageManager.getTabIdToPageMap().get(tab.id);
                    if (!page) {
                        results.push({
                            tabId: tab.id,
                            url: tab.url,
                            title: tab.title || 'Unknown',
                            injectionStatus: 'error',
                            error: 'Unable to access page',
                            details: {
                                scriptPresent: false,
                                domModifications: { elementsAdded: 0, elementsRemoved: 0, styleChanges: 0 },
                                conflicts: [],
                                extensionMarkers: [],
                                globalVariables: []
                            }
                        });
                        continue;
                    }
                    const analysis = await this.analyzeContentScriptInTab(page, tab.id, extensionId);
                    if (analysis) {
                        results.push({
                            tabId: tab.id,
                            url: tab.url,
                            title: tab.title || 'Unknown',
                            extensionId,
                            injectionStatus: analysis.injectionStatus,
                            details: {
                                scriptPresent: analysis.injectionStatus !== 'none',
                                domModifications: {
                                    elementsAdded: analysis.domModifications.elementsAdded || 0,
                                    elementsRemoved: analysis.domModifications.elementsRemoved,
                                    styleChanges: analysis.domModifications.styleChanges
                                },
                                conflicts: analysis.conflicts,
                                extensionMarkers: analysis.extensionMarkers,
                                globalVariables: analysis.globalVariables
                            }
                        });
                    }
                    else {
                        // 页面无效时的备用结果
                        results.push({
                            tabId: tab.id,
                            url: tab.url,
                            title: tab.title || 'Unknown',
                            injectionStatus: 'not_injected',
                            details: {
                                scriptPresent: false,
                                domModifications: { elementsAdded: 0, elementsRemoved: 0, styleChanges: 0 },
                                conflicts: [],
                                extensionMarkers: [],
                                globalVariables: []
                            }
                        });
                    }
                }
                catch (e) {
                    this.log('Failed to analyze tab', tab.id, ':', e);
                    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                    // 区分Frame错误和其他错误
                    const isFrameError = errorMessage.includes('detached Frame') || errorMessage.includes('Target closed');
                    results.push({
                        tabId: tab.id,
                        url: tab.url,
                        title: tab.title || 'Unknown',
                        injectionStatus: 'error',
                        error: isFrameError ? 'Page navigation detected, analysis skipped' : errorMessage,
                        details: {
                            scriptPresent: false,
                            domModifications: { elementsAdded: 0, elementsRemoved: 0, styleChanges: 0 },
                            conflicts: isFrameError ? [{ type: 'frame_detached', description: 'Page frame detached during analysis' }] : [],
                            extensionMarkers: [],
                            globalVariables: []
                        }
                    });
                }
            }
            const response = { results };
            this.log(`Content script status analysis complete: ${results.length} tabs analyzed`);
            return response;
        }
        catch (e) {
            this.log('Failed to check content script status:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to check content script status: ${e}`);
        }
    }
    /**
     * 检查页面和Frame是否有效
     */
    async isPageValid(page) {
        try {
            // 检查页面是否已关闭
            if (page.isClosed()) {
                return false;
            }
            // 检查主Frame是否有效
            const mainFrame = page.mainFrame();
            if (!mainFrame || mainFrame.isDetached()) {
                return false;
            }
            // 尝试简单的evaluate操作验证Frame可用性
            await mainFrame.evaluate(() => document.readyState);
            return true;
        }
        catch (error) {
            // 如果任何检查失败，认为页面无效
            return false;
        }
    }
    /**
     * 公共方法：检查特定扩展在标签页中是否有内容脚本
     */
    async hasContentScriptInTab(extensionId, tabId) {
        try {
            const page = this.pageManager.getTabIdToPageMap().get(tabId);
            if (!page)
                return false;
            const result = await this.verifyContentScript(page, tabId);
            return result ? result.injectionStatus !== 'none' : false;
        }
        catch (error) {
            this.log(`Failed to check content script for extension ${extensionId} in tab ${tabId}:`, error);
            return false;
        }
    }
    /**
     * 验证内容脚本在特定页面中的存在
     */
    async verifyContentScript(page, tabId) {
        try {
            // 预检查页面有效性
            if (!(await this.isPageValid(page))) {
                this.log(`Page/Frame invalid for tab ${tabId}, skipping verification`);
                return null;
            }
            const result = await page.evaluate(() => {
                const result = {
                    injectionStatus: 'none',
                    domModifications: {
                        elementsRemoved: 0,
                        styleChanges: 0,
                        elementsAdded: 0
                    },
                    conflicts: [],
                    extensionMarkers: [],
                    globalVariables: [],
                    detectedExtensionId: null
                };
                // 检查扩展标记
                const allElements = document.querySelectorAll('*');
                const extElements = [];
                allElements.forEach(el => {
                    if (el.hasAttribute('data-extension-id') ||
                        el.hasAttribute('data-injected-by') ||
                        el.classList.contains('extension-injected')) {
                        extElements.push(el);
                        result.extensionMarkers.push(el.tagName.toLowerCase());
                    }
                });
                // 检查样式注入
                const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
                const extensionStyles = styles.filter(styleEl => {
                    const href = styleEl.href;
                    return href && href.includes('chrome-extension://');
                });
                if (extensionStyles.length > 0) {
                    result.domModifications.styleChanges = extensionStyles.length;
                    result.injectionStatus = 'injected';
                }
                if (extElements.length > 0) {
                    result.domModifications.elementsAdded = extElements.length;
                    result.injectionStatus = 'injected';
                }
                // 检查全局变量
                const globalVars = Object.keys(window).filter(key => key.startsWith('ext_') || key.includes('Extension'));
                result.globalVariables = globalVars;
                // 运行时环境检查
                const runtimeInfo = {
                    hasChrome: typeof window.chrome !== 'undefined',
                    hasChromeRuntime: typeof window.chrome?.runtime !== 'undefined',
                    userAgent: navigator.userAgent,
                    documentReadyState: document.readyState
                };
                // 检测扩展脚本
                const scripts = Array.from(document.querySelectorAll('script[src*="chrome-extension://"]'));
                const extensionScripts = scripts.map(s => s.src);
                if (extensionScripts.length > 0) {
                    const firstScript = extensionScripts[0];
                    const match = firstScript.match(/chrome-extension:\/\/([a-z]{32})/);
                    if (match) {
                        result.detectedExtensionId = match[1];
                        result.injectionStatus = 'injected';
                    }
                }
                return result;
            });
            return {
                tabId,
                ...result
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            // 检查是否是Frame分离错误
            if (errorMsg.includes('detached Frame') || errorMsg.includes('Target closed')) {
                this.log(`Content script verification failed for tab ${tabId}: Frame detached`);
                return null; // 返回null而不是抛出错误
            }
            // 其他错误仍然抛出
            throw new McpError(ErrorCode.InternalError, `Failed to analyze tab ${tabId}: ${error}`);
        }
    }
    /**
     * 分析标签页中的内容脚本
     */
    async analyzeContentScriptInTab(page, tabId, extensionId) {
        try {
            // 首先检查页面有效性
            if (!(await this.isPageValid(page))) {
                this.log(`Page invalid for tab ${tabId}, skipping analysis`);
                return null;
            }
            // 使用超时保护的验证
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(null), 5000); // 5秒超时
            });
            const verifyPromise = this.verifyContentScript(page, tabId);
            const result = await Promise.race([verifyPromise, timeoutPromise]);
            if (result) {
                result.extensionId = extensionId;
                return result;
            }
            else {
                this.log(`Content script verification timed out or failed for tab ${tabId}`);
                return null;
            }
        }
        catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            if (errorMsg.includes('detached Frame')) {
                this.log(`Content script analysis skipped for tab ${tabId}: Frame detached`);
                return null;
            }
            throw new McpError(ErrorCode.InternalError, `Failed to analyze tab ${tabId}: ${e}`);
        }
    }
}
//# sourceMappingURL=ExtensionContentScript.js.map