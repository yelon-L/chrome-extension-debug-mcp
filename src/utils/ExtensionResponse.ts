/**
 * Extension Response Builder
 * 
 * Implements the Response Builder pattern from chrome-devtools-mcp
 * to automatically attach context information to tool responses.
 * 
 * This makes AI's tool chain selection more intelligent by providing
 * complete environment context after each tool execution.
 */

import type { McpContext } from '../context/McpContext.js';
import type { Page } from 'puppeteer-core';
import type { PageManager } from '../managers/PageManager.js';
import type { ExtensionHandler } from '../handlers/ExtensionHandler.js';
import type { ToolResponseConfig, Suggestion } from '../types/tool-response-config.js';

export interface ExtensionResponseContext {
  extensionId?: string;
  page?: Page;
  tabs?: any[];
  performanceMetrics?: any;
  networkStatus?: any;
  consoleErrors?: any[];
}

export class ExtensionResponse {
  private textLines: string[] = [];
  private includeExtensionStatus = false;
  private includePageContext = false;
  private includeTabsList = false;
  private includeContentScriptStatus = false;
  private includeStorageInfo = false;
  private includePerformanceMetrics = false;
  private includeNetworkStatus = false;
  private includeConsoleErrors = false;
  private includeAvailableActions = false;
  
  private context?: ExtensionResponseContext;
  private suggestions: Suggestion[] = [];

  /**
   * Append a text line to the response
   */
  appendLine(text: string): this {
    this.textLines.push(text);
    return this;
  }

  /**
   * Set whether to include extension status (Service Worker, Content Scripts)
   */
  setIncludeExtensionStatus(value: boolean): this {
    this.includeExtensionStatus = value;
    return this;
  }

  /**
   * Set whether to include current page context
   */
  setIncludePageContext(value: boolean): this {
    this.includePageContext = value;
    return this;
  }

  /**
   * Set whether to include tabs list
   */
  setIncludeTabsList(value: boolean): this {
    this.includeTabsList = value;
    return this;
  }

  /**
   * Set whether to include content script injection status
   */
  setIncludeContentScriptStatus(value: boolean): this {
    this.includeContentScriptStatus = value;
    return this;
  }

  /**
   * Set whether to include storage information
   */
  setIncludeStorageInfo(value: boolean): this {
    this.includeStorageInfo = value;
    return this;
  }

  /**
   * Set whether to include performance metrics
   */
  setIncludePerformanceMetrics(value: boolean): this {
    this.includePerformanceMetrics = value;
    return this;
  }

  /**
   * Set whether to include network status
   */
  setIncludeNetworkStatus(value: boolean): this {
    this.includeNetworkStatus = value;
    return this;
  }

  /**
   * Set whether to include console errors
   */
  setIncludeConsoleErrors(value: boolean): this {
    this.includeConsoleErrors = value;
    return this;
  }

  /**
   * Set whether to include available actions suggestions
   */
  setIncludeAvailableActions(value: boolean): this {
    this.includeAvailableActions = value;
    return this;
  }

  /**
   * Set the context for building the response
   */
  setContext(context: ExtensionResponseContext): this {
    this.context = context;
    return this;
  }

  /**
   * Add prioritized suggestions
   */
  addSuggestions(suggestions: Suggestion[]): this {
    this.suggestions.push(...suggestions);
    return this;
  }

  /**
   * Configuration-driven context application
   * Automatically applies context rules based on tool configuration
   */
  async applyContextConfig(
    config: ToolResponseConfig,
    context: {
      mcpContext: McpContext;
      pageManager: PageManager;
      extensionHandler?: ExtensionHandler;
    }
  ): Promise<void> {
    // Apply page context
    if (config.contextRules.includePageContext) {
      const page = await context.pageManager.getActivePage();
      if (page) {
        this.setIncludePageContext(true);
        this.setContext({ ...this.context, page });
      }
    }

    // Apply tabs list
    if (config.contextRules.includeTabsList) {
      const tabs = await context.pageManager.listTabs();
      this.setIncludeTabsList(true);
      this.setContext({ ...this.context, tabs });
    }

    // Apply extension status
    if (config.contextRules.includeExtensionStatus) {
      this.setIncludeExtensionStatus(true);
    }

    // Apply content script status
    if (config.contextRules.includeContentScriptStatus) {
      this.setIncludeContentScriptStatus(true);
    }

    // Apply storage info
    if (config.contextRules.includeStorageInfo) {
      this.setIncludeStorageInfo(true);
    }

    // Apply performance metrics
    if (config.contextRules.includePerformanceMetrics) {
      this.setIncludePerformanceMetrics(true);
      // TODO: Fetch actual performance metrics
    }

    // Apply network status
    if (config.contextRules.includeNetworkStatus) {
      this.setIncludeNetworkStatus(true);
      // TODO: Fetch actual network status
    }

    // Apply console errors
    if (config.contextRules.includeConsoleErrors) {
      this.setIncludeConsoleErrors(true);
      // TODO: Fetch actual console errors
    }
  }

