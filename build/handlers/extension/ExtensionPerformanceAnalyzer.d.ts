/**
 * ExtensionPerformanceAnalyzer - 扩展性能分析器
 *
 * 功能：
 * - 录制Chrome性能trace
 * - 对比有/无扩展的性能差异
 * - 计算扩展对页面性能的影响
 * - 生成性能优化建议
 */
import type { ChromeManager } from '../../managers/ChromeManager.js';
import type { PageManager } from '../../managers/PageManager.js';
import type { PerformanceAnalysisResult, PerformanceAnalysisOptions } from '../../types/performance-types.js';
export declare class ExtensionPerformanceAnalyzer {
    private chromeManager;
    private pageManager;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
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
     * 计算Core Web Vitals
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
     * 生成优化建议
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
}
//# sourceMappingURL=ExtensionPerformanceAnalyzer.d.ts.map