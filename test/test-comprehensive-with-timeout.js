/**
 * 带超时保护的全功能综合测试
 * 测试所有主要功能模块
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class ComprehensiveFunctionalTest {
  constructor() {
    this.server = new ChromeDebugServer();
    this.results = {
      passed: [],
      failed: [],
      skipped: []
    };
  }

  // 超时包装器
  async withTimeout(promise, timeoutMs, description) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${description} 超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ]);
  }

  async runAllTests() {
    console.log('🧪 开始全功能综合测试');
    console.log('=====================================');

    // 测试分组
    const testGroups = [
      { name: '基础连接测试', tests: this.getBasicTests() },
      { name: '扩展管理测试', tests: this.getExtensionTests() },
      { name: '交互功能测试', tests: this.getInteractionTests() },
      { name: '状态监控测试', tests: this.getMonitoringTests() }
    ];

    for (const group of testGroups) {
      console.log(`\n🎯 ${group.name}`);
      console.log('-'.repeat(40));
      
      for (const test of group.tests) {
        await this.runSingleTest(test);
      }
    }

    this.printFinalResults();
  }

  async runSingleTest(test) {
    console.log(`🔍 测试: ${test.name}`);
    
    try {
      const result = await this.withTimeout(
        test.execute(),
        test.timeout || 5000,
        test.name
      );
      
      if (result.success) {
        this.results.passed.push(test.name);
        console.log(`   ✅ 通过: ${result.message || '成功'}`);
      } else {
        this.results.failed.push({ test: test.name, reason: result.message });
        console.log(`   ❌ 失败: ${result.message}`);
      }
      
    } catch (error) {
      if (error.message.includes('超时')) {
        this.results.failed.push({ test: test.name, reason: '超时' });
        console.log(`   ⏱️ 超时: ${test.name}`);
      } else {
        this.results.failed.push({ test: test.name, reason: error.message });
        console.log(`   💥 异常: ${error.message}`);
      }
    }
  }

  getBasicTests() {
    return [
      {
        name: 'Chrome连接测试',
        timeout: 3000,
        execute: async () => {
          try {
            await this.server.handleAttachToChrome({ host: 'localhost', port: 9222 });
            return { success: true, message: 'Chrome连接成功' };
          } catch (error) {
            return { success: false, message: `连接失败: ${error.message}` };
          }
        }
      },
      {
        name: '标签页列表测试',
        timeout: 2000,
        execute: async () => {
          try {
            const tabs = await this.server.extensionHandler.listTabs();
            return { success: true, message: `发现 ${tabs.length || 0} 个标签页` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      }
    ];
  }

  getExtensionTests() {
    return [
      {
        name: '扩展列表测试',
        timeout: 3000,
        execute: async () => {
          try {
            const extensions = await this.server.extensionHandler.listExtensions({});
            return { success: true, message: `发现 ${extensions.length || 0} 个扩展` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: '扩展日志测试',
        timeout: 2000,
        execute: async () => {
          try {
            const logs = await this.server.extensionHandler.getExtensionLogs({});
            return { success: true, message: `收集到 ${logs.length || 0} 条日志` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: '扩展上下文测试',
        timeout: 2000,
        execute: async () => {
          try {
            const contexts = await this.server.extensionHandler.listExtensionContexts({});
            return { success: true, message: `发现 ${contexts.length || 0} 个上下文` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      }
    ];
  }

  getInteractionTests() {
    return [
      {
        name: '弹窗检测测试',
        timeout: 3000,
        execute: async () => {
          try {
            const dialogs = await this.server.extensionHandler.detectDialogs();
            return { success: true, message: `检测到 ${dialogs.total || 0} 个弹窗` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: '表单分析测试',
        timeout: 3000,
        execute: async () => {
          try {
            const forms = await this.server.extensionHandler.analyzeForms();
            return { success: true, message: `分析了 ${forms.forms?.length || 0} 个表单` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: '元素定位测试',
        timeout: 3000,
        execute: async () => {
          try {
            const elements = await this.server.extensionHandler.findElementByContent({
              textContent: 'test',
              maxResults: 1
            });
            return { success: true, message: `找到 ${elements.length || 0} 个元素` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      }
    ];
  }

  getMonitoringTests() {
    return [
      {
        name: '页面状态检测测试',
        timeout: 5000,
        execute: async () => {
          try {
            const state = await this.server.extensionHandler.detectPageState();
            return { 
              success: true, 
              message: `页面状态: ${state.state}, 阻塞: ${state.isBlocked}` 
            };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: '日志搜索测试',
        timeout: 2000,
        execute: async () => {
          try {
            const results = await this.server.extensionHandler.searchExtensionLogs({
              query: 'test',
              limit: 5
            });
            return { success: true, message: `搜索到 ${results.matches?.length || 0} 条结果` };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      },
      {
        name: 'DOM稳定性分析测试',
        timeout: 3000,
        execute: async () => {
          try {
            const stability = await this.server.extensionHandler.analyzeDOMStability({
              monitorDuration: 1000
            });
            return { 
              success: true, 
              message: `稳定性: ${stability.overallStability || 0}%` 
            };
          } catch (error) {
            return { success: false, message: error.message };
          }
        }
      }
    ];
  }

  printFinalResults() {
    console.log('\n📊 综合测试结果');
    console.log('=====================================');
    console.log(`✅ 通过测试: ${this.results.passed.length}`);
    console.log(`❌ 失败测试: ${this.results.failed.length}`);
    console.log(`⏭️ 跳过测试: ${this.results.skipped.length}`);

    if (this.results.failed.length > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.failed.forEach(item => {
        console.log(`   - ${item.test}: ${item.reason}`);
      });
    }

    const total = this.results.passed.length + this.results.failed.length;
    const successRate = total > 0 ? Math.round(this.results.passed.length / total * 100) : 0;
    console.log(`\n📈 测试成功率: ${successRate}%`);

    if (successRate >= 80) {
      console.log('🎉 测试结果良好！');
    } else if (successRate >= 60) {
      console.log('⚠️ 测试结果一般，需要关注失败项');
    } else {
      console.log('🚨 测试结果较差，需要重点修复');
    }
  }
}

// 执行测试，带全局超时保护
const tester = new ComprehensiveFunctionalTest();

// 全局超时保护 - 60秒后强制退出
setTimeout(() => {
  console.log('🚨 测试全局超时，强制退出');
  process.exit(1);
}, 60000);

tester.runAllTests().catch(error => {
  console.log('💥 测试执行失败:', error.message);
}).finally(() => {
  console.log('🔚 综合功能测试完成');
  process.exit(0);
});
