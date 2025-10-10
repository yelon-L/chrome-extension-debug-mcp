/**
 * Smart Timeout Configuration System
 * 
 * Phase 3: Adaptive timeout calculation based on:
 * - Tool base timeout
 * - CPU throttling multiplier
 * - Network condition multiplier
 */

export interface TimeoutOptions {
  cpuMultiplier?: number;
  networkMultiplier?: number;
  baseOverride?: number;
}

export class TimeoutConfig {
  // Base timeouts for each tool category (ms)
  private static readonly BASE_TIMEOUTS: Record<string, number> = {
    // Fast operations (< 1s)
    'list_tabs': 1000,
    'list_extensions': 2000,
    'new_tab': 2000,
    'switch_tab': 1000,
    'close_tab': 1000,
    
    // DOM interactions (1-3s)
    'click': 3000,
    'type': 3000,
    'screenshot': 3000,
    'hover_element': 2000,
    'drag_element': 3000,
    'fill_form': 5000,
    'upload_file': 5000,
    'handle_dialog': 2000,
    
    // Snapshot operations (2-5s)
    'take_snapshot': 5000,
    'click_by_uid': 3000,
    'fill_by_uid': 3000,
    'hover_by_uid': 2000,
    
    // Wait operations (configurable)
    'wait_for_element': 10000,
    'wait_for_extension_ready': 15000,
    'wait_for': 5000,
    
    // Extension debugging (5-15s)
    'get_extension_logs': 5000,
    'inject_content_script': 5000,
    'content_script_status': 3000,
    'list_extension_contexts': 3000,
    'switch_extension_context': 3000,
    'inspect_extension_storage': 15000, // Long: Service Worker wake-up
    'monitor_extension_messages': 30000, // Long: Monitoring duration
    'track_extension_api_calls': 30000, // Long: Tracking duration
    'test_extension_on_multiple_pages': 30000, // Long: Multi-page test
    
    // Performance & Network (10-30s)
    'analyze_extension_performance': 15000,
    'emulate_cpu': 5000,
    'emulate_network': 5000,
    'test_extension_conditions': 30000,
    'performance_get_insights': 5000,
    'performance_list_insights': 3000,
    'track_extension_network': 30000,
    'list_extension_requests': 3000,
    'get_extension_request_details': 2000,
    'export_extension_network_har': 5000,
    'analyze_extension_network': 5000,
    
    // Developer Tools (5-10s)
    'check_extension_permissions': 5000,
    'audit_extension_security': 10000,
    'check_extension_updates': 10000,
    
    // Quick Tools (30-60s)
    'quick_extension_debug': 60000, // Long: Multiple sub-tasks
    'quick_performance_check': 45000, // Long: Performance analysis
    
    // Navigation & Utilities (2-5s)
    'navigate_page_history': 5000,
    'resize_page': 2000,
    'run_script': 5000,
    
    // Evaluation (2-5s)
    'evaluate': 5000,
  };
  
  // Network condition multipliers
  private static readonly NETWORK_MULTIPLIERS: Record<string, number> = {
    'No throttling': 1.0,
    'Good 3G': 1.5,
    'Regular 3G': 2.0,
    'Slow 3G': 3.0,
    'Offline': 5.0,
  };
  
  /**
   * Get adaptive timeout for a tool
   */
  static getTimeout(
    toolName: string, 
    options: TimeoutOptions = {}
  ): number {
    const {
      cpuMultiplier = 1.0,
      networkMultiplier = 1.0,
      baseOverride
    } = options;
    
    // Use override if provided, otherwise lookup base timeout
    const baseTimeout = baseOverride ?? this.BASE_TIMEOUTS[toolName] ?? 10000;
    
    // Calculate adaptive timeout
    const adaptiveTimeout = Math.round(
      baseTimeout * cpuMultiplier * networkMultiplier
    );
    
    // Clamp to reasonable range (1s - 120s)
    return Math.max(1000, Math.min(adaptiveTimeout, 120000));
  }
  
  /**
   * Get network multiplier from condition name
   */
  static getNetworkMultiplier(condition: string): number {
    return this.NETWORK_MULTIPLIERS[condition] ?? 1.0;
  }
  
  /**
   * Get CPU multiplier from throttle rate
   * rate: 1 = no throttle, 4 = 4x slower
   */
  static getCPUMultiplier(throttleRate: number): number {
    return Math.max(1.0, throttleRate);
  }
  
  /**
   * Get timeout with auto-detection of current emulation state
   */
  static getAdaptiveTimeout(
    toolName: string,
    currentCPURate: number = 1,
    currentNetworkCondition: string = 'No throttling'
  ): number {
    const cpuMult = this.getCPUMultiplier(currentCPURate);
    const networkMult = this.getNetworkMultiplier(currentNetworkCondition);
    
    return this.getTimeout(toolName, {
      cpuMultiplier: cpuMult,
      networkMultiplier: networkMult
    });
  }
  
  /**
   * Get progress reporting interval for long-running tools
   * Returns 0 if tool doesn't need progress reporting
   */
  static getProgressInterval(toolName: string): number {
    const baseTimeout = this.BASE_TIMEOUTS[toolName] ?? 10000;
    
    // Only report progress for tools > 10s
    if (baseTimeout > 10000) {
      // Report every 20% of total time, minimum 2s
      return Math.max(2000, Math.round(baseTimeout * 0.2));
    }
    
    return 0; // No progress reporting needed
  }
}

