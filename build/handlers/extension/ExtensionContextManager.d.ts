/**
 * 扩展上下文管理模块
 * 负责扩展上下文的分析、切换和管理
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
import { ExtensionContentScript } from './ExtensionContentScript.js';
import { ListExtensionContextsArgs, ListExtensionContextsResponse, SwitchExtensionContextArgs, SwitchExtensionContextResponse } from '../../types/index.js';
/**
 * 上下文目标接口
 */
interface ContextTarget {
    extensionId: string;
    contextType: string;
    targetId: string;
    url: string;
    tabId?: string;
}
export declare class ExtensionContextManager {
    private chromeManager;
    private pageManager;
    private contentScript;
    constructor(chromeManager: ChromeManager, pageManager: PageManager, contentScript: ExtensionContentScript);
    /**
     * Week 2: 列出扩展的所有上下文
     */
    listExtensionContexts(args: ListExtensionContextsArgs): Promise<ListExtensionContextsResponse>;
    /**
     * Week 2 Day 8-10: 切换扩展上下文
     */
    switchExtensionContext(args: SwitchExtensionContextArgs): Promise<SwitchExtensionContextResponse>;
    /**
     * 分析所有扩展相关的Chrome目标
     */
    private analyzeExtensionTargets;
    /**
     * 为单个扩展构建完整的上下文信息
     */
    private buildExtensionContext;
    /**
     * 检测扩展在各个标签页中的Content Scripts
     */
    private detectContentScripts;
    /**
     * 获取扩展的manifest信息
     */
    private getExtensionManifestInfo;
    /**
     * 提取扩展ID
     */
    private extractExtensionId;
    /**
     * 计算扩展的总上下文数量
     */
    private countContexts;
    /**
     * 查找目标上下文
     */
    findTargetContext(extensionId: string, contextType: string, tabId?: string, targetId?: string): Promise<ContextTarget | null>;
    /**
     * 执行上下文切换
     */
    performContextSwitch(target: ContextTarget): Promise<{
        success: boolean;
        sessionId?: string;
    }>;
    /**
     * 检测上下文能力
     */
    private detectContextCapabilities;
}
export {};
//# sourceMappingURL=ExtensionContextManager.d.ts.map