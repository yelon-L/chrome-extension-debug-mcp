#!/usr/bin/env node

/**
 * Phase 1.3: 优化版 measure_extension_impact 测试
 * 专注于速度和稳定性
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testOptimized() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Phase 1.3: 优化版综合影响测试');
  console.log('='.repeat(60) + '\n');

  const server = new ChromeDebugServer();
  let startTime = Date.now();

  try {
    // 1. 快速连接
    console.log('📌 步骤1: 连接Chrome...');
    await server.handleAttachToChrome({ 
      host: 'localhost', 
      port: 9222 
    });
    console.log(`✅ 连接成功 (${Date.now() - startTime}ms)\n`);

    // 2. 获取扩展
    console.log('📌 步骤2: 获取扩展信息...');
    let stepTime = Date.now();
    const extResult = await server.handleListExtensions({});
    const extensions = JSON.parse(extResult.content[0].text);
    
    if (!extensions || extensions.length === 0) {
      throw new Error('未找到扩展！请确保Chrome已加载扩展');
    }

    const extensionId = extensions[0].id;
    console.log(`✅ 找到扩展: ${extensionId} (${Date.now() - stepTime}ms)\n`);

    // 3. 测试单个工具性能
    console.log('📌 步骤3: 单独测试性能分析...');
    stepTime = Date.now();
    
    const perfResult = await server.handleAnalyzeExtensionPerformance({
      extensionId,
      testUrl: 'https://example.com',
      duration: 1000,  // 快速测试
      waitForIdle: false
    });

    const perfData = JSON.parse(perfResult.content[0].text);
    console.log(`✅ 性能分析完成 (${Date.now() - stepTime}ms)`);
    console.log(`   CPU增加: ${perfData.metrics.delta.cpuUsage.toFixed(1)}%`);
    console.log(`   内存增加: ${perfData.metrics.delta.memoryUsage.toFixed(1)}MB\n`);

    // 4. 测试网络监控
    console.log('📌 步骤4: 单独测试网络监控...');
    stepTime = Date.now();
    
    const netResult = await server.handleTrackExtensionNetwork({
      extensionId,
      duration: 1500,  // 快速测试
      testUrl: 'https://httpbin.org/json',
      includeRequests: false
    });

    const netData = JSON.parse(netResult.content[0].text);
    console.log(`✅ 网络监控完成 (${Date.now() - stepTime}ms)`);
    console.log(`   请求数: ${netData.totalRequests}`);
    console.log(`   数据量: ${(netData.totalDataTransferred / 1024).toFixed(1)}KB\n`);

    // 5. 测试综合影响（快速版本）
    console.log('📌 步骤5: 综合影响测量（优化版本）...');
    stepTime = Date.now();
    
    const impactResult = await server.handleMeasureExtensionImpact({
      extensionId,
      testPages: ['https://example.com'],  // 只测试1个页面
      iterations: 1,                       // 只做1次迭代
      performanceDuration: 1000,           // 快速trace
      networkDuration: 1500,               // 快速网络监控
      includeNetworkDetails: false
    });

    const report = JSON.parse(impactResult.content[0].text);
    console.log(`✅ 综合影响测量完成 (${Date.now() - stepTime}ms)\n`);

    // 6. 显示结果摘要
    console.log('=' .repeat(60));
    console.log('📊 综合测试结果');
    console.log('='.repeat(60) + '\n');

    console.log('🎯 整体评估:');
    console.log(`   影响级别: ${report.overall.overallImpactLevel}`);
    console.log(`   综合评分: ${report.overall.overallImpactScore}/100\n`);

    console.log('⚡ 性能影响:');
    console.log(`   CPU增加: ${report.overall.avgCpuIncrease.toFixed(1)}%`);
    console.log(`   内存增加: ${report.overall.avgMemoryIncrease.toFixed(1)}MB`);
    console.log(`   LCP增加: ${report.overall.avgLcpIncrease.toFixed(0)}ms\n`);

    console.log('🌐 网络影响:');
    console.log(`   请求数: ${report.overall.avgRequestsPerPage.toFixed(0)}个`);
    console.log(`   数据量: ${(report.overall.avgDataPerPage / 1024).toFixed(1)}KB\n`);

    if (report.keyFindings && report.keyFindings.length > 0) {
      console.log('🔍 关键发现:');
      report.keyFindings.slice(0, 3).forEach(finding => {
        console.log(`   • ${finding}`);
      });
      console.log();
    }

    // 7. 性能统计
    const totalTime = Date.now() - startTime;
    console.log('=' .repeat(60));
    console.log('⏱️  性能统计');
    console.log('='.repeat(60) + '\n');
    console.log(`总测试时间: ${totalTime}ms (${(totalTime/1000).toFixed(1)}秒)`);
    console.log(`测试配置: 1页面 × 1迭代`);
    console.log(`平均每测试: ${totalTime}ms\n`);

    // 8. 成功总结
    console.log('🎉 Phase 1.3 优化测试完成！\n');
    console.log('✅ 验证的功能:');
    console.log('   1. ✅ analyze_extension_performance (性能分析)');
    console.log('   2. ✅ track_extension_network (网络监控)');
    console.log('   3. ✅ measure_extension_impact (综合影响)');
    console.log('\n🚀 所有Phase 1功能正常工作！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n📝 错误详情:', error.stack);
    
    const totalTime = Date.now() - startTime;
    console.error(`\n⏱️ 失败时间: ${totalTime}ms`);
  } finally {
    // 🔥 关键修复: 清理资源，确保进程能正常退出
    console.log('\n🧹 清理资源...');
    try {
      await server.cleanup();
      console.log('✅ 资源清理完成');
    } catch (cleanupError) {
      console.error('⚠️ 清理过程中发生错误:', cleanupError.message);
    }
    
    // 强制退出进程
    setTimeout(() => {
      console.log('🏁 强制退出进程');
      process.exit(0);
    }, 1000);
  }
}

// 添加超时保护
const TIMEOUT_MS = 45000; // 45秒超时
const timeoutId = setTimeout(() => {
  console.error('\n⏰ 测试超时 (45秒)');
  process.exit(1);
}, TIMEOUT_MS);

// 运行测试
testOptimized().finally(() => {
  clearTimeout(timeoutId);
});
