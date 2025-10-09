#!/usr/bin/env node

/**
 * Phase 1 性能分析功能测试
 * 测试新的 analyze_extension_performance 工具
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testPerformanceAnalyzer() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Phase 1: 扩展性能分析功能测试');
  console.log('='.repeat(70) + '\n');

  const server = new ChromeDebugServer();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 1. 连接到Chrome
    console.log('📌 步骤1: 连接到Chrome (localhost:9222)...');
    const attachResult = await server.handleAttachToChrome({
      host: 'localhost',
      port: 9222
    });
    console.log('✅ 成功连接到Chrome');
    console.log(`   → ${JSON.stringify(attachResult.content[0].text)}\n`);

    // 2. 列出扩展
    console.log('📌 步骤2: 列出已安装的扩展...');
    const extensionsResult = await server.handleListExtensions({});
    const extensions = JSON.parse(extensionsResult.content[0].text);
    console.log(`✅ 发现 ${extensions.extensions?.length || 0} 个扩展`);
    
    if (extensions.extensions && extensions.extensions.length > 0) {
      console.log(`   → 使用扩展: ${extensions.extensions[0].id}\n`);
      
      const extensionId = extensions.extensions[0].id;
      
      // 3. 测试性能分析
      console.log('📌 步骤3: 开始性能分析...');
      console.log('   测试URL: https://example.com');
      console.log('   分析时长: 3秒');
      console.log('   正在录制Chrome Tracing数据...\n');
      
      const startTime = Date.now();
      
      const perfResult = await server.handleAnalyzeExtensionPerformance({
        extensionId: extensionId,
        testUrl: 'https://example.com',
        duration: 3000,
        iterations: 1
      });
      
      const duration = Date.now() - startTime;
      const perfAnalysis = JSON.parse(perfResult.content[0].text);
      
      console.log('✅ 性能分析完成！');
      console.log(`   → 耗时: ${duration}ms\n`);
      
      // 4. 显示分析结果
      console.log('=' .repeat(70));
      console.log('📊 性能分析报告');
      console.log('='.repeat(70));
      
      console.log('\n🎯 扩展信息:');
      console.log(`   • 扩展ID: ${perfAnalysis.extensionId}`);
      console.log(`   • 测试URL: ${perfAnalysis.testUrl}`);
      console.log(`   • 测试时间: ${new Date(perfAnalysis.timestamp).toLocaleString()}`);
      
      console.log('\n📈 性能指标对比:');
      console.log('┌─────────────────────────┬───────────────┬───────────────┬───────────────┐');
      console.log('│ 指标                    │ 基准值        │ 扩展值        │ 差异          │');
      console.log('├─────────────────────────┼───────────────┼───────────────┼───────────────┤');
      console.log(`│ CPU使用率 (%)           │ ${perfAnalysis.metrics.baseline.cpuUsage.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.cpuUsage.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.cpuUsage > 0 ? '+' : '') + perfAnalysis.metrics.delta.cpuUsage.toFixed(2).padStart(12)} │`);
      console.log(`│ 内存使用 (MB)           │ ${perfAnalysis.metrics.baseline.memoryUsage.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.memoryUsage.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.memoryUsage > 0 ? '+' : '') + perfAnalysis.metrics.delta.memoryUsage.toFixed(2).padStart(12)} │`);
      console.log(`│ 执行时间 (ms)           │ ${perfAnalysis.metrics.baseline.executionTime.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.executionTime.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.executionTime > 0 ? '+' : '') + perfAnalysis.metrics.delta.executionTime.toFixed(2).padStart(12)} │`);
      console.log(`│ 脚本评估时间 (ms)       │ ${perfAnalysis.metrics.baseline.scriptEvaluationTime.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.scriptEvaluationTime.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.scriptEvaluationTime > 0 ? '+' : '') + perfAnalysis.metrics.delta.scriptEvaluationTime.toFixed(2).padStart(12)} │`);
      console.log(`│ 布局时间 (ms)           │ ${perfAnalysis.metrics.baseline.layoutTime.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.layoutTime.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.layoutTime > 0 ? '+' : '') + perfAnalysis.metrics.delta.layoutTime.toFixed(2).padStart(12)} │`);
      console.log(`│ 绘制时间 (ms)           │ ${perfAnalysis.metrics.baseline.paintTime.toFixed(2).padStart(13)} │ ${perfAnalysis.metrics.withExtension.paintTime.toFixed(2).padStart(13)} │ ${(perfAnalysis.metrics.delta.paintTime > 0 ? '+' : '') + perfAnalysis.metrics.delta.paintTime.toFixed(2).padStart(12)} │`);
      console.log('└─────────────────────────┴───────────────┴───────────────┴───────────────┘');
      
      console.log('\n🌐 Core Web Vitals 影响:');
      console.log(`   • LCP影响: ${perfAnalysis.impact.cwvImpact.lcp > 0 ? '+' : ''}${perfAnalysis.impact.cwvImpact.lcp.toFixed(0)}ms`);
      console.log(`   • FID影响: ${perfAnalysis.impact.cwvImpact.fid > 0 ? '+' : ''}${perfAnalysis.impact.cwvImpact.fid.toFixed(0)}ms`);
      console.log(`   • CLS影响: ${perfAnalysis.impact.cwvImpact.cls > 0 ? '+' : ''}${perfAnalysis.impact.cwvImpact.cls.toFixed(4)}`);
      console.log(`   • 页面加载延迟: ${perfAnalysis.impact.pageLoadDelay > 0 ? '+' : ''}${perfAnalysis.impact.pageLoadDelay.toFixed(0)}ms`);
      
      console.log('\n💡 优化建议:');
      perfAnalysis.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
      
      console.log('\n📝 性能摘要:');
      console.log(perfAnalysis.summary.split('\n').map(line => '   ' + line).join('\n'));
      
      testsPassed++;
      
    } else {
      console.log('⚠️ 没有检测到扩展，跳过性能分析测试\n');
      console.log('提示: 请先加载一个测试扩展:');
      console.log('   chrome --remote-debugging-port=9222 --load-extension=./enhanced-test-extension\n');
      testsFailed++;
    }

    // 5. 测试总结
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试总结');
    console.log('='.repeat(70));
    console.log(`✅ 通过: ${testsPassed}`);
    console.log(`❌ 失败: ${testsFailed}`);
    console.log(`📈 成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 Phase 1 性能分析功能测试完成！');
    
    if (testsPassed > 0) {
      console.log('\n✨ 新功能亮点:');
      console.log('   • ✅ Chrome Tracing API集成');
      console.log('   • ✅ CPU/内存/执行时间分析');
      console.log('   • ✅ Core Web Vitals影响计算');
      console.log('   • ✅ 智能优化建议生成');
      console.log('   • ✅ 详细的性能报告输出');
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    testsFailed++;
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// 运行测试
testPerformanceAnalyzer().catch(error => {
  console.error('❌ 测试套件执行失败:', error);
  process.exit(1);
});
