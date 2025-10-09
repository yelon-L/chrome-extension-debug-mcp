/**
 * 扩展存储访问优化器
 * 解决权限和上下文问题，提升存储访问成功率
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const log = (...args: any[]) => console.error('[StorageAccessOptimizer]', ...args);

export class StorageAccessOptimizer {
  private contextCache: Map<string, any> = new Map();
  private permissionCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 30000; // 30秒缓存

  constructor(
    private chromeManager: any,
    private contextManager: any
  ) {}

  /**
   * 优化的扩展存储访问策略
   */
  async optimizedStorageAccess(extensionId: string, storageTypes: string[], keys?: string[]): Promise<any> {
    log(`🎯 优化存储访问: ${extensionId}, 类型: ${storageTypes.join(',')}`);
    
    try {
      // 1. 智能上下文选择和权限检查
      const accessContext = await this.findBestStorageContext(extensionId);
      
      // 2. 并行权限检查
      const permissions = await this.checkStoragePermissionsParallel(extensionId, storageTypes);
      
      // 3. 分批读取，避免超时
      const storageData = await this.batchReadStorage(accessContext, storageTypes, keys, permissions);
      
      return {
        success: true,
        extensionId,
        storageData,
        accessContext: accessContext.contextType,
        permissions
      };
      
    } catch (error) {
      log(`❌ 存储访问失败: ${(error as Error).message}`);
      
      // 4. 失败时的降级策略
      return await this.fallbackStorageAccess(extensionId, storageTypes, keys);
    }
  }

  /**
   * 智能选择最佳存储访问上下文
   */
  private async findBestStorageContext(extensionId: string): Promise<any> {
    const cacheKey = `context-${extensionId}`;
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      log(`✅ 使用缓存上下文: ${cached.contextType}`);
      return cached;
    }

    // 按优先级尝试不同上下文
    const contextPriority = [
      'service_worker',  // Manifest V3 background
      'background',      // Manifest V2 background 
      'popup',          // 扩展弹窗
      'options',        // 选项页面
      'content_script'  // 内容脚本 (权限有限)
    ];

    for (const contextType of contextPriority) {
      try {
        const context = await this.contextManager.findTargetContext(extensionId, contextType);
        if (context) {
          // 测试上下文是否可访问storage
          const hasStorageAccess = await this.testStorageAccess(context);
          if (hasStorageAccess) {
            log(`✅ 找到最佳上下文: ${contextType}`);
            this.setCachedItem(cacheKey, context);
            return context;
          }
        }
      } catch (error) {
        log(`⚠️  上下文 ${contextType} 不可用: ${(error as Error).message}`);
        continue;
      }
    }

    throw new Error(`No accessible storage context found for extension ${extensionId}`);
  }

  /**
   * 并行检查存储权限
   */
  private async checkStoragePermissionsParallel(extensionId: string, storageTypes: string[]): Promise<any> {
    const cacheKey = `permissions-${extensionId}`;
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      return cached;
    }

    log(`🔍 并行检查存储权限: ${storageTypes.join(',')}`);
    
    const permissionChecks = storageTypes.map(async (storageType) => {
      try {
        const hasPermission = await this.checkSpecificStoragePermission(extensionId, storageType);
        return { storageType, hasPermission, error: null };
      } catch (error) {
        return { storageType, hasPermission: false, error: (error as Error).message };
      }
    });

    const results = await Promise.allSettled(permissionChecks);
    const permissions = results.map(result => 
      result.status === 'fulfilled' ? result.value : { storageType: 'unknown', hasPermission: false, error: 'Check failed' }
    );

    this.setCachedItem(cacheKey, permissions);
    return permissions;
  }

  /**
   * 测试上下文是否有存储访问权限
   */
  private async testStorageAccess(context: any): Promise<boolean> {
    try {
      const cdpClient = this.chromeManager.getCdpClient();
      if (!cdpClient) return false;

      // 切换到目标上下文
      const switchResult = await this.contextManager.performContextSwitch(context);
      if (!switchResult.success) return false;

      // 快速测试chrome.storage是否可用
      const testResult = await cdpClient.Runtime.evaluate({
        expression: `
          (function() {
            try {
              return !!(typeof chrome !== 'undefined' && chrome.storage);
            } catch (e) {
              return false;
            }
          })()
        `,
        contextId: switchResult.sessionId,
        timeout: 2000
      });

      return testResult.result?.value === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查特定存储类型权限
   */
  private async checkSpecificStoragePermission(extensionId: string, storageType: string): Promise<boolean> {
    try {
      const cdpClient = this.chromeManager.getCdpClient();
      if (!cdpClient) return false;

      const testResult = await cdpClient.Runtime.evaluate({
        expression: `
          (function() {
            try {
              return !!(typeof chrome !== 'undefined' && 
                       chrome.storage && 
                       chrome.storage.${storageType});
            } catch (e) {
              return false;
            }
          })()
        `,
        timeout: 1500
      });

      return testResult.result?.value === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 分批读取存储数据，避免超时
   */
  private async batchReadStorage(context: any, storageTypes: string[], keys?: string[], permissions?: any[]): Promise<any[]> {
    log(`📚 分批读取存储: ${storageTypes.length} 种类型`);
    
    const batchSize = 2; // 每批处理2种存储类型
    const results: any[] = [];
    
    for (let i = 0; i < storageTypes.length; i += batchSize) {
      const batch = storageTypes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (storageType) => {
        try {
          // 检查权限
          const permission = permissions?.find(p => p.storageType === storageType);
          if (permission && !permission.hasPermission) {
            return {
              storageType,
              data: null,
              error: 'No permission',
              quota: null
            };
          }

          return await this.readSingleStorageType(context, storageType, keys);
        } catch (error) {
          return {
            storageType,
            data: null,
            error: (error as Error).message,
            quota: null
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      const processedResults = batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : { storageType: 'unknown', data: null, error: 'Batch failed' }
      );
      
      results.push(...processedResults);
      
      // 批次间短暂延迟，避免过载
      if (i + batchSize < storageTypes.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * 读取单一存储类型
   */
  private async readSingleStorageType(context: any, storageType: string, keys?: string[]): Promise<any> {
    const cdpClient = this.chromeManager.getCdpClient();
    if (!cdpClient) throw new Error('CDP client not available');

    const switchResult = await this.contextManager.performContextSwitch(context);
    if (!switchResult.success) throw new Error('Context switch failed');

    const keysExpression = keys ? `[${keys.map(k => `"${k}"`).join(',')}]` : 'null';
    
    const storageExpression = `
      new Promise((resolve) => {
        try {
          if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.${storageType}) {
            resolve({ data: null, error: 'Storage type not available' });
            return;
          }
          
          const keys = ${keysExpression};
          chrome.storage.${storageType}.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              resolve({ data: null, error: chrome.runtime.lastError.message });
            } else {
              // 获取配额信息
              chrome.storage.${storageType}.getBytesInUse(keys, (bytesInUse) => {
                resolve({ 
                  data: result, 
                  error: null,
                  quota: { bytesInUse: bytesInUse || 0 }
                });
              });
            }
          });
        } catch (e) {
          resolve({ data: null, error: e.message });
        }
      })
    `;

    const result = await cdpClient.Runtime.evaluate({
      expression: storageExpression,
      awaitPromise: true,
      contextId: switchResult.sessionId,
      timeout: 5000
    });

    if (result.result?.value) {
      return {
        storageType,
        data: result.result.value.data,
        error: result.result.value.error,
        quota: result.result.value.quota
      };
    }

    throw new Error('Failed to read storage data');
  }

  /**
   * 降级存储访问策略
   */
  private async fallbackStorageAccess(extensionId: string, storageTypes: string[], keys?: string[]): Promise<any> {
    log(`🔄 启用降级存储访问策略`);
    
    try {
      // 方法1: 尝试通过manifest获取扩展信息
      const manifestInfo = await this.getStorageInfoFromManifest(extensionId);
      
      // 方法2: 使用简化的存储检查
      const basicStorageCheck = await this.basicStorageCheck(extensionId, storageTypes);
      
      return {
        success: false,
        extensionId,
        storageData: [],
        fallbackInfo: {
          manifestInfo,
          basicCheck: basicStorageCheck
        },
        error: 'Primary access failed, using fallback strategy'
      };
    } catch (error) {
      throw new Error(`All storage access strategies failed: ${(error as Error).message}`);
    }
  }

  private async getStorageInfoFromManifest(extensionId: string): Promise<any> {
    try {
      const cdpClient = this.chromeManager.getCdpClient();
      if (!cdpClient) return null;

      const manifestResult = await cdpClient.Runtime.evaluate({
        expression: `
          (async () => {
            try {
              const response = await fetch('chrome-extension://${extensionId}/manifest.json');
              const manifest = await response.json();
              return {
                permissions: manifest.permissions || [],
                hasStoragePermission: (manifest.permissions || []).includes('storage')
              };
            } catch (e) {
              return null;
            }
          })()
        `,
        awaitPromise: true,
        timeout: 3000
      });

      return manifestResult.result?.value;
    } catch (error) {
      return null;
    }
  }

  private async basicStorageCheck(extensionId: string, storageTypes: string[]): Promise<any> {
    const results = storageTypes.map(type => ({
      storageType: type,
      accessible: false,
      reason: 'Permission or context issue'
    }));

    return { extensionId, storageTypes: results };
  }

  // 缓存管理
  private getCachedItem(key: string): any | null {
    const item = this.contextCache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    this.contextCache.delete(key);
    return null;
  }

  private setCachedItem(key: string, data: any): void {
    this.contextCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // 清理过期缓存
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.contextCache.entries()) {
      if (now - item.timestamp >= this.CACHE_TTL) {
        this.contextCache.delete(key);
      }
    }
  }
}
