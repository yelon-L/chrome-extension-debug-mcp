/**
 * Phase 1.3: 扩展综合影响量化类型定义
 *
 * 这个模块定义了 measure_extension_impact 工具所需的类型，
 * 用于综合评估扩展对页面性能、网络和用户体验的整体影响。
 */
import { PerformanceAnalysisResult } from './performance-types.js';
import { NetworkAnalysis } from './network-types.js';
/**
 * 测试页面配置
 */
export interface TestPage {
    url: string;
    name?: string;
    waitTime?: number;
}
/**
 * 综合影响测量选项
 */
export interface MeasureExtensionImpactArgs {
    extensionId: string;
    testPages: TestPage[] | string[];
    iterations?: number;
    performanceDuration?: number;
    networkDuration?: number;
    includeNetworkDetails?: boolean;
    compareBaseline?: boolean;
}
/**
 * 单次测试结果
 */
export interface SingleTestResult {
    page: string;
    iteration: number;
    performance: PerformanceAnalysisResult;
    network: NetworkAnalysis;
    timestamp: number;
}
/**
 * 页面级别的聚合结果
 */
export interface PageImpactSummary {
    pageUrl: string;
    pageName: string;
    iterations: number;
    avgPerformance: {
        cpuIncrease: number;
        memoryIncrease: number;
        executionTimeIncrease: number;
        lcpIncrease: number;
        fidIncrease: number;
        clsIncrease: number;
    };
    avgNetwork: {
        totalRequests: number;
        totalDataTransferred: number;
        averageRequestTime: number;
        failedRequests: number;
    };
    impactScore: number;
    impactLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
}
/**
 * 扩展整体影响报告
 */
export interface ExtensionImpactReport {
    extensionId: string;
    extensionName: string;
    testDate: number;
    configuration: {
        totalPages: number;
        iterationsPerPage: number;
        totalTests: number;
    };
    pageResults: PageImpactSummary[];
    overall: {
        avgCpuIncrease: number;
        avgMemoryIncrease: number;
        avgExecutionTimeIncrease: number;
        avgLcpIncrease: number;
        avgFidIncrease: number;
        avgClsIncrease: number;
        avgRequestsPerPage: number;
        avgDataPerPage: number;
        avgRequestTimePerPage: number;
        overallImpactScore: number;
        overallImpactLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
    };
    keyFindings: string[];
    recommendations: string[];
    summary: string;
    detailedResults?: SingleTestResult[];
}
/**
 * 影响级别阈值配置
 */
export interface ImpactThresholds {
    cpu: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
    memory: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
    lcp: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
    cls: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
    requests: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
    dataSize: {
        minimal: number;
        low: number;
        medium: number;
        high: number;
    };
}
//# sourceMappingURL=impact-types.d.ts.map