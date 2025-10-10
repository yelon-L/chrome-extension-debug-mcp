/**
 * Quick Debug Handler - 快捷调试处理器
 * 
 * 功能：
 * - 提供一键式扩展调试
 * - 组合多个工具调用
 * - 生成综合诊断报告
 * - 快速性能检测
 */

import type { ExtensionHandler } from './ExtensionHandler.js';

export interface QuickExtensionDebugArgs {
  extensionId: string;
  includeStorage?: boolean;
  includeLogs?: boolean;
  includeContentScript?: boolean;
}

export interface QuickPerformanceCheckArgs {
  extensionId: string;
  testUrl?: string;
}

export interface QuickDebugResult {
  extensionId: string;
  timestamp: number;
  extension?: any;
  logs?: any;
  contentScript?: any;
  storage?: any;
  summary: string;
}

export interface QuickPerformanceResult {
  extensionId: string;
  timestamp: number;
  performance: any;
  network: any;
  summary: string;
}

/**
 * 快捷调试处理器
 */
export class QuickDebugHandler {
  constructor(private extensionHandler: ExtensionHandler) {}

  /**
   * 一键扩展快速调试
   * 自动执行多个诊断工具并生成综合报告
   */
  async quickExtensionDebug(args: QuickExtensionDebugArgs): Promise<QuickDebugResult> {
    console.log('[QuickDebug] 开始快速诊断扩展:', args.extensionId);
    
    const results: any = {
      extensionId: args.extensionId,
      timestamp: Date.now()
    };

    try {
      // 1. 获取扩展基本信息
      console.log('[QuickDebug] 步骤1/4: 获取扩展信息...');
      try {
        const extensions = await this.extensionHandler.listExtensions({ id: args.extensionId });
        results.extension = extensions.find((e: any) => e.id === args.extensionId);
        
        if (!results.extension) {
          results.extension = { 
            error: '未找到扩展',
            suggestion: '使用list_extensions查看所有已加载扩展'
          };
        }
      } catch (error) {
        results.extension = { 
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // 2. 获取日志
      if (args.includeLogs !== false) {
        console.log('[QuickDebug] 步骤2/4: 获取扩展日志...');
        try {
          const logs = await this.extensionHandler.getExtensionLogs({
            extensionId: args.extensionId
          });
          // 限制返回最新50条
          const recent = logs.logs.slice(-50);
          results.logs = {
            total: logs.logs.length,
            recent: recent.slice(0, 10),
            errorCount: logs.logs.filter((l: any) => l.level === 'error').length,
            warnCount: logs.logs.filter((l: any) => l.level === 'warn').length
          };
        } catch (error) {
          results.logs = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // 3. 检查内容脚本
      if (args.includeContentScript !== false) {
        console.log('[QuickDebug] 步骤3/4: 检查内容脚本...');
        try {
          const status = await this.extensionHandler.contentScriptStatus({
            extensionId: args.extensionId
          });
          results.contentScript = status;
        } catch (error) {
          results.contentScript = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // 4. 检查存储
      if (args.includeStorage !== false) {
        console.log('[QuickDebug] 步骤4/4: 检查扩展存储...');
        try {
          const storage = await this.extensionHandler.inspectExtensionStorage({
            extensionId: args.extensionId
          });
          // 从storageData数组中统计各类型存储的项数
          const localData = storage.storageData.find(s => s.type === 'local');
          const syncData = storage.storageData.find(s => s.type === 'sync');
          const sessionData = storage.storageData.find(s => s.type === 'session');
          
          results.storage = {
            local: localData ? Object.keys(localData.data).length : 0,
            sync: syncData ? Object.keys(syncData.data).length : 0,
            session: sessionData ? Object.keys(sessionData.data).length : 0,
            quota: localData?.quota || syncData?.quota
          };
        } catch (error) {
          results.storage = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // 生成摘要
      results.summary = this.generateQuickDebugSummary(results);

      console.log('[QuickDebug] 快速诊断完成');
      return results;
      
    } catch (error) {
      console.error('[QuickDebug] 快速诊断失败:', error);
      results.summary = `快速诊断失败: ${error instanceof Error ? error.message : String(error)}`;
      return results;
    }
  }

  /**
   * 一键性能快速检测
   * 快速评估扩展性能表现
   */
  async quickPerformanceCheck(args: QuickPerformanceCheckArgs): Promise<QuickPerformanceResult> {
    console.log('[QuickPerformance] 开始快速性能检测:', args.extensionId);

    const results: any = {
      extensionId: args.extensionId,
      timestamp: Date.now()
    };

    try {
      // 1. 性能分析（简化版）
      console.log('[QuickPerformance] 步骤1/2: 分析性能影响...');
      try {
        const performance = await this.extensionHandler.analyzeExtensionPerformance({
          extensionId: args.extensionId,
          testUrl: args.testUrl || 'https://example.com',
          duration: 2000  // 快速检测使用较短时间
        });
        // 计算简单的影响评分（基于CPU和内存）
        const impactScore = Math.max(0, 100 - (
          performance.metrics.delta.cpuUsage * 2 + 
          performance.metrics.delta.memoryUsage / 10
        ));
        
        results.performance = {
          cpuUsage: performance.metrics.delta.cpuUsage,
          memoryUsage: performance.metrics.delta.memoryUsage,
          executionTime: performance.metrics.delta.executionTime,
          impactScore: Math.round(impactScore),
          cwv: performance.cwv?.withExtension || null,
          recommendations: performance.recommendations?.slice(0, 3) || []
        };
      } catch (error) {
        results.performance = { 
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // 2. 网络监控（10秒）
      console.log('[QuickPerformance] 步骤2/2: 监控网络活动...');
      try {
        const network = await this.extensionHandler.trackExtensionNetwork({
          extensionId: args.extensionId,
          duration: 10000,
          includeRequests: false
        });
        results.network = {
          totalRequests: network.totalRequests,
          totalDataTransferred: network.totalDataTransferred,
          averageRequestTime: network.averageRequestTime,
          requestsByType: network.requestsByType
        };
      } catch (error) {
        results.network = { 
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // 生成摘要
      results.summary = this.generatePerformanceSummary(results);

      console.log('[QuickPerformance] 快速性能检测完成');
      return results;
      
    } catch (error) {
      console.error('[QuickPerformance] 快速性能检测失败:', error);
      results.summary = `快速性能检测失败: ${error instanceof Error ? error.message : String(error)}`;
      return results;
    }
  }

  /**
   * 生成快速调试摘要
   */
  private generateQuickDebugSummary(results: any): string {
    let summary = '='.repeat(50) + '\n';
    summary += '扩展快速诊断报告\n';
    summary += '='.repeat(50) + '\n\n';

    // 扩展信息
    if (results.extension) {
      if (results.extension.error) {
        summary += `❌ 扩展信息: ${results.extension.error}\n`;
      } else {
        summary += `📦 扩展名称: ${results.extension.name || '未知'}\n`;
        summary += `🆔 扩展ID: ${results.extensionId}\n`;
        summary += `📊 状态: ${results.extension.enabled ? '✓ 已启用' : '✗ 已禁用'}\n`;
        summary += `🔖 版本: ${results.extension.version || '未知'}\n`;
      }
    }
    summary += '\n';

    // 日志信息
    if (results.logs) {
      if (results.logs.error) {
        summary += `❌ 日志检查: ${results.logs.error}\n`;
      } else {
        summary += `📝 日志统计:\n`;
        summary += `   - 总计: ${results.logs.total}条\n`;
        summary += `   - 错误: ${results.logs.errorCount}个\n`;
        summary += `   - 警告: ${results.logs.warnCount}个\n`;
        
        if (results.logs.errorCount > 0) {
          summary += `   ⚠️  发现错误，建议查看详细日志\n`;
        }
      }
    }
    summary += '\n';

    // 内容脚本状态
    if (results.contentScript) {
      if (results.contentScript.error) {
        summary += `❌ 内容脚本检查: ${results.contentScript.error}\n`;
      } else {
        const injected = results.contentScript.injected !== false;
        summary += `🔌 内容脚本: ${injected ? '✓ 已注入' : '✗ 未注入'}\n`;
        if (injected && results.contentScript.scriptCount) {
          summary += `   - 脚本数量: ${results.contentScript.scriptCount}\n`;
        }
      }
    }
    summary += '\n';

    // 存储信息
    if (results.storage) {
      if (results.storage.error) {
        summary += `❌ 存储检查: ${results.storage.error}\n`;
      } else {
        summary += `💾 存储统计:\n`;
        summary += `   - Local: ${results.storage.local}项\n`;
        summary += `   - Sync: ${results.storage.sync}项\n`;
        if (results.storage.session !== undefined) {
          summary += `   - Session: ${results.storage.session}项\n`;
        }
        if (results.storage.usage) {
          summary += `   - 使用量: ${(results.storage.usage.usedBytes / 1024).toFixed(1)}KB\n`;
        }
      }
    }
    summary += '\n';

    // 总体建议
    summary += '💡 建议:\n';
    if (results.logs && results.logs.errorCount > 0) {
      summary += '   - 使用get_extension_logs查看详细错误信息\n';
    }
    if (results.contentScript && !results.contentScript.injected) {
      summary += '   - 使用inject_content_script手动注入内容脚本\n';
    }
    if (results.extension && !results.extension.enabled) {
      summary += '   - 在chrome://extensions中启用扩展\n';
    }

    summary += '\n' + '='.repeat(50);
    return summary;
  }

  /**
   * 生成性能检测摘要
   */
  private generatePerformanceSummary(results: any): string {
    let summary = '='.repeat(50) + '\n';
    summary += '扩展性能快速检测报告\n';
    summary += '='.repeat(50) + '\n\n';

    // 性能影响
    if (results.performance) {
      if (results.performance.error) {
        summary += `❌ 性能分析: ${results.performance.error}\n`;
      } else {
        summary += `⚡ 性能影响:\n`;
        summary += `   - CPU使用: ${results.performance.cpuUsage.toFixed(1)}%\n`;
        summary += `   - 内存占用: ${(results.performance.memoryUsage).toFixed(1)}MB\n`;
        summary += `   - 执行时间: ${results.performance.executionTime.toFixed(0)}ms\n`;
        summary += `   - 影响评分: ${results.performance.impactScore}/100\n`;
        
        // Core Web Vitals
        if (results.performance.cwv) {
          summary += `\n📊 Core Web Vitals:\n`;
          summary += `   - LCP: ${results.performance.cwv.lcp.toFixed(0)}ms`;
          if (results.performance.cwv.rating?.lcp) {
            summary += ` (${results.performance.cwv.rating.lcp})`;
          }
          summary += `\n`;
          summary += `   - FID: ${results.performance.cwv.fid.toFixed(0)}ms`;
          if (results.performance.cwv.rating?.fid) {
            summary += ` (${results.performance.cwv.rating.fid})`;
          }
          summary += `\n`;
          summary += `   - CLS: ${results.performance.cwv.cls.toFixed(3)}`;
          if (results.performance.cwv.rating?.cls) {
            summary += ` (${results.performance.cwv.rating.cls})`;
          }
          summary += `\n`;
        }
        
        // 关键建议
        if (results.performance.recommendations && results.performance.recommendations.length > 0) {
          summary += `\n⚠️  关键建议:\n`;
          results.performance.recommendations.forEach((rec: string, idx: number) => {
            summary += `   ${idx + 1}. ${rec}\n`;
          });
        }
      }
    }
    summary += '\n';

    // 网络活动
    if (results.network) {
      if (results.network.error) {
        summary += `❌ 网络监控: ${results.network.error}\n`;
      } else {
        summary += `🌐 网络活动:\n`;
        summary += `   - 请求数量: ${results.network.totalRequests}个\n`;
        summary += `   - 数据传输: ${(results.network.totalDataTransferred / 1024).toFixed(1)}KB\n`;
        summary += `   - 平均耗时: ${results.network.averageRequestTime.toFixed(0)}ms\n`;
        
        if (results.network.requestsByType) {
          summary += `\n📋 请求类型分布:\n`;
          Object.entries(results.network.requestsByType).forEach(([type, count]) => {
            summary += `   - ${type}: ${count}个\n`;
          });
        }
      }
    }
    summary += '\n';

    // 综合评价
    summary += '📈 综合评价:\n';
    if (results.performance && !results.performance.error) {
      const score = results.performance.impactScore;
      if (score >= 80) {
        summary += '   ✅ 扩展性能优秀，对页面影响较小\n';
      } else if (score >= 60) {
        summary += '   ⚠️  扩展有一定性能影响，建议优化\n';
      } else {
        summary += '   ❌ 扩展性能影响较大，需要优化\n';
      }
    }

    summary += '\n' + '='.repeat(50);
    return summary;
  }
}

