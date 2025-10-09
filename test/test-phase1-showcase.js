#!/usr/bin/env node

/**
 * Phase 1 功能展示测试
 * 专门展示3个新增性能分析功能的实际效果
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class Phase1ShowcaseTest {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = null;
  }

  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 Phase 1 性能分析功能展示测试');
    console.log('   展示Chrome Debug MCP独有的扩展性能分析能力');
    console.log('='.repeat(80) + '\n');

    try {
      await this.setup();
      await this.showcaseAnalyzePerformance();
      await this.showcaseTrackNetwork();
      await this.showcaseMeasureImpact();
      this.showSummary();
    } catch (error) {
      console.error('❌ 测试失败:', error);
    } finally {
      await this.cleanup();
    }
  }

  async setup() {
    console.log('📌 初始化测试环境...\n');
    
    // 连接Chrome
    await this.server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ 已连接到Chrome调试端口');

    // 获取扩展
    const extResult = await this.server.handleListExtensions({});
    const extensions = JSON.parse(extResult.content[0].text);
    
    if (!extensions || extensions.length === 0) {
      throw new Error('未找到扩展！请确保Chrome已加载测试扩展');
    }

    this.extensionId = extensions[0].id;
    console.log(`✅ 目标扩展: ${this.extensionId}`);
    console.log(`✅ 扩展标题: ${extensions[0].title || 'Unknown'}\n`);
  }

  async showcaseAnalyzePerformance() {
    console.log('=' .repeat(60));
    console.log('🚀 功能展示 1: analyze_extension_performance');
    console.log('   Chrome Tracing API集成 + 性能影响量化');
    console.log('='.repeat(60) + '\n');

    console.log('📊 执行扩展性能分析...');
    console.log('   目标页面: https://example.com');
    console.log('   分析方法: Chrome Tracing API录制 + 对比分析\n');

    const result = await this.server.handleAnalyzeExtensionPerformance({
      extensionId: this.extensionId,
      testUrl: 'https://example.com',
      duration: 1500,
      waitForIdle: true
    });

    const data = JSON.parse(result.content[0].text);

    console.log('📈 性能影响分析结果:');
    console.log(`   🔸 CPU使用率变化: ${data.metrics.delta.cpuUsage > 0 ? '+' : ''}${data.metrics.delta.cpuUsage.toFixed(2)}%`);
    console.log(`   🔸 内存使用变化: ${data.metrics.delta.memoryUsage > 0 ? '+' : ''}${data.metrics.delta.memoryUsage.toFixed(2)}MB`);
    console.log(`   🔸 执行时间变化: ${data.metrics.delta.executionTime > 0 ? '+' : ''}${data.metrics.delta.executionTime.toFixed(2)}ms`);
    console.log(`   🔸 脚本执行时间: ${data.metrics.withExtension.scriptEvaluationTime.toFixed(2)}ms`);
    
    console.log('\n🎯 Core Web Vitals 影响:');
    console.log(`   🔸 LCP变化: ${data.impact.cwvImpact.lcp > 0 ? '+' : ''}${data.impact.cwvImpact.lcp.toFixed(0)}ms`);
    console.log(`   🔸 FID变化: ${data.impact.cwvImpact.fid > 0 ? '+' : ''}${data.impact.cwvImpact.fid.toFixed(0)}ms`);
    console.log(`   🔸 CLS变化: ${data.impact.cwvImpact.cls > 0 ? '+' : ''}${data.impact.cwvImpact.cls.toFixed(4)}`);
    
    console.log(`\n🏆 影响评级: ${data.impact.impactLevel}`);
    console.log(`📋 扩展名称: ${data.extensionName}`);
    
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      data.recommendations.slice(0, 3).forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
    }

    console.log('\n✅ analyze_extension_performance 展示完成\n');
  }

  async showcaseTrackNetwork() {
    console.log('=' .repeat(60));
    console.log('🌐 功能展示 2: track_extension_network');
    console.log('   扩展网络请求监控 + 数据传输分析');
    console.log('='.repeat(60) + '\n');

    console.log('📡 监控扩展网络活动...');
    console.log('   目标页面: https://httpbin.org/json');
    console.log('   监控时长: 2500ms');
    console.log('   监控范围: 所有扩展发起的网络请求\n');

    const result = await this.server.handleTrackExtensionNetwork({
      extensionId: this.extensionId,
      duration: 2500,
      testUrl: 'https://httpbin.org/json',
      includeRequests: false
    });

    const data = JSON.parse(result.content[0].text);

    console.log('📊 网络活动统计:');
    console.log(`   🔸 总请求数: ${data.totalRequests}个`);
    console.log(`   🔸 数据传输: ${(data.totalDataTransferred / 1024).toFixed(2)}KB`);
    console.log(`   🔸 平均响应时间: ${data.averageRequestTime.toFixed(0)}ms`);
    console.log(`   🔸 最快请求: ${data.statistics?.fastestRequest?.toFixed(0) || 'N/A'}ms`);
    console.log(`   🔸 最慢请求: ${data.statistics?.slowestRequest?.toFixed(0) || 'N/A'}ms`);
    console.log(`   🔸 失败请求: ${data.statistics.failedRequests}个`);

    if (data.resourceTypeBreakdown && Object.keys(data.resourceTypeBreakdown).length > 0) {
      console.log('\n📋 资源类型分布:');
      Object.entries(data.resourceTypeBreakdown).forEach(([type, count]) => {
        console.log(`   🔸 ${type}: ${count}个`);
      });
    }

    console.log(`\n⏱️  监控时长: ${data.monitoringDuration}ms`);
    console.log(`📅 测试时间: ${new Date(data.timestamp).toLocaleString()}`);

    console.log('\n✅ track_extension_network 展示完成\n');
  }

  async showcaseMeasureImpact() {
    console.log('=' .repeat(60));
    console.log('🎯 功能展示 3: measure_extension_impact');
    console.log('   综合影响量化 + 多页面批量分析 + 智能评分');
    console.log('='.repeat(60) + '\n');

    console.log('🔬 执行综合影响测量...');
    console.log('   测试页面: 2个典型网站');
    console.log('   测试迭代: 每页面1次（演示用）');
    console.log('   分析维度: 性能 + 网络 + Core Web Vitals\n');

    const result = await this.server.handleMeasureExtensionImpact({
      extensionId: this.extensionId,
      testPages: [
        { url: 'https://example.com', name: '示例网站' },
        { url: 'https://httpbin.org/html', name: 'API测试页' }
      ],
      iterations: 1,
      performanceDuration: 1000,
      networkDuration: 1500
    });

    const report = JSON.parse(result.content[0].text);

    console.log('📊 综合影响评估报告:');
    console.log(`   🏆 整体影响级别: ${report.overall.overallImpactLevel}`);
    console.log(`   📈 综合评分: ${report.overall.overallImpactScore.toFixed(1)}/100`);
    console.log(`   📄 测试页面数: ${report.configuration.totalPages}`);
    console.log(`   🔄 总测试次数: ${report.configuration.totalTests}\n`);

    console.log('⚡ 平均性能影响:');
    console.log(`   🔸 CPU增加: ${report.overall.avgCpuIncrease > 0 ? '+' : ''}${report.overall.avgCpuIncrease.toFixed(1)}%`);
    console.log(`   🔸 内存增加: ${report.overall.avgMemoryIncrease > 0 ? '+' : ''}${report.overall.avgMemoryIncrease.toFixed(1)}MB`);
    console.log(`   🔸 LCP增加: ${report.overall.avgLcpIncrease > 0 ? '+' : ''}${report.overall.avgLcpIncrease.toFixed(0)}ms`);
    console.log(`   🔸 CLS增加: ${report.overall.avgClsIncrease > 0 ? '+' : ''}${report.overall.avgClsIncrease.toFixed(4)}\n`);

    console.log('🌐 平均网络影响:');
    console.log(`   🔸 每页请求数: ${report.overall.avgRequestsPerPage.toFixed(0)}个`);
    console.log(`   🔸 每页数据量: ${(report.overall.avgDataPerPage / 1024).toFixed(1)}KB`);
    console.log(`   🔸 平均响应时间: ${report.overall.avgRequestTimePerPage.toFixed(0)}ms\n`);

    console.log('📋 各页面详细结果:');
    report.pageResults.forEach((page, idx) => {
      console.log(`   ${idx + 1}. ${page.pageName}:`);
      console.log(`      影响级别: ${page.impactLevel} (${page.impactScore}/100)`);
      console.log(`      CPU: +${page.avgPerformance.cpuIncrease.toFixed(1)}%, 内存: +${page.avgPerformance.memoryIncrease.toFixed(1)}MB`);
      console.log(`      网络: ${page.avgNetwork.totalRequests}请求, ${(page.avgNetwork.totalDataTransferred/1024).toFixed(1)}KB`);
    });

    if (report.keyFindings && report.keyFindings.length > 0) {
      console.log('\n🔍 关键发现:');
      report.keyFindings.forEach(finding => {
        console.log(`   • ${finding}`);
      });
    }

    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      report.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log('\n✅ measure_extension_impact 展示完成\n');
  }

  showSummary() {
    console.log('=' .repeat(80));
    console.log('🏆 Phase 1 功能展示总结');
    console.log('='.repeat(80) + '\n');

    console.log('✅ 成功展示的功能特性:');
    console.log('   1. 🚀 analyze_extension_performance');
    console.log('      • Chrome Tracing API集成');
    console.log('      • CPU/内存/执行时间精确分析');
    console.log('      • Core Web Vitals影响量化');
    console.log('      • 自动优化建议生成\n');

    console.log('   2. 🌐 track_extension_network');
    console.log('      • 实时网络请求监控');
    console.log('      • 数据传输统计分析');
    console.log('      • 请求性能分布统计');
    console.log('      • 资源类型分类统计\n');

    console.log('   3. 🎯 measure_extension_impact');
    console.log('      • 多页面批量测试');
    console.log('      • 性能+网络综合评分');
    console.log('      • 智能影响级别评定');
    console.log('      • 详细分析报告生成\n');

    console.log('🎯 独特竞争优势验证:');
    console.log('   ✅ 扩展专业性能分析 (vs 通用浏览器自动化)');
    console.log('   ✅ 多维度综合影响评估 (vs 单一指标)');
    console.log('   ✅ 实用的优化建议生成 (vs 仅数据展示)');
    console.log('   ✅ 批量测试与评分系统 (vs 单次测试)\n');

    console.log('📈 技术价值体现:');
    console.log('   • 填补Chrome DevTools MCP在扩展性能分析的空白');
    console.log('   • 提供企业级扩展性能监控解决方案');
    console.log('   • 为扩展开发者提供科学的性能优化指导');
    console.log('   • 支持扩展性能的标准化评估流程\n');

    console.log('🚀 Phase 1开发完成，Chrome Debug MCP现已具备专业级扩展性能分析能力！');
  }

  async cleanup() {
    console.log('\n🧹 清理资源...');
    try {
      // 注意：不关闭Chrome，保持调试端口可用
      if (this.server.getCdpClient && this.server.getCdpClient()) {
        await this.server.getCdpClient().close();
      }
      console.log('✅ 已断开Chrome连接（保持浏览器运行）');
    } catch (error) {
      console.log('⚠️ 清理警告:', error.message);
    }

    setTimeout(() => {
      console.log('🏁 测试完成，进程退出');
      process.exit(0);
    }, 1000);
  }
}

// 执行展示测试
const showcase = new Phase1ShowcaseTest();
showcase.run().catch(console.error);
