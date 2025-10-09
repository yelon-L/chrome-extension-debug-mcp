/**
 * 基础扩展检测模块
 * 负责Chrome扩展的发现和基础信息获取
 */
// 简化日志函数
const log = (...args) => console.error('[ExtensionDetector]', ...args);
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
export class ExtensionDetector {
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
            extensionTargets.forEach((target) => {
                if (target.url) {
                    const match = target.url.match(/chrome-extension:\/\/([a-z]{32})/);
                    if (match) {
                        const extensionId = match[1];
                        if (!extensionIds.has(extensionId)) {
                            extensionIds.add(extensionId);
                            extensions.push({
                                id: extensionId,
                                url: target.url,
                                type: target.type,
                                title: target.title || 'Unknown Extension',
                                targetId: target.targetId
                            });
                        }
                    }
                }
            });
            log(`Discovered ${extensions.length} unique extensions`);
            return extensions;
        }
        catch (e) {
            log('Failed to list extensions:', e);
            throw new McpError(ErrorCode.InternalError, `Failed to list extensions: ${e}`);
        }
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