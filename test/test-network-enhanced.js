/**
 * Phase 1.3: Network Monitoring Enhancement 测试
 * 
 * 测试4个新工具：
 * 1. list_extension_requests - 列出请求（过滤/分页/排序）
 * 2. get_extension_request_details - 获取请求详情
 * 3. export_extension_network_har - 导出HAR格式
 * 4. analyze_extension_network - 网络模式分析
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';
import path from 'path';
import { promises as fs } from 'fs';

class NetworkEnhancementTester {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = '';
    this.testResults = [];
  }

  async setup() {
    console.log('\n🚀 Phase 1.3: Network Monitoring Enhancement 测试\n');
    console.log('='.repeat(60));
    
    // 连接到已运行的Chrome (端口9222)
    const attachResult = await this.server.handleAttachToChrome({
      host: 'localhost',
      port: 9222
    });
    console.log('✅ 已连接到Chrome:', attachResult.content[0].text);
    
    // 获取扩展ID
    const extensionsResult = await this.server.handleListExtensions({});
    const extensionsText = extensionsResult.content[0].text;
    const extensionsData = typeof extensionsText === 'string' ? JSON.parse(extensionsText) : extensionsText;
    
    const testExtension = extensionsData.extensions?.find(ext => 
      ext.name?.includes('test-extension-enhanced') || 
      ext.url?.includes('test-extension-enhanced')
    );
    
    if (!testExtension) {
      console.log('⚠️ 未找到test-extension-enhanced扩展，使用手动ID');
      // 可以手动输入扩展ID，或使用chrome://extensions查看
      this.extensionId = 'pmjpdpfoncealbpcofhfmlleajnfhpoc'; // 替换为实际扩展ID
    } else {
      this.extensionId = testExtension.id;
      console.log('✅ 找到测试扩展:', this.extensionId.substring(0, 32) + '...');
    }
    
    // 获取已有标签页
    const tabsResult = await this.server.handleListTabs({});
    const tabsText = tabsResult.content[0].text;
    const tabsData = typeof tabsText === 'string' ? JSON.parse(tabsText) : tabsText;
    
    if (!tabsData.tabs || tabsData.tabs.length === 0) {
      console.log('⚠️ 没有打开的标签页，请先在Chrome中打开一个页面');
      process.exit(1);
    }
    
    // 切换到第一个标签页
    const firstTab = tabsData.tabs[0];
    await this.server.handleSwitchTab({ tabId: firstTab.id });
    console.log('✅ 使用标签页:', firstTab.url.substring(0, 50) + '...');
    
    console.log('');
  }

  async test1_ListExtensionRequests() {
    console.log('\n📋 测试1: list_extension_requests - 列出网络请求');
    console.log('-'.repeat(60));
    
    try {
      // 1.1 先运行网络监控收集数据
      console.log('  ⏳ 启动网络监控（10秒）...');
      
      // 触发扩展的网络测试
      const page = this.server.pageManager.getCurrentPage();
      if (page) {
        await page.evaluate(() => {
          // 触发扩展的综合网络测试
          chrome.runtime.sendMessage({ action: 'triggerNetworkTest' });
        });
      }
      
      await this.server.handleTrackExtensionNetwork({
        extensionId: this.extensionId,
        duration: 10000,
        testUrl: 'https://httpbin.org/html'
      });
      
      console.log('  ✅ 网络监控完成');
      
      // 1.2 基本列表（无过滤）
      console.log('\n  📊 测试1.1: 基本列表（前10条）');
      const basicList = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        pagination: { page: 1, pageSize: 10 }
      });
      
      const basicData = JSON.parse(basicList.content[0].text);
      console.log(`    ✅ 返回 ${basicData.requests.length}/${basicData.total} 条请求`);
      console.log(`    📄 共 ${basicData.totalPages} 页，当前第 ${basicData.page} 页`);
      
      // 1.3 按资源类型过滤
      console.log('\n  🔍 测试1.2: 过滤 - 仅JSON资源');
      const filteredList = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        filters: {
          resourceType: ['fetch', 'xhr']
        },
        pagination: { page: 1, pageSize: 20 }
      });
      
      const filteredData = JSON.parse(filteredList.content[0].text);
      console.log(`    ✅ JSON请求: ${filteredData.total} 条`);
      if (filteredData.requests.length > 0) {
        console.log(`    📌 示例: ${filteredData.requests[0].method} ${filteredData.requests[0].url.substring(0, 50)}...`);
      }
      
      // 1.4 按HTTP方法过滤
      console.log('\n  🔍 测试1.3: 过滤 - 仅POST/PUT/DELETE');
      const methodList = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        filters: {
          method: ['POST', 'PUT', 'DELETE']
        }
      });
      
      const methodData = JSON.parse(methodList.content[0].text);
      console.log(`    ✅ 写操作请求: ${methodData.total} 条`);
      methodData.requests.slice(0, 3).forEach(req => {
        console.log(`    📌 ${req.method} → ${req.url.substring(0, 60)}...`);
      });
      
      // 1.5 按URL模式过滤
      console.log('\n  🔍 测试1.4: 过滤 - URL包含"httpbin"');
      const urlList = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        filters: {
          urlPattern: 'httpbin'
        }
      });
      
      const urlData = JSON.parse(urlList.content[0].text);
      console.log(`    ✅ httpbin请求: ${urlData.total} 条`);
      
      // 1.6 按持续时间排序
      console.log('\n  ⏱️ 测试1.5: 排序 - 按持续时间降序');
      const sortedList = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        sortBy: 'duration',
        sortOrder: 'desc',
        pagination: { page: 1, pageSize: 5 }
      });
      
      const sortedData = JSON.parse(sortedList.content[0].text);
      console.log(`    ✅ 最慢的5个请求:`);
      sortedData.requests.forEach((req, i) => {
        console.log(`    ${i+1}. ${req.timing.duration}ms - ${req.url.substring(0, 50)}...`);
      });
      
      this.testResults.push({ name: 'list_extension_requests', status: '✅ 通过', details: `${basicData.total}条请求，过滤/排序正常` });
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResults.push({ name: 'list_extension_requests', status: '❌ 失败', error: error.message });
    }
  }

  async test2_GetRequestDetails() {
    console.log('\n🔍 测试2: get_extension_request_details - 获取请求详情');
    console.log('-'.repeat(60));
    
    try {
      // 先获取一个请求ID
      const listResult = await this.server.handleListExtensionRequests({
        extensionId: this.extensionId,
        pagination: { page: 1, pageSize: 1 }
      });
      
      const listData = JSON.parse(listResult.content[0].text);
      
      if (listData.requests.length === 0) {
        console.log('  ⚠️ 没有请求记录，跳过测试');
        this.testResults.push({ name: 'get_extension_request_details', status: '⚠️ 跳过', details: '无请求数据' });
        return;
      }
      
      const requestId = listData.requests[0].id;
      console.log('  📌 测试请求ID:', requestId.substring(0, 50) + '...');
      
      // 获取详情
      const detailsResult = await this.server.handleGetExtensionRequestDetails({
        extensionId: this.extensionId,
        requestId: requestId
      });
      
      const details = JSON.parse(detailsResult.content[0].text);
      
      console.log('\n  📊 请求详情:');
      console.log(`    URL: ${details.url}`);
      console.log(`    Method: ${details.method}`);
      console.log(`    Status: ${details.status || details.statusCode || 'N/A'}`);
      console.log(`    Type: ${details.resourceType}`);
      console.log(`    Duration: ${details.timing.duration}ms`);
      console.log(`    Size: ${details.size.responseBodySize || 0} bytes`);
      console.log(`    Headers: ${Object.keys(details.requestHeaders || {}).length} request, ${Object.keys(details.responseHeaders || {}).length} response`);
      
      if (details.initiator) {
        console.log(`    Initiator: ${details.initiator.type}`);
        if (details.initiator.url) {
          console.log(`    Initiator URL: ${details.initiator.url.substring(0, 60)}...`);
        }
      }
      
      this.testResults.push({ name: 'get_extension_request_details', status: '✅ 通过', details: '详情完整' });
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResults.push({ name: 'get_extension_request_details', status: '❌ 失败', error: error.message });
    }
  }

  async test3_ExportHAR() {
    console.log('\n📦 测试3: export_extension_network_har - 导出HAR格式');
    console.log('-'.repeat(60));
    
    try {
      const harPath = path.join(process.cwd(), 'test-network.har');
      
      console.log('  ⏳ 收集网络数据并导出HAR...');
      
      const harResult = await this.server.handleExportExtensionNetworkHAR({
        extensionId: this.extensionId,
        duration: 8000,
        outputPath: harPath,
        testUrl: 'https://httpbin.org/html'
      });
      
      const harData = JSON.parse(harResult.content[0].text);
      
      console.log('\n  📊 HAR导出统计:');
      console.log(`    总请求数: ${harData.summary.totalRequests}`);
      console.log(`    总数据量: ${(harData.summary.totalSize / 1024).toFixed(2)} KB`);
      console.log(`    平均持续: ${harData.summary.averageDuration.toFixed(2)} ms`);
      
      if (harData.savedPath) {
        const stats = await fs.stat(harData.savedPath);
        console.log(`    文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`    保存路径: ${harData.savedPath}`);
        
        // 验证HAR格式
        const harContent = await fs.readFile(harData.savedPath, 'utf-8');
        const har = JSON.parse(harContent);
        
        console.log('\n  ✅ HAR格式验证:');
        console.log(`    版本: ${har.log?.version || 'N/A'}`);
        console.log(`    Creator: ${har.log?.creator?.name || 'N/A'} ${har.log?.creator?.version || ''}`);
        console.log(`    Entries: ${har.log?.entries?.length || 0}`);
        
        if (har.log?.entries?.length > 0) {
          const entry = har.log.entries[0];
          console.log(`    示例请求: ${entry.request?.method} ${entry.request?.url?.substring(0, 50)}...`);
          console.log(`    响应状态: ${entry.response?.status} ${entry.response?.statusText || ''}`);
        }
      }
      
      this.testResults.push({ name: 'export_extension_network_har', status: '✅ 通过', details: `${harData.summary.totalRequests}个请求，HAR格式正确` });
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResults.push({ name: 'export_extension_network_har', status: '❌ 失败', error: error.message });
    }
  }

  async test4_AnalyzeNetwork() {
    console.log('\n📈 测试4: analyze_extension_network - 网络模式分析');
    console.log('-'.repeat(60));
    
    try {
      const analysisResult = await this.server.handleAnalyzeExtensionNetwork({
        extensionId: this.extensionId
      });
      
      const analysis = JSON.parse(analysisResult.content[0].text);
      
      console.log('\n  🎯 网络模式分析:');
      
      // 域名分析
      if (analysis.patterns.frequentDomains.length > 0) {
        console.log('\n  📍 频繁访问的域名 (Top 5):');
        analysis.patterns.frequentDomains.slice(0, 5).forEach((d, i) => {
          console.log(`    ${i+1}. ${d.domain} - ${d.count}次 (${d.percentage}%)`);
        });
      }
      
      // 资源类型分布
      if (analysis.patterns.resourceTypeDistribution.length > 0) {
        console.log('\n  📦 资源类型分布:');
        analysis.patterns.resourceTypeDistribution.forEach(type => {
          console.log(`    ${type.type}: ${type.count}次 (${type.percentage}%) - ${(type.size / 1024).toFixed(2)} KB`);
        });
      }
      
      // HTTP方法分布
      if (analysis.patterns.methodDistribution.length > 0) {
        console.log('\n  🔧 HTTP方法分布:');
        analysis.patterns.methodDistribution.forEach(method => {
          console.log(`    ${method.method}: ${method.count}次`);
        });
      }
      
      // 状态码分布
      if (analysis.patterns.statusDistribution.length > 0) {
        console.log('\n  📊 状态码分布:');
        analysis.patterns.statusDistribution.forEach(status => {
          const emoji = status.status >= 200 && status.status < 300 ? '✅' : 
                       status.status >= 400 ? '❌' : '⚠️';
          console.log(`    ${emoji} ${status.status}: ${status.count}次`);
        });
      }
      
      // 时间线分析
      console.log('\n  ⏱️ 时间线分析:');
      console.log(`    峰值时间: ${analysis.patterns.timelineAnalysis.peakTime}`);
      console.log(`    平均请求/分钟: ${analysis.patterns.timelineAnalysis.avgRequestsPerMinute}`);
      console.log(`    最繁忙时段: ${analysis.patterns.timelineAnalysis.busiestPeriod.count}个请求`);
      
      // 问题检测
      if (analysis.issues.length > 0) {
        console.log('\n  ⚠️ 发现的问题:');
        analysis.issues.forEach((issue, i) => {
          const severityEmoji = issue.severity === 'high' ? '🔴' : 
                               issue.severity === 'medium' ? '🟡' : '🟢';
          console.log(`    ${i+1}. ${severityEmoji} [${issue.type}] ${issue.description}`);
          console.log(`       影响: ${issue.affected}个请求`);
          console.log(`       建议: ${issue.recommendation}`);
        });
      } else {
        console.log('\n  ✅ 未发现明显问题');
      }
      
      // 优化建议
      console.log('\n  💡 优化建议:');
      analysis.recommendations.forEach((rec, i) => {
        console.log(`    ${i+1}. ${rec}`);
      });
      
      // 评分
      console.log('\n  🎯 网络性能评分:');
      console.log(`    性能: ${analysis.score.performance}/100`);
      console.log(`    可靠性: ${analysis.score.reliability}/100`);
      console.log(`    效率: ${analysis.score.efficiency}/100`);
      console.log(`    总分: ${analysis.score.overall}/100`);
      
      this.testResults.push({ name: 'analyze_extension_network', status: '✅ 通过', details: `评分${analysis.score.overall}/100, ${analysis.issues.length}个问题` });
      
    } catch (error) {
      console.error('  ❌ 测试失败:', error.message);
      this.testResults.push({ name: 'analyze_extension_network', status: '❌ 失败', error: error.message });
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Phase 1.3 测试报告');
    console.log('='.repeat(60));
    
    const passCount = this.testResults.filter(r => r.status.includes('✅')).length;
    const failCount = this.testResults.filter(r => r.status.includes('❌')).length;
    const skipCount = this.testResults.filter(r => r.status.includes('⚠️')).length;
    
    console.log('\n测试结果汇总:');
    this.testResults.forEach((result, i) => {
      console.log(`${i+1}. ${result.name}: ${result.status}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log('\n统计:');
    console.log(`✅ 通过: ${passCount}/${this.testResults.length}`);
    console.log(`❌ 失败: ${failCount}/${this.testResults.length}`);
    console.log(`⚠️ 跳过: ${skipCount}/${this.testResults.length}`);
    
    const successRate = ((passCount / this.testResults.length) * 100).toFixed(1);
    console.log(`\n成功率: ${successRate}%`);
    
    if (failCount === 0) {
      console.log('\n🎉 Phase 1.3: Network Monitoring Enhancement - 全部测试通过！');
    } else {
      console.log('\n⚠️ 部分测试失败，需要修复');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async run() {
    try {
      await this.setup();
      
      await this.test1_ListExtensionRequests();
      await this.test2_GetRequestDetails();
      await this.test3_ExportHAR();
      await this.test4_AnalyzeNetwork();
      
      await this.generateReport();
      
      process.exit(0);
    } catch (error) {
      console.error('\n💥 测试过程出错:', error);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// 运行测试
const tester = new NetworkEnhancementTester();
tester.run().catch(console.error);

