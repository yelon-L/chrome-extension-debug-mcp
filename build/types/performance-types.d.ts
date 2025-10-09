/**
 * 性能分析相关类型定义
 */
export interface TraceEvent {
    name: string;
    cat: string;
    ph: string;
    ts: number;
    pid: number;
    tid: number;
    args?: any;
    dur?: number;
}
export interface PerformanceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    executionTime: number;
    scriptEvaluationTime: number;
    layoutTime: number;
    paintTime: number;
}
export interface CoreWebVitals {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
}
export interface PerformanceImpact {
    pageLoadDelay: number;
    interactionDelay: number;
    memoryIncrease: number;
    cpuIncrease: number;
    cwvImpact: {
        lcp: number;
        fid: number;
        cls: number;
    };
}
export interface PerformanceAnalysisResult {
    extensionId: string;
    extensionName: string;
    testUrl: string;
    timestamp: number;
    metrics: {
        baseline: PerformanceMetrics;
        withExtension: PerformanceMetrics;
        delta: PerformanceMetrics;
    };
    cwv: {
        baseline: CoreWebVitals;
        withExtension: CoreWebVitals;
        delta: CoreWebVitals;
    };
    impact: PerformanceImpact;
    recommendations: string[];
    summary: string;
}
export interface PerformanceComparison {
    baselineMetrics: PerformanceMetrics;
    extensionMetrics: PerformanceMetrics;
    delta: PerformanceMetrics;
    baselineCWV: CoreWebVitals;
    extensionCWV: CoreWebVitals;
    deltaCWV: CoreWebVitals;
}
export interface TraceRecording {
    buffer: Buffer;
    events: TraceEvent[];
    url: string;
    timestamp: number;
}
export interface PerformanceAnalysisOptions {
    extensionId: string;
    testUrl: string;
    duration?: number;
    iterations?: number;
    includeScreenshots?: boolean;
    waitForIdle?: boolean;
}
//# sourceMappingURL=performance-types.d.ts.map