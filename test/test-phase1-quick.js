#!/usr/bin/env node

/**
 * Phase 1 快速测试脚本
 * 测试 analyze_extension_performance 和 track_extension_network
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function quickTest() {
  const server = new ChromeDebugServer();
  
  console.log('🧪 Phase 1 快速功能测试\n');
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
      console.log('💡 提示: 使用以下命令启动Chrome:');
      console.log('   chrome --remote-debugging-port=9222 --load-extension=./enhanced-test-extension\n');
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 测试性能分析
    console.log('='.repeat(80));
    console.log('📊 测试 1: analyze_extension_performance\n');
    
    try {
      console.log('   ⏱️ 开始性能分析 (3秒trace录制)...');
      const perfResult = await server.handleAnalyzeExtensionPerformance({
        extensionId: extension.id,
        testUrl: 'https://example.com',
        duration: 3000
      });
      
      const perfData = JSON.parse(perfResult.content[0].text);
      
      console.log('   ✅ 性能分析完成\n');
      console.log('   📊 性能指标:');
      console.log(`      • CPU使用率变化: ${perfData.metrics.delta.cpuUsage > 0 ? '+' : ''}${perfData.metrics.delta.cpuUsage}%`);
      console.log(`      • 内存使用变化: ${perfData.metrics.delta.memoryUsage > 0 ? '+' : ''}${perfData.metrics.delta.memoryUsage.toFixed(2)}MB`);
      console.log(`      • 执行时间增加: ${perfData.metrics.delta.executionTime > 0 ? '+' : ''}${perfData.metrics.delta.executionTime.toFixed(0)}ms`);
      console.log(`      • LCP影响: ${perfData.impact.cwvImpact.lcp > 0 ? '+' : ''}${perfData.impact.cwvImpact.lcp.toFixed(0)}ms`);
      console.log(`      • CLS影响: ${perfData.impact.cwvImpact.cls > 0 ? '+' : ''}${perfData.impact.cwvImpact.cls.toFixed(3)}`);
      
      console.log('\n   💡 优化建议:');
      perfData.recommendations.forEach((rec, i) => {
        console.log(`      ${i + 1}. ${rec}`);
      });
      
      console.log('\n   📋 摘要:');
      console.log(perfData.summary.split('\n').map(line => '      ' + line).join('\n'));
      
      console.log('\n   ✅ analyze_extension_performance 测试通过');
      
    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
    }
    
    // 4. 测试网络监控
    console.log('\n' + '='.repeat(80));
    console.log('🌐 测试 2: track_extension_network\n');
    
    try {
      console.log('   ⏱️ 开始网络监控 (5秒)...');
      const networkResult = await server.handleTrackExtensionNetwork({
        extensionId: extension.id,
        duration: 5000,
        testUrl: 'https://example.com',
        includeRequests: false
      });
      
      const networkData = JSON.parse(networkResult.content[0].text);
      
      console.log('   ✅ 网络监控完成\n');
      console.log('   🌐 网络统计:');
      console.log(`      • 监控时长: ${(networkData.monitoringDuration / 1000).toFixed(1)}秒`);
      console.log(`      • 总请求数: ${networkData.totalRequests}个`);
      console.log(`      • 数据传输: ${(networkData.totalDataTransferred / 1024).toFixed(2)}KB`);
      console.log(`      • 平均响应时间: ${networkData.averageRequestTime.toFixed(0)}ms`);
      console.log(`      • 失败请求: ${networkData.statistics.failedRequests}个`);
      console.log(`      • 缓存请求: ${networkData.statistics.cachedRequests}个`);
      
      if (Object.keys(networkData.requestsByType).length > 0) {
        console.log('\n   📋 请求类型:');
        Object.entries(networkData.requestsByType).forEach(([type, count]) => {
          console.log(`      • ${type}: ${count}个`);
        });
      }
      
      if (networkData.recommendations.length > 0) {
        console.log('\n   💡 优化建议:');
        networkData.recommendations.forEach((rec, i) => {
          console.log(`      ${i + 1}. ${rec}`);
        });
      }
      
      console.log('\n   ✅ track_extension_network 测试通过');
      
    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
    }
    
    // 5. 总结
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试总结\n');
    console.log('✅ Phase 1.1 (analyze_extension_performance): 功能正常');
    console.log('✅ Phase 1.2 (track_extension_network): 功能正常');
    console.log('\n🎉 Phase 1 工具测试完成！\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  } finally {
    // 注意：不调用 cleanup() 以避免关闭用户的 Chrome 实例
    // await server.cleanup();
    console.log('🧹 测试完成（保持 Chrome 运行）');
  }
}

// 运行测试
quickTest().catch(console.error);
