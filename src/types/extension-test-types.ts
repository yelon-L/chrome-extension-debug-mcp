/**
 * Week 4: 批量扩展测试相关类型定义
 */

export interface TestExtensionOnMultiplePagesArgs {
  extensionId: string;
  testUrls: string[];
  testCases?: ExtensionTestCase[];
  timeout?: number; // 每个页面的测试超时时间 (ms)
  concurrency?: number; // 并发测试数量，默认3
  includePerformance?: boolean; // 是否包含性能分析
  generateReport?: boolean; // 是否生成详细报告
}

export interface ExtensionTestCase {
  name: string;
  description: string;
  checkInjection?: boolean; // 检查内容脚本注入
  checkAPICalls?: boolean; // 检查API调用
  checkStorage?: boolean; // 检查存储操作
  checkMessages?: boolean; // 检查消息传递
  customScript?: string; // 自定义验证脚本
  expectedResults?: Record<string, any>; // 预期结果
}

export interface ExtensionTestResult {
  extensionId: string;
  extensionName?: string;
  testStartTime: number;
  testEndTime: number;
  summary: ExtensionTestSummary;
  pageResults: ExtensionPageTestResult[];
  recommendations: string[];
  performanceImpact?: ExtensionPerformanceImpact;
}

export interface ExtensionTestSummary {
  totalPages: number;
  passedPages: number;
  failedPages: number;
  timeoutPages: number;
  totalDuration: number;
  averagePageLoadTime: number;
  successRate: number; // 成功率百分比
}

export interface ExtensionPageTestResult {
  url: string;
  tabId: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  startTime: number;
  endTime: number;
  duration: number;
  
  // 集成现有功能的结果
  injectionStatus?: any; // 来自content_script_status
  apiCallsCount?: number; // 来自track_extension_api_calls
  messagesCount?: number; // 来自monitor_extension_messages
  storageOperations?: any; // 来自inspect_extension_storage
  
  // 测试用例结果
  testCaseResults: ExtensionTestCaseResult[];
  
  // 性能指标
  performance: ExtensionPagePerformance;
  
  // 错误信息
  errors: string[];
  warnings: string[];
}

export interface ExtensionTestCaseResult {
  testCaseName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
  actualResults?: Record<string, any>;
  expectedResults?: Record<string, any>;
}

export interface ExtensionPagePerformance {
  loadTime: number; // 页面加载时间
  injectionTime: number; // 扩展注入时间
  testDuration: number; // 测试执行时间
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
  networkRequests?: number; // 网络请求数量
  consoleErrors?: number; // 控制台错误数量
}

export interface ExtensionPerformanceImpact {
  averageLoadTimeIncrease: number; // 平均加载时间增加
  memoryUsageIncrease: number; // 内存使用增加
  networkOverhead: number; // 网络开销
  cpuUsageIncrease: number; // CPU使用增加
  impactRating: 'low' | 'medium' | 'high'; // 性能影响评级
}

export interface BatchTestOptions {
  maxConcurrency: number;
  timeout: number;
  retryFailedTests: boolean;
  generateDetailedReport: boolean;
  includeScreenshots: boolean;
  monitorConsoleErrors: boolean;
}
