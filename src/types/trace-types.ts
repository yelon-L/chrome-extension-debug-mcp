/**
 * Type definitions for Chrome DevTools Trace Processing
 */

export interface TraceResult {
  parsedTrace: any; // TraceEngine.TraceModel.ParsedTrace
  insights: any | null; // TraceEngine.Insights.Types.TraceInsightSets
  rawEvents?: any[];
}

export interface TraceParseError {
  error: string;
  details?: any;
}

export type InsightName = 
  | 'DocumentLatency'
  | 'LCPBreakdown'
  | 'CLSCulprits'
  | 'RenderBlocking'
  | 'SlowCSSSelector'
  | 'INPBreakdown'
  | 'ThirdParties'
  | 'Viewport';

export interface InsightOutput {
  output: string;
}

export interface ExtensionTraceEvent {
  name: string;
  cat: string;
  ph: string;
  ts: number;
  dur?: number;
  args?: any;
  extensionId?: string;
}

export interface TraceRecordingOptions {
  url: string;
  duration?: number;
  withExtension?: boolean;
  extensionId?: string;
}

export interface TraceSummary {
  summary: string;
  insights: string[];
  extensionEvents?: ExtensionTraceEvent[];
  recommendations?: string[];
}


