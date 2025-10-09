/**
 * 扩展日志搜索增强模块
 * Phase 4: 交互与快照增强 - 日志分析功能
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { ExtensionLogEntry } from '../../types/index.js';
export interface LogSearchOptions {
    query: string;
    extensionId?: string;
    extensionIds?: string[];
    level?: string[];
    sourceTypes?: string[];
    since?: number;
    until?: number;
    limit?: number;
    caseSensitive?: boolean;
    useRegex?: boolean;
    includeContext?: boolean;
}
export interface LogSearchResult {
    matches: LogSearchMatch[];
    totalMatches: number;
    searchOptions: LogSearchOptions;
    statistics: {
        matchesByLevel: Record<string, number>;
        matchesBySource: Record<string, number>;
        matchesByExtension: Record<string, number>;
        timeRange: {
            earliest: number;
            latest: number;
        };
    };
    performance: {
        searchTimeMs: number;
        logsScanned: number;
        matchRate: number;
    };
}
export interface LogSearchMatch {
    logEntry: ExtensionLogEntry;
    matchDetails: {
        field: 'message' | 'source' | 'url';
        matchText: string;
        contextBefore?: string;
        contextAfter?: string;
        position: number;
        length: number;
    }[];
    relevanceScore: number;
}
export interface LogExportOptions {
    extensionId?: string;
    extensionIds?: string[];
    level?: string[];
    sourceTypes?: string[];
    since?: number;
    until?: number;
    format: 'json' | 'csv' | 'txt';
    includeMetadata?: boolean;
}
export interface LogExportResult {
    data: string;
    format: string;
    totalLogs: number;
    exportedLogs: number;
    metadata: {
        exportTime: number;
        timeRange: {
            earliest: number;
            latest: number;
        };
        filters: LogExportOptions;
    };
}
export interface LogPatternAnalysis {
    patterns: LogPattern[];
    statistics: {
        totalLogs: number;
        uniquePatterns: number;
        mostCommonPattern: string;
        errorRate: number;
        warningRate: number;
    };
    timeline: {
        interval: string;
        data: Array<{
            timestamp: number;
            count: number;
            errorCount: number;
            warningCount: number;
        }>;
    };
}
export interface LogPattern {
    pattern: string;
    frequency: number;
    percentage: number;
    level: string;
    examples: string[];
    firstSeen: number;
    lastSeen: number;
}
export declare class ExtensionLogSearcher {
    private chromeManager;
    constructor(chromeManager: ChromeManager);
    /**
     * 搜索扩展日志
     */
    searchLogs(options: LogSearchOptions): Promise<LogSearchResult>;
    /**
     * 导出扩展日志
     */
    exportLogs(options: LogExportOptions): Promise<LogExportResult>;
    /**
     * 分析日志模式
     */
    analyzeLogPatterns(options: {
        extensionId?: string;
        timeRange?: {
            start: number;
            end: number;
        };
        minFrequency?: number;
    }): Promise<LogPatternAnalysis>;
    /**
     * 验证搜索选项
     */
    private validateSearchOptions;
    /**
     * 收集日志数据
     */
    private collectLogs;
    /**
     * 收集日志用于导出
     */
    private collectLogsForExport;
    /**
     * 执行搜索
     */
    private performSearch;
    /**
     * 搜索文本中的内容
     */
    private searchInText;
    /**
     * 获取匹配详情
     */
    private getMatchDetails;
    /**
     * 计算相关性分数
     */
    private calculateRelevanceScore;
    /**
     * 获取控制台日志
     */
    private getConsoleLogs;
    /**
     * 检查日志是否来自指定扩展
     */
    private isLogFromExtension;
    /**
     * 计算统计信息
     */
    private calculateStatistics;
    /**
     * 格式化日志用于导出
     */
    private formatLogs;
    /**
     * 格式化为CSV
     */
    private formatAsCSV;
    /**
     * 格式化为文本
     */
    private formatAsText;
    /**
     * 计算时间范围
     */
    private calculateTimeRange;
    /**
     * 提取日志模式
     */
    private extractPatterns;
    /**
     * 从日志消息中提取模式
     */
    private extractPattern;
    /**
     * 计算级别比率
     */
    private calculateLevelRate;
    /**
     * 生成时间线数据
     */
    private generateTimeline;
}
//# sourceMappingURL=ExtensionLogSearcher.d.ts.map