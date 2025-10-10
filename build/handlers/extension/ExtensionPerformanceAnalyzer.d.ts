/**
 * ExtensionPerformanceAnalyzer - 扩展性能分析器
 *
 * 功能：
 * - 录制Chrome性能trace
 * - 对比有/无扩展的性能差异
 * - 计算扩展对页面性能的影响
 * - 生成性能优化建议
 * - 集成Web Vitals实时测量
 */
import type { ChromeManager } from '../../managers/ChromeManager.js';
import type { PageManager } from '../../managers/PageManager.js';
import type { PerformanceAnalysisResult, PerformanceAnalysisOptions } from '../../types/performance-types.js';
import type { TraceResult } from '../../types/trace-types.js';
export declare class ExtensionPerformanceAnalyzer {
    private chromeManager;
    private pageManager;
    private lastTraceResult;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * Get the last recorded trace result (for insights extraction)
     */
    getLastTraceResult(): TraceResult | null;
    /**
     * 分析扩展性能影响
     */
    analyzePerformance(options: PerformanceAnalysisOptions): Promise<PerformanceAnalysisResult>;
    /**
     * 录制性能trace
     */
    private recordTrace;
    /**
     * 解析trace events
     */
    private parseTraceEvents;
    /**
     * 计算性能指标
     */
    private calculateMetrics;
    /**
     * 计算Core Web Vitals（增强版 - 结合trace events和实时测量）
     */
    private calculateCoreWebVitalsEnhanced;
    /**
     * 计算Core Web Vitals（旧版 - 保留兼容性）
     */
    private calculateCoreWebVitals;
    /**
     * 计算指标差异
     */
    private calculateDelta;
    /**
     * 计算CWV差异
     */
    private calculateCWVDelta;
    /**
     * 计算性能影响
     */
    private calculateImpact;
    /**
     * 生成优化建议（增强版 - 包含Web Vitals建议）
     */
    private generateRecommendations;
    /**
     * 生成摘要
     */
    private generateSummary;
    /**
     * 计算影响级别
     */
    private calculateImpactLevel;
    /**
     * Get Chrome DevTools trace summary
     */
    getDevToolsTraceSummary(): Promise<string>;
    /**
     * List available Performance Insights
     */
    listPerformanceInsights(): Promise<string[]>;
    /**
     * Get specific Performance Insight
     */
    getPerformanceInsight(insightName: string): Promise<string>;
    /**
     * Get extension-specific trace events
     */
    getExtensionTraceEvents(extensionId: string): Promise<{
        events: any[];
        metrics: {
            totalDuration: number;
            eventCount: number;
            cpuTime: number;
            scriptTime: number;
        };
        summary?: undefined;
        error?: undefined;
    } | {
        events: import("../../types/trace-types.js").ExtensionTraceEvent[];
        metrics: {
            totalDuration: number;
            eventCount: number;
            cpuTime: number;
            scriptTime: number;
        };
        summary: string;
        error?: undefined;
    } | {
        events: any[];
        metrics: {
            totalDuration: number;
            eventCount: number;
            cpuTime: number;
            scriptTime: number;
        };
        error: string;
        summary?: undefined;
    }>;
}
//# sourceMappingURL=ExtensionPerformanceAnalyzer.d.ts.map