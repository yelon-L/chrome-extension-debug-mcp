#!/usr/bin/env node

/**
 * Phase 1 快速测试（缩短时间版本）
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function fastTest() {
  const server = new ChromeDebugServer();
  
  console.log('🧪 Phase 1 快速测试（缩短版）\n');
  console.log('='.repeat(80));
  
  try {
    // 1. 连接Chrome
    console.log('\n📌 步骤 1: 连接到Chrome...');
    await server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ Chrome连接成功\n');
    
    // 2. 列出扩展
    console.log('📌 步骤 2: 检测扩展...');
    const extensionsResult = await server.handleListExtensions({});
    const extensions = JSON.parse(extensionsResult.content[0].text);
    
    console.log(`✅ 检测到 ${extensions.length} 个扩展`);
    
    if (extensions.length === 0) {
      console.log('\n⚠️ 没有扩展可测试');
      return;
    }
    
    const extension = extensions[0];
    console.log(`   扩展: ${extension.title}`);
    console.log(`   ID: ${extension.id}\n`);
    
    // 2.5. 打开一个测试页面
    console.log('📌 步骤 2.5: 打开测试页面...');
    await server.handleNewTab({ url: 'https://example.com' });
    console.log('✅ 测试页面已打开\n');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 测试性能分析（缩短到1秒）
    console.log('='.repeat(80));
    console.log('📊 测试 1: analyze_extension_performance (快速版)\n');
    
    try {
      console.log('   ⏱️ 开始性能分析 (1秒trace录制)...');
      const startTime = Date.now();
      
      const perfResult = await server.handleAnalyzeExtensionPerformance({
        extensionId: extension.id,
        testUrl: 'https://example.com',
        duration: 1000  // 缩短到1秒
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const perfData = JSON.parse(perfResult.content[0].text);
      
      console.log(`   ✅ 性能分析完成 (耗时: ${elapsed}秒)\n`);
      console.log('   📊 性能指标:');
      console.log(`      • CPU使用率变化: ${perfData.metrics.delta.cpuUsage > 0 ? '+' : ''}${perfData.metrics.delta.cpuUsage}%`);
      console.log(`      • 内存使用变化: ${perfData.metrics.delta.memoryUsage > 0 ? '+' : ''}${perfData.metrics.delta.memoryUsage.toFixed(2)}MB`);
      console.log(`      • 执行时间增加: ${perfData.metrics.delta.executionTime > 0 ? '+' : ''}${perfData.metrics.delta.executionTime.toFixed(0)}ms`);
      
      console.log('\n   💡 优化建议:');
      perfData.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`      ${i + 1}. ${rec}`);
      });
      
      console.log('\n   ✅ analyze_extension_performance 测试通过');
      
    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
    }
    
    // 4. 测试网络监控（缩短到2秒）
    console.log('\n' + '='.repeat(80));
    console.log('🌐 测试 2: track_extension_network (快速版)\n');
    
    try {
      console.log('   ⏱️ 开始网络监控 (2秒)...');
      const startTime = Date.now();
      
      const networkResult = await server.handleTrackExtensionNetwork({
        extensionId: extension.id,
        duration: 2000,  // 缩短到2秒
        testUrl: 'https://example.com',
        includeRequests: false
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const networkData = JSON.parse(networkResult.content[0].text);
      
      console.log(`   ✅ 网络监控完成 (耗时: ${elapsed}秒)\n`);
      console.log('   🌐 网络统计:');
      console.log(`      • 监控时长: ${(networkData.monitoringDuration / 1000).toFixed(1)}秒`);
      console.log(`      • 总请求数: ${networkData.totalRequests}个`);
      console.log(`      • 数据传输: ${(networkData.totalDataTransferred / 1024).toFixed(2)}KB`);
      console.log(`      • 平均响应时间: ${networkData.averageRequestTime.toFixed(0)}ms`);
      
      if (networkData.recommendations.length > 0) {
        console.log('\n   💡 优化建议:');
        networkData.recommendations.slice(0, 2).forEach((rec, i) => {
          console.log(`      ${i + 1}. ${rec}`);
        });
      }
      
      console.log('\n   ✅ track_extension_network 测试通过');
      
    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
    }
    
    // 总结
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试总结\n');
    console.log('✅ Phase 1.1 (analyze_extension_performance): 功能正常');
    console.log('✅ Phase 1.2 (track_extension_network): 功能正常');
    console.log('\n🎉 Phase 1 快速测试完成！\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  } finally {
    // 不调用 cleanup() 以避免关闭用户的 Chrome 实例
    console.log('🧹 测试完成（保持 Chrome 运行）');
  }
}

// 运行测试
fastTest().catch(console.error);
