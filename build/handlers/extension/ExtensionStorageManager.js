/**
 * 扩展存储管理模块
 * 负责扩展存储的检查、监控和分析
 */
// 简化日志函数
const log = (...args) => console.error('[ExtensionStorageManager]', ...args);
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
export class ExtensionStorageManager {
    constructor(chromeManager, pageManager, contextManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
        this.contextManager = contextManager;
    }
    /**
     * Week 2 Day 11-12: 检查扩展存储
     */
    async inspectExtensionStorage(args) {
        try {
            const { extensionId, storageTypes = ['local', 'sync', 'session', 'managed'], keys, watch = false } = args;
            log('Inspecting extension storage', { extensionId, storageTypes, keys, watch });
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new McpError(ErrorCode.InternalError, 'Chrome not connected. Please attach to Chrome first.');
            }
            // 1. 找到扩展的背景上下文或任意有权限的上下文
            const targetContext = await this.findStorageAccessibleContext(extensionId);
            if (!targetContext) {
                throw new McpError(ErrorCode.InvalidParams, `Cannot find accessible context for extension ${extensionId} to inspect storage`);
            }
            // 2. 切换到目标上下文
            const switchResult = await this.contextManager.performContextSwitch(targetContext);
            if (!switchResult.success) {
                throw new McpError(ErrorCode.InternalError, `Failed to switch to context for storage inspection`);
            }
            // 2.5. 尝试唤醒Service Worker（如果是Service Worker上下文）
            if (targetContext.contextType === 'background' && targetContext.url.includes('service_worker')) {
                log('Detected Service Worker context, attempting to wake it up...');
                await this.wakeUpServiceWorker(extensionId, switchResult.sessionId);
                // 等待Service Worker完全唤醒
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            // 3. 检查存储访问能力
            const capabilities = await this.detectStorageCapabilities(targetContext, switchResult.sessionId);
            // 4. 读取存储数据（带重试机制）
            const storageData = await this.readExtensionStorageDataWithRetry(extensionId, storageTypes, keys, switchResult.sessionId);
            const response = {
                extensionId,
                storageData,
                watching: watch, // TODO: 实现监控功能
                capabilities
            };
            log('Storage inspection completed', { extensionId, dataTypes: storageData.length });
            return response;
        }
        catch (e) {
            log('Failed to inspect extension storage:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to inspect extension storage: ${e}`);
        }
    }
    /**
     * 查找可访问存储的上下文
     */
    async findStorageAccessibleContext(extensionId) {
        // 优先尝试Background上下文，通常有完整的存储权限
        const backgroundContext = await this.contextManager.findTargetContext(extensionId, 'background');
        if (backgroundContext) {
            return backgroundContext;
        }
        // 如果没有Background，尝试popup或options页面
        const popupContext = await this.contextManager.findTargetContext(extensionId, 'popup');
        if (popupContext) {
            return popupContext;
        }
        const optionsContext = await this.contextManager.findTargetContext(extensionId, 'options');
        if (optionsContext) {
            return optionsContext;
        }
        // 最后尝试content script，但权限可能有限
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient)
            return null;
        const result = await cdpClient.Target.getTargets();
        const allTargets = result.targetInfos;
        // 查找有该扩展内容脚本的页面（限制检查数量，避免卡顿）
        const pageTargets = allTargets.filter((target) => target.type === 'page' && target.tabId);
        const maxPagesToCheck = Math.min(pageTargets.length, 5); // 最多检查5个页面
        for (let i = 0; i < maxPagesToCheck; i++) {
            const target = pageTargets[i];
            try {
                const hasContentScript = await this.verifyContentScript(extensionId, target.tabId);
                if (hasContentScript) {
                    return {
                        extensionId,
                        contextType: 'content_script',
                        targetId: target.targetId,
                        url: target.url || '',
                        tabId: target.tabId
                    };
                }
            }
            catch (e) {
                log(`Skip checking tab ${target.tabId} due to error:`, e);
                continue;
            }
        }
        return null;
    }
    /**
     * 验证内容脚本存在 - 带超时控制
     */
    async verifyContentScript(extensionId, tabId) {
        const page = this.pageManager.getTabIdToPageMap().get(tabId);
        if (!page)
            return false;
        try {
            // 添加3秒超时控制
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Content script verification timeout')), 3000);
            });
            const verifyPromise = page.evaluate((extId) => {
                // 检查扩展相关的脚本或标记
                const scripts = Array.from(document.querySelectorAll('script[src*="chrome-extension://"]'));
                const hasExtensionScript = scripts.some(script => script.src.includes(extId));
                const hasExtensionMarker = document.documentElement.getAttribute(`data-extension-${extId}`) !== null;
                return hasExtensionScript || hasExtensionMarker || window[`ext_${extId}_loaded`];
            }, extensionId);
            const hasScript = await Promise.race([verifyPromise, timeoutPromise]);
            return hasScript;
        }
        catch (e) {
            log(`Content script verification failed for tab ${tabId}:`, e);
            return false;
        }
    }
    /**
     * 检测存储访问能力
     */
    async detectStorageCapabilities(context, sessionId) {
        const cdpClient = this.chromeManager.getCdpClient();
        const capabilities = {
            canRead: false,
            canWrite: false,
            canClear: false
        };
        if (!cdpClient)
            return capabilities;
        try {
            // 测试存储API可用性
            const testResult = await cdpClient.Runtime.evaluate({
                expression: `
          (() => {
            const result = {
              canRead: false,
              canWrite: false,
              canClear: false,
              apis: []
            };
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
              result.apis.push('storage');
              
              // 检查各种存储类型的可用性
              if (chrome.storage.local) {
                result.apis.push('storage.local');
                result.canRead = true;
                result.canWrite = true;
                result.canClear = true;
              }
              
              if (chrome.storage.sync) {
                result.apis.push('storage.sync');
              }
              
              if (chrome.storage.session) {
                result.apis.push('storage.session');
              }
              
              if (chrome.storage.managed) {
                result.apis.push('storage.managed');
              }
            }
            
            return result;
          })()
        `,
                returnByValue: true,
                awaitPromise: true
            }, sessionId);
            if (testResult.result?.value) {
                const apiResult = testResult.result.value;
                capabilities.canRead = apiResult.canRead;
                capabilities.canWrite = apiResult.canWrite;
                capabilities.canClear = apiResult.canClear;
            }
        }
        catch (e) {
            log('Failed to detect storage capabilities:', e);
        }
        return capabilities;
    }
    /**
     * 唤醒Service Worker
     * 通过发送简单的消息来激活休眠的Service Worker
     */
    async wakeUpServiceWorker(extensionId, sessionId) {
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient)
            return;
        try {
            // 方法1: 尝试访问chrome.storage API来唤醒
            const wakeUpScript = `
        new Promise((resolve) => {
          // 简单的存储访问操作来唤醒Service Worker
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, () => {
              resolve({ awake: true });
            });
          } else {
            resolve({ awake: false });
          }
        })
      `;
            await cdpClient.Runtime.evaluate({
                expression: wakeUpScript,
                returnByValue: true,
                awaitPromise: true
            }, sessionId);
            log('Service Worker wake-up attempt completed');
        }
        catch (e) {
            log('Service Worker wake-up failed (non-critical):', e);
            // 唤醒失败不是致命错误，继续执行
        }
    }
    /**
     * 带重试机制的存储数据读取
     */
    async readExtensionStorageDataWithRetry(extensionId, storageTypes, keys, sessionId, maxRetries = 2) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log(`Storage read attempt ${attempt}/${maxRetries} for extension ${extensionId}`);
                const result = await this.readExtensionStorageData(extensionId, storageTypes, keys, sessionId);
                // 如果成功读取到数据（至少有一个存储类型有数据），直接返回
                const hasData = result.some(storage => Object.keys(storage.data).length > 0);
                if (hasData || attempt === maxRetries) {
                    return result;
                }
                // 如果没有数据且不是最后一次尝试，等待后重试
                if (attempt < maxRetries) {
                    log(`No data found, retrying after 1 second...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                lastError = error;
                log(`Storage read attempt ${attempt}/${maxRetries} failed:`, error);
                if (attempt < maxRetries) {
                    // 等待后重试
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        // 所有重试都失败，返回空数据而不抛出错误（优雅降级）
        log(`All ${maxRetries} storage read attempts failed, returning empty data`);
        return storageTypes.map(type => ({
            type: type,
            data: {},
            quota: undefined,
            lastModified: Date.now()
        }));
    }
    /**
     * 读取扩展存储数据
     */
    async readExtensionStorageData(extensionId, storageTypes, keys, sessionId) {
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient)
            return [];
        const storageData = [];
        for (const storageType of storageTypes) {
            try {
                log(`Reading ${storageType} storage for extension ${extensionId}`);
                // 构造存储读取脚本
                const keysFilter = keys ? JSON.stringify(keys) : 'null';
                const readScript = `
          new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.${storageType}) {
              resolve({ data: {}, quota: null, error: 'Storage type not available' });
              return;
            }

            const storageArea = chrome.storage.${storageType};
            const keys = ${keysFilter};

            // 读取数据
            storageArea.get(keys, (items) => {
              if (chrome.runtime.lastError) {
                resolve({ 
                  data: {}, 
                  quota: null, 
                  error: chrome.runtime.lastError.message 
                });
                return;
              }

              const result = {
                data: items || {},
                quota: null,
                error: null
              };

              // 尝试获取存储使用量（仅对local和sync有效）
              if (storageArea.getBytesInUse && (storageType === 'local' || storageType === 'sync')) {
                storageArea.getBytesInUse(null, (bytes) => {
                  if (!chrome.runtime.lastError) {
                    const maxBytes = storageType === 'local' ? 10485760 : 102400; // 10MB for local, 100KB for sync
                    result.quota = {
                      used: bytes,
                      total: maxBytes
                    };
                  }
                  resolve(result);
                });
              } else {
                resolve(result);
              }
            });
          })
        `;
                // 添加10秒超时控制（Service Worker可能需要更长唤醒时间）
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Storage ${storageType} read timeout`)), 10000);
                });
                const evalPromise = cdpClient.Runtime.evaluate({
                    expression: readScript,
                    returnByValue: true,
                    awaitPromise: true
                }, sessionId);
                const evalResult = await Promise.race([evalPromise, timeoutPromise]);
                if (evalResult.result?.value) {
                    const storageResult = evalResult.result.value;
                    if (storageResult.error) {
                        log(`Storage ${storageType} read error:`, storageResult.error);
                        // 添加空的存储数据记录错误
                        storageData.push({
                            type: storageType,
                            data: {},
                            quota: storageResult.quota,
                            lastModified: Date.now()
                        });
                    }
                    else {
                        storageData.push({
                            type: storageType,
                            data: storageResult.data || {},
                            quota: storageResult.quota,
                            lastModified: Date.now()
                        });
                    }
                }
            }
            catch (e) {
                log(`Failed to read ${storageType} storage:`, e);
                // 添加错误记录
                storageData.push({
                    type: storageType,
                    data: {},
                    quota: undefined,
                    lastModified: Date.now()
                });
            }
        }
        return storageData;
    }
    /**
     * 启动存储监控（未来功能）
     */
    async startStorageWatcher(extensionId, storageTypes) {
        // TODO: 实现存储变更监控
        log('Storage watching not implemented yet', { extensionId, storageTypes });
    }
    /**
     * 停止存储监控（未来功能）
     */
    async stopStorageWatcher(extensionId) {
        // TODO: 实现停止监控
        log('Storage watching not implemented yet', { extensionId });
    }
}
//# sourceMappingURL=ExtensionStorageManager.js.map