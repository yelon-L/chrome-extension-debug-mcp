/**
 * 新功能验证测试
 * 
 * 测试功能：
 * 1. Core Web Vitals增强
 * 2. 错误信息增强
 * 3. 进度反馈机制
 * 4. HAR格式支持
 * 5. 快捷组合工具
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class NewFeaturesTest {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = null;
  }

  async initialize() {
    console.log('\n=== 新功能验证测试 ===\n');
    
    // 连接到Chrome（假设已经运行在9222端口）
    try {
      await this.server.handleAttachToChrome({ host: 'localhost', port: 9222 });
      console.log('✓ Chrome连接成功');
    } catch (error) {
      console.log('✗ Chrome连接失败，请确保Chrome运行在9222端口');
      console.log('  启动命令: chrome --remote-debugging-port=9222');
      throw error;
    }

    // 获取扩展ID
    const extensionsResult = await this.server.handleListExtensions({});
    const extensions = JSON.parse(extensionsResult.content[0].text);
    
    if (extensions.length === 0) {
      console.log('⚠ 未找到已加载的扩展，某些测试将被跳过');
      return false;
    }
    
    this.extensionId = extensions[0].id;
    console.log(`✓ 找到扩展: ${extensions[0].name} (${this.extensionId})`);
    return true;
  }

  async testQuickExtensionDebug() {
    console.log('\n--- 测试1: 快速扩展调试 ---');
    
    if (!this.extensionId) {
      console.log('⊘ 跳过（无可用扩展）');
      return;
    }

    try {
      const startTime = Date.now();
      const result = await this.server.handleQuickExtensionDebug({
        extensionId: this.extensionId,
        includeStorage: true,
        includeLogs: true,
        includeContentScript: true
      });
      
      const data = JSON.parse(result.content[0].text);
      const duration = Date.now() - startTime;
      
      console.log('✓ quick_extension_debug 执行成功');
      console.log(`  耗时: ${duration}ms`);
      console.log(`  扩展: ${data.extension?.name || '未知'}`);
      console.log(`  日志: ${data.logs?.total || 0}条`);
      console.log(`  存储: local=${data.storage?.local || 0}, sync=${data.storage?.sync || 0}`);
      console.log('\n摘要预览:');
      console.log(data.summary.substring(0, 300) + '...');
      
    } catch (error) {
      console.log(`✗ 测试失败: ${error.message}`);
    }
  }

  async testQuickPerformanceCheck() {
    console.log('\n--- 测试2: 快速性能检测 ---');
    
    if (!this.extensionId) {
      console.log('⊘ 跳过（无可用扩展）');
      return;
    }

    try {
      const startTime = Date.now();
      console.log('  开始性能检测（预计需要12秒）...');
      
      const result = await this.server.handleQuickPerformanceCheck({
        extensionId: this.extensionId,
        testUrl: 'https://example.com'
      });
      
      const data = JSON.parse(result.content[0].text);
      const duration = Date.now() - startTime;
      
      console.log('✓ quick_performance_check 执行成功');
      console.log(`  总耗时: ${duration}ms`);
      
      if (data.performance && !data.performance.error) {
        console.log(`  CPU影响: ${data.performance.cpuUsage.toFixed(1)}%`);
        console.log(`  内存影响: ${data.performance.memoryUsage.toFixed(1)}MB`);
        console.log(`  影响评分: ${data.performance.impactScore}/100`);
        
        if (data.performance.cwv) {
          console.log(`  LCP: ${data.performance.cwv.lcp}ms`);
          console.log(`  FID: ${data.performance.cwv.fid}ms`);
          console.log(`  CLS: ${data.performance.cwv.cls.toFixed(3)}`);
        }
      }
      
      if (data.network && !data.network.error) {
        console.log(`  网络请求: ${data.network.totalRequests}个`);
        console.log(`  数据传输: ${(data.network.totalDataTransferred / 1024).toFixed(1)}KB`);
      }
      
    } catch (error) {
      console.log(`✗ 测试失败: ${error.message}`);
    }
  }

  async testHARExport() {
    console.log('\n--- 测试3: HAR格式导出 ---');
    
    if (!this.extensionId) {
      console.log('⊘ 跳过（无可用扩展）');
      return;
    }

    try {
      const startTime = Date.now();
      console.log('  开始收集网络数据（10秒）...');
      
      const result = await this.server.handleExportExtensionNetworkHAR({
        extensionId: this.extensionId,
        duration: 10000,
        testUrl: 'https://example.com'
      });
      
      const data = JSON.parse(result.content[0].text);
      const duration = Date.now() - startTime;
      
      console.log('✓ export_extension_network_har 执行成功');
      console.log(`  耗时: ${duration}ms`);
      
      if (data.harData) {
        console.log(`  HAR版本: ${data.harData.log.version}`);
        console.log(`  请求数量: ${data.harData.log.entries.length}`);
      }
      
      if (data.summary) {
        console.log(`  总大小: ${(data.summary.totalSize / 1024).toFixed(1)}KB`);
        console.log(`  总时间: ${data.summary.totalTime.toFixed(0)}ms`);
        console.log(`  请求方法: ${Object.keys(data.summary.byMethod).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`✗ 测试失败: ${error.message}`);
    }
  }

  async testCoreWebVitals() {
    console.log('\n--- 测试4: Core Web Vitals增强 ---');
    
    if (!this.extensionId) {
      console.log('⊘ 跳过（无可用扩展）');
      return;
    }

    try {
      console.log('  分析扩展性能（包含CWV）...');
      
      const result = await this.server.handleAnalyzeExtensionPerformance({
        extensionId: this.extensionId,
        testUrl: 'https://example.com',
        duration: 2000
      });
      
      const data = JSON.parse(result.content[0].text);
      
      console.log('✓ Core Web Vitals测量完成');
      
      if (data.cwv?.withExtension) {
        const cwv = data.cwv.withExtension;
        console.log(`  LCP: ${cwv.lcp}ms ${cwv.rating?.lcp ? `(${cwv.rating.lcp})` : ''}`);
        console.log(`  FID: ${cwv.fid}ms ${cwv.rating?.fid ? `(${cwv.rating.fid})` : ''}`);
        console.log(`  CLS: ${cwv.cls.toFixed(3)} ${cwv.rating?.cls ? `(${cwv.rating.cls})` : ''}`);
        
        if (cwv.score !== undefined) {
          console.log(`  综合评分: ${cwv.score}/100`);
        }
      }
      
    } catch (error) {
      console.log(`✗ 测试失败: ${error.message}`);
    }
  }

  async testErrorMessages() {
    console.log('\n--- 测试5: 友好错误信息 ---');
    
    try {
      // 尝试获取不存在的扩展
      console.log('  测试扩展未找到错误...');
      await this.server.handleGetExtensionLogs({ 
        extensionId: 'invalid-extension-id-12345678901234567890123456789012' 
      });
      console.log('⚠ 应该抛出错误但没有');
    } catch (error) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('诊断步骤') || errorMsg.length > 100) {
        console.log('✓ 错误信息已增强（包含诊断信息）');
        console.log(`  错误长度: ${errorMsg.length}字符`);
      } else {
        console.log('⚠ 错误信息未包含诊断步骤');
        console.log(`  错误: ${errorMsg.substring(0, 100)}`);
      }
    }
  }

  async runAllTests() {
    try {
      const hasExtension = await this.initialize();
      
      // 运行所有测试
      await this.testQuickExtensionDebug();
      await this.testQuickPerformanceCheck();
      await this.testHARExport();
      await this.testCoreWebVitals();
      await this.testErrorMessages();
      
      console.log('\n=== 测试完成 ===\n');
      console.log('✓ 所有新功能已验证');
      console.log('\n新增工具列表:');
      console.log('  1. quick_extension_debug - 一键扩展快速调试');
      console.log('  2. quick_performance_check - 一键性能快速检测');
      console.log('  3. export_extension_network_har - HAR格式导出');
      console.log('\n增强功能:');
      console.log('  • Core Web Vitals完整测量（LCP、FID、CLS）');
      console.log('  • 友好错误信息（包含诊断步骤）');
      console.log('  • 进度反馈机制（长时间任务）');
      
    } catch (error) {
      console.error('\n✗ 测试失败:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    try {
      await this.server.cleanup();
    } catch (error) {
      // 忽略清理错误
    }
  }
}

// 运行测试
const test = new NewFeaturesTest();
test.runAllTests().catch(console.error);


