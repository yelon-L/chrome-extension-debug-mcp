/**
 * 基础扩展检测模块
 * 负责Chrome扩展的发现和基础信息获取
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { ListExtensionsArgs } from '../../types/index.js';
export declare class ExtensionDetector {
    private chromeManager;
    constructor(chromeManager: ChromeManager);
    /**
     * 列出所有Chrome扩展
     */
    listExtensions(args: ListExtensionsArgs): Promise<any[]>;
    /**
     * 获取扩展完整信息（包括名称）
     */
    getExtensionFullInfo(extensionId: string): Promise<any>;
    /**
     * 提取扩展ID从URL
     */
    extractExtensionId(url: string): string | null;
    /**
     * 获取扩展基本信息
     */
    getExtensionInfo(extensionId: string): Promise<{
        name: string;
        version: string;
    } | null>;
}
//# sourceMappingURL=ExtensionDetector.d.ts.map