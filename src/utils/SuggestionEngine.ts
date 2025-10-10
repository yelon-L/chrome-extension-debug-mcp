/**
 * Suggestion Engine
 * 
 * Generates intelligent, prioritized suggestions for next actions
 * based on tool results and current context.
 */

import type { Suggestion, SuggestionPriority } from '../types/tool-response-config.js';

export interface SuggestionContext {
  extensionId?: string;
  pageUrl?: string;
  previousActions?: string[];
  toolResult?: any;
}

export type SuggestionGenerator = (result: any, context: SuggestionContext) => Promise<Suggestion[]>;

export class SuggestionEngine {
  private generators: Record<string, SuggestionGenerator> = {};

  constructor() {
    this.registerDefaultGenerators();
  }

  /**
   * Generate suggestions for a tool result
   */
  async generateSuggestions(
    toolName: string,
    result: any,
    context: SuggestionContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Get tool-specific generator
    const generator = this.generators[toolName];
    if (generator) {
      suggestions.push(...await generator(result, context));
    }
    
    // Sort by priority
    return suggestions.sort((a, b) => 
      this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority)
    );
  }

  /**
   * Register a suggestion generator for a tool
   */
  registerGenerator(toolName: string, generator: SuggestionGenerator): void {
    this.generators[toolName] = generator;
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: SuggestionPriority): number {
    const weights: Record<SuggestionPriority, number> = {
      'CRITICAL': 0,
      'HIGH': 1,
      'MEDIUM': 2,
      'LOW': 3
    };
    return weights[priority];
  }

  /**
   * Register default suggestion generators
   */
  private registerDefaultGenerators(): void {
    // list_extensions
    this.generators['list_extensions'] = async (extensions, context) => {
      const suggestions: Suggestion[] = [];
      
      if (!Array.isArray(extensions)) return suggestions;
      
      for (const ext of extensions) {
        if (!ext.enabled) {
          suggestions.push({
            priority: 'HIGH',
            action: 'Enable extension for debugging',
            toolName: 'switch_extension_context',
            args: { extensionId: ext.id },
            reason: `Extension ${ext.name} is disabled`,
            estimatedImpact: 'Required for debugging'
          });
        }
        
        // Check for errors in extension info
        if (ext.hasErrors || (ext.errors && ext.errors > 0)) {
          suggestions.push({
            priority: 'CRITICAL',
            action: 'Check extension errors',
            toolName: 'get_extension_logs',
            args: { extensionId: ext.id, level: ['error'] },
            reason: `Extension has errors`,
            estimatedImpact: 'May affect extension functionality'
          });
        }
      }
      
      return suggestions;
    };

    // get_extension_logs
    this.generators['get_extension_logs'] = async (logs, context) => {
      const suggestions: Suggestion[] = [];
      
      if (!Array.isArray(logs)) return suggestions;
      
      const errorLogs = logs.filter(log => log.level === 'error');
      const warningLogs = logs.filter(log => log.level === 'warning');
      
      if (errorLogs.length > 0) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Investigate critical errors',
          toolName: 'get_console_logs',
          args: { level: 'error' },
          reason: `Found ${errorLogs.length} error(s) in logs`,
          estimatedImpact: 'Errors may break extension functionality'
        });
      }
      
      if (warningLogs.length > 5) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Review warnings',
          toolName: 'search_extension_logs',
          args: { extensionId: context.extensionId, level: ['warning'] },
          reason: `${warningLogs.length} warnings detected`,
          estimatedImpact: 'May indicate potential issues'
        });
      }
      
      return suggestions;
    };

    // content_script_status
    this.generators['content_script_status'] = async (status, context) => {
      const suggestions: Suggestion[] = [];
      
      if (status.injectionFailed) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Fix content script injection',
          toolName: 'inject_content_script',
          args: { extensionId: context.extensionId },
          reason: 'Content script injection failed',
          estimatedImpact: 'Extension may not work on current page'
        });
      }
      
      if (status.notInjectedCount > 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Check injection permissions',
          toolName: 'check_extension_permissions',
          args: { extensionId: context.extensionId },
          reason: `Content script not injected in ${status.notInjectedCount} page(s)`,
          estimatedImpact: 'Limited extension functionality'
        });
      }
      
      return suggestions;
    };

    // inspect_extension_storage
    this.generators['inspect_extension_storage'] = async (storage, context) => {
      const suggestions: Suggestion[] = [];
      
      if (storage.error) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Check storage permissions',
          toolName: 'check_extension_permissions',
          args: { extensionId: context.extensionId },
          reason: 'Storage access failed',
          estimatedImpact: 'Extension cannot persist data'
        });
      }
      
      if (storage.local && Object.keys(storage.local).length > 100) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Analyze storage usage',
          toolName: 'analyze_extension_performance',
          args: { extensionId: context.extensionId },
          reason: 'Large number of storage keys detected',
          estimatedImpact: 'May slow down extension'
        });
      }
      
      return suggestions;
    };

    // analyze_extension_performance
    this.generators['analyze_extension_performance'] = async (perf, context) => {
      const suggestions: Suggestion[] = [];
      
      if (perf.cpuUsage > 80) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Optimize CPU usage',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId },
          reason: `High CPU usage: ${perf.cpuUsage}%`,
          estimatedImpact: 'May slow down browser'
        });
      }
      
      if (perf.memoryUsage > 100 * 1024 * 1024) { // >100MB
        suggestions.push({
          priority: 'HIGH',
          action: 'Investigate memory usage',
          toolName: 'track_extension_api_calls',
          args: { extensionId: context.extensionId },
          reason: `High memory usage: ${(perf.memoryUsage / 1024 / 1024).toFixed(0)}MB`,
          estimatedImpact: 'May cause performance issues'
        });
      }
      
      if (perf.lcp > 2500) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Optimize page load performance',
          toolName: 'analyze_extension_network',
          args: { extensionId: context.extensionId },
          reason: `Poor LCP: ${perf.lcp}ms`,
          estimatedImpact: 'Affects user experience'
        });
      }
      
      return suggestions;
    };

    // analyze_extension_network
    this.generators['analyze_extension_network'] = async (network, context) => {
      const suggestions: Suggestion[] = [];
      
      if (network.failedRequests && network.failedRequests > 0) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Investigate failed requests',
          toolName: 'list_extension_requests',
          args: { extensionId: context.extensionId, status: 'failed' },
          reason: `${network.failedRequests} failed request(s)`,
          estimatedImpact: 'May break extension functionality'
        });
      }
      
      if (network.slowRequests && network.slowRequests.length > 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Optimize slow requests',
          toolName: 'export_extension_network_har',
          args: { extensionId: context.extensionId },
          reason: `${network.slowRequests.length} slow request(s) detected`,
          estimatedImpact: 'May slow down extension'
        });
      }
      
      return suggestions;
    };

    // check_extension_permissions
    this.generators['check_extension_permissions'] = async (permissions, context) => {
      const suggestions: Suggestion[] = [];
      
      if (permissions.missing && permissions.missing.length > 0) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Add missing permissions',
          toolName: 'audit_extension_security',
          args: { extensionId: context.extensionId },
          reason: `Missing permissions: ${permissions.missing.join(', ')}`,
          estimatedImpact: 'Extension cannot access required APIs'
        });
      }
      
      if (permissions.excessive && permissions.excessive.length > 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Review excessive permissions',
          toolName: 'audit_extension_security',
          args: { extensionId: context.extensionId },
          reason: `Excessive permissions detected`,
          estimatedImpact: 'Security risk'
        });
      }
      
      return suggestions;
    };

    // audit_extension_security
    this.generators['audit_extension_security'] = async (audit, context) => {
      const suggestions: Suggestion[] = [];
      
      if (audit.vulnerabilities && audit.vulnerabilities.length > 0) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Fix security vulnerabilities',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId },
          reason: `${audit.vulnerabilities.length} security issue(s) found`,
          estimatedImpact: 'Critical security risk'
        });
      }
      
      return suggestions;
    };

    // list_tabs
    this.generators['list_tabs'] = async (tabs, context) => {
      const suggestions: Suggestion[] = [];
      
      if (tabs && tabs.length > 20) {
        suggestions.push({
          priority: 'LOW',
          action: 'Consider testing with fewer tabs',
          toolName: 'close_tab',
          reason: `${tabs.length} tabs open may affect performance`,
          estimatedImpact: 'Testing accuracy may be affected'
        });
      }
      
      return suggestions;
    };

    // take_snapshot
    this.generators['take_snapshot'] = async (snapshot, context) => {
      const suggestions: Suggestion[] = [];
      
      if (snapshot.elements && snapshot.elements.length > 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Use UID-based interaction',
          toolName: 'click_by_uid',
          reason: 'Snapshot generated with UIDs',
          estimatedImpact: 'Enables stable element interaction'
        });
      }
      
      return suggestions;
    };

    // list_extension_contexts
    this.generators['list_extension_contexts'] = async (contexts, context) => {
      const suggestions: Suggestion[] = [];
      
      if (Array.isArray(contexts) && contexts.length === 0) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Check extension status',
          toolName: 'list_extensions',
          reason: 'No extension contexts found',
          estimatedImpact: 'Extension may not be loaded'
        });
      }
      
      return suggestions;
    };

    // monitor_extension_messages
    this.generators['monitor_extension_messages'] = async (messages, context) => {
      const suggestions: Suggestion[] = [];
      
      if (Array.isArray(messages) && messages.length === 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Check message configuration',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId },
          reason: 'No messages captured during monitoring',
          estimatedImpact: 'May indicate configuration issue'
        });
      }
      
      return suggestions;
    };

    // track_extension_api_calls
    this.generators['track_extension_api_calls'] = async (apiCalls, context) => {
      const suggestions: Suggestion[] = [];
      
      if (apiCalls.errors && apiCalls.errors.length > 0) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Fix API call errors',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId, level: ['error'] },
          reason: `${apiCalls.errors.length} API call error(s) detected`,
          estimatedImpact: 'API errors may break functionality'
        });
      }
      
      return suggestions;
    };

    // test_extension_on_multiple_pages
    this.generators['test_extension_on_multiple_pages'] = async (testResults, context) => {
      const suggestions: Suggestion[] = [];
      
      if (testResults.failedPages && testResults.failedPages.length > 0) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Investigate failed pages',
          toolName: 'content_script_status',
          args: { extensionId: context.extensionId },
          reason: `Extension failed on ${testResults.failedPages.length} page(s)`,
          estimatedImpact: 'May indicate compatibility issues'
        });
      }
      
      return suggestions;
    };

    // list_extension_requests
    this.generators['list_extension_requests'] = async (requests, context) => {
      const suggestions: Suggestion[] = [];
      
      if (Array.isArray(requests)) {
        const failedRequests = requests.filter(r => r.status >= 400);
        if (failedRequests.length > 0) {
          suggestions.push({
            priority: 'HIGH',
            action: 'Investigate failed requests',
            toolName: 'get_extension_request_details',
            args: { extensionId: context.extensionId, requestId: failedRequests[0].id },
            reason: `${failedRequests.length} failed request(s)`,
            estimatedImpact: 'Network failures may break features'
          });
        }
      }
      
      return suggestions;
    };

    // get_extension_request_details
    this.generators['get_extension_request_details'] = async (requestDetail, context) => {
      const suggestions: Suggestion[] = [];
      
      if (requestDetail.status >= 400) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Analyze network error',
          toolName: 'analyze_extension_network',
          args: { extensionId: context.extensionId },
          reason: `Request failed with status ${requestDetail.status}`,
          estimatedImpact: 'May indicate server or permission issues'
        });
      }
      
      return suggestions;
    };

    // performance_list_insights
    this.generators['performance_list_insights'] = async (insights, context) => {
      const suggestions: Suggestion[] = [];
      
      if (Array.isArray(insights) && insights.length > 0) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Review performance insights',
          toolName: 'performance_get_insights',
          args: { insightName: insights[0] },
          reason: `${insights.length} insight(s) available`,
          estimatedImpact: 'May reveal performance issues'
        });
      }
      
      return suggestions;
    };

    // performance_get_insights
    this.generators['performance_get_insights'] = async (insight, context) => {
      const suggestions: Suggestion[] = [];
      
      // Insights are already detailed, suggest optimization
      suggestions.push({
        priority: 'MEDIUM',
        action: 'Optimize based on insight',
        toolName: 'analyze_extension_performance',
        reason: 'Performance insight suggests optimization',
        estimatedImpact: 'May improve extension performance'
      });
      
      return suggestions;
    };

    // test_extension_conditions
    this.generators['test_extension_conditions'] = async (conditionResults, context) => {
      const suggestions: Suggestion[] = [];
      
      if (conditionResults.failedConditions && conditionResults.failedConditions.length > 0) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Fix condition failures',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId },
          reason: `Failed under ${conditionResults.failedConditions.length} condition(s)`,
          estimatedImpact: 'Extension may not work in all environments'
        });
      }
      
      return suggestions;
    };

    // wait_for_extension_ready
    this.generators['wait_for_extension_ready'] = async (readyResult, context) => {
      const suggestions: Suggestion[] = [];
      
      if (!readyResult.ready || readyResult.timeout) {
        suggestions.push({
          priority: 'CRITICAL',
          action: 'Check extension initialization',
          toolName: 'get_extension_logs',
          args: { extensionId: context.extensionId, level: ['error', 'warning'] },
          reason: 'Extension failed to become ready',
          estimatedImpact: 'Extension may not function properly'
        });
      }
      
      return suggestions;
    };

    // check_extension_updates
    this.generators['check_extension_updates'] = async (updateInfo, context) => {
      const suggestions: Suggestion[] = [];
      
      if (updateInfo.updateAvailable) {
        suggestions.push({
          priority: 'MEDIUM',
          action: 'Update extension',
          toolName: 'audit_extension_security',
          args: { extensionId: context.extensionId },
          reason: 'New version available',
          estimatedImpact: 'May include bug fixes and features'
        });
      }
      
      return suggestions;
    };

    // quick_extension_debug
    this.generators['quick_extension_debug'] = async (debugResult, context) => {
      const suggestions: Suggestion[] = [];
      
      if (debugResult.issues && debugResult.issues.length > 0) {
        const critical = debugResult.issues.filter((i: any) => i.severity === 'critical');
        if (critical.length > 0) {
          suggestions.push({
            priority: 'CRITICAL',
            action: 'Fix critical issues',
            toolName: 'get_extension_logs',
            args: { extensionId: context.extensionId, level: ['error'] },
            reason: `${critical.length} critical issue(s) found`,
            estimatedImpact: 'Immediate action required'
          });
        }
      }
      
      return suggestions;
    };

    // quick_performance_check
    this.generators['quick_performance_check'] = async (perfResult, context) => {
      const suggestions: Suggestion[] = [];
      
      if (perfResult.issues && perfResult.issues.length > 0) {
        suggestions.push({
          priority: 'HIGH',
          action: 'Optimize performance',
          toolName: 'analyze_extension_performance',
          args: { extensionId: context.extensionId },
          reason: `${perfResult.issues.length} performance issue(s) detected`,
          estimatedImpact: 'May slow down browser'
        });
      }
      
      return suggestions;
    };

    // get_console_logs
    this.generators['get_console_logs'] = async (logs, context) => {
      const suggestions: Suggestion[] = [];
      
      if (Array.isArray(logs)) {
        const errors = logs.filter(log => typeof log === 'string' && log.includes('error'));
        if (errors.length > 0) {
          suggestions.push({
            priority: 'HIGH',
            action: 'Investigate console errors',
            toolName: 'evaluate',
            args: { expression: 'console.trace()' },
            reason: `${errors.length} console error(s) found`,
            estimatedImpact: 'Errors may indicate bugs'
          });
        }
      }
      
      return suggestions;
    };
  }
}

