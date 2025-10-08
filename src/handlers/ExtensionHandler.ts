/**
 * Extension Handler Module
 * Handles extension discovery, logs, and content script operations
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { PageManager } from '../managers/PageManager.js';
import { ChromeManager } from '../managers/ChromeManager.js';
import {
  ListExtensionsArgs,
  GetExtensionLogsArgs,
  InjectContentScriptArgs,
  ContentScriptStatusArgs,
} from '../types/index.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[ExtensionHandler]', ...args);

export class ExtensionHandler {
  constructor(private chromeManager: ChromeManager, private pageManager: PageManager) {}

  /**
   * List extension-related targets (extension pages and service workers)
   */
  async listExtensions(_args: ListExtensionsArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const cdp = this.chromeManager.getCdpClient();
    if (!cdp) {
      throw new McpError(ErrorCode.InternalError, 'CDP client not available. Attach or launch Chrome first.');
    }

    try {
      const { Target } = cdp as any;
      const targets = await Target.getTargets();
      const items = (targets.targetInfos || []).filter((info: any) => {
        return (info.url?.startsWith('chrome-extension://')) || (info.type === 'service_worker');
      }).map((info: any) => ({ id: info.targetId, type: info.type, url: info.url || '' }));

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Failed to list extensions: ${e}`);
    }
  }

  /**
   * Get filtered extension logs
   */
  async getExtensionLogs(args: GetExtensionLogsArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const logs = this.chromeManager.getConsoleLogs();

    let filtered = logs;
    if (args?.sourceTypes && args.sourceTypes.length > 0) {
      filtered = logs.filter((line) => {
        return args.sourceTypes!.some((t) => line.startsWith(`[${t}]`));
      });
    }

    if (args?.clear) {
      this.chromeManager.clearConsoleLogs();
    }

    return { content: [{ type: 'text', text: filtered.join('\n') || 'No logs' }] };
  }

  /**
   * Inject content script code or files into a specific tab
   */
  async injectContentScript(args: InjectContentScriptArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!args?.tabId) {
      throw new McpError(ErrorCode.InvalidParams, 'tabId is required');
    }
    const page = this.pageManager.getTabIdToPageMap().get(args.tabId);
    if (!page) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
    }

    try {
      // Inject inline code if provided
      if (args.code) {
        await page.addScriptTag({ content: args.code });
        log('Injected inline code into tab', args.tabId);
      }

      // Inject files if provided (paths must be accessible from this process)
      if (args.files && args.files.length > 0) {
        for (const filePath of args.files) {
          try {
            await page.addScriptTag({ path: filePath });
            log('Injected file into tab', args.tabId, filePath);
          } catch (e) {
            log('Failed to inject file', filePath, e);
            throw new McpError(ErrorCode.InternalError, `Failed to inject file ${filePath}: ${e}`);
          }
        }
      }

      return { content: [{ type: 'text', text: 'injected' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Inject content script failed: ${e}`);
    }
  }

  /**
   * Check content script status by probing DOM markers from MVP content script
   */
  async contentScriptStatus(args: ContentScriptStatusArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!args?.tabId) {
      throw new McpError(ErrorCode.InvalidParams, 'tabId is required');
    }
    const page = this.pageManager.getTabIdToPageMap().get(args.tabId);
    if (!page) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
    }

    try {
      const status = await page.evaluate(() => {
        const indicator = document.getElementById('mvp-indicator');
        const btn = document.getElementById('mvp-capture-btn');
        const hasLogFn = typeof (console?.log) === 'function';
        return {
          indicator: !!indicator,
          captureBtn: !!btn,
          consoleReady: hasLogFn,
          url: location.href,
          title: document.title
        };
      });

      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Failed to check content script status: ${e}`);
    }
  }
}
