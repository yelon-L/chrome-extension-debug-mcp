#!/usr/bin/env node

/**
 * 连接已运行Chrome模式 - 24工具全面测试
 * 测试场景：连接到已启动的Chrome实例（需要手动启动）
 * 
 * 启动命令:
 * Windows: chrome.exe --remote-debugging-port=9222 --load-extension=E:\developer\workspace\me\chrome-extension-debug-mcp\test-extension-enhanced
 * Linux/Mac: google-chrome --remote-debugging-port=9222 --load-extension=/path/to/test-extension-enhanced
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveTest24ToolsAttach {
  constructor() {
    this.server = null;
    this.results = {
      mode: 'attach_to_chrome',
      startTime: Date.now(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
    this.extensionId = null;
    this.testTabId = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️',
      'test': '🧪'
    }[level] || '📋';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(name, description, testFn) {
    this.results.summary.total++;
    const testResult = {
      name,
      description,
      startTime: Date.now(),
      status: 'pending',
      duration: 0,
      error: null,
      result: null
    };

    this.log(`\n测试 #${this.results.summary.total}: ${name}`, 'test');
    this.log(`说明: ${description}`, 'info');

    try {
      const result = await testFn();
      testResult.status = 'passed';
      testResult.result = result;
      testResult.duration = Date.now() - testResult.startTime;
      this.results.summary.passed++;
      this.log(`通过 (${testResult.duration}ms)`, 'success');
      this.results.tests.push(testResult);
      return result;
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
      testResult.duration = Date.now() - testResult.startTime;
      this.results.summary.failed++;
      this.log(`失败: ${error.message} (${testResult.duration}ms)`, 'error');
      this.results.tests.push(testResult);
      throw error;
    }
  }

  async skipTest(name, reason) {
    this.results.summary.total++;
    this.results.summary.skipped++;
    this.results.tests.push({
      name,
      status: 'skipped',
      reason,
      duration: 0
    });
    this.log(`跳过: ${name} - ${reason}`, 'warn');
  }

  async initialize() {
    this.log('='.repeat(80));
    this.log('Chrome Extension Debug MCP - 24工具全面测试');
    this.log('测试模式: 连接已运行Chrome (attach_to_chrome)');
    this.log('='.repeat(80));

    this.log('\n⚠️  请确保Chrome已通过以下命令启动:', 'warn');
    this.log('  Windows: chrome.exe --remote-debugging-port=9222 --load-extension=path\\to\\test-extension-enhanced', 'info');
    this.log('  Linux/Mac: google-chrome --remote-debugging-port=9222 --load-extension=/path/to/test-extension-enhanced', 'info');
    this.log('\n等待5秒后开始连接...', 'info');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.server = new ChromeDebugServer();
  }

  // ==================== 基础浏览器操作工具测试 (11个) ====================

  async test01_AttachToChrome() {
    return await this.runTest(
      '01. attach_to_chrome',
      '连接到已运行的Chrome实例',
      async () => {
        const result = await this.server.handleAttachToChrome({
          host: 'localhost',
          port: 9222
        });

        this.log(`   连接成功`, 'success');
        
        // 等待连接稳定
        await new Promise(resolve => setTimeout(resolve, 2000));

        return { connected: true };
      }
    );
  }

  async test02_ListTabs() {
    return await this.runTest(
      '02. list_tabs',
      '列出所有打开的标签页',
      async () => {
        const result = await this.server.handleListTabs();
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   发现 ${data.tabs?.length || 0} 个标签页`, 'info');
        
        // 保存第一个标签页ID用于后续测试
        if (data.tabs && data.tabs.length > 0) {
          // 优先选择非chrome://的标签页
          const normalTab = data.tabs.find(t => !t.url.startsWith('chrome://')) || data.tabs[0];
          this.testTabId = normalTab.id;
          this.log(`   主标签页ID: ${this.testTabId}`, 'info');
          this.log(`   主标签页URL: ${normalTab.url}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test03_NewTab() {
    return await this.runTest(
      '03. new_tab',
      '创建新标签页 (httpbin.org/html)',
      async () => {
        const result = await this.server.handleNewTab({ url: 'https://httpbin.org/html' });
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   新标签页ID: ${data.id}`, 'info');
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return data;
      }
    );
  }

  async test04_SwitchTab() {
    return await this.runTest(
      '04. switch_tab',
      '切换回主标签页',
      async () => {
        if (!this.testTabId) {
          throw new Error('没有可切换的标签页ID');
        }
        
        const result = await this.server.handleSwitchTab({ tabId: this.testTabId });
        
        this.log(`   切换到标签页: ${this.testTabId}`, 'info');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { success: true };
      }
    );
  }

  async test05_Evaluate() {
    return await this.runTest(
      '05. evaluate',
      '在页面中执行JavaScript代码',
      async () => {
        const result = await this.server.handleEvaluate({
          expression: 'document.title',
          tabId: this.testTabId
        });
        
        const data = JSON.parse(result.content[0].text);
        this.log(`   页面标题: ${data.result}`, 'info');
        
        return data;
      }
    );
  }

  async test06_Click() {
    return await this.runTest(
      '06. click',
      '点击页面中的链接元素',
      async () => {
        // 先确保在example.com
        await this.server.handleEvaluate({
          expression: 'if(!window.location.href.includes("example.com")) window.location.href = "https://example.com";',
          tabId: this.testTabId
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // example.com 有一个 "More information..." 链接
        const result = await this.server.handleClick({
          selector: 'a',
          tabId: this.testTabId
        });
        
        this.log(`   点击成功`, 'info');
        
        // 等待导航
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 返回主页
        await this.server.handleEvaluate({
          expression: 'window.location.href = "https://example.com"; "navigated"',
          tabId: this.testTabId
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { clicked: true };
      }
    );
  }

  async test07_Type() {
    return await this.runTest(
      '07. type',
      '在输入框中输入文本 (使用httpbin.org/forms)',
      async () => {
        // 先导航到有表单的页面
        await this.server.handleEvaluate({
          expression: 'window.location.href = "https://httpbin.org/forms/post"; "navigating"',
          tabId: this.testTabId
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 输入文本到表单
        const result = await this.server.handleType({
          selector: 'input[name="custname"]',
          text: 'MCP Test User (Attach Mode)',
          tabId: this.testTabId
        });
        
        this.log(`   输入文本成功`, 'info');
        
        // 返回主页
        await this.server.handleEvaluate({
          expression: 'window.location.href = "https://example.com"; "navigated"',
          tabId: this.testTabId
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { typed: true };
      }
    );
  }

  async test08_Screenshot() {
    return await this.runTest(
      '08. screenshot',
      '截取当前页面的屏幕截图',
      async () => {
        const screenshotPath = path.join(__dirname, '..', 'test-screenshot-attach.png');
        
        const result = await this.server.handleScreenshot({
          path: screenshotPath,
          fullPage: false,
          tabId: this.testTabId
        });
        
        // 检查文件是否创建
        if (fs.existsSync(screenshotPath)) {
          const stats = fs.statSync(screenshotPath);
          this.log(`   截图已保存: ${screenshotPath} (${(stats.size / 1024).toFixed(1)}KB)`, 'info');
        }
        
        return { screenshot: screenshotPath };
      }
    );
  }

  async test09_GetConsoleLogs() {
    return await this.runTest(
      '09. get_console_logs',
      '获取浏览器控制台日志',
      async () => {
        const result = await this.server.handleGetConsoleLogs({ clear: false });
        const logs = result.content[0].text;
        
        const logLines = logs.split('\n').filter(l => l.trim());
        this.log(`   收集到 ${logLines.length} 条控制台日志`, 'info');
        
        return { logCount: logLines.length };
      }
    );
  }

  async test10_CloseTab() {
    return await this.runTest(
      '10. close_tab',
      '关闭之前创建的标签页',
      async () => {
        // 获取当前所有标签页
        const tabsResult = await this.server.handleListTabs();
        const tabsData = JSON.parse(tabsResult.content[0].text);
        
        // 找到非主标签页
        const tabToClose = tabsData.tabs?.find(t => t.id !== this.testTabId && !t.url.startsWith('chrome://'));
        
        if (tabToClose) {
          await this.server.handleCloseTab({ tabId: tabToClose.id });
          this.log(`   关闭标签页: ${tabToClose.id}`, 'info');
          return { closed: tabToClose.id };
        } else {
          this.log(`   没有额外标签页需要关闭`, 'warn');
          return { closed: null };
        }
      }
    );
  }

  async test11_LaunchChrome() {
    // 这个测试在attach模式下会跳过
    await this.skipTest(
      '11. launch_chrome',
      '在attach_to_chrome模式下不适用（Chrome已手动启动）'
    );
  }

  // ==================== 扩展调试工具测试 (13个) ====================

  async test12_ListExtensions() {
    return await this.runTest(
      '12. list_extensions',
      '列出已加载的Chrome扩展',
      async () => {
        const result = await this.server.handleListExtensions({});
        const data = JSON.parse(result.content[0].text);
        
        const extensions = Array.isArray(data) ? data : (data.extensions || []);
        this.log(`   发现 ${extensions.length} 个扩展`, 'info');
        
        if (extensions.length > 0) {
          this.extensionId = extensions[0].id;
          this.log(`   扩展ID: ${this.extensionId}`, 'info');
          this.log(`   扩展名称: ${extensions[0].name || '未知'}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test13_GetExtensionLogs() {
    return await this.runTest(
      '13. get_extension_logs (Week 1)',
      '获取扩展的多级日志',
      async () => {
        // 等待扩展产生一些日志
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = await this.server.handleGetExtensionLogs({
          sourceTypes: ['extension', 'background', 'service_worker', 'content_script'],
          level: ['log', 'info', 'warn', 'error'],
          clear: false
        });
        
        const data = JSON.parse(result.content[0].text);
        const logs = data.logs || [];
        
        this.log(`   收集到 ${logs.length} 条扩展日志`, 'info');
        
        if (logs.length > 0) {
          const levels = [...new Set(logs.map(l => l.level))];
          this.log(`   日志级别: ${levels.join(', ')}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test14_ContentScriptStatus() {
    return await this.runTest(
      '14. content_script_status (Week 1)',
      '检测内容脚本注入状态',
      async () => {
        if (!this.testTabId) {
          throw new Error('没有可用的测试标签页');
        }
        
        const result = await this.server.handleContentScriptStatus({
          tabId: this.testTabId,
          extensionId: this.extensionId
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   注入状态: ${data.injected ? '已注入' : '未注入'}`, 'info');
        if (data.markers) {
          this.log(`   DOM标记: ${data.markers.length} 个`, 'info');
        }
        
        return data;
      }
    );
  }

  async test15_ListExtensionContexts() {
    return await this.runTest(
      '15. list_extension_contexts (Week 2)',
      '列出扩展的所有上下文',
      async () => {
        const result = await this.server.handleListExtensionContexts({
          extensionId: this.extensionId
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   总上下文数: ${data.totalContexts || 0}`, 'info');
        
        if (data.extensions && data.extensions.length > 0) {
          const ext = data.extensions[0];
          const contextTypes = Object.keys(ext.contexts || {});
          this.log(`   上下文类型: ${contextTypes.join(', ')}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test16_SwitchExtensionContext() {
    return await this.runTest(
      '16. switch_extension_context (Week 2)',
      '切换到扩展的background上下文',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        const result = await this.server.handleSwitchExtensionContext({
          extensionId: this.extensionId,
          contextType: 'background'
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   切换成功: ${data.success ? '是' : '否'}`, 'info');
        if (data.targetId) {
          this.log(`   目标ID: ${data.targetId}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test17_InspectExtensionStorage() {
    return await this.runTest(
      '17. inspect_extension_storage (Week 2)',
      '检查扩展的存储数据',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        const result = await this.server.handleInspectExtensionStorage({
          extensionId: this.extensionId,
          storageTypes: ['local', 'sync']
        });
        
        const data = JSON.parse(result.content[0].text);
        
        const localKeys = Object.keys(data.local || {}).length;
        const syncKeys = Object.keys(data.sync || {}).length;
        
        this.log(`   Local存储项: ${localKeys}`, 'info');
        this.log(`   Sync存储项: ${syncKeys}`, 'info');
        
        return data;
      }
    );
  }

  async test18_InjectContentScript() {
    return await this.runTest(
      '18. inject_content_script (Week 2)',
      '动态注入内容脚本',
      async () => {
        if (!this.extensionId || !this.testTabId) {
          throw new Error('缺少扩展ID或标签页ID');
        }
        
        const result = await this.server.handleInjectContentScript({
          extensionId: this.extensionId,
          tabId: this.testTabId,
          code: 'console.log("[MCP Test Attach] 动态注入的脚本已执行"); document.body.setAttribute("data-mcp-attach-injected", "true");'
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   注入成功: ${data.success ? '是' : '否'}`, 'info');
        
        return data;
      }
    );
  }

  async test19_MonitorExtensionMessages() {
    return await this.runTest(
      '19. monitor_extension_messages (Week 3)',
      '监控扩展消息传递 (20秒)',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始监控消息传递...`, 'info');
        
        const result = await this.server.handleMonitorExtensionMessages({
          extensionId: this.extensionId,
          duration: 20000,
          messageTypes: ['runtime', 'tabs'],
          includeResponses: true
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   捕获消息数: ${data.totalMessages || 0}`, 'info');
        this.log(`   Runtime消息: ${data.runtimeMessages || 0}`, 'info');
        this.log(`   Tabs消息: ${data.tabsMessages || 0}`, 'info');
        
        return data;
      }
    );
  }

  async test20_TrackExtensionAPICalls() {
    return await this.runTest(
      '20. track_extension_api_calls (Week 3)',
      '追踪扩展API调用 (20秒)',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始追踪API调用...`, 'info');
        
        const result = await this.server.handleTrackExtensionAPICalls({
          extensionId: this.extensionId,
          duration: 20000,
          apiCategories: ['storage', 'tabs', 'runtime'],
          includeResults: true
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   总API调用: ${data.totalCalls || 0}`, 'info');
        this.log(`   Storage调用: ${data.storageCalls || 0}`, 'info');
        this.log(`   Tabs调用: ${data.tabsCalls || 0}`, 'info');
        
        return data;
      }
    );
  }

  async test21_TestExtensionOnMultiplePages() {
    return await this.runTest(
      '21. test_extension_on_multiple_pages (Week 4)',
      '在多个页面上批量测试扩展',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始批量测试...`, 'info');
        
        const result = await this.server.handleTestExtensionOnMultiplePages({
          extensionId: this.extensionId,
          testUrls: [
            'https://example.com',
            'https://httpbin.org/html',
            'https://httpbin.org/json'
          ],
          timeout: 15000,
          includePerformance: true,
          generateReport: true
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   测试页面数: ${data.totalPages || 0}`, 'info');
        this.log(`   成功率: ${data.successRate || 0}%`, 'info');
        
        return data;
      }
    );
  }

  async test22_AnalyzeExtensionPerformance() {
    return await this.runTest(
      '22. analyze_extension_performance (Phase 1)',
      '分析扩展性能影响',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始性能分析...`, 'info');
        
        const result = await this.server.handleAnalyzeExtensionPerformance({
          extensionId: this.extensionId,
          testUrl: 'https://example.com',
          duration: 3000,
          waitForIdle: true,
          includeScreenshots: false
        });
        
        const data = JSON.parse(result.content[0].text);
        
        if (data.metrics && data.metrics.delta) {
          this.log(`   CPU增加: ${data.metrics.delta.cpuUsage?.toFixed(1) || 'N/A'}%`, 'info');
          this.log(`   内存增加: ${data.metrics.delta.memoryUsage?.toFixed(1) || 'N/A'}MB`, 'info');
          this.log(`   影响级别: ${data.impact?.impactLevel || 'N/A'}`, 'info');
        }
        
        return data;
      }
    );
  }

  async test23_TrackExtensionNetwork() {
    return await this.runTest(
      '23. track_extension_network (Phase 1)',
      '追踪扩展网络请求',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始网络监控...`, 'info');
        
        const result = await this.server.handleTrackExtensionNetwork({
          extensionId: this.extensionId,
          duration: 5000,
          testUrl: 'https://httpbin.org/html',
          includeRequests: false
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   总请求数: ${data.totalRequests || 0}`, 'info');
        this.log(`   数据传输: ${((data.totalDataTransferred || 0) / 1024).toFixed(1)}KB`, 'info');
        
        return data;
      }
    );
  }

  async test24_MeasureExtensionImpact() {
    return await this.runTest(
      '24. measure_extension_impact (Phase 1)',
      '综合量化扩展影响',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始综合影响测试...`, 'info');
        
        const result = await this.server.handleMeasureExtensionImpact({
          extensionId: this.extensionId,
          testPages: [
            'https://example.com',
            'https://httpbin.org/html'
          ],
          iterations: 1,
          performanceDuration: 2000,
          networkDuration: 3000
        });
        
        const data = JSON.parse(result.content[0].text);
        
        if (data.overall) {
          this.log(`   整体影响级别: ${data.overall.overallImpactLevel || 'N/A'}`, 'info');
          this.log(`   综合评分: ${data.overall.overallImpactScore || 'N/A'}/100`, 'info');
        }
        
        return data;
      }
    );
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      this.log('\n' + '='.repeat(80));
      this.log('第一部分: 基础浏览器操作工具 (11个)');
      this.log('='.repeat(80));
      
      await this.test01_AttachToChrome();
      await this.test02_ListTabs();
      await this.test03_NewTab();
      await this.test04_SwitchTab();
      await this.test05_Evaluate();
      await this.test06_Click();
      await this.test07_Type();
      await this.test08_Screenshot();
      await this.test09_GetConsoleLogs();
      await this.test10_CloseTab();
      await this.test11_LaunchChrome();
      
      this.log('\n' + '='.repeat(80));
      this.log('第二部分: 扩展调试专用工具 (13个)');
      this.log('='.repeat(80));
      
      await this.test12_ListExtensions();
      await this.test13_GetExtensionLogs();
      await this.test14_ContentScriptStatus();
      await this.test15_ListExtensionContexts();
      await this.test16_SwitchExtensionContext();
      await this.test17_InspectExtensionStorage();
      await this.test18_InjectContentScript();
      await this.test19_MonitorExtensionMessages();
      await this.test20_TrackExtensionAPICalls();
      await this.test21_TestExtensionOnMultiplePages();
      await this.test22_AnalyzeExtensionPerformance();
      await this.test23_TrackExtensionNetwork();
      await this.test24_MeasureExtensionImpact();
      
      this.generateReport();
      
    } catch (error) {
      this.log(`\n致命错误: ${error.message}`, 'error');
      this.log(error.stack, 'error');
      this.generateReport();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    this.results.endTime = Date.now();
    this.results.totalDuration = this.results.endTime - this.results.startTime;
    
    this.log('\n' + '='.repeat(80));
    this.log('测试报告总结');
    this.log('='.repeat(80));
    
    this.log(`测试模式: ${this.results.mode}`);
    this.log(`总测试数: ${this.results.summary.total}`);
    this.log(`✅ 通过: ${this.results.summary.passed}`, 'success');
    this.log(`❌ 失败: ${this.results.summary.failed}`, 'error');
    this.log(`⚠️  跳过: ${this.results.summary.skipped}`, 'warn');
    this.log(`通过率: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);
    this.log(`总耗时: ${(this.results.totalDuration / 1000).toFixed(1)}秒`);
    
    // 保存详细报告到JSON
    const reportPath = path.join(__dirname, '..', 'test-results-attach-chrome.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n详细报告已保存: ${reportPath}`, 'info');
    
    if (this.results.summary.failed === 0) {
      this.log('\n🎉 所有测试通过！', 'success');
    } else {
      this.log('\n⚠️  部分测试失败，请查看详细报告', 'warn');
    }
  }

  async cleanup() {
    this.log('\n清理测试环境...', 'info');
    
    if (this.server) {
      try {
        await this.server.cleanup();
        this.log('服务器已清理', 'success');
      } catch (error) {
        this.log(`清理失败: ${error.message}`, 'error');
      }
    }
    
    this.log('\n⚠️  请手动关闭Chrome浏览器', 'warn');
  }
}

// 运行测试
const test = new ComprehensiveTest24ToolsAttach();
test.runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});


