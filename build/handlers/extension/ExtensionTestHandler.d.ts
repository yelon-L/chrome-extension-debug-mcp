/**
 * Week 4: 批量扩展测试处理器
 * 实现扩展在多个页面的批量测试和分析
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
import { TestExtensionOnMultiplePagesArgs, ExtensionTestResult } from '../../types/extension-test-types.js';
export declare class ExtensionTestHandler {
    private chromeManager;
    private pageManager;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 安全获取错误消息
     */
    private getErrorMessage;
    /**
     * Week 4核心功能：在多个页面批量测试扩展
     */
    testExtensionOnMultiplePages(args: TestExtensionOnMultiplePagesArgs): Promise<ExtensionTestResult>;
    /**
     * 获取扩展基础信息
     */
    private getExtensionInfo;
    /**
     * 执行批量并发测试
     */
    private executeBatchTests;
    /**
     * 等待可用的并发槽位
     */
    private waitForAvailableSlot;
    /**
     * 测试单个页面
     */
    private testSinglePage;
    /**
     * 等待页面加载完成
     */
    private waitForPageLoad;
    /**
     * 执行测试用例
     */
    private executeTestCases;
    /**
     * 执行默认测试
     */
    private executeDefaultTests;
    /**
     * 检查内容脚本注入状态
     */
    private checkContentScriptInjection;
    /**
     * 执行自定义脚本
     */
    private executeCustomScript;
    /**
     * 创建失败页面结果
     */
    private createFailedPageResult;
    /**
     * 生成测试摘要
     */
    private generateTestSummary;
    /**
     * 分析性能影响
     */
    private analyzePerformanceImpact;
    /**
     * 生成优化建议
     */
    private generateRecommendations;
}
//# sourceMappingURL=ExtensionTestHandler.d.ts.map