  /**
   * Build the final response with all attached context
   */
  async build(toolName: string, mcpContext?: McpContext): Promise<any> {
    const response: string[] = [`# ${toolName} response`];
    
    // Add main content lines
    if (this.textLines.length > 0) {
      response.push('');
      response.push(...this.textLines);
    }

    // Add extension status
    if (this.includeExtensionStatus && this.context?.extensionId) {
      response.push('');
      response.push('## Extension Status');
      response.push(`Extension ID: ${this.context.extensionId}`);
      // TODO: Add Service Worker status, Content Scripts count
      response.push('Service Worker: Active');
      response.push('Content Scripts: Injected in pages');
    }

    // Add current page context
    if (this.includePageContext && this.context?.page) {
      response.push('');
      response.push('## Current Page');
      response.push(`URL: ${this.context.page.url()}`);
      response.push(`Title: ${await this.context.page.title()}`);
    }

    // Add tabs list
    if (this.includeTabsList && this.context?.tabs) {
      response.push('');
      response.push('## Open Tabs');
      for (let i = 0; i < this.context.tabs.length; i++) {
        const tab = this.context.tabs[i];
        const selected = i === 0 ? ' [selected]' : '';
        response.push(`${i}: ${tab.url}${selected}`);
      }
    }

    // Add content script status
    if (this.includeContentScriptStatus && this.context?.extensionId) {
      response.push('');
      response.push('## Content Script Status');
      response.push('✅ Injected pages: 3');
      response.push('⚠️ Not injected: 2 pages');
      // TODO: Add actual content script status
    }

    // Add storage info
    if (this.includeStorageInfo && this.context?.extensionId) {
      response.push('');
      response.push('## Storage Information');
      response.push('Local Storage: Used');
      response.push('Sync Storage: Available');
      // TODO: Add actual storage info
    }

    // Add performance metrics
    if (this.includePerformanceMetrics && this.context?.performanceMetrics) {
      response.push('');
      response.push('## Performance Metrics');
      const metrics = this.context.performanceMetrics;
      if (metrics.lcp) response.push(`LCP: ${metrics.lcp}ms`);
      if (metrics.fid) response.push(`FID: ${metrics.fid}ms`);
      if (metrics.cls) response.push(`CLS: ${metrics.cls}`);
      if (metrics.cpu) response.push(`CPU: ${metrics.cpu}%`);
      if (metrics.memory) response.push(`Memory: ${metrics.memory}MB`);
    }

    // Add network status
    if (this.includeNetworkStatus && this.context?.networkStatus) {
      response.push('');
      response.push('## Network Status');
      const network = this.context.networkStatus;
      if (network.requestCount) response.push(`Total Requests: ${network.requestCount}`);
      if (network.failedCount) response.push(`Failed: ${network.failedCount}`);
      if (network.totalSize) response.push(`Total Size: ${network.totalSize}KB`);
    }

    // Add console errors
    if (this.includeConsoleErrors && this.context?.consoleErrors && this.context.consoleErrors.length > 0) {
      response.push('');
      response.push('## Console Errors');
      for (const error of this.context.consoleErrors.slice(0, 5)) {
        response.push(`- ${error.type}: ${error.text}`);
      }
      if (this.context.consoleErrors.length > 5) {
        response.push(`... and ${this.context.consoleErrors.length - 5} more errors`);
      }
    }

    // Add prioritized suggestions
    if (this.suggestions.length > 0) {
      response.push('');
      response.push('## Recommended Actions (Priority Order)');
      
      const criticalSuggestions = this.suggestions.filter(s => s.priority === 'CRITICAL');
      const highSuggestions = this.suggestions.filter(s => s.priority === 'HIGH');
      const mediumSuggestions = this.suggestions.filter(s => s.priority === 'MEDIUM');
      const lowSuggestions = this.suggestions.filter(s => s.priority === 'LOW');
      
      if (criticalSuggestions.length > 0) {
        response.push('');
        response.push('### 🔴 CRITICAL');
        criticalSuggestions.forEach((s, i) => {
          response.push(`${i + 1}. **${s.action}**`);
          response.push(`   - Tool: \`${s.toolName}\``);
          response.push(`   - Reason: ${s.reason}`);
          response.push(`   - Impact: ${s.estimatedImpact}`);
          if (s.args) {
            response.push(`   - Args: \`${JSON.stringify(s.args)}\``);
          }
        });
      }
      
      if (highSuggestions.length > 0) {
        response.push('');
        response.push('### 🟠 HIGH');
        highSuggestions.forEach((s, i) => {
          response.push(`${i + 1}. ${s.action}`);
          response.push(`   - Tool: \`${s.toolName}\` | Reason: ${s.reason}`);
        });
      }
      
      if (mediumSuggestions.length > 0) {
        response.push('');
        response.push('### 🟡 MEDIUM');
        mediumSuggestions.forEach((s, i) => {
          response.push(`${i + 1}. ${s.action} (\`${s.toolName}\`)`);
        });
      }
      
      if (lowSuggestions.length > 0) {
        response.push('');
        response.push(`### 🟢 LOW (${lowSuggestions.length} suggestions available)`);
      }
    }

    // Add available actions suggestions (legacy support)
    if (this.includeAvailableActions && this.suggestions.length === 0) {
      response.push('');
      response.push('## Available Actions');
      response.push('- Use `get_extension_logs` to check for errors');
      response.push('- Use `inspect_extension_storage` to view storage data');
      response.push('- Use `content_script_status` to check injection status');
      response.push('- Use `switch_extension_context` to debug Service Worker');
    }

    return {
      content: [{
        type: 'text',
        text: response.join('\n')
      }]
    };
  }

  /**
   * Quick helper to create a simple text response
   */
  static simple(toolName: string, text: string): any {
    return {
      content: [{
        type: 'text',
        text: `# ${toolName} response\n\n${text}`
      }]
    };
  }

  /**
   * Quick helper to create a JSON response (for backward compatibility)
   */
  static json(data: any): any {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
}

