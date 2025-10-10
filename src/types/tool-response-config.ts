/**
 * Configuration-driven Response Builder System
 * 
 * Defines configuration types for automatic context attachment,
 * intelligent suggestions, and metrics collection for each tool.
 */

import { ExtensionToolCategories } from './tool-categories.js';

/**
 * Context rules configuration
 * Defines what contextual information should be automatically attached to responses
 */
export interface ContextRules {
  includePageContext?: boolean;          // Current page URL, title, etc.
  includeTabsList?: boolean;             // List of all open tabs
  includeExtensionStatus?: boolean;      // Extension runtime status
  includeContentScriptStatus?: boolean;  // Content script injection status
  includeStorageInfo?: boolean;          // Extension storage summary
  includePerformanceMetrics?: boolean;   // Performance metrics summary
  includeNetworkStatus?: boolean;        // Network activity summary
  includeConsoleErrors?: boolean;        // Recent console errors
  includeDialogPrompt?: boolean;         // Active dialog information
}

/**
 * Suggestion rules configuration
 * Defines how to generate next-step suggestions
 */
export interface SuggestionRules {
  enabled: boolean;
  staticSuggestions?: string[];                           // Fixed suggestions
  conditionalLogic?: string;                              // Function name for conditional logic
  priorityLevel?: 'static' | 'conditional' | 'intelligent'; // Suggestion complexity level
}

/**
 * Metrics configuration
 * Defines what metrics to collect for this tool
 */
export interface MetricsConfig {
  trackUsage: boolean;           // Track basic usage count
  trackSuccess: boolean;          // Track success/failure rate
  trackFollowUpActions: boolean;  // Track what tools are used next
}

/**
 * Complete tool response configuration
 */
export interface ToolResponseConfig {
  toolName: string;
  category: ExtensionToolCategories;
  useResponseBuilder: boolean;
  
  contextRules: ContextRules;
  suggestionRules: SuggestionRules;
  metrics: MetricsConfig;
}

/**
 * Suggestion priority levels
 */
export type SuggestionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Suggestion structure
 */
export interface Suggestion {
  priority: SuggestionPriority;
  action: string;
  toolName: string;
  args?: Record<string, any>;
  reason: string;
  estimatedImpact: string;
}

/**
 * Tool call record for metrics
 */
export interface ToolCall {
  toolName: string;
  timestamp: number;
  duration: number;
  args?: Record<string, any>;
  success?: boolean;
}

/**
 * Tool metrics structure
 */
export interface ToolMetrics {
  toolName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  contextHitRate: number;
  suggestionAdoptionRate: number;
  toolChainLength: number[];
}

/**
 * Tool chain analysis result
 */
export interface ToolChainAnalysis {
  avgChainLength: number;
  commonPatterns: string[][];
  improvementOpportunities: string[];
}

/**
 * Metrics report structure
 */
export interface MetricsReport {
  summary: {
    totalToolCalls: number;
    avgToolChainLength: number;
    topUsedTools: Array<{ name: string; count: number }>;
    contextEffectiveness: number;
    suggestionEffectiveness: number;
  };
  perToolMetrics: ToolMetrics[];
  recommendations: string[];
}

