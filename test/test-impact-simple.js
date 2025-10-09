#!/usr/bin/env node

/**
 * Phase 1.3: 简化版 measure_extension_impact 测试
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testSimple() {
  console.log('\n🚀 Phase 1.3: 简化测试\n');

  const server = new ChromeDebugServer();

  try {
    // 1. 连接
    console.log('📌 连接Chrome...');
    await server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ 连接成功\n');

    // 2. 获取扩展
    const result = await server.handleListExtensions({});
    const extensions = JSON.parse(result.content[0].text);
    const extensionId = extensions[0].id;
    console.log(`✅ 扩展: ${extensionId}\n`);

    // 3. 测量影响（1个页面，1次迭代）
    console.log('📌 开始测量（1页面，1迭代）...\n');
    const impactResult = await server.handleMeasureExtensionImpact({
      extensionId,
      testPages: ['https://example.com'],
      iterations: 1,
      performanceDuration: 1500,
      networkDuration: 2000
    });

    const report = JSON.parse(impactResult.content[0].text);

    // 4. 显示结果
    console.log('\n📊 结果:');
    console.log(`级别: ${report.overall.overallImpactLevel}`);
    console.log(`评分: ${report.overall.overallImpactScore}/100`);
    console.log(`CPU: +${report.overall.avgCpuIncrease.toFixed(1)}%`);
    console.log(`内存: +${report.overall.avgMemoryIncrease.toFixed(1)}MB\n`);

    console.log('✅ Phase 1.3 功能正常！\n');

  } catch (error) {
    console.error('\n❌ 失败:', error.message);
    process.exit(1);
  }
}

testSimple();
