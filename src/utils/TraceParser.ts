/**
 * TraceParser - Chrome DevTools Trace Processing Integration
 * 
 * Integrates with chrome-devtools-frontend to provide professional-grade
 * performance trace analysis and Performance Insights extraction.
 * 
 * Note: chrome-devtools-frontend is loaded dynamically at runtime to avoid
 * compile-time TypeScript errors. The package has many TypeScript 
 * compatibility issues that would prevent compilation.
 */

import type {
  TraceResult,
  TraceParseError,
  InsightName,
  InsightOutput,
  ExtensionTraceEvent
} from '../types/trace-types.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[TraceParser]', ...args);

/**
 * TraceParser provides Chrome DevTools-level trace analysis
 */
export class TraceParser {
  private engine: any = null;
  private TraceEngine: any = null;
  private PerformanceTraceFormatter: any = null;
  private PerformanceInsightFormatter: any = null;
  private AgentFocus: any = null;
  private initialized = false;

  constructor() {
    // Lazy initialization to handle dynamic imports
  }

  /**
   * Initialize Chrome DevTools modules
   * Uses dynamic import to handle the complex dependencies
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      log('Initializing Chrome DevTools trace processing...');
      
      // Dynamic import of chrome-devtools-frontend modules
      // Use dynamic import() function with template to avoid TypeScript resolution at compile time
      const devtoolsPackageName = 'chrome-devtools-frontend';
      
      const TraceEngineModule = await import(
        /* @vite-ignore */
        `${devtoolsPackageName}/front_end/models/trace/trace.js`
      );
      const PerformanceTraceFormatterModule = await import(
        /* @vite-ignore */
        `${devtoolsPackageName}/front_end/models/ai_assistance/data_formatters/PerformanceTraceFormatter.js`
      );
      const PerformanceInsightFormatterModule = await import(
        /* @vite-ignore */
        `${devtoolsPackageName}/front_end/models/ai_assistance/data_formatters/PerformanceInsightFormatter.js`
      );
      const AIContextModule = await import(
        /* @vite-ignore */
        `${devtoolsPackageName}/front_end/models/ai_assistance/performance/AIContext.js`
      );

      this.TraceEngine = TraceEngineModule;
      this.PerformanceTraceFormatter = PerformanceTraceFormatterModule.PerformanceTraceFormatter;
      this.PerformanceInsightFormatter = PerformanceInsightFormatterModule.PerformanceInsightFormatter;
      this.AgentFocus = AIContextModule.AgentFocus;

      // Create trace engine instance with all handlers
      this.engine = this.TraceEngine.TraceModel.Model.createWithAllHandlers();
      
      this.initialized = true;
      log('Chrome DevTools trace processing initialized successfully');
    } catch (error) {
      log('Failed to initialize Chrome DevTools modules:', error);
      log('Falling back to basic trace parsing');
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Parse raw trace buffer
   */
  async parseRawTraceBuffer(buffer: Buffer | Uint8Array): Promise<TraceResult | TraceParseError> {
    await this.initialize();

    if (!this.initialized || !this.engine) {
      // Fallback to basic parsing if DevTools modules not available
      return this.parseBasic(buffer);
    }

    this.engine.resetProcessor();

    if (!buffer) {
      return {
        error: 'No buffer was provided.'
      };
    }

    try {
      const asString = buffer.toString('utf-8');
      if (!asString) {
        return {
          error: 'Decoding the trace buffer returned an empty string.'
        };
      }

      const data = JSON.parse(asString);
      const events = Array.isArray(data) ? data : (data.traceEvents || []);

      log(`Parsing ${events.length} trace events...`);

      await this.engine.parse(events);
      const parsedTrace = this.engine.parsedTrace();

      if (!parsedTrace) {
        return {
          error: 'No parsed trace was returned from the trace engine.'
        };
      }

      const insights = parsedTrace?.insights ?? null;

      log('Trace parsed successfully');
      return {
        parsedTrace,
        insights,
        rawEvents: events
      };
    } catch (e) {
      const errorText = e instanceof Error ? e.message : JSON.stringify(e);
      log(`Unexpected error parsing trace: ${errorText}`);
      return {
        error: errorText,
        details: e
      };
    }
  }

  /**
   * Basic trace parsing fallback (when DevTools modules not available)
   */
  private parseBasic(buffer: Buffer | Uint8Array): TraceResult | TraceParseError {
    try {
      const asString = buffer.toString('utf-8');
      const data = JSON.parse(asString);
      const events = Array.isArray(data) ? data : (data.traceEvents || []);

      log('Using basic trace parsing (DevTools modules not available)');

      return {
        parsedTrace: { data: { events } },
        insights: null,
        rawEvents: events
      };
    } catch (e) {
      return {
        error: 'Failed to parse trace buffer',
        details: e
      };
    }
  }

  /**
   * Get trace summary
   */
  getTraceSummary(result: TraceResult): string {
    if (!this.initialized || !this.PerformanceTraceFormatter || !this.AgentFocus) {
      return this.getBasicSummary(result);
    }

    try {
      const focus = this.AgentFocus.fromParsedTrace(result.parsedTrace);
      const formatter = new this.PerformanceTraceFormatter(focus);
      const output = formatter.formatTraceSummary();

      const extraFormatDescriptions = `Information on performance traces may contain main thread activity represented as call frames and network requests.`;

      return `${extraFormatDescriptions}\n\n${output}`;
    } catch (e) {
      log('Error generating trace summary:', e);
      return this.getBasicSummary(result);
    }
  }

  /**
   * Basic summary fallback
   */
  private getBasicSummary(result: TraceResult): string {
    const eventCount = result.rawEvents?.length || 0;
    return `Trace Summary:\n- Total Events: ${eventCount}\n- DevTools integration: Not available (basic mode)\n- Note: Install chrome-devtools-frontend for detailed insights`;
  }

  /**
   * Get specific insight output
   */
  getInsightOutput(result: TraceResult, insightName: InsightName): InsightOutput | TraceParseError {
    if (!this.initialized || !this.PerformanceInsightFormatter) {
      return {
        error: 'Performance Insights not available. Chrome DevTools frontend integration required.'
      };
    }

    if (!result.insights) {
      return {
        error: 'No Performance insights are available for this trace.'
      };
    }

    try {
      // Get the main navigation
      const mainNavigationId = result.parsedTrace?.data?.Meta?.mainFrameNavigations?.at(0)?.args?.data?.navigationId;

      const NO_NAVIGATION = this.TraceEngine?.Types?.Events?.NO_NAVIGATION || 'NO_NAVIGATION';
      const insightsForNav = result.insights.get(mainNavigationId ?? NO_NAVIGATION);

      if (!insightsForNav) {
        return {
          error: 'No Performance Insights for this trace.'
        };
      }

      const matchingInsight = insightsForNav.model?.[insightName];
      if (!matchingInsight) {
        return {
          error: `No Insight with the name ${insightName} found. Double check the name you provided is accurate and try again.`
        };
      }

      const focus = this.AgentFocus.fromParsedTrace(result.parsedTrace);
      const formatter = new this.PerformanceInsightFormatter(focus, matchingInsight);
      
      return { output: formatter.formatInsight() };
    } catch (e) {
      log('Error extracting insight:', e);
      return {
        error: `Failed to extract insight: ${e instanceof Error ? e.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List available insights for a trace
   */
  listInsights(result: TraceResult): string[] {
    if (!result.insights) {
      return [];
    }

    try {
      const mainNavigationId = result.parsedTrace?.data?.Meta?.mainFrameNavigations?.at(0)?.args?.data?.navigationId;
      const NO_NAVIGATION = this.TraceEngine?.Types?.Events?.NO_NAVIGATION || 'NO_NAVIGATION';
      const insightsForNav = result.insights.get(mainNavigationId ?? NO_NAVIGATION);

      if (!insightsForNav || !insightsForNav.model) {
        return [];
      }

      return Object.keys(insightsForNav.model);
    } catch (e) {
      log('Error listing insights:', e);
      return [];
    }
  }

  /**
   * Filter extension-specific trace events
   */
  filterExtensionEvents(result: TraceResult, extensionId: string): ExtensionTraceEvent[] {
    const events = result.rawEvents || [];
    const extensionUrl = `chrome-extension://${extensionId}`;
    
    const filtered: ExtensionTraceEvent[] = [];

    for (const event of events) {
      let isExtensionEvent = false;

      // Check URL in event args
      if (event.args) {
        const args = event.args as any;
        if (args.data?.url && args.data.url.includes(extensionUrl)) {
          isExtensionEvent = true;
        }
        if (args.data?.scriptUrl && args.data.scriptUrl.includes(extensionUrl)) {
          isExtensionEvent = true;
        }
        if (args.url && args.url.includes(extensionUrl)) {
          isExtensionEvent = true;
        }
      }

      // Check frame URL
      if (event.args?.frame?.url && event.args.frame.url.includes(extensionUrl)) {
        isExtensionEvent = true;
      }

      if (isExtensionEvent) {
        filtered.push({
          name: event.name,
          cat: event.cat,
          ph: event.ph,
          ts: event.ts,
          dur: event.dur,
          args: event.args,
          extensionId
        });
      }
    }

    log(`Filtered ${filtered.length} extension-specific events out of ${events.length} total`);
    return filtered;
  }

  /**
   * Calculate extension metrics from filtered events
   */
  calculateExtensionMetrics(events: ExtensionTraceEvent[]): {
    totalDuration: number;
    eventCount: number;
    cpuTime: number;
    scriptTime: number;
  } {
    let totalDuration = 0;
    let cpuTime = 0;
    let scriptTime = 0;

    for (const event of events) {
      if (event.dur) {
        totalDuration += event.dur;

        // CPU events
        if (event.name.includes('Task') || event.name.includes('Function')) {
          cpuTime += event.dur;
        }

        // Script events
        if (event.name.includes('Script') || event.name === 'EvaluateScript') {
          scriptTime += event.dur;
        }
      }
    }

    return {
      totalDuration: totalDuration / 1000, // Convert to ms
      eventCount: events.length,
      cpuTime: cpuTime / 1000,
      scriptTime: scriptTime / 1000
    };
  }
}

// Export singleton instance
export const traceParser = new TraceParser();

