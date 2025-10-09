/**
 * 扩展上下文管理模块
 * 负责扩展上下文的分析、切换和管理
 */
// 简化日志函数
const log = (...args) => console.error('[ExtensionContextManager]', ...args);
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
export class ExtensionContextManager {
    constructor(chromeManager, pageManager, contentScript) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
        this.contentScript = contentScript;
    }
    /**
     * Week 2: 列出扩展的所有上下文
     */
    async listExtensionContexts(args) {
        try {
            const { extensionId } = args;
            log('Getting extension contexts', { extensionId });
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new McpError(ErrorCode.InternalError, 'Chrome not connected. Please attach to Chrome first.');
            }
            const result = await cdpClient.Target.getTargets();
            const allTargetInfos = result.targetInfos;
            log(`Found ${allTargetInfos.length} total targets for context analysis`);
            // 分析扩展相关目标
            const extensionTargets = this.analyzeExtensionTargets(allTargetInfos);
            // 按扩展ID分组
            const extensionMap = new Map();
            extensionTargets.forEach((target) => {
                const extId = this.extractExtensionId(target.url);
                if (extId && (!extensionId || extId === extensionId)) {
                    if (!extensionMap.has(extId)) {
                        extensionMap.set(extId, []);
                    }
                    extensionMap.get(extId).push(target);
                }
            });
            // 为每个扩展构建上下文信息
            const extensions = [];
            let totalContexts = 0;
            const summary = {
                activeBackgrounds: 0,
                totalContentScripts: 0,
                openPopups: 0,
                openOptions: 0,
                activeDevtools: 0
            };
            for (const [extId, targets] of extensionMap) {
                const extContext = await this.buildExtensionContext(extId, targets);
                extensions.push(extContext);
                // 更新统计
                if (extContext.contexts.background?.active)
                    summary.activeBackgrounds++;
                summary.totalContentScripts += extContext.contexts.contentScripts.length;
                if (extContext.contexts.popup?.open)
                    summary.openPopups++;
                if (extContext.contexts.options?.open)
                    summary.openOptions++;
                if (extContext.contexts.devtools)
                    summary.activeDevtools += extContext.contexts.devtools.length;
                totalContexts += this.countContexts(extContext.contexts);
            }
            log(`Context analysis complete: ${extensions.length} extensions, ${totalContexts} total contexts`);
            return {
                extensions,
                totalContexts,
                summary
            };
        }
        catch (e) {
            log('Failed to list extension contexts:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to list extension contexts: ${e}`);
        }
    }
    /**
     * Week 2 Day 8-10: 切换扩展上下文
     */
    async switchExtensionContext(args) {
        try {
            const { extensionId, contextType, tabId, targetId } = args;
            log('Switching extension context', { extensionId, contextType, tabId, targetId });
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new McpError(ErrorCode.InternalError, 'Chrome not connected. Please attach to Chrome first.');
            }
            // 1. 找到目标上下文
            const targetContext = await this.findTargetContext(extensionId, contextType, tabId, targetId);
            if (!targetContext) {
                throw new McpError(ErrorCode.InvalidParams, `Cannot find ${contextType} context for extension ${extensionId}`);
            }
            // 2. 切换到目标上下文
            const switchResult = await this.performContextSwitch(targetContext);
            // 3. 检测上下文能力
            const capabilities = await this.detectContextCapabilities(targetContext);
            const response = {
                success: switchResult.success,
                currentContext: {
                    extensionId: targetContext.extensionId,
                    contextType: targetContext.contextType,
                    targetId: targetContext.targetId,
                    url: targetContext.url,
                    tabId: targetContext.tabId
                },
                capabilities
            };
            log('Context switch completed', response);
            return response;
        }
        catch (e) {
            log('Failed to switch extension context:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to switch extension context: ${e}`);
        }
    }
    /**
     * 分析所有扩展相关的Chrome目标
     */
    analyzeExtensionTargets(allTargets) {
        return allTargets.filter(target => {
            // Service Worker
            if (target.type === 'service_worker' && target.url?.includes('chrome-extension://')) {
                return true;
            }
            // Background Page (MV2)
            if (target.type === 'background_page') {
                return true;
            }
            // Extension Pages (popup, options, etc.)
            if (target.type === 'page' && target.url?.startsWith('chrome-extension://')) {
                return true;
            }
            // DevTools Extensions
            if (target.type === 'devtools' && target.url?.includes('chrome-extension://')) {
                return true;
            }
            // Other extension workers
            if (target.type === 'worker' && target.url?.includes('chrome-extension://')) {
                return true;
            }
            return false;
        });
    }
    /**
     * 为单个扩展构建完整的上下文信息
     */
    async buildExtensionContext(extensionId, targets) {
        // 获取扩展基本信息
        const manifestInfo = await this.getExtensionManifestInfo(extensionId);
        const contexts = {
            contentScripts: [],
            devtools: []
        };
        // 分类处理各种目标
        targets.forEach(target => {
            const url = target.url || '';
            if (target.type === 'service_worker' || target.type === 'background_page') {
                // Background Context
                contexts.background = {
                    type: target.type === 'service_worker' ? 'service_worker' : 'page',
                    targetId: target.targetId,
                    url: url,
                    active: true, // 如果出现在targets中，说明是active的
                    lastActivity: Date.now()
                };
            }
            else if (target.type === 'page' && url.startsWith('chrome-extension://')) {
                // 判断是popup还是options还是其他扩展页面
                if (url.includes('/popup.html') || url.includes('popup')) {
                    contexts.popup = {
                        targetId: target.targetId,
                        url: url,
                        open: true,
                        windowId: target.windowId
                    };
                }
                else if (url.includes('/options.html') || url.includes('options')) {
                    contexts.options = {
                        targetId: target.targetId,
                        url: url,
                        open: true,
                        tabId: target.tabId
                    };
                }
            }
            else if (target.type === 'devtools') {
                contexts.devtools.push({
                    targetId: target.targetId,
                    inspectedTabId: target.tabId || 'unknown',
                    url: url
                });
            }
        });
        // 检测Content Scripts (需要通过其他方式获取，因为它们不会直接在targets中)
        contexts.contentScripts = await this.detectContentScripts(extensionId);
        return {
            extensionId,
            extensionName: manifestInfo.name,
            manifestVersion: manifestInfo.manifestVersion,
            contexts
        };
    }
    /**
     * 检测扩展在各个标签页中的Content Scripts
     */
    async detectContentScripts(extensionId) {
        const contentScripts = [];
        try {
            // 获取所有标签页
            const tabs = this.pageManager.getTabIdToPageMap();
            for (const [tabId, page] of tabs) {
                try {
                    // 在每个标签页中检测扩展的内容脚本
                    const hasContentScript = await this.contentScript.hasContentScriptInTab(extensionId, tabId);
                    if (hasContentScript) {
                        const url = await page.url();
                        contentScripts.push({
                            tabId: tabId,
                            targetId: `page_${tabId}`,
                            url: url,
                            frameId: 0,
                            injected: true,
                            isolated: true
                        });
                    }
                }
                catch (e) {
                    log(`Failed to check content script in tab ${tabId}:`, e);
                    // 继续检查其他标签页
                }
            }
        }
        catch (e) {
            log('Failed to detect content scripts:', e);
        }
        return contentScripts;
    }
    /**
     * 获取扩展的manifest信息
     */
    async getExtensionManifestInfo(extensionId) {
        try {
            // 尝试通过chrome.management API获取扩展信息
            // 这需要在有权限的context中执行
            const cdpClient2 = this.chromeManager.getCdpClient();
            if (!cdpClient2) {
                throw new Error('Chrome not connected');
            }
            const result = await cdpClient2.Runtime.evaluate({
                expression: `
          new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.management) {
              chrome.management.get('${extensionId}', (ext) => {
                if (chrome.runtime.lastError) {
                  resolve({ name: 'Unknown Extension', manifestVersion: 3 });
                } else {
                  resolve({ 
                    name: ext.name, 
                    manifestVersion: ext.type === 'extension' ? (ext.version?.includes('3') ? 3 : 2) : 3
                  });
                }
              });
            } else {
              resolve({ name: 'Unknown Extension', manifestVersion: 3 });
            }
          })
        `,
                awaitPromise: true,
                returnByValue: true
            });
            if (result.result?.value) {
                return result.result.value;
            }
        }
        catch (e) {
            log('Failed to get extension manifest info:', e);
        }
        // 回退到默认值
        return {
            name: `Extension ${extensionId.slice(0, 8)}...`,
            manifestVersion: 3 // 默认假设是MV3
        };
    }
    /**
     * 提取扩展ID
     */
    extractExtensionId(url) {
        if (!url)
            return null;
        const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
        return match ? match[1] : null;
    }
    /**
     * 计算扩展的总上下文数量
     */
    countContexts(contexts) {
        let count = 0;
        if (contexts.background)
            count++;
        count += contexts.contentScripts.length;
        if (contexts.popup)
            count++;
        if (contexts.options)
            count++;
        if (contexts.devtools)
            count += contexts.devtools.length;
        return count;
    }
    /**
     * 查找目标上下文
     */
    async findTargetContext(extensionId, contextType, tabId, targetId) {
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient)
            return null;
        // 如果直接提供了targetId，尝试使用
        if (targetId) {
            const result = await cdpClient.Target.getTargets();
            const target = result.targetInfos.find((t) => t.targetId === targetId);
            if (target && target.url?.includes(`chrome-extension://${extensionId}`)) {
                return {
                    extensionId,
                    contextType,
                    targetId,
                    url: target.url,
                    tabId: target.tabId
                };
            }
        }
        // 根据上下文类型查找
        const result = await cdpClient.Target.getTargets();
        const allTargets = result.targetInfos;
        for (const target of allTargets) {
            if (!target.url?.includes(`chrome-extension://${extensionId}`))
                continue;
            switch (contextType) {
                case 'background':
                    if (target.type === 'service_worker' || target.type === 'background_page') {
                        return {
                            extensionId,
                            contextType: 'background',
                            targetId: target.targetId,
                            url: target.url,
                            tabId: target.tabId
                        };
                    }
                    break;
                case 'popup':
                    if (target.type === 'page' && (target.url.includes('popup.html') || target.url.includes('popup'))) {
                        return {
                            extensionId,
                            contextType: 'popup',
                            targetId: target.targetId,
                            url: target.url,
                            tabId: target.tabId
                        };
                    }
                    break;
                case 'options':
                    if (target.type === 'page' && (target.url.includes('options.html') || target.url.includes('options'))) {
                        return {
                            extensionId,
                            contextType: 'options',
                            targetId: target.targetId,
                            url: target.url,
                            tabId: target.tabId
                        };
                    }
                    break;
                case 'devtools':
                    if (target.type === 'devtools') {
                        return {
                            extensionId,
                            contextType: 'devtools',
                            targetId: target.targetId,
                            url: target.url,
                            tabId: target.inspectedTabId
                        };
                    }
                    break;
                case 'content_script':
                    // 内容脚本需要通过tabId匹配
                    if (tabId && target.type === 'page' && target.tabId === tabId) {
                        log(`Found page target for tabId ${tabId}: ${target.targetId}, url: ${target.url}`);
                        // 验证该tab确实有该扩展的内容脚本
                        const hasContentScript = await this.contentScript.hasContentScriptInTab(extensionId, tabId);
                        log(`Content script verification for ${extensionId} in tab ${tabId}: ${hasContentScript}`);
                        if (hasContentScript) {
                            return {
                                extensionId,
                                contextType: 'content_script',
                                targetId: target.targetId,
                                url: target.url,
                                tabId: tabId
                            };
                        }
                    }
                    break;
            }
        }
        return null;
    }
    /**
     * 执行上下文切换
     */
    async performContextSwitch(target) {
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient) {
            return { success: false };
        }
        try {
            // 附加到目标
            const attachResult = await cdpClient.Target.attachToTarget({
                targetId: target.targetId,
                flatten: true
            });
            if (attachResult.sessionId) {
                // 在新会话中启用必要的域
                // 使用会话发送命令
                await cdpClient.Runtime.enable({ sessionId: attachResult.sessionId });
                await cdpClient.Console.enable({ sessionId: attachResult.sessionId });
                // 如果是页面类型，还启用Page域
                if (target.contextType !== 'background') {
                    try {
                        await cdpClient.Page.enable({ sessionId: attachResult.sessionId });
                    }
                    catch (e) {
                        // 某些上下文可能不支持Page域，忽略错误
                        log('Page domain not available for context:', target.contextType);
                    }
                }
                log('Successfully switched to context:', target);
                return { success: true, sessionId: attachResult.sessionId };
            }
            return { success: false };
        }
        catch (e) {
            log('Failed to attach to target:', e);
            return { success: false };
        }
    }
    /**
     * 检测上下文能力
     */
    async detectContextCapabilities(target) {
        const cdpClient = this.chromeManager.getCdpClient();
        const capabilities = {
            canEvaluate: false,
            canInjectScript: false,
            canAccessStorage: false,
            chromeAPIs: []
        };
        if (!cdpClient)
            return capabilities;
        try {
            // 测试基础JavaScript执行能力
            const evalResult = await cdpClient.Runtime.evaluate({
                expression: 'typeof window',
                returnByValue: true,
                awaitPromise: true
            });
            capabilities.canEvaluate = !evalResult.exceptionDetails;
            // 检测Chrome API可用性
            const apiCheckResult = await cdpClient.Runtime.evaluate({
                expression: `
          (() => {
            const apis = [];
            if (typeof chrome !== 'undefined') {
              // 检测常见的Chrome API
              const commonAPIs = [
                'runtime', 'storage', 'tabs', 'windows', 'management',
                'permissions', 'contextMenus', 'notifications', 'alarms',
                'webNavigation', 'webRequest', 'cookies', 'bookmarks', 'history'
              ];
              
              commonAPIs.forEach(api => {
                if (chrome[api]) apis.push(api);
              });
            }
            return apis;
          })()
        `,
                returnByValue: true,
                awaitPromise: true
            });
            if (apiCheckResult.result?.value) {
                capabilities.chromeAPIs = apiCheckResult.result.value;
                capabilities.canAccessStorage = capabilities.chromeAPIs.includes('storage');
            }
            // 根据上下文类型设置注入能力
            capabilities.canInjectScript = ['background', 'content_script', 'popup', 'options'].includes(target.contextType);
        }
        catch (e) {
            log('Failed to detect context capabilities:', e);
        }
        return capabilities;
    }
}
//# sourceMappingURL=ExtensionContextManager.js.map