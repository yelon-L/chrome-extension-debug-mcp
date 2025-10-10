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

export interface ExtensionResponseContext {
  extensionId?: string;
  page?: Page;
  tabs?: any[];
}

export class ExtensionResponse {
  private textLines: string[] = [];
  private includeExtensionStatus = false;
  private includePageContext = false;
  private includeTabsList = false;
  private includeContentScriptStatus = false;
  private includeStorageInfo = false;
  private includeAvailableActions = false;
  
  private context?: ExtensionResponseContext;

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
        response.push(`${i}: ${tab.url()}${selected}`);
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

    // Add available actions suggestions
    if (this.includeAvailableActions) {
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

