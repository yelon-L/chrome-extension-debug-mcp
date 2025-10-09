/**
 * 内容脚本状态检查优化器
 * 并行处理、智能扫描、超时控制
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const log = (...args: any[]) => console.error('[ContentScriptOptimizer]', ...args);

interface TabAnalysisTask {
  tabId: string;
  url: string;
  title: string;
  priority: number;
}

interface ContentScriptStatus {
  tabId: string;
  extensionId: string;
  injected: boolean;
  errors: string[];
  performance: {
    responseTime: number;
    memoryUsage?: number;
  };
  conflicts: string[];
  functionality: {
    domAccess: boolean;
    messagesPassing: boolean;
    storageAccess: boolean;
  };
}

export class ContentScriptOptimizer {
  private readonly MAX_CONCURRENT_TABS = 5;
  private readonly ANALYSIS_TIMEOUT = 3000; // 单个标签页分析超时
  private readonly FAST_CHECK_TIMEOUT = 1000; // 快速检查超时
  
  private scanCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 20000; // 20秒缓存

  constructor(
    private chromeManager: any,
    private pageManager: any
  ) {}

  /**
   * 优化的内容脚本状态检查
   */
  async optimizedContentScriptStatus(args: any): Promise<any> {
    const { extensionId, tabId, checkAllTabs = false } = args;
    log(`🎯 优化内容脚本检查: ${extensionId}, 全部标签: ${checkAllTabs}`);

    try {
      let results: ContentScriptStatus[] = [];
      
      if (tabId) {
        // 单标签页快速检查
        results = await this.analyzeSingleTab(extensionId, tabId);
      } else if (checkAllTabs) {
        // 多标签页并行检查
        results = await this.analyzeAllTabsParallel(extensionId);
      } else {
        // 活跃标签页检查
        results = await this.analyzeActiveTabs(extensionId);
      }

      return this.generateOptimizedReport(extensionId, results);

    } catch (error) {
      log(`❌ 内容脚本检查失败: ${(error as Error).message}`);
      throw new McpError(ErrorCode.InternalError, `Content script analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * 单标签页分析
   */
  private async analyzeSingleTab(extensionId: string, tabId: string): Promise<ContentScriptStatus[]> {
    const cacheKey = `single-${extensionId}-${tabId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      log(`✅ 使用单标签缓存结果`);
      return [cached];
    }

    log(`🔍 分析单个标签页: ${tabId}`);
    
    const startTime = Date.now();
    const status = await this.performTabAnalysis(extensionId, tabId);
    status.performance.responseTime = Date.now() - startTime;
    
    this.setCachedResult(cacheKey, status);
    return [status];
  }

  /**
   * 并行分析所有标签页
   */
  private async analyzeAllTabsParallel(extensionId: string): Promise<ContentScriptStatus[]> {
    const cacheKey = `all-${extensionId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      log(`✅ 使用全标签缓存结果`);
      return cached;
    }

    log(`🚀 并行分析所有标签页`);
    
    // 1. 获取所有标签页并排序
    const tabs = await this.getAllTabsSorted();
    if (tabs.length === 0) {
      return [];
    }

    // 2. 分批并行处理
    const results = await this.processBatchedAnalysis(extensionId, tabs);
    
    this.setCachedResult(cacheKey, results);
    return results;
  }

  /**
   * 分析活跃标签页
   */
  private async analyzeActiveTabs(extensionId: string): Promise<ContentScriptStatus[]> {
    log(`🎯 分析活跃标签页`);
    
    const tabs = await this.getActiveTabsSorted();
    const limitedTabs = tabs.slice(0, 3); // 只检查前3个最活跃的标签页
    
    return await this.processBatchedAnalysis(extensionId, limitedTabs);
  }

  /**
   * 获取所有标签页并排序
   */
  private async getAllTabsSorted(): Promise<TabAnalysisTask[]> {
    try {
      const browser = this.chromeManager.getBrowser();
      if (!browser) throw new Error('Browser not connected');

      const pages = await browser.pages();
      const tasks: TabAnalysisTask[] = [];

      for (const page of pages) {
        try {
          const url = page.url();
          const title = await page.title();
          
          // 跳过特殊页面
          if (this.shouldSkipPage(url)) continue;
          
          const tabId = await this.getTabIdFromPage(page);
          const priority = this.calculateTabPriority(url, title);
          
          tasks.push({ tabId, url, title, priority });
        } catch (error) {
          // 跳过有问题的页面
          continue;
        }
      }

      // 按优先级排序
      return tasks.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      log(`⚠️  获取标签页列表失败: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * 获取活跃标签页并排序
   */
  private async getActiveTabsSorted(): Promise<TabAnalysisTask[]> {
    const allTabs = await this.getAllTabsSorted();
    
    // 过滤活跃标签页（优先级 > 5）
    return allTabs.filter(tab => tab.priority > 5);
  }

  /**
   * 分批并行分析
   */
  private async processBatchedAnalysis(extensionId: string, tabs: TabAnalysisTask[]): Promise<ContentScriptStatus[]> {
    const results: ContentScriptStatus[] = [];
    
    log(`📦 分批处理 ${tabs.length} 个标签页，每批 ${this.MAX_CONCURRENT_TABS} 个`);
    
    for (let i = 0; i < tabs.length; i += this.MAX_CONCURRENT_TABS) {
      const batch = tabs.slice(i, i + this.MAX_CONCURRENT_TABS);
      
      log(`🔄 处理批次 ${Math.floor(i / this.MAX_CONCURRENT_TABS) + 1}: ${batch.length} 个标签页`);
      
      const batchPromises = batch.map(async (tab) => {
        try {
          const startTime = Date.now();
          const status = await Promise.race([
            this.performTabAnalysis(extensionId, tab.tabId),
            this.createTimeoutPromise(this.ANALYSIS_TIMEOUT, tab.tabId)
          ]);
          
          status.performance.responseTime = Date.now() - startTime;
          return status;
        } catch (error) {
          return this.createFailedStatus(extensionId, tab.tabId, (error as Error).message);
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<ContentScriptStatus>).value);
      
      results.push(...successfulResults);
      
      // 批次间短暂延迟
      if (i + this.MAX_CONCURRENT_TABS < tabs.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return results;
  }

  /**
   * 执行单个标签页分析
   */
  private async performTabAnalysis(extensionId: string, tabId: string): Promise<ContentScriptStatus> {
    const status: ContentScriptStatus = {
      tabId,
      extensionId,
      injected: false,
      errors: [],
      performance: { responseTime: 0 },
      conflicts: [],
      functionality: {
        domAccess: false,
        messagesPassing: false,
        storageAccess: false
      }
    };

    try {
      // 1. 快速注入检查
      status.injected = await this.quickInjectionCheck(extensionId, tabId);
      
      if (status.injected) {
        // 2. 并行功能检查
        const [domAccess, messagesPassing, storageAccess, conflicts] = await Promise.allSettled([
          this.checkDomAccess(tabId),
          this.checkMessagesPassing(extensionId, tabId), 
          this.checkStorageAccess(extensionId, tabId),
          this.detectConflicts(extensionId, tabId)
        ]);

        status.functionality.domAccess = domAccess.status === 'fulfilled' ? domAccess.value : false;
        status.functionality.messagesPassing = messagesPassing.status === 'fulfilled' ? messagesPassing.value : false;
        status.functionality.storageAccess = storageAccess.status === 'fulfilled' ? storageAccess.value : false;
        status.conflicts = conflicts.status === 'fulfilled' ? conflicts.value : [];
      }

    } catch (error) {
      status.errors.push((error as Error).message);
    }

    return status;
  }

  /**
   * 快速注入检查
   */
  private async quickInjectionCheck(extensionId: string, tabId: string): Promise<boolean> {
    try {
      const browser = this.chromeManager.getBrowser();
      if (!browser) return false;

      const page = await this.getPageByTabId(tabId);
      if (!page) return false;

      // 快速检查扩展标识
      const result = await Promise.race([
        page.evaluate(`
          (function() {
            try {
              // 检查多种扩展标识
              const indicators = [
                () => window.chrome && window.chrome.runtime && window.chrome.runtime.id === '${extensionId}',
                () => document.querySelector('[data-extension-id="${extensionId}"]'),
                () => document.querySelector('.${extensionId}-injected'),
                () => window['${extensionId}_loaded']
              ];
              
              return indicators.some(check => {
                try { return check(); } catch (e) { return false; }
              });
            } catch (e) {
              return false;
            }
          })()
        `),
        new Promise(resolve => setTimeout(() => resolve(false), this.FAST_CHECK_TIMEOUT))
      ]);

      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查DOM访问能力
   */
  private async checkDomAccess(tabId: string): Promise<boolean> {
    try {
      const page = await this.getPageByTabId(tabId);
      if (!page) return false;

      const result = await Promise.race([
        page.evaluate(`
          (function() {
            try {
              return !!(document && document.body && document.querySelector);
            } catch (e) {
              return false;
            }
          })()
        `),
        new Promise(resolve => setTimeout(() => resolve(false), this.FAST_CHECK_TIMEOUT))
      ]);

      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查消息传递能力
   */
  private async checkMessagesPassing(extensionId: string, tabId: string): Promise<boolean> {
    try {
      const page = await this.getPageByTabId(tabId);
      if (!page) return false;

      const result = await Promise.race([
        page.evaluate(`
          (function() {
            try {
              return !!(window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage);
            } catch (e) {
              return false;
            }
          })()
        `),
        new Promise(resolve => setTimeout(() => resolve(false), this.FAST_CHECK_TIMEOUT))
      ]);

      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查存储访问能力
   */
  private async checkStorageAccess(extensionId: string, tabId: string): Promise<boolean> {
    try {
      const page = await this.getPageByTabId(tabId);
      if (!page) return false;

      const result = await Promise.race([
        page.evaluate(`
          (function() {
            try {
              return !!(window.chrome && window.chrome.storage);
            } catch (e) {
              return false;
            }
          })()
        `),
        new Promise(resolve => setTimeout(() => resolve(false), this.FAST_CHECK_TIMEOUT))
      ]);

      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * 检测冲突
   */
  private async detectConflicts(extensionId: string, tabId: string): Promise<string[]> {
    try {
      const page = await this.getPageByTabId(tabId);
      if (!page) return [];

      const result = await Promise.race([
        page.evaluate(`
          (function() {
            const conflicts = [];
            try {
              // 检查常见冲突
              if (window.jQuery && window.jQuery.fn.jquery) {
                conflicts.push('jQuery version: ' + window.jQuery.fn.jquery);
              }
              if (window.React) {
                conflicts.push('React detected');
              }
              if (document.querySelectorAll('[data-extension-id]').length > 1) {
                conflicts.push('Multiple extensions detected');
              }
            } catch (e) {}
            return conflicts;
          })()
        `),
        new Promise(resolve => setTimeout(() => resolve([]), this.FAST_CHECK_TIMEOUT))
      ]);

      return Array.isArray(result) ? result : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 辅助方法
   */
  private shouldSkipPage(url: string): boolean {
    const skipPatterns = [
      'chrome://',
      'chrome-extension://',
      'devtools://',
      'about:blank',
      'data:text/html'
    ];
    
    return skipPatterns.some(pattern => url.startsWith(pattern));
  }

  private calculateTabPriority(url: string, title: string): number {
    let priority = 1;
    
    // HTTP/HTTPS 页面优先级高
    if (url.startsWith('http://') || url.startsWith('https://')) {
      priority += 5;
    }
    
    // 有标题的页面优先级高
    if (title && title.length > 0 && title !== 'about:blank') {
      priority += 3;
    }
    
    // 常见网站优先级高
    const popularSites = ['google.com', 'github.com', 'stackoverflow.com', 'localhost'];
    if (popularSites.some(site => url.includes(site))) {
      priority += 2;
    }
    
    return priority;
  }

  private async getTabIdFromPage(page: any): Promise<string> {
    try {
      const target = page.target();
      return target._targetId || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getPageByTabId(tabId: string): Promise<any> {
    try {
      const browser = this.chromeManager.getBrowser();
      if (!browser) return null;

      const pages = await browser.pages();
      for (const page of pages) {
        const pageTabId = await this.getTabIdFromPage(page);
        if (pageTabId === tabId) {
          return page;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private createTimeoutPromise(timeout: number, tabId: string): Promise<ContentScriptStatus> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Analysis timeout for tab ${tabId} after ${timeout}ms`));
      }, timeout);
    });
  }

  private createFailedStatus(extensionId: string, tabId: string, error: string): ContentScriptStatus {
    return {
      tabId,
      extensionId,
      injected: false,
      errors: [error],
      performance: { responseTime: 0 },
      conflicts: [],
      functionality: {
        domAccess: false,
        messagesPassing: false,
        storageAccess: false
      }
    };
  }

  private generateOptimizedReport(extensionId: string, results: ContentScriptStatus[]): any {
    const summary = {
      extensionId,
      totalTabs: results.length,
      injectedTabs: results.filter(r => r.injected).length,
      errors: results.filter(r => r.errors.length > 0).length,
      avgResponseTime: results.reduce((sum, r) => sum + r.performance.responseTime, 0) / results.length || 0,
      functionalityStats: {
        domAccess: results.filter(r => r.functionality.domAccess).length,
        messagesPassing: results.filter(r => r.functionality.messagesPassing).length,
        storageAccess: results.filter(r => r.functionality.storageAccess).length
      },
      conflicts: results.reduce((total, r) => total + r.conflicts.length, 0)
    };

    return {
      success: true,
      summary,
      details: results,
      optimization: {
        cacheHits: this.scanCache.size,
        parallelProcessing: true,
        timeoutProtection: true
      }
    };
  }

  // 缓存管理
  private getCachedResult(key: string): any | null {
    const item = this.scanCache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    this.scanCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.scanCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.scanCache.entries()) {
      if (now - item.timestamp >= this.CACHE_TTL) {
        this.scanCache.delete(key);
      }
    }
  }
}
