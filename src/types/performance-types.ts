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
  cpuUsage: number;              // CPU占用百分比
  memoryUsage: number;            // 内存使用MB
  executionTime: number;          // 总执行时间ms
  scriptEvaluationTime: number;   // 脚本评估时间ms
  layoutTime: number;             // 布局时间ms
  paintTime: number;              // 绘制时间ms
}

export interface CoreWebVitals {
  lcp: number;  // Largest Contentful Paint (ms)
  fid: number;  // First Input Delay (ms)
  cls: number;  // Cumulative Layout Shift (score)
  fcp: number;  // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

export interface PerformanceImpact {
  pageLoadDelay: number;          // 页面加载延迟ms
  interactionDelay: number;        // 交互延迟ms
  memoryIncrease: number;          // 内存增加MB
  cpuIncrease: number;             // CPU增加百分比
  cwvImpact: {
    lcp: number;                   // LCP影响ms
    fid: number;                   // FID影响ms
    cls: number;                   // CLS影响
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
  duration?: number;           // 测试持续时间ms，默认3000
  iterations?: number;         // 测试迭代次数，默认1
  includeScreenshots?: boolean; // 是否包含截图
  waitForIdle?: boolean;       // 是否等待网络空闲
}
