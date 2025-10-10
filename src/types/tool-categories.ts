/**
 * Tool Categories for Chrome Extension Debug MCP
 * 
 * Organizes 47+ tools into logical functional domains
 * for better discoverability and AI tool selection.
 */

export enum ExtensionToolCategories {
  BROWSER_CONTROL = 'Browser Control',
  EXTENSION_DEBUGGING = 'Extension Debugging',
  CONTEXT_MANAGEMENT = 'Context Management',
  STORAGE_INSPECTION = 'Storage Inspection',
  PERFORMANCE_ANALYSIS = 'Performance Analysis',
  NETWORK_MONITORING = 'Network Monitoring',
  INTERACTION = 'Interaction',
  SMART_WAITING = 'Smart Waiting',
  DEVELOPER_TOOLS = 'Developer Tools',
  QUICK_DEBUG = 'Quick Debug Tools'
}

export const ToolCategoryMap: Record<string, ExtensionToolCategories> = {
  // Browser Control
  'launch_chrome': ExtensionToolCategories.BROWSER_CONTROL,
  'attach_to_chrome': ExtensionToolCategories.BROWSER_CONTROL,
  'list_tabs': ExtensionToolCategories.BROWSER_CONTROL,
  'new_tab': ExtensionToolCategories.BROWSER_CONTROL,
  'switch_tab': ExtensionToolCategories.BROWSER_CONTROL,
  'close_tab': ExtensionToolCategories.BROWSER_CONTROL,
  
  // Extension Debugging
  'list_extensions': ExtensionToolCategories.EXTENSION_DEBUGGING,
  'get_extension_logs': ExtensionToolCategories.EXTENSION_DEBUGGING,
  'inject_content_script': ExtensionToolCategories.EXTENSION_DEBUGGING,
  'content_script_status': ExtensionToolCategories.EXTENSION_DEBUGGING,
  'monitor_extension_messages': ExtensionToolCategories.EXTENSION_DEBUGGING,
  'track_extension_api_calls': ExtensionToolCategories.EXTENSION_DEBUGGING,
  
  // Context Management
  'list_extension_contexts': ExtensionToolCategories.CONTEXT_MANAGEMENT,
  'switch_extension_context': ExtensionToolCategories.CONTEXT_MANAGEMENT,
  'evaluate': ExtensionToolCategories.CONTEXT_MANAGEMENT,
  'get_console_logs': ExtensionToolCategories.CONTEXT_MANAGEMENT,
  
  // Storage Inspection
  'inspect_extension_storage': ExtensionToolCategories.STORAGE_INSPECTION,
  
  // Performance Analysis
  'analyze_extension_performance': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'performance_get_insights': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'performance_list_insights': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'emulate_cpu': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'emulate_network': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'test_extension_conditions': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  'test_extension_on_multiple_pages': ExtensionToolCategories.PERFORMANCE_ANALYSIS,
  
  // Network Monitoring
  'list_extension_requests': ExtensionToolCategories.NETWORK_MONITORING,
  'get_extension_request_details': ExtensionToolCategories.NETWORK_MONITORING,
  'export_extension_network_har': ExtensionToolCategories.NETWORK_MONITORING,
  'analyze_extension_network': ExtensionToolCategories.NETWORK_MONITORING,
  
  // Interaction
  'click': ExtensionToolCategories.INTERACTION,
  'type': ExtensionToolCategories.INTERACTION,
  'screenshot': ExtensionToolCategories.INTERACTION,
  'take_snapshot': ExtensionToolCategories.INTERACTION,
  'click_by_uid': ExtensionToolCategories.INTERACTION,
  'fill_by_uid': ExtensionToolCategories.INTERACTION,
  'hover_by_uid': ExtensionToolCategories.INTERACTION,
  'hover_element': ExtensionToolCategories.INTERACTION,
  'drag_element': ExtensionToolCategories.INTERACTION,
  'fill_form': ExtensionToolCategories.INTERACTION,
  'upload_file': ExtensionToolCategories.INTERACTION,
  'handle_dialog': ExtensionToolCategories.INTERACTION,
  
  // Smart Waiting
  'wait_for_element': ExtensionToolCategories.SMART_WAITING,
  'wait_for_extension_ready': ExtensionToolCategories.SMART_WAITING,
  
  // Developer Tools
  'check_extension_permissions': ExtensionToolCategories.DEVELOPER_TOOLS,
  'audit_extension_security': ExtensionToolCategories.DEVELOPER_TOOLS,
  'check_extension_updates': ExtensionToolCategories.DEVELOPER_TOOLS,
  
  // Quick Debug Tools
  'quick_extension_debug': ExtensionToolCategories.QUICK_DEBUG,
  'quick_performance_check': ExtensionToolCategories.QUICK_DEBUG,
};

/**
 * Get category for a tool
 */
export function getToolCategory(toolName: string): ExtensionToolCategories | undefined {
  return ToolCategoryMap[toolName];
}

/**
 * Get all tools in a category
 */
export function getToolsByCategory(category: ExtensionToolCategories): string[] {
  return Object.entries(ToolCategoryMap)
    .filter(([_, cat]) => cat === category)
    .map(([tool]) => tool);
}

