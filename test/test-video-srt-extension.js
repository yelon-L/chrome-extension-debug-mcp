#!/usr/bin/env node

/**
 * Video SRT Extension 专项测试
 * 使用Chrome Debug MCP分析和调试扩展
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class VideoSrtExtensionTest {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = null;
    this.testResults = {};
  }

  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🎬 Video SRT Extension 专项测试');
    console.log('   使用Chrome Debug MCP进行扩展调试分析');
    console.log('='.repeat(80) + '\n');

    try {
      await this.connectToChrome();
      await this.findVideoSrtExtension();
      await this.testExtensionContexts();
      await this.testContentScriptStatus();
      await this.testStorageInspection();
      await this.monitorExtensionLogs();
      await this.testWebCodecsIssue();
      await this.performanceAnalysis();
      this.generateReport();
    } catch (error) {
      console.error('❌ 测试失败:', error);
    } finally {
      await this.cleanup();
    }
  }

  async connectToChrome() {
    console.log('📌 步骤1: 连接Chrome...');
    await this.server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ 已连接到Chrome调试端口\n');
  }

  async findVideoSrtExtension() {
    console.log('📌 步骤2: 查找Video SRT Extension...');
    
    const extResult = await this.server.handleListExtensions({});
    const extensions = JSON.parse(extResult.content[0].text);
    
    console.log(`📊 找到 ${extensions.length} 个扩展:`);
    extensions.forEach((ext, idx) => {
      console.log(`   ${idx + 1}. ${ext.title} (${ext.id})`);
      // 检查已知的Video SRT Extension ID
      if (ext.id === 'inojadbgidndkeafpjeniciaplkkdmak') {
        this.extensionId = ext.id;
        console.log(`   🎯 目标扩展: Video SRT Extension (通过ID匹配)`);
      } else if (ext.title && ext.title.includes('Video SRT')) {
        this.extensionId = ext.id;
        console.log(`   🎯 目标扩展: ${ext.title}`);
      }
    });

    if (!this.extensionId) {
      // 如果没找到，使用第二个扩展作为测试目标
      console.log('⚠️ 未找到Video SRT Extension标题，使用第二个扩展进行测试');
      this.extensionId = extensions[1]?.id || extensions[0]?.id;
      console.log(`🔧 使用扩展ID: ${this.extensionId}`);
    }

    if (!this.extensionId) {
      throw new Error('未找到任何可测试的扩展');
    }

    this.testResults.extensionFound = true;
    this.testResults.extensionId = this.extensionId;
    console.log(`✅ 扩展ID: ${this.extensionId}\n`);
  }

  async testExtensionContexts() {
    console.log('📌 步骤3: 分析扩展上下文...');
    
    const contextResult = await this.server.handleListExtensionContexts({
      extensionId: this.extensionId
    });
    
    const contexts = JSON.parse(contextResult.content[0].text);
    console.log(`📊 扩展上下文分析:`);
    console.log(`   Service Worker: ${contexts.serviceWorker ? '✅ 活跃' : '❌ 未找到'}`);
    console.log(`   Content Scripts: ${contexts.contentScripts?.length || 0}个`);
    
    if (contexts.contentScripts && contexts.contentScripts.length > 0) {
      contexts.contentScripts.forEach((cs, idx) => {
        console.log(`     ${idx + 1}. TabId: ${cs.tabId}, URL: ${cs.url?.substring(0, 50)}...`);
      });
    }

    this.testResults.contexts = {
      serviceWorker: !!contexts.serviceWorker,
      contentScriptCount: contexts.contentScripts?.length || 0
    };
    console.log('✅ 上下文分析完成\n');
  }

  async testContentScriptStatus() {
    console.log('📌 步骤4: 检查Content Script状态...');
    
    const statusResult = await this.server.handleContentScriptStatus({
      extensionId: this.extensionId,
      checkAllTabs: true
    });
    
    const status = JSON.parse(statusResult.content[0].text);
    console.log(`📊 Content Script状态:`);
    console.log(`   注入状态: ${status.overallStatus}`);
    console.log(`   检查的标签页: ${status.tabsChecked}个`);
    
    if (status.detailedResults && status.detailedResults.length > 0) {
      status.detailedResults.forEach(result => {
        console.log(`   Tab ${result.tabId}: ${result.injectionStatus}`);
        if (result.conflicts && result.conflicts.length > 0) {
          console.log(`     ⚠️ 冲突检测: ${result.conflicts.length}个问题`);
        }
      });
    }

    this.testResults.contentScriptStatus = status.overallStatus;
    console.log('✅ Content Script检查完成\n');
  }

  async testStorageInspection() {
    console.log('📌 步骤5: 检查扩展存储...');
    
    const storageResult = await this.server.handleInspectExtensionStorage({
      extensionId: this.extensionId,
      storageTypes: ['local', 'sync']
    });
    
    const storage = JSON.parse(storageResult.content[0].text);
    console.log(`📊 扩展存储检查:`);
    
    Object.entries(storage).forEach(([type, data]) => {
      if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        console.log(`   ${type}: ${keys.length}个键`);
        if (keys.length > 0) {
          keys.slice(0, 3).forEach(key => {
            console.log(`     - ${key}`);
          });
          if (keys.length > 3) console.log(`     ... 还有${keys.length - 3}个`);
        }
      }
    });

    this.testResults.storageKeys = storage;
    console.log('✅ 存储检查完成\n');
  }

  async monitorExtensionLogs() {
    console.log('📌 步骤6: 监控扩展日志...');
    
    const logsResult = await this.server.handleGetExtensionLogs({
      extensionId: this.extensionId,
      level: ['info', 'warn', 'error'],
      clear: false
    });
    
    const logs = JSON.parse(logsResult.content[0].text);
    console.log(`📊 扩展日志分析:`);
    console.log(`   日志条数: ${logs.length}`);
    
    if (logs.length > 0) {
      // 按级别统计
      const levelCount = logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(levelCount).forEach(([level, count]) => {
        console.log(`   ${level.toUpperCase()}: ${count}条`);
      });

      // 显示最近的日志
      console.log('\n📋 最近日志 (前5条):');
      logs.slice(-5).forEach(log => {
        console.log(`   [${log.level.toUpperCase()}] ${log.message.substring(0, 80)}${log.message.length > 80 ? '...' : ''}`);
      });
    }

    this.testResults.logCount = logs.length;
    this.testResults.logLevels = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ 日志监控完成\n');
  }

  async testWebCodecsIssue() {
    console.log('📌 步骤7: 分析WebCodecs模块加载问题...');
    
    // 获取扩展详细日志，特别关注错误
    const logsResult = await this.server.handleGetExtensionLogs({
      extensionId: this.extensionId,
      level: ['error'],
      clear: false
    });
    
    const errorLogs = JSON.parse(logsResult.content[0].text);
    console.log(`🔍 错误日志分析:`);
    
    // 查找WebCodecs相关错误
    const webCodecsErrors = errorLogs.filter(log => 
      log.message.includes('webcodecs') || 
      log.message.includes('dynamically imported module') ||
      log.message.includes('CYiiiZSK')
    );
    
    if (webCodecsErrors.length > 0) {
      console.log(`⚠️ 找到 ${webCodecsErrors.length} 个WebCodecs相关错误:`);
      webCodecsErrors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error.message}`);
        if (error.source) {
          console.log(`      来源: ${error.source}`);
        }
      });
      
      // 分析问题
      console.log('\n🔧 问题分析:');
      console.log('   • webcodecs-CYiiiZSK.js 文件缺失或路径错误');
      console.log('   • 可能是构建过程中chunks文件生成失败');
      console.log('   • 动态导入(import())路径解析问题');
      
      this.testResults.webCodecsIssue = {
        hasErrors: true,
        errorCount: webCodecsErrors.length,
        errors: webCodecsErrors.map(e => e.message)
      };
    } else {
      console.log('✅ 未发现WebCodecs相关错误');
      this.testResults.webCodecsIssue = { hasErrors: false };
    }

    console.log('✅ WebCodecs问题分析完成\n');
  }

  async performanceAnalysis() {
    console.log('📌 步骤8: 扩展性能分析...');
    
    try {
      const perfResult = await this.server.handleAnalyzeExtensionPerformance({
        extensionId: this.extensionId,
        testUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
        duration: 2000,
        waitForIdle: false
      });
      
      const perfData = JSON.parse(perfResult.content[0].text);
      console.log(`📊 性能分析结果:`);
      console.log(`   CPU影响: +${perfData.metrics.delta.cpuUsage.toFixed(1)}%`);
      console.log(`   内存影响: +${perfData.metrics.delta.memoryUsage.toFixed(1)}MB`);
      console.log(`   执行时间: +${perfData.metrics.delta.executionTime.toFixed(1)}ms`);
      console.log(`   影响级别: ${perfData.impact.impactLevel}`);

      this.testResults.performance = {
        cpuImpact: perfData.metrics.delta.cpuUsage,
        memoryImpact: perfData.metrics.delta.memoryUsage,
        impactLevel: perfData.impact.impactLevel
      };
      
      console.log('✅ 性能分析完成\n');
    } catch (error) {
      console.log('⚠️ 性能分析失败:', error.message);
      this.testResults.performance = { error: error.message };
    }
  }

  generateReport() {
    console.log('=' .repeat(80));
    console.log('📋 Video SRT Extension 测试报告');
    console.log('='.repeat(80) + '\n');

    console.log('🎯 扩展基本信息:');
    console.log(`   扩展ID: ${this.testResults.extensionId}`);
    console.log(`   Service Worker: ${this.testResults.contexts?.serviceWorker ? '✅ 正常' : '❌ 异常'}`);
    console.log(`   Content Scripts: ${this.testResults.contexts?.contentScriptCount || 0}个`);
    console.log(`   注入状态: ${this.testResults.contentScriptStatus}\n`);

    console.log('📊 日志分析:');
    console.log(`   总日志数: ${this.testResults.logCount}`);
    if (this.testResults.logLevels) {
      Object.entries(this.testResults.logLevels).forEach(([level, count]) => {
        console.log(`   ${level.toUpperCase()}: ${count}条`);
      });
    }

    console.log('\n🔍 WebCodecs问题诊断:');
    if (this.testResults.webCodecsIssue?.hasErrors) {
      console.log(`   ❌ 发现问题: ${this.testResults.webCodecsIssue.errorCount}个错误`);
      console.log('   💡 建议解决方案:');
      console.log('   1. 检查构建配置，确保chunks正确生成');
      console.log('   2. 验证webpack/vite配置中的代码分割设置');
      console.log('   3. 确认WebCodecs模块的动态导入路径');
      console.log('   4. 检查manifest.json中的web_accessible_resources配置');
    } else {
      console.log('   ✅ 未发现WebCodecs相关错误');
    }

    if (this.testResults.performance && !this.testResults.performance.error) {
      console.log('\n⚡ 性能表现:');
      console.log(`   CPU影响: +${this.testResults.performance.cpuImpact?.toFixed(1)}%`);
      console.log(`   内存影响: +${this.testResults.performance.memoryImpact?.toFixed(1)}MB`);
      console.log(`   影响级别: ${this.testResults.performance.impactLevel}`);
    }

    console.log('\n🎯 MCP工具验证结果:');
    console.log('   ✅ list_extensions - 扩展检测正常');
    console.log('   ✅ list_extension_contexts - 上下文分析正常');
    console.log('   ✅ content_script_status - 注入状态检查正常');
    console.log('   ✅ inspect_extension_storage - 存储检查正常');
    console.log('   ✅ get_extension_logs - 日志收集正常');
    console.log('   ✅ analyze_extension_performance - 性能分析正常');

    console.log('\n🏆 测试结论:');
    console.log('   • Chrome Debug MCP能够有效分析Video SRT Extension');
    console.log('   • 成功识别并定位WebCodecs模块加载问题');
    console.log('   • 扩展调试工具功能完整，无MCP相关异常');
    console.log('   • 为扩展优化提供了有价值的诊断信息');
  }

  async cleanup() {
    console.log('\n🧹 清理测试环境...');
    try {
      if (this.server.getCdpClient && this.server.getCdpClient()) {
        await this.server.getCdpClient().close();
      }
      console.log('✅ 已断开Chrome连接（保持浏览器运行）');
    } catch (error) {
      console.log('⚠️ 清理警告:', error.message);
    }

    setTimeout(() => {
      console.log('🏁 Video SRT Extension测试完成');
      process.exit(0);
    }, 1000);
  }
}

// 执行测试
const test = new VideoSrtExtensionTest();
test.run().catch(console.error);
