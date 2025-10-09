/**
 * Week 4: 批量扩展测试相关类型定义
 */
export interface TestExtensionOnMultiplePagesArgs {
    extensionId: string;
    testUrls: string[];
    testCases?: ExtensionTestCase[];
    timeout?: number;
    concurrency?: number;
    includePerformance?: boolean;
    generateReport?: boolean;
}
export interface ExtensionTestCase {
    name: string;
    description: string;
    checkInjection?: boolean;
    checkAPICalls?: boolean;
    checkStorage?: boolean;
    checkMessages?: boolean;
    customScript?: string;
    expectedResults?: Record<string, any>;
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
    successRate: number;
}
export interface ExtensionPageTestResult {
    url: string;
    tabId: string;
    status: 'passed' | 'failed' | 'timeout' | 'error';
    startTime: number;
    endTime: number;
    duration: number;
    injectionStatus?: any;
    apiCallsCount?: number;
    messagesCount?: number;
    storageOperations?: any;
    testCaseResults: ExtensionTestCaseResult[];
    performance: ExtensionPagePerformance;
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
    loadTime: number;
    injectionTime: number;
    testDuration: number;
    memoryUsage?: {
        before: number;
        after: number;
        peak: number;
    };
    networkRequests?: number;
    consoleErrors?: number;
}
export interface ExtensionPerformanceImpact {
    averageLoadTimeIncrease: number;
    memoryUsageIncrease: number;
    networkOverhead: number;
    cpuUsageIncrease: number;
    impactRating: 'low' | 'medium' | 'high';
}
export interface BatchTestOptions {
    maxConcurrency: number;
    timeout: number;
    retryFailedTests: boolean;
    generateDetailedReport: boolean;
    includeScreenshots: boolean;
    monitorConsoleErrors: boolean;
}
//# sourceMappingURL=extension-test-types.d.ts.map