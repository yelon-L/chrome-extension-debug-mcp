/**
 * 增强的超时保护机制
 * 解决测试脚本卡住问题的完整方案
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class EnhancedTimeoutManager {
  constructor(options = {}) {
    this.server = new ChromeDebugServer();
    
    // 超时配置
    this.timeouts = {
      // 单个任务超时（秒）
      connection: options.connectionTimeout || 10,     // 连接类操作
      detection: options.detectionTimeout || 15,      // 检测类操作  
      analysis: options.analysisTimeout || 20,        // 分析类操作
      monitoring: options.monitoringTimeout || 10,    // 监控类操作
      
      // 全局流程超时（分钟）
      totalFlow: options.totalFlowTimeout || 5 * 60,  // 5分钟总流程
      
      // 任务间等待时间（秒）
      taskInterval: options.taskInterval || 1         // 任务间隔
    };
    
    this.results = {
      completed: [],
      failed: [],
      skipped: [],
      timeouts: []
    };
    
    this.startTime = Date.now();
  }

  /**
   * 智能超时包装器 - 根据任务类型自动选择超时时间
   */
  async withSmartTimeout(promise, taskType, taskName) {
    const timeoutMs = (this.timeouts[taskType] || 10) * 1000;
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`TIMEOUT_${taskType.toUpperCase()}`)), timeoutMs)
        )
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ ${taskName} (${duration}ms)`);
      this.results.completed.push({ task: taskName, duration, type: taskType });
      return { success: true, data: result, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error.message.startsWith('TIMEOUT_')) {
        console.log(`   ⏱️ ${taskName} 超时 (${duration}ms)`);
        this.results.timeouts.push({ task: taskName, duration, type: taskType });
        return { success: false, error: 'timeout', duration };
      } else {
        console.log(`   ❌ ${taskName} 失败: ${error.message} (${duration}ms)`);
        this.results.failed.push({ task: taskName, error: error.message, duration, type: taskType });
        return { success: false, error: error.message, duration };
      }
    }
  }

  /**
   * 可恢复的任务执行 - 单个任务失败不影响后续任务
   */
  async executeTaskWithRecovery(taskName, taskType, taskFn, options = {}) {
    const { critical = false, retries = 0 } = options;
    
    console.log(`🔍 执行任务: ${taskName}`);
    
    let attempt = 0;
    let lastResult = null;
    
    while (attempt <= retries) {
      if (attempt > 0) {
        console.log(`   🔄 重试 ${attempt}/${retries}`);
        await this.sleep(1000); // 重试前等待1秒
      }
      
      lastResult = await this.withSmartTimeout(taskFn(), taskType, taskName);
      
      if (lastResult.success) {
        return lastResult;
      }
      
      attempt++;
    }
    
    // 所有重试都失败了
    if (critical) {
      throw new Error(`关键任务 ${taskName} 失败: ${lastResult.error}`);
    }
    
    console.log(`   ⚠️ 非关键任务 ${taskName} 失败，继续执行后续任务`);
    return lastResult;
  }

  /**
   * 带流程监控的批量任务执行
   */
  async executeBatchTasks(taskGroups) {
    console.log('🚀 开始执行批量任务');
    console.log('=====================================');
    
    // 启动全局超时监控
    const globalTimeout = setTimeout(() => {
      console.log('🚨 全局流程超时，但任务将优雅结束');
      this.forceCompleteCurrentTasks();
    }, this.timeouts.totalFlow * 1000);
    
    try {
      for (const group of taskGroups) {
        console.log(`\n🎯 ${group.name}`);
        console.log('-'.repeat(40));
        
        const groupStartTime = Date.now();
        
        for (const task of group.tasks) {
          // 检查是否应该跳过任务
          if (this.shouldSkipTask(task)) {
            console.log(`⏭️ 跳过任务: ${task.name} (条件不满足)`);
            this.results.skipped.push({ task: task.name, reason: 'condition_not_met' });
            continue;
          }
          
          await this.executeTaskWithRecovery(
            task.name,
            task.type || 'detection',
            task.execute,
            {
              critical: task.critical || false,
              retries: task.retries || 0
            }
          );
          
          // 任务间间隔
          if (this.timeouts.taskInterval > 0) {
            await this.sleep(this.timeouts.taskInterval * 1000);
          }
        }
        
        const groupDuration = Date.now() - groupStartTime;
        console.log(`📊 ${group.name} 完成，用时: ${groupDuration}ms`);
      }
      
    } catch (error) {
      console.log(`💥 批量任务执行异常: ${error.message}`);
    } finally {
      clearTimeout(globalTimeout);
      this.printFinalReport();
    }
  }

  /**
   * 检查是否应该跳过任务
   */
  shouldSkipTask(task) {
    // 基于前置条件或依赖检查
    if (task.condition && !task.condition()) {
      return true;
    }
    
    // 基于时间预算检查
    const elapsedTime = Date.now() - this.startTime;
    const remainingTime = (this.timeouts.totalFlow * 1000) - elapsedTime;
    const estimatedTaskTime = (this.timeouts[task.type || 'detection'] || 10) * 1000;
    
    if (remainingTime < estimatedTaskTime && !task.critical) {
      return true;
    }
    
    return false;
  }

  /**
   * 优雅地完成当前任务
   */
  forceCompleteCurrentTasks() {
    console.log('⏰ 开始优雅退出流程...');
    // 这里可以添加清理逻辑
    setTimeout(() => {
      console.log('🔚 强制退出');
      process.exit(0);
    }, 5000); // 给5秒时间完成清理
  }

  /**
   * 睡眠函数
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成最终报告
   */
  printFinalReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📊 执行报告');
    console.log('=====================================');
    console.log(`⏱️ 总执行时间: ${Math.round(totalTime/1000)}秒`);
    console.log(`✅ 成功任务: ${this.results.completed.length}`);
    console.log(`❌ 失败任务: ${this.results.failed.length}`);
    console.log(`⏱️ 超时任务: ${this.results.timeouts.length}`);
    console.log(`⏭️ 跳过任务: ${this.results.skipped.length}`);
    
    // 详细统计
    if (this.results.timeouts.length > 0) {
      console.log('\n⏱️ 超时任务详情:');
      this.results.timeouts.forEach(item => {
        console.log(`   - ${item.task} (${item.type}, ${item.duration}ms)`);
      });
    }
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ 失败任务详情:');
      this.results.failed.forEach(item => {
        console.log(`   - ${item.task}: ${item.error} (${item.duration}ms)`);
      });
    }
    
    // 性能统计
    const avgCompletedTime = this.results.completed.length > 0 
      ? Math.round(this.results.completed.reduce((sum, item) => sum + item.duration, 0) / this.results.completed.length)
      : 0;
    
    console.log(`\n📈 平均任务完成时间: ${avgCompletedTime}ms`);
    
    const totalTasks = this.results.completed.length + this.results.failed.length + 
                      this.results.timeouts.length + this.results.skipped.length;
    const successRate = totalTasks > 0 ? Math.round(this.results.completed.length / totalTasks * 100) : 0;
    
    console.log(`📊 任务成功率: ${successRate}%`);
    
    if (successRate >= 80) {
      console.log('🎉 整体执行状况良好！');
    } else if (successRate >= 50) {
      console.log('⚠️ 执行状况一般，建议检查失败和超时任务');
    } else {
      console.log('🚨 执行状况较差，需要重点排查问题');
    }
  }
}

// 示例：远程扩展调试任务配置
async function demoEnhancedExtensionDebug() {
  const manager = new EnhancedTimeoutManager({
    connectionTimeout: 8,      // 连接操作8秒超时
    detectionTimeout: 12,      // 检测操作12秒超时
    analysisTimeout: 15,       // 分析操作15秒超时
    monitoringTimeout: 8,      // 监控操作8秒超时
    totalFlowTimeout: 3 * 60,  // 总流程3分钟超时
    taskInterval: 0.5          // 任务间隔0.5秒
  });

  const taskGroups = [
    {
      name: '基础连接验证',
      tasks: [
        {
          name: 'Chrome远程连接',
          type: 'connection',
          critical: true,  // 关键任务，失败则停止
          retries: 2,      // 允许2次重试
          execute: async () => {
            return await manager.server.handleAttachToChrome({ 
              host: 'localhost', 
              port: 9222 
            });
          }
        },
        {
          name: '页面状态检测',
          type: 'detection',
          critical: true,
          execute: async () => {
            return await manager.server.extensionHandler.detectPageState();
          }
        }
      ]
    },
    {
      name: '扩展发现和分析',
      tasks: [
        {
          name: '扫描扩展列表',
          type: 'detection',
          critical: false,
          retries: 1,
          execute: async () => {
            return await manager.server.extensionHandler.listExtensions({});
          }
        },
        {
          name: '扩展上下文分析',
          type: 'analysis',
          critical: false,
          execute: async () => {
            return await manager.server.extensionHandler.listExtensionContexts({});
          }
        },
        {
          name: '扩展日志收集',
          type: 'monitoring',
          critical: false,
          condition: () => true, // 可以根据前面结果设置条件
          execute: async () => {
            return await manager.server.extensionHandler.getExtensionLogs({
              sourceTypes: ['extension', 'service_worker', 'content_script']
            });
          }
        }
      ]
    }
  ];

  await manager.executeBatchTasks(taskGroups);
}

// 执行演示
console.log('🔬 演示增强超时保护机制');
demoEnhancedExtensionDebug().catch(console.error);
