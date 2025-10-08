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
  ExtensionLogsResponse,
  ExtensionLogEntry,
  ContentScriptStatusResponse,
  ContentScriptStatusResult,
  ContentScriptInjectionStatus,
  ContentScriptDOMModifications,
  ContentScriptConflict,
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
      log('Calling Target.getTargets()...');
      const targets = await Target.getTargets();
      log('Raw targets response:', JSON.stringify(targets, null, 2));
      
      const allTargetInfos = targets.targetInfos || [];
      log(`Found ${allTargetInfos.length} total targets`);
      
      // 详细记录每个目标
      allTargetInfos.forEach((info: any, index: number) => {
        log(`Target ${index + 1}:`, {
          id: info.targetId,
          type: info.type,
          url: info.url || '(no url)',
          title: info.title || '(no title)',
          attached: info.attached
        });
      });
      
      // 应用扩展的过滤逻辑
      const items = allTargetInfos.filter((info: any) => {
        const isExtensionUrl = info.url?.startsWith('chrome-extension://');
        const isServiceWorker = info.type === 'service_worker';
        // 添加更多检测条件
        const isExtensionWorker = info.type === 'worker' && info.url?.includes('chrome-extension://');
        const isExtensionPage = info.type === 'page' && info.url?.startsWith('chrome-extension://');
        const isExtensionBackground = info.type === 'background_page';
        
        const shouldInclude = isExtensionUrl || isExtensionWorker || isExtensionPage || isExtensionBackground;
        
        log(`Target ${info.targetId}: type=${info.type}, url=${info.url}, include=${shouldInclude} (ext=${isExtensionUrl}, sw=${isServiceWorker}, ew=${isExtensionWorker}, ep=${isExtensionPage}, bg=${isExtensionBackground})`);
        
        return shouldInclude;
      }).map((info: any) => ({ id: info.targetId, type: info.type, url: info.url || '' }));

      log(`After filtering: ${items.length} extension targets found`);
      items.forEach((item: any, index: number) => {
        log(`Extension ${index + 1}:`, item);
      });

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    } catch (e) {
      log('Error in listExtensions:', e);
      throw new McpError(ErrorCode.InternalError, `Failed to list extensions: ${e}`);
    }
  }

  /**
   * Get filtered extension logs with enhanced filtering capabilities
   */
  async getExtensionLogs(args: GetExtensionLogsArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    log('Getting extension logs with args:', args);
    
    // 获取结构化日志
    const structuredLogs = this.chromeManager.getStructuredLogs();
    log(`Found ${structuredLogs.length} total structured logs`);
    
    // 应用过滤器
    let filteredLogs = [...structuredLogs];
    
    // 1. 扩展ID过滤
    if (args?.extensionId) {
      filteredLogs = filteredLogs.filter(log => log.extensionId === args.extensionId);
      log(`After extensionId filter (${args.extensionId}): ${filteredLogs.length} logs`);
    }
    
    // 2. 源类型过滤
    if (args?.sourceTypes && args.sourceTypes.length > 0) {
      filteredLogs = filteredLogs.filter(log => args.sourceTypes!.includes(log.source as any));
      log(`After sourceTypes filter (${args.sourceTypes.join(', ')}): ${filteredLogs.length} logs`);
    }
    
    // 3. 日志级别过滤
    if (args?.level && args.level.length > 0) {
      filteredLogs = filteredLogs.filter(log => args.level!.includes(log.level as any));
      log(`After level filter (${args.level.join(', ')}): ${filteredLogs.length} logs`);
    }
    
    // 4. 时间过滤
    if (args?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= args.since!);
      log(`After since filter (${new Date(args.since).toISOString()}): ${filteredLogs.length} logs`);
    }
    
    // 5. Tab ID过滤 (主要用于content script日志)
    if (args?.tabId) {
      filteredLogs = filteredLogs.filter(log => {
        // 对于content script，可能需要通过URL匹配tab
        if (log.source === 'content_script') {
          // 这里可能需要更复杂的逻辑来匹配tabId和URL
          return true; // 简化实现，后续可以增强
        }
        return log.tabId === args.tabId;
      });
      log(`After tabId filter (${args.tabId}): ${filteredLogs.length} logs`);
    }
    
    // 按时间戳排序（最新的在前）
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // 准备响应数据
    const response: ExtensionLogsResponse = {
      logs: filteredLogs,
      totalCount: structuredLogs.length,
      filteredCount: filteredLogs.length
    };
    
    // 如果有扩展ID，尝试获取扩展信息
    if (args?.extensionId) {
      try {
        const extensionInfo = await this.getExtensionInfo(args.extensionId);
        if (extensionInfo) {
          response.extensionInfo = extensionInfo;
        }
      } catch (e) {
        log('Failed to get extension info:', e);
      }
    }
    
    // 清理日志（如果请求）
    if (args?.clear) {
      this.chromeManager.clearConsoleLogs();
      log('Logs cleared');
    }
    
    // 格式化输出
    const formattedOutput = this.formatLogsOutput(response);
    
    return { content: [{ type: 'text', text: formattedOutput }] };
  }
  
  /**
   * 获取扩展信息
   */
  private async getExtensionInfo(extensionId: string): Promise<{id: string; name: string; version: string} | null> {
    try {
      const cdp = this.chromeManager.getCdpClient();
      if (!cdp) return null;
      
      const { Target } = cdp as any;
      const targets = await Target.getTargets();
      
      // 查找该扩展的manifest页面
      const extensionTarget = (targets.targetInfos || []).find((info: any) => 
        info.url?.startsWith(`chrome-extension://${extensionId}/`) &&
        (info.url.includes('manifest.json') || info.type === 'background_page' || info.type === 'service_worker')
      );
      
      if (extensionTarget) {
        // 这里可以进一步获取manifest信息，暂时返回基本信息
        return {
          id: extensionId,
          name: `Extension ${extensionId}`,
          version: 'unknown'
        };
      }
      
      return null;
    } catch (e) {
      log('Error getting extension info:', e);
      return null;
    }
  }
  
  /**
   * 格式化日志输出
   */
  private formatLogsOutput(response: ExtensionLogsResponse): string {
    const lines: string[] = [];
    
    // 头部信息
    lines.push(`=== Extension Logs Report ===`);
    lines.push(`Total logs: ${response.totalCount}`);
    lines.push(`Filtered logs: ${response.filteredCount}`);
    
    if (response.extensionInfo) {
      lines.push(`Extension: ${response.extensionInfo.name} (${response.extensionInfo.id})`);
      lines.push(`Version: ${response.extensionInfo.version}`);
    }
    
    lines.push(''); // 空行
    
    if (response.logs.length === 0) {
      lines.push('No logs found matching the criteria.');
      return lines.join('\n');
    }
    
    // 日志条目
    lines.push('=== Log Entries ===');
    
    response.logs.forEach((log, index) => {
      const timestamp = new Date(log.timestamp).toISOString();
      const source = log.source.toUpperCase().padEnd(12);
      const level = log.level.toUpperCase().padEnd(5);
      
      lines.push(`[${index + 1}] ${timestamp} ${source} ${level} ${log.message}`);
      
      if (log.url && log.url !== 'about:blank') {
        lines.push(`    URL: ${log.url}`);
      }
      
      if (log.extensionId) {
        lines.push(`    Extension: ${log.extensionId}`);
      }
      
      if (log.tabId) {
        lines.push(`    Tab: ${log.tabId}`);
      }
      
      lines.push(''); // 空行分隔
    });
    
    return lines.join('\n');
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
   * Enhanced content script status check with comprehensive analysis
   */
  async contentScriptStatus(args: ContentScriptStatusArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    log('Checking content script status with args:', args);

    const results: ContentScriptStatusResult[] = [];

    if (args?.checkAllTabs) {
      // 检查所有标签页
      const tabs = await this.pageManager.listTabs();
      log(`Checking content script status for ${tabs.length} tabs`);
      
      for (const tab of tabs) {
        try {
          const result = await this.analyzeContentScriptInTab(tab.id, tab.url, args.extensionId);
          if (result) {
            results.push(result);
          }
        } catch (e) {
          log(`Failed to analyze tab ${tab.id}:`, e);
        }
      }
    } else if (args?.tabId) {
      // 检查特定标签页
      const page = this.pageManager.getTabIdToPageMap().get(args.tabId);
      if (!page) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
      }
      
      const url = await page.url();
      const result = await this.analyzeContentScriptInTab(args.tabId, url, args.extensionId);
      if (result) {
        results.push(result);
      }
    } else {
      throw new McpError(ErrorCode.InvalidParams, 'Either tabId or checkAllTabs must be provided');
    }

    const response: ContentScriptStatusResponse = { results };
    const formattedOutput = this.formatContentScriptStatusOutput(response);
    
    return { content: [{ type: 'text', text: formattedOutput }] };
  }

  /**
   * 分析特定标签页中的内容脚本状态
   */
  private async analyzeContentScriptInTab(tabId: string, url: string, extensionId?: string): Promise<ContentScriptStatusResult | null> {
    const page = this.pageManager.getTabIdToPageMap().get(tabId);
    if (!page) {
      log(`Page not found for tabId: ${tabId}`);
      return null;
    }

    try {
      log(`Analyzing content script in tab ${tabId} (${url})`);
      
      const analysis = await page.evaluate((extId) => {
        const startTime = performance.now();
        
        // 检测内容脚本注入状态
        const injectionStatus = {
          injected: false,
          scriptCount: 0,
          cssCount: 0,
          errors: [] as string[],
          performance: {
            injectionTime: 0,
            domReadyTime: performance.now() - startTime
          }
        };

        // 检测DOM修改
        const domModifications = {
          elementsAdded: 0,
          elementsRemoved: 0,
          styleChanges: 0
        };

        // 检测冲突
        const conflicts: Array<{type: 'css' | 'js' | 'dom', description: string, severity: 'low' | 'medium' | 'high'}> = [];

        try {
          // 1. 检测扩展相关的脚本标签
          const scripts = Array.from(document.querySelectorAll('script'));
          const extensionScripts = scripts.filter(script => {
            const src = script.src;
            return src && src.includes('chrome-extension://') && 
                   (!extId || src.includes(extId));
          });
          injectionStatus.scriptCount = extensionScripts.length;

          // 2. 检测扩展相关的样式
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
          const extensionStyles = styles.filter(style => {
            if (style instanceof HTMLLinkElement) {
              return style.href && style.href.includes('chrome-extension://') &&
                     (!extId || style.href.includes(extId));
            } else {
              const textContent = style.textContent || '';
              return textContent.includes('/* injected by extension */') ||
                     style.hasAttribute('data-extension-id');
            }
          });
          injectionStatus.cssCount = extensionStyles.length;

          // 3. 检测特定的扩展标记（如MVP扩展的标记）
          const mvpIndicator = document.getElementById('mvp-indicator');
          const mvpCaptureBtn = document.getElementById('mvp-capture-btn');
          const hasExtensionMarkers = mvpIndicator || mvpCaptureBtn || 
                                    document.querySelector('[data-extension-injected]') ||
                                    document.querySelector('.extension-injected');

          injectionStatus.injected = injectionStatus.scriptCount > 0 || injectionStatus.cssCount > 0 || !!hasExtensionMarkers;

          // 4. 检测DOM修改（通过MutationObserver记录或特定标记）
          const extensionElements = Array.from(document.querySelectorAll('[data-extension-id], [data-injected-by], .extension-injected, .extension-widget, .extension-status-bar'));
          domModifications.elementsAdded = extensionElements.length;

          // 5. 检测潜在冲突
          // CSS冲突检测
          const importantStyles = Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.zIndex && parseInt(style.zIndex) > 10000;
          });
          if (importantStyles.length > 5) {
            conflicts.push({
              type: 'css',
              description: `High z-index elements detected (${importantStyles.length}), potential overlay conflicts`,
              severity: 'medium'
            });
          }

          // JavaScript冲突检测
          const globalVars = Object.keys(window).filter(key => key.startsWith('ext_') || key.includes('Extension'));
          if (globalVars.length > 0) {
            conflicts.push({
              type: 'js',
              description: `Extension global variables detected: ${globalVars.join(', ')}`,
              severity: 'low'
            });
          }

          // DOM冲突检测
          const duplicateIds: string[] = [];
          const ids = new Set<string>();
          Array.from(document.querySelectorAll('[id]')).forEach(el => {
            if (ids.has(el.id)) {
              duplicateIds.push(el.id);
            } else {
              ids.add(el.id);
            }
          });
          if (duplicateIds.length > 0) {
            conflicts.push({
              type: 'dom',
              description: `Duplicate IDs detected: ${duplicateIds.join(', ')}`,
              severity: 'high'
            });
          }

          injectionStatus.performance.injectionTime = performance.now() - startTime;

        } catch (error: any) {
          injectionStatus.errors.push(`Analysis error: ${error?.message || String(error)}`);
        }

        return {
          injectionStatus,
          domModifications,
          conflicts,
          additionalInfo: {
            hasConsole: typeof console !== 'undefined',
            hasChrome: typeof (window as any).chrome !== 'undefined',
            hasChromeRuntime: typeof (window as any).chrome?.runtime !== 'undefined',
            userAgent: navigator.userAgent,
            documentReadyState: document.readyState
          }
        };
      }, extensionId);

      // 尝试确定扩展ID（如果未提供）
      let detectedExtensionId = extensionId;
      if (!detectedExtensionId && analysis.injectionStatus.injected) {
        // 从注入的脚本或样式中提取扩展ID
        const scripts = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script[src*="chrome-extension://"]'));
          return scripts.map(s => (s as HTMLScriptElement).src);
        });
        
        for (const src of scripts) {
          const match = src.match(/chrome-extension:\/\/([a-z]+)/);
          if (match) {
            detectedExtensionId = match[1];
            break;
          }
        }
      }

      const result: ContentScriptStatusResult = {
        tabId,
        url,
        extensionId: extensionId || detectedExtensionId || 'unknown',
        injectionStatus: analysis.injectionStatus,
        domModifications: analysis.domModifications,
        conflicts: analysis.conflicts
      };

      log(`Content script analysis complete for tab ${tabId}:`, {
        injected: result.injectionStatus.injected,
        scriptCount: result.injectionStatus.scriptCount,
        cssCount: result.injectionStatus.cssCount,
        conflictsCount: result.conflicts.length
      });

      return result;

    } catch (e) {
      log(`Failed to analyze content script in tab ${tabId}:`, e);
      throw new McpError(ErrorCode.InternalError, `Failed to analyze content script: ${e}`);
    }
  }

  /**
   * 格式化内容脚本状态输出
   */
  private formatContentScriptStatusOutput(response: ContentScriptStatusResponse): string {
    const lines: string[] = [];
    
    lines.push('=== Content Script Status Report ===');
    lines.push(`Analyzed tabs: ${response.results.length}`);
    
    const injectedTabs = response.results.filter(r => r.injectionStatus.injected);
    lines.push(`Tabs with content scripts: ${injectedTabs.length}`);
    lines.push('');

    if (response.results.length === 0) {
      lines.push('No tabs analyzed.');
      return lines.join('\n');
    }

    response.results.forEach((result, index) => {
      lines.push(`[${index + 1}] Tab: ${result.tabId}`);
      lines.push(`    URL: ${result.url}`);
      lines.push(`    Extension: ${result.extensionId}`);
      
      const status = result.injectionStatus;
      lines.push(`    Injection Status: ${status.injected ? '✅ INJECTED' : '❌ NOT INJECTED'}`);
      
      if (status.injected) {
        lines.push(`    Scripts: ${status.scriptCount}, CSS: ${status.cssCount}`);
        lines.push(`    Performance: Injection=${status.performance.injectionTime.toFixed(2)}ms, DOM Ready=${status.performance.domReadyTime.toFixed(2)}ms`);
        
        if (result.domModifications.elementsAdded > 0) {
          lines.push(`    DOM Changes: +${result.domModifications.elementsAdded} elements`);
        }
        
        if (result.conflicts.length > 0) {
          lines.push(`    Conflicts: ${result.conflicts.length} detected`);
          result.conflicts.forEach(conflict => {
            const severity = conflict.severity.toUpperCase();
            lines.push(`      [${severity}] ${conflict.type}: ${conflict.description}`);
          });
        }
      }
      
      if (status.errors.length > 0) {
        lines.push(`    Errors: ${status.errors.join(', ')}`);
      }
      
      lines.push('');
    });

    // 总结部分
    if (injectedTabs.length > 0) {
      lines.push('=== Summary ===');
      const totalScripts = injectedTabs.reduce((sum, tab) => sum + tab.injectionStatus.scriptCount, 0);
      const totalCSS = injectedTabs.reduce((sum, tab) => sum + tab.injectionStatus.cssCount, 0);
      const totalConflicts = response.results.reduce((sum, tab) => sum + tab.conflicts.length, 0);
      
      lines.push(`Total scripts injected: ${totalScripts}`);
      lines.push(`Total CSS injected: ${totalCSS}`);
      if (totalConflicts > 0) {
        lines.push(`⚠️ Total conflicts: ${totalConflicts}`);
      }
      
      // 扩展分布
      const extensionCounts = new Map<string, number>();
      injectedTabs.forEach(tab => {
        const count = extensionCounts.get(tab.extensionId) || 0;
        extensionCounts.set(tab.extensionId, count + 1);
      });
      
      if (extensionCounts.size > 0) {
        lines.push('Extension distribution:');
        extensionCounts.forEach((count, extId) => {
          lines.push(`  ${extId}: ${count} tabs`);
        });
      }
    }

    return lines.join('\n');
  }
}
