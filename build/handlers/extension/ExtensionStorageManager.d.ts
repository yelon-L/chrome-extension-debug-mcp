/**
 * 扩展存储管理模块
 * 负责扩展存储的检查、监控和分析
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
import { ExtensionContextManager } from './ExtensionContextManager.js';
import { InspectExtensionStorageArgs, InspectExtensionStorageResponse } from '../../types/index.js';
export declare class ExtensionStorageManager {
    private chromeManager;
    private pageManager;
    private contextManager;
    constructor(chromeManager: ChromeManager, pageManager: PageManager, contextManager: ExtensionContextManager);
    /**
     * Week 2 Day 11-12: 检查扩展存储
     */
    inspectExtensionStorage(args: InspectExtensionStorageArgs): Promise<InspectExtensionStorageResponse>;
    /**
     * 查找可访问存储的上下文
     */
    private findStorageAccessibleContext;
    /**
     * 验证内容脚本存在 - 带超时控制
     */
    private verifyContentScript;
    /**
     * 检测存储访问能力
     */
    private detectStorageCapabilities;
    /**
     * 唤醒Service Worker
     * 通过发送简单的消息来激活休眠的Service Worker
     */
    private wakeUpServiceWorker;
    /**
     * 带重试机制的存储数据读取
     */
    private readExtensionStorageDataWithRetry;
    /**
     * 读取扩展存储数据
     */
    private readExtensionStorageData;
    /**
     * 启动存储监控（未来功能）
     */
    startStorageWatcher(extensionId: string, storageTypes: string[]): Promise<void>;
    /**
     * 停止存储监控（未来功能）
     */
    stopStorageWatcher(extensionId: string): Promise<void>;
}
//# sourceMappingURL=ExtensionStorageManager.d.ts.map