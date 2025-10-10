#!/usr/bin/env node

/**
 * 自启动Chrome模式 - 24工具全面测试
 * 测试场景：使用launch_chrome启动Chrome并加载test-extension-enhanced
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ComprehensiveTest24Tools {
  constructor() {
    this.server = null;
    this.results = {
      mode: 'launch_chrome',
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
    this.log('测试模式: 自启动Chrome (launch_chrome)');
    this.log('='.repeat(80));

    this.server = new ChromeDebugServer();

    // 获取扩展路径
    const extensionPath = path.join(__dirname, '..', 'test-extension-enhanced');
    
    if (!fs.existsSync(extensionPath)) {
      throw new Error(`测试扩展不存在: ${extensionPath}`);
    }

    this.log(`\n测试扩展路径: ${extensionPath}`, 'info');
  }

  // ==================== 基础浏览器操作工具测试 (11个) ====================

  async test01_LaunchChrome() {
    return await this.runTest(
      '01. launch_chrome',
      '启动Chrome并加载test-extension-enhanced扩展',
      async () => {
        const extensionPath = path.join(__dirname, '..', 'test-extension-enhanced');
        
        // 尝试常见的Chrome路径
        const chromePathsWin = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];
        
        let chromePath = null;
        if (process.platform === 'win32') {
          for (const p of chromePathsWin) {
            if (fs.existsSync(p)) {
              chromePath = p;
              break;
            }
          }
        }
        
        const launchArgs = {
          loadExtension: extensionPath,
          url: 'https://example.com',
          headless: false
        };
        
        // 如果找到Chrome路径就使用，否则使用channel
        if (chromePath) {
          launchArgs.executablePath = chromePath;
          this.log(`   使用Chrome路径: ${chromePath}`, 'info');
        } else {
          // 使用channel参数让puppeteer自动查找
          launchArgs.channel = 'chrome'; // 或 'chrome-dev', 'chrome-beta', 'chrome-canary'
          this.log(`   使用channel: chrome (自动查找)`, 'info');
        }
        
        const result = await this.server.handleLaunchChrome(launchArgs);

        // 等待Chrome完全启动
        await new Promise(resolve => setTimeout(resolve, 3000));

        return { message: 'Chrome启动成功，扩展已加载' };
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
          this.testTabId = data.tabs[0].id;
          this.log(`   主标签页ID: ${this.testTabId}`, 'info');
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
        // example.com 有一个 "More information..." 链接
        const result = await this.server.handleClick({
          selector: 'a',
          tabId: this.testTabId
        });
        
        this.log(`   点击成功`, 'info');
        
        // 等待导航
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 返回主页
        const evalResult = await this.server.handleEvaluate({
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
          text: 'MCP Test User',
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
        const screenshotPath = path.join(__dirname, '..', 'test-screenshot-launch.png');
        
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
        const tabToClose = tabsData.tabs?.find(t => t.id !== this.testTabId);
        
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

  // ==================== 扩展调试工具测试 (13个) ====================

  async test11_ListExtensions() {
    return await this.runTest(
      '11. list_extensions',
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

  async test12_GetExtensionLogs() {
    return await this.runTest(
      '12. get_extension_logs (Week 1)',
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

  async test13_ContentScriptStatus() {
    return await this.runTest(
      '13. content_script_status (Week 1)',
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

  async test14_ListExtensionContexts() {
    return await this.runTest(
      '14. list_extension_contexts (Week 2)',
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

  async test15_SwitchExtensionContext() {
    return await this.runTest(
      '15. switch_extension_context (Week 2)',
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

  async test16_InspectExtensionStorage() {
    return await this.runTest(
      '16. inspect_extension_storage (Week 2)',
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

  async test17_InjectContentScript() {
    return await this.runTest(
      '17. inject_content_script (Week 2)',
      '动态注入内容脚本',
      async () => {
        if (!this.extensionId || !this.testTabId) {
          throw new Error('缺少扩展ID或标签页ID');
        }
        
        const result = await this.server.handleInjectContentScript({
          extensionId: this.extensionId,
          tabId: this.testTabId,
          code: 'console.log("[MCP Test] 动态注入的脚本已执行"); document.body.setAttribute("data-mcp-injected", "true");'
        });
        
        const data = JSON.parse(result.content[0].text);
        
        this.log(`   注入成功: ${data.success ? '是' : '否'}`, 'info');
        
        return data;
      }
    );
  }

  async test18_MonitorExtensionMessages() {
    return await this.runTest(
      '18. monitor_extension_messages (Week 3)',
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

  async test19_TrackExtensionAPICalls() {
    return await this.runTest(
      '19. track_extension_api_calls (Week 3)',
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

  async test20_TestExtensionOnMultiplePages() {
    return await this.runTest(
      '20. test_extension_on_multiple_pages (Week 4)',
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

  async test21_AnalyzeExtensionPerformance() {
    return await this.runTest(
      '21. analyze_extension_performance (Phase 1)',
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

  async test22_TrackExtensionNetwork() {
    return await this.runTest(
      '22. track_extension_network (Phase 1)',
      '追踪扩展网络请求',
      async () => {
        if (!this.extensionId) {
          throw new Error('没有可用的扩展ID');
        }
        
        this.log(`   开始网络监控...`, 'info');
        
        // 注意：test-extension-enhanced可能没有网络请求，使用一个有资源的页面
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

  async test23_MeasureExtensionImpact() {
    return await this.runTest(
      '23. measure_extension_impact (Phase 1)',
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

  async test24_AttachToChrome() {
    // 这个测试在launch模式下会跳过，因为已经启动了Chrome
    await this.skipTest(
      '24. attach_to_chrome',
      '在launch_chrome模式下不适用（Chrome已通过launch启动）'
    );
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      this.log('\n' + '='.repeat(80));
      this.log('第一部分: 基础浏览器操作工具 (11个)');
      this.log('='.repeat(80));
      
      await this.test01_LaunchChrome();
      await this.test02_ListTabs();
      await this.test03_NewTab();
      await this.test04_SwitchTab();
      await this.test05_Evaluate();
      await this.test06_Click();
      await this.test07_Type();
      await this.test08_Screenshot();
      await this.test09_GetConsoleLogs();
      await this.test10_CloseTab();
      
      this.log('\n' + '='.repeat(80));
      this.log('第二部分: 扩展调试专用工具 (13个)');
      this.log('='.repeat(80));
      
      await this.test11_ListExtensions();
      await this.test12_GetExtensionLogs();
      await this.test13_ContentScriptStatus();
      await this.test14_ListExtensionContexts();
      await this.test15_SwitchExtensionContext();
      await this.test16_InspectExtensionStorage();
      await this.test17_InjectContentScript();
      await this.test18_MonitorExtensionMessages();
      await this.test19_TrackExtensionAPICalls();
      await this.test20_TestExtensionOnMultiplePages();
      await this.test21_AnalyzeExtensionPerformance();
      await this.test22_TrackExtensionNetwork();
      await this.test23_MeasureExtensionImpact();
      await this.test24_AttachToChrome();
      
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
    const reportPath = path.join(__dirname, '..', 'test-results-launch-chrome.json');
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
  }
}

// 运行测试
const test = new ComprehensiveTest24Tools();
test.runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

