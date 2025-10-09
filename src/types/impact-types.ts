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
  url: string;                // 测试页面URL
  name?: string;              // 页面名称（用于报告）
  waitTime?: number;          // 页面加载后等待时间（ms）
}

/**
 * 综合影响测量选项
 */
export interface MeasureExtensionImpactArgs {
  extensionId: string;                // 扩展ID
  testPages: TestPage[] | string[];   // 测试页面列表
  iterations?: number;                // 每个页面的测试迭代次数（默认3次求平均）
  performanceDuration?: number;       // 性能trace录制时长（ms，默认2000）
  networkDuration?: number;           // 网络监控时长（ms，默认5000）
  includeNetworkDetails?: boolean;    // 是否包含详细网络请求（默认false）
  compareBaseline?: boolean;          // 是否对比基准（无扩展情况，默认true）
}

/**
 * 单次测试结果
 */
export interface SingleTestResult {
  page: string;                           // 页面URL
  iteration: number;                      // 迭代次数
  performance: PerformanceAnalysisResult; // 性能分析结果
  network: NetworkAnalysis;               // 网络分析结果
  timestamp: number;                      // 测试时间戳
}

/**
 * 页面级别的聚合结果
 */
export interface PageImpactSummary {
  pageUrl: string;                    // 页面URL
  pageName: string;                   // 页面名称
  iterations: number;                 // 测试次数
  
  // 平均性能指标
  avgPerformance: {
    cpuIncrease: number;              // 平均CPU增加（%）
    memoryIncrease: number;           // 平均内存增加（MB）
    executionTimeIncrease: number;    // 平均执行时间增加（ms）
    lcpIncrease: number;              // 平均LCP增加（ms）
    fidIncrease: number;              // 平均FID增加（ms）
    clsIncrease: number;              // 平均CLS增加
  };
  
  // 网络影响
  avgNetwork: {
    totalRequests: number;            // 平均请求数
    totalDataTransferred: number;     // 平均数据传输（bytes）
    averageRequestTime: number;       // 平均请求时间（ms）
    failedRequests: number;           // 平均失败请求数
  };
  
  // 综合评分（0-100，越低越好）
  impactScore: number;
  
  // 影响级别
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
}

/**
 * 扩展整体影响报告
 */
export interface ExtensionImpactReport {
  extensionId: string;                    // 扩展ID
  extensionName: string;                  // 扩展名称
  testDate: number;                       // 测试时间戳
  
  // 测试配置
  configuration: {
    totalPages: number;                   // 测试页面数
    iterationsPerPage: number;            // 每页迭代次数
    totalTests: number;                   // 总测试次数
  };
  
  // 各页面结果
  pageResults: PageImpactSummary[];
  
  // 整体统计
  overall: {
    // 性能影响
    avgCpuIncrease: number;
    avgMemoryIncrease: number;
    avgExecutionTimeIncrease: number;
    avgLcpIncrease: number;
    avgFidIncrease: number;
    avgClsIncrease: number;
    
    // 网络影响
    avgRequestsPerPage: number;
    avgDataPerPage: number;
    avgRequestTimePerPage: number;
    
    // 综合评分和级别
    overallImpactScore: number;           // 0-100
    overallImpactLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
  };
  
  // 关键发现
  keyFindings: string[];
  
  // 建议
  recommendations: string[];
  
  // 摘要
  summary: string;
  
  // 详细测试结果（可选）
  detailedResults?: SingleTestResult[];
}

/**
 * 影响级别阈值配置
 */
export interface ImpactThresholds {
  // 性能阈值
  cpu: { minimal: number; low: number; medium: number; high: number };
  memory: { minimal: number; low: number; medium: number; high: number };
  lcp: { minimal: number; low: number; medium: number; high: number };
  cls: { minimal: number; low: number; medium: number; high: number };
  
  // 网络阈值
  requests: { minimal: number; low: number; medium: number; high: number };
  dataSize: { minimal: number; low: number; medium: number; high: number };
}
