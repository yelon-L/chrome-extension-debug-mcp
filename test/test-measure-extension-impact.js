#!/usr/bin/env node

/**
 * Phase 1.3: 测试 measure_extension_impact 工具
 * 综合影响量化测试
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testMeasureExtensionImpact() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Phase 1.3: measure_extension_impact 工具测试');
  console.log('='.repeat(80) + '\n');

  const server = new ChromeDebugServer();

  try {
    // 1. 连接到Chrome
    console.log('📌 步骤1: 连接到Chrome...\n');
    await server.handleAttachToChrome({
      host: 'localhost',
      port: 9222
    });
    console.log('✅ Chrome连接成功\n');

    // 2. 获取扩展ID
    console.log('📌 步骤2: 获取扩展列表...\n');
    const extensionsResult = await server.handleListExtensions({});
    const extensions = JSON.parse(extensionsResult.content[0].text);
    
    if (!extensions || extensions.length === 0) {
      throw new Error('未找到扩展！请确保Chrome已加载扩展');
    }

    const extensionId = extensions[0].id;
    console.log(`✅ 找到扩展: ${extensionId}\n`);

    // 3. 测试综合影响测量
    console.log('📌 步骤3: 测量扩展综合影响...\n');
    console.log('测试配置:');
    console.log('  • 测试页面: 3个');
    console.log('  • 每页迭代: 2次');
    console.log('  • 性能trace: 2000ms');
    console.log('  • 网络监控: 3000ms\n');

    const impactResult = await server.handleMeasureExtensionImpact({
      extensionId: extensionId,
      testPages: [
        'https://example.com',
        'https://httpbin.org/html',
        'https://www.google.com'
      ],
      iterations: 2,
      performanceDuration: 2000,
      networkDuration: 3000,
      includeNetworkDetails: false
    });

    const report = JSON.parse(impactResult.content[0].text);

    // 4. 显示测试结果
    console.log('=' .repeat(80));
    console.log('📊 综合影响测量报告');
    console.log('='.repeat(80) + '\n');

    console.log('🎯 整体影响:');
    console.log(`   级别: ${report.overall.overallImpactLevel}`);
    console.log(`   评分: ${report.overall.overallImpactScore}/100\n`);

    console.log('⚡ 性能影响 (平均):');
    console.log(`   CPU增加: ${report.overall.avgCpuIncrease.toFixed(1)}%`);
    console.log(`   内存增加: ${report.overall.avgMemoryIncrease.toFixed(1)}MB`);
    console.log(`   LCP增加: ${report.overall.avgLcpIncrease.toFixed(0)}ms`);
    console.log(`   CLS增加: ${report.overall.avgClsIncrease.toFixed(3)}\n`);

    console.log('🌐 网络影响 (平均):');
    console.log(`   每页请求数: ${report.overall.avgRequestsPerPage.toFixed(0)}个`);
    console.log(`   每页数据: ${(report.overall.avgDataPerPage / 1024).toFixed(1)}KB`);
    console.log(`   请求时间: ${report.overall.avgRequestTimePerPage.toFixed(0)}ms\n`);

    console.log('📋 各页面结果:');
    report.pageResults.forEach((page, idx) => {
      console.log(`\n   ${idx + 1}. ${page.pageName}`);
      console.log(`      影响级别: ${page.impactLevel} (${page.impactScore}/100)`);
      console.log(`      CPU: +${page.avgPerformance.cpuIncrease.toFixed(1)}%`);
      console.log(`      内存: +${page.avgPerformance.memoryIncrease.toFixed(1)}MB`);
      console.log(`      网络请求: ${page.avgNetwork.totalRequests}个`);
    });

    console.log('\n\n🔍 关键发现:');
    report.keyFindings.forEach(finding => {
      console.log(`   ${finding}`);
    });

    console.log('\n\n💡 优化建议:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ measure_extension_impact 工具测试完成！');
    console.log('='.repeat(80) + '\n');

    console.log('📊 测试统计:');
    console.log(`   总测试次数: ${report.configuration.totalTests}`);
    console.log(`   测试页面数: ${report.configuration.totalPages}`);
    console.log(`   每页迭代: ${report.configuration.iterationsPerPage}\n`);

    console.log('🎉 Phase 1.3 功能验证通过！\n');
    console.log('📌 Phase 1 完成状态:');
    console.log('   ✅ Phase 1.1: analyze_extension_performance');
    console.log('   ✅ Phase 1.2: track_extension_network');
    console.log('   ✅ Phase 1.3: measure_extension_impact');
    console.log('\n🏆 Phase 1 全部功能已完成！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testMeasureExtensionImpact();
