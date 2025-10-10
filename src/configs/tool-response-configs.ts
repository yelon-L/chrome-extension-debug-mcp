/**
 * Tool Response Configurations
 * 
 * Defines specific configuration for each of the 24 tools to be enhanced
 * with the Response Builder pattern.
 */

import { ToolResponseConfig } from '../types/tool-response-config.js';
import { ExtensionToolCategories } from '../types/tool-categories.js';

export const TOOL_RESPONSE_CONFIGS: Record<string, ToolResponseConfig> = {
  // 1. list_tabs - Browser Control
  'list_tabs': {
    toolName: 'list_tabs',
    category: ExtensionToolCategories.BROWSER_CONTROL,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeTabsList: false, // Avoid redundancy
      includeExtensionStatus: false,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateTabsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 2. get_extension_logs - Extension Debugging
  'get_extension_logs': {
    toolName: 'get_extension_logs',
    category: ExtensionToolCategories.EXTENSION_DEBUGGING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includeConsoleErrors: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateLogsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 3. content_script_status - Extension Debugging
  'content_script_status': {
    toolName: 'content_script_status',
    category: ExtensionToolCategories.EXTENSION_DEBUGGING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeTabsList: true,
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateContentScriptSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 4. list_extension_contexts - Context Management
  'list_extension_contexts': {
    toolName: 'list_extension_contexts',
    category: ExtensionToolCategories.CONTEXT_MANAGEMENT,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateContextsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 5. inspect_extension_storage - Storage Inspection
  'inspect_extension_storage': {
    toolName: 'inspect_extension_storage',
    category: ExtensionToolCategories.STORAGE_INSPECTION,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includeStorageInfo: false, // Avoid redundancy
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateStorageSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 6. monitor_extension_messages - Extension Debugging
  'monitor_extension_messages': {
    toolName: 'monitor_extension_messages',
    category: ExtensionToolCategories.EXTENSION_DEBUGGING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateMessagesSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 7. track_extension_api_calls - Extension Debugging
  'track_extension_api_calls': {
    toolName: 'track_extension_api_calls',
    category: ExtensionToolCategories.EXTENSION_DEBUGGING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateApiCallsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 8. test_extension_on_multiple_pages - Performance Analysis
  'test_extension_on_multiple_pages': {
    toolName: 'test_extension_on_multiple_pages',
    category: ExtensionToolCategories.PERFORMANCE_ANALYSIS,
    useResponseBuilder: true,
    contextRules: {
      includeExtensionStatus: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateMultiPageTestSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 9. list_extension_requests - Network Monitoring
  'list_extension_requests': {
    toolName: 'list_extension_requests',
    category: ExtensionToolCategories.NETWORK_MONITORING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeNetworkStatus: false, // Avoid redundancy
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateNetworkListSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 10. get_extension_request_details - Network Monitoring
  'get_extension_request_details': {
    toolName: 'get_extension_request_details',
    category: ExtensionToolCategories.NETWORK_MONITORING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeNetworkStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateRequestDetailsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 11. analyze_extension_network - Network Monitoring
  'analyze_extension_network': {
    toolName: 'analyze_extension_network',
    category: ExtensionToolCategories.NETWORK_MONITORING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includeNetworkStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateNetworkAnalysisSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 12. analyze_extension_performance - Performance Analysis
  'analyze_extension_performance': {
    toolName: 'analyze_extension_performance',
    category: ExtensionToolCategories.PERFORMANCE_ANALYSIS,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generatePerformanceSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 13. performance_list_insights - Performance Analysis
  'performance_list_insights': {
    toolName: 'performance_list_insights',
    category: ExtensionToolCategories.PERFORMANCE_ANALYSIS,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateInsightsListSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 14. performance_get_insights - Performance Analysis
  'performance_get_insights': {
    toolName: 'performance_get_insights',
    category: ExtensionToolCategories.PERFORMANCE_ANALYSIS,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateSpecificInsightSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 15. test_extension_conditions - Performance Analysis
  'test_extension_conditions': {
    toolName: 'test_extension_conditions',
    category: ExtensionToolCategories.PERFORMANCE_ANALYSIS,
    useResponseBuilder: true,
    contextRules: {
      includeExtensionStatus: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateConditionsTestSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 16. take_snapshot - Interaction
  'take_snapshot': {
    toolName: 'take_snapshot',
    category: ExtensionToolCategories.INTERACTION,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateSnapshotSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 17. wait_for_extension_ready - Smart Waiting
  'wait_for_extension_ready': {
    toolName: 'wait_for_extension_ready',
    category: ExtensionToolCategories.SMART_WAITING,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateWaitReadySuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 18. check_extension_permissions - Developer Tools
  'check_extension_permissions': {
    toolName: 'check_extension_permissions',
    category: ExtensionToolCategories.DEVELOPER_TOOLS,
    useResponseBuilder: true,
    contextRules: {
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generatePermissionsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 19. audit_extension_security - Developer Tools
  'audit_extension_security': {
    toolName: 'audit_extension_security',
    category: ExtensionToolCategories.DEVELOPER_TOOLS,
    useResponseBuilder: true,
    contextRules: {
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateSecuritySuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 20. check_extension_updates - Developer Tools
  'check_extension_updates': {
    toolName: 'check_extension_updates',
    category: ExtensionToolCategories.DEVELOPER_TOOLS,
    useResponseBuilder: true,
    contextRules: {
      includeExtensionStatus: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateUpdatesSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 21. quick_extension_debug - Quick Debug (already uses Response Builder for list_extensions)
  'quick_extension_debug': {
    toolName: 'quick_extension_debug',
    category: ExtensionToolCategories.QUICK_DEBUG,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includeConsoleErrors: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateQuickDebugSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 22. quick_performance_check - Quick Debug
  'quick_performance_check': {
    toolName: 'quick_performance_check',
    category: ExtensionToolCategories.QUICK_DEBUG,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeExtensionStatus: true,
      includePerformanceMetrics: true,
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'intelligent',
      conditionalLogic: 'generateQuickPerformanceSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 23. get_console_logs - Context Management
  'get_console_logs': {
    toolName: 'get_console_logs',
    category: ExtensionToolCategories.CONTEXT_MANAGEMENT,
    useResponseBuilder: true,
    contextRules: {
      includePageContext: true,
      includeConsoleErrors: false, // Avoid redundancy
    },
    suggestionRules: {
      enabled: true,
      priorityLevel: 'conditional',
      conditionalLogic: 'generateConsoleLogsSuggestions'
    },
    metrics: {
      trackUsage: true,
      trackSuccess: true,
      trackFollowUpActions: true
    }
  },

  // 24. track_extension_network - (seems to be removed, using list_extension_requests instead)
  // Note: This tool doesn't exist in the current codebase, skipping
};

/**
 * Get configuration for a specific tool
 */
export function getToolConfig(toolName: string): ToolResponseConfig | undefined {
  return TOOL_RESPONSE_CONFIGS[toolName];
}

/**
 * Check if a tool uses Response Builder
 */
export function usesResponseBuilder(toolName: string): boolean {
  return TOOL_RESPONSE_CONFIGS[toolName]?.useResponseBuilder ?? false;
}

/**
 * Get all tools that use Response Builder
 */
export function getResponseBuilderTools(): string[] {
  return Object.keys(TOOL_RESPONSE_CONFIGS).filter(
    toolName => TOOL_RESPONSE_CONFIGS[toolName].useResponseBuilder
  );
}

