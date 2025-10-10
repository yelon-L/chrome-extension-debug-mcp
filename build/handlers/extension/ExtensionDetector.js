/**
 * 基础扩展检测模块
 * 负责Chrome扩展的发现和基础信息获取
 */
// 简化日志函数
const log = (...args) => console.error('[ExtensionDetector]', ...args);
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
export class ExtensionDetector {
    chromeManager;
    constructor(chromeManager) {
        this.chromeManager = chromeManager;
    }
    /**
     * 列出所有Chrome扩展
     */
    async listExtensions(args) {
        try {
            log('Listing Chrome extensions');
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new McpError(ErrorCode.InternalError, 'Chrome not connected. Please attach to Chrome first.');
            }
            const result = await cdpClient.Target.getTargets();
            const allTargets = result.targetInfos;
            log(`Found ${allTargets.length} total targets`);
            // 过滤扩展相关的targets
            const extensionTargets = allTargets.filter((target) => {
                // Service Worker (MV3 扩展)
                if (target.type === 'service_worker' && target.url?.startsWith('chrome-extension://')) {
                    return true;
                }
                // Background Page (MV2 扩展)
                if (target.type === 'background_page') {
                    return true;
                }
                // Extension Pages
                if (target.type === 'page' && target.url?.startsWith('chrome-extension://')) {
                    return true;
                }
                return false;
            });
            log(`Found ${extensionTargets.length} extension targets`);
            // 提取扩展ID并去重
            const extensionIds = new Set();
            const extensions = [];
            // 收集扩展信息并获取名称
            for (const target of extensionTargets) {
                if (target.url) {
                    const match = target.url.match(/chrome-extension:\/\/([a-z]{32})/);
                    if (match) {
                        const extensionId = match[1];
                        if (!extensionIds.has(extensionId)) {
                            extensionIds.add(extensionId);
                            // 尝试获取扩展完整信息
                            const extInfo = await this.getExtensionFullInfo(extensionId);
                            extensions.push({
                                id: extensionId,
                                name: extInfo?.name || target.title || 'Unknown Extension',
                                version: extInfo?.version || 'unknown',
                                description: extInfo?.description || '',
                                url: target.url,
                                type: target.type,
                                title: target.title || 'Unknown Extension',
                                targetId: target.targetId,
                                enabled: extInfo?.enabled !== false
                            });
                        }
                    }
                }
            }
            log(`Discovered ${extensions.length} unique extensions`);
            return extensions;
        }
        catch (e) {
            log('Failed to list extensions:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to list extensions: ${e}`);
        }
    }
    /**
     * 获取扩展完整信息（包括名称）
     * 使用 Target.attachToTarget 在扩展 context 中执行
     */
    async getExtensionFullInfo(extensionId) {
        try {
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient)
                return null;
            // 方法1: 通过 attachToTarget 在扩展 context 中获取 manifest
            const { targetInfos } = await cdpClient.Target.getTargets();
            const swTarget = targetInfos.find((t) => t.type === 'service_worker' &&
                t.url &&
                t.url.includes(extensionId));
            if (swTarget) {
                let sessionId;
                try {
                    // 附加到 Service Worker target
                    const attachResult = await cdpClient.Target.attachToTarget({
                        targetId: swTarget.targetId,
                        flatten: true
                    });
                    sessionId = attachResult.sessionId;
                    // 在 Service Worker context 中执行
                    const result = await cdpClient.Runtime.evaluate({
                        expression: `
              (() => {
                try {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                    const manifest = chrome.runtime.getManifest();
                    return {
                      name: manifest.name,
                      version: manifest.version,
                      description: manifest.description,
                      manifestVersion: manifest.manifest_version
                    };
                  }
                  return null;
                } catch (e) {
                  return { error: e.message };
                }
              })()
            `,
                        returnByValue: true,
                        awaitPromise: false
                    });
                    // 立即分离 session
                    if (sessionId) {
                        await cdpClient.Target.detachFromTarget({ sessionId });
                        sessionId = undefined;
                    }
                    if (result.result?.value && !result.result.value.error) {
                        log('Successfully got manifest from Service Worker for', extensionId);
                        return result.result.value;
                    }
                }
                catch (e) {
                    log('Error attaching to service worker:', e);
                    if (sessionId) {
                        try {
                            await cdpClient.Target.detachFromTarget({ sessionId });
                        }
                        catch (detachError) {
                            // Ignore detach errors
                        }
                    }
                }
            }
            // 方法2: 尝试 Background Page (MV2 扩展)
            const bgTarget = targetInfos.find((t) => t.type === 'background_page' &&
                t.url &&
                t.url.includes(extensionId));
            if (bgTarget) {
                let sessionId;
                try {
                    const attachResult = await cdpClient.Target.attachToTarget({
                        targetId: bgTarget.targetId,
                        flatten: true
                    });
                    sessionId = attachResult.sessionId;
                    const result = await cdpClient.Runtime.evaluate({
                        expression: `
              (() => {
                try {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                    const manifest = chrome.runtime.getManifest();
                    return {
                      name: manifest.name,
                      version: manifest.version,
                      description: manifest.description,
                      manifestVersion: manifest.manifest_version
                    };
                  }
                  return null;
                } catch (e) {
                  return { error: e.message };
                }
              })()
            `,
                        returnByValue: true,
                        awaitPromise: false
                    });
                    if (sessionId) {
                        await cdpClient.Target.detachFromTarget({ sessionId });
                        sessionId = undefined;
                    }
                    if (result.result?.value && !result.result.value.error) {
                        log('Successfully got manifest from Background Page for', extensionId);
                        return result.result.value;
                    }
                }
                catch (e) {
                    log('Error attaching to background page:', e);
                    if (sessionId) {
                        try {
                            await cdpClient.Target.detachFromTarget({ sessionId });
                        }
                        catch (detachError) {
                            // Ignore detach errors
                        }
                    }
                }
            }
            // 方法3: Fallback - 从目标标题提取名称（不完整）
            const extensionTarget = targetInfos.find((target) => target.url && target.url.includes(extensionId) && target.title);
            if (extensionTarget) {
                const extractedName = this.extractNameFromTitle(extensionTarget.title);
                if (extractedName) {
                    return {
                        name: extractedName,
                        version: 'unknown',
                        description: 'Detected from target info (incomplete)'
                    };
                }
            }
            return null;
        }
        catch (error) {
            log('Failed to get extension info:', error);
            return null;
        }
    }
    /**
     * 从 target title 提取扩展名称
     */
    extractNameFromTitle(title) {
        if (!title)
            return null;
        // "Service Worker chrome-extension://xxx/background/index.js" -> null
        if (title.includes('Service Worker') || title.includes('chrome-extension://')) {
            return null;
        }
        return title;
    }
    /**
     * 提取扩展ID从URL
     */
    extractExtensionId(url) {
        const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
        return match ? match[1] : null;
    }
    /**
     * 获取扩展基本信息
     */
    async getExtensionInfo(extensionId) {
        try {
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient)
                return null;
            // 尝试通过chrome.management API获取扩展信息
            const result = await cdpClient.Runtime.evaluate({
                expression: `
          new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.management) {
              chrome.management.get('${extensionId}', (ext) => {
                if (chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve({ name: ext.name, version: ext.version });
                }
              });
            } else {
              resolve(null);
            }
          })
        `,
                awaitPromise: true,
                returnByValue: true
            });
            return result.result?.value || null;
        }
        catch (e) {
            log('Failed to get extension info:', e);
            return null;
        }
    }
}
//# sourceMappingURL=ExtensionDetector.js.map