/**
 * Phase 1.3: 扩展综合影响量化器
 *
 * 这个类负责综合评估扩展对页面性能、网络和用户体验的整体影响。
 * 它通过运行多次测试并聚合结果，提供准确的影响量化报告。
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
import { MeasureExtensionImpactArgs, ExtensionImpactReport } from '../../types/impact-types.js';
export declare class ExtensionImpactMeasurer {
    private chromeManager;
    private pageManager;
    private performanceAnalyzer;
    private networkMonitor;
    private readonly DEFAULT_THRESHOLDS;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 主方法：测量扩展的综合影响
     */
    measureImpact(args: MeasureExtensionImpactArgs): Promise<ExtensionImpactReport>;
    /**
     * 执行单次测试
     */
    private runSingleTest;
    /**
     * 按页面聚合结果
     */
    private aggregateByPage;
    /**
     * 计算整体统计
     */
    private calculateOverallStats;
    /**
     * 计算影响分数（0-100，越高影响越大）
     */
    private calculateImpactScore;
    /**
     * 根据分数计算影响级别
     */
    private calculateImpactLevel;
    /**
     * 生成关键发现
     */
    private generateKeyFindings;
    /**
     * 生成优化建议
     */
    private generateRecommendations;
    /**
     * 生成摘要
     */
    private generateSummary;
    /**
     * 工具方法：标准化测试页面列表
     */
    private normalizeTestPages;
    /**
     * 工具方法：计算平均值
     */
    private average;
    /**
     * 工具方法：从URL提取页面名称
     */
    private extractPageName;
    /**
     * 工具方法：获取扩展名称
     */
    private getExtensionName;
    /**
     * 工具方法：获取影响级别emoji
     */
    private getImpactLevelEmoji;
}
//# sourceMappingURL=ExtensionImpactMeasurer.d.ts.map