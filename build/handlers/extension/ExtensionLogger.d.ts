/**
 * 扩展日志分析模块
 * 负责Chrome扩展的日志收集、过滤和分析
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { GetExtensionLogsArgs, ExtensionLogsResponse } from '../../types/index.js';
export declare class ExtensionLogger {
    private chromeManager;
    constructor(chromeManager: ChromeManager);
    /**
     * 获取扩展相关日志
     */
    getExtensionLogs(args: GetExtensionLogsArgs): Promise<ExtensionLogsResponse>;
    /**
     * 收集控制台日志
     */
    private collectConsoleLogs;
    /**
     * 判断日志是否与扩展相关
     */
    private isExtensionRelated;
    /**
     * 增强日志信息
     */
    private enhanceLogs;
    /**
     * 从URL提取扩展ID
     */
    private extractExtensionIdFromUrl;
    /**
     * 分类日志
     */
    private categorizeLog;
    /**
     * 分析日志统计
     */
    private analyzeLogs;
    /**
     * 清理控制台日志
     */
    private clearConsoleLogs;
}
//# sourceMappingURL=ExtensionLogger.d.ts.map