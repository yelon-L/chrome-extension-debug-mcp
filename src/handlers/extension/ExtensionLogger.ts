/**
 * 扩展日志分析模块
 * 负责Chrome扩展的日志收集、过滤和分析
 */

// 简化日志函数
const log = (...args: any[]) => console.error('[ExtensionLogger]', ...args);
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ChromeManager } from '../../managers/ChromeManager.js';
import { 
  GetExtensionLogsArgs, 
  ExtensionLogsResponse,
  ExtensionLogEntry
} from '../../types/index.js';

export class ExtensionLogger {
  constructor(
    private chromeManager: ChromeManager
  ) {}

  /**
   * 获取扩展相关日志
   */
  async getExtensionLogs(args: GetExtensionLogsArgs): Promise<ExtensionLogsResponse> {
    try {
      const { extensionId, sourceTypes = ['page', 'extension', 'service_worker'], since, clear = false } = args;
      log('Getting extension logs', { extensionId, sourceTypes, since, clear });

      const cdpClient = this.chromeManager.getCdpClient();
      if (!cdpClient) {
        throw new McpError(ErrorCode.InternalError, 'Chrome not connected. Please attach to Chrome first.');
      }

      // 获取console日志
      const logs = await this.collectConsoleLogs(sourceTypes, since);
      
      // 过滤扩展相关日志
      const filteredLogs = extensionId ? 
        logs.filter(log => this.isExtensionRelated(log, extensionId)) : 
        logs.filter(log => this.isExtensionRelated(log));

      // 分析和增强日志
      const enhancedLogs = await this.enhanceLogs(filteredLogs);

      // 清理日志（如果请求）
      if (clear) {
        await this.clearConsoleLogs();
      }

      const response: ExtensionLogsResponse = {
        logs: enhancedLogs,
        totalCount: enhancedLogs.length,
        filteredCount: enhancedLogs.length,
        extensionInfo: {
          id: extensionId || 'all',
          name: 'Unknown',
          version: '1.0.0'
        }
      };

      log(`Extension logs analysis complete: ${enhancedLogs.length} entries`);
      return response;

    } catch (e) {
      log('Failed to get extension logs:', e);
      throw new McpError(ErrorCode.InternalError, `Failed to get extension logs: ${e}`);
    }
  }

  /**
   * 收集控制台日志
   */
  private async collectConsoleLogs(sourceTypes: string[], since?: number): Promise<any[]> {
    // 简化实现，实际应该从Chrome DevTools Protocol获取
    const logs: any[] = [];
    
    // 这里应该实现真正的日志收集逻辑
    // 由于复杂性，先返回空数组
    
    return logs;
  }

  /**
   * 判断日志是否与扩展相关
   */
  private isExtensionRelated(logEntry: any, extensionId?: string): boolean {
    const text = logEntry.text || '';
    const url = logEntry.url || '';
    
    // 检查URL是否为chrome-extension://
    if (url.startsWith('chrome-extension://')) {
      if (extensionId) {
        return url.includes(extensionId);
      }
      return true;
    }
    
    // 检查日志内容是否包含扩展相关关键词
    const extensionKeywords = [
      'chrome-extension://',
      'chrome.runtime',
      'chrome.tabs',
      'chrome.storage',
      'Extension',
      'background script',
      'content script'
    ];
    
    return extensionKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 增强日志信息
   */
  private async enhanceLogs(logs: any[]): Promise<ExtensionLogEntry[]> {
    return logs.map(log => ({
      timestamp: log.timestamp || Date.now(),
      level: log.level || 'info',
      message: log.text || log.message || '',
      source: log.source || 'unknown',
      url: log.url || '',
      lineNumber: log.lineNumber,
      columnNumber: log.columnNumber,
      stackTrace: log.stackTrace,
      extensionId: this.extractExtensionIdFromUrl(log.url),
      category: this.categorizeLog(log)
    }));
  }

  /**
   * 从URL提取扩展ID
   */
  private extractExtensionIdFromUrl(url: string): string | undefined {
    if (!url) return undefined;
    const match = url.match(/chrome-extension:\/\/([a-z]{32})/);
    return match ? match[1] : undefined;
  }

  /**
   * 分类日志
   */
  private categorizeLog(log: any): string {
    const text = (log.text || '').toLowerCase();
    
    if (text.includes('error') || log.level === 'error') {
      return 'error';
    }
    if (text.includes('warn') || log.level === 'warning') {
      return 'warning';
    }
    if (text.includes('background')) {
      return 'background';
    }
    if (text.includes('content')) {
      return 'content_script';
    }
    
    return 'general';
  }

  /**
   * 分析日志统计
   */
  private analyzeLogs(logs: ExtensionLogEntry[]) {
    const summary = {
      errorCount: 0,
      levels: {} as Record<string, number>,
      sources: {} as Record<string, number>,
      timeRange: {
        start: undefined as number | undefined,
        end: undefined as number | undefined
      }
    };

    logs.forEach(log => {
      // 分类统计
      summary.levels[log.level] = (summary.levels[log.level] || 0) + 1;
      summary.sources[log.source] = (summary.sources[log.source] || 0) + 1;

      // 时间统计
      if (log.timestamp) {
        if (!summary.timeRange.start || log.timestamp < summary.timeRange.start) {
          summary.timeRange.start = log.timestamp;
        }
        if (!summary.timeRange.end || log.timestamp > summary.timeRange.end) {
          summary.timeRange.end = log.timestamp;
        }
      }

      // 错误统计
      if (log.level === 'error') {
        summary.errorCount++;
      }
    });

    return summary;
  }

  /**
   * 清理控制台日志
   */
  private async clearConsoleLogs(): Promise<void> {
    try {
      const cdpClient = this.chromeManager.getCdpClient();
      if (cdpClient) {
        await cdpClient.Runtime.discardConsoleEntries();
      }
    } catch (e) {
      log('Failed to clear console logs:', e);
    }
  }
}
