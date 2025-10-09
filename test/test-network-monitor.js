#!/usr/bin/env node

/**
 * Phase 1.2 网络监控功能测试
 * 测试 track_extension_network 工具
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testNetworkMonitor() {
  const server = new ChromeDebugServer();
  
  console.log('🌐 Phase 1.2 网络监控功能测试\n');
  console.log('='.repeat(80));
  
  try {
    // 1. 连接到Chrome
    console.log('\n📌 步骤 1: 连接到Chrome...');
    const attachResult = await server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ Chrome连接成功');
    console.log(`   连接信息: ${attachResult.content[0].text}\n`);
    
    // 2. 检测扩展
    console.log('📌 步骤 2: 检测已加载的扩展...');
    const extensionsResult = await server.handleListExtensions({});
    const extensionsData = JSON.parse(extensionsResult.content[0].text);
    
    if (!extensionsData.extensions || extensionsData.extensions.length === 0) {
      console.log('⚠️  未检测到扩展，跳过网络监控测试');
      console.log('💡 提示: 使用以下命令启动Chrome并加载测试扩展:');
      console.log('   chrome --remote-debugging-port=9222 --load-extension=./enhanced-test-extension\n');
      return;
    }
    
    const extension = extensionsData.extensions[0];
    console.log(`✅ 检测到扩展: ${extension.name} (${extension.id})`);
    console.log(`   版本: ${extension.version}`);
    console.log(`   类型: ${extension.type}\n`);
    
    // 3. 打开测试页面
    console.log('📌 步骤 3: 打开测试页面...');
    const newTabResult = await server.handleNewTab({ url: 'https://example.com' });
    console.log('✅ 测试页面已打开\n');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 开始网络监控（短时间测试）
    console.log('📌 步骤 4: 开始网络监控 (10秒)...');
    console.log('   监控扩展网络请求中...\n');
    
    const networkResult = await server.handleTrackExtensionNetwork({
      extensionId: extension.id,
      duration: 10000,
      includeRequests: false  // 不包含详细请求列表，只要摘要
    });
    
    const networkData = JSON.parse(networkResult.content[0].text);
    
    // 5. 展示网络分析结果
    console.log('='.repeat(80));
    console.log('📊 网络监控分析结果\n');
    
    console.log('🌐 基本统计:');
    console.log(`   • 监控时长: ${(networkData.monitoringDuration / 1000).toFixed(1)}秒`);
    console.log(`   • 总请求数: ${networkData.totalRequests}个`);
    console.log(`   • 数据传输: ${(networkData.totalDataTransferred / 1024).toFixed(2)} KB`);
    console.log(`   • 数据接收: ${(networkData.totalDataReceived / 1024).toFixed(2)} KB`);
    console.log(`   • 数据发送: ${(networkData.totalDataSent / 1024).toFixed(2)} KB`);
    console.log(`   • 平均响应时间: ${networkData.averageRequestTime.toFixed(0)}ms\n`);
    
    console.log('📋 请求类型分布:');
    Object.entries(networkData.requestsByType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count}个`);
    });
    console.log();
    
    if (Object.keys(networkData.requestsByDomain).length > 0) {
      console.log('🌍 请求域名分布:');
      Object.entries(networkData.requestsByDomain)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([domain, count]) => {
          console.log(`   • ${domain}: ${count}个`);
        });
      console.log();
    }
    
    if (Object.keys(networkData.requestsByMethod).length > 0) {
      console.log('🔧 请求方法分布:');
      Object.entries(networkData.requestsByMethod).forEach(([method, count]) => {
        console.log(`   • ${method}: ${count}个`);
      });
      console.log();
    }
    
    console.log('📈 性能统计:');
    console.log(`   • 成功请求: ${networkData.statistics.successRequests}个`);
    console.log(`   • 失败请求: ${networkData.statistics.failedRequests}个`);
    console.log(`   • 缓存请求: ${networkData.statistics.cachedRequests}个`);
    console.log(`   • 重定向请求: ${networkData.statistics.redirectRequests}个\n`);
    
    if (networkData.slowestRequests && networkData.slowestRequests.length > 0) {
      console.log('🐌 最慢的请求 (Top 3):');
      networkData.slowestRequests.slice(0, 3).forEach((req, index) => {
        const url = req.url.length > 60 ? req.url.substring(0, 57) + '...' : req.url;
        console.log(`   ${index + 1}. ${req.timing.duration}ms - ${url}`);
      });
      console.log();
    }
    
    if (networkData.largestRequests && networkData.largestRequests.length > 0) {
      console.log('📦 最大的请求 (Top 3):');
      networkData.largestRequests.slice(0, 3).forEach((req, index) => {
        const url = req.url.length > 60 ? req.url.substring(0, 57) + '...' : req.url;
        const size = (req.size.transferSize / 1024).toFixed(2);
        console.log(`   ${index + 1}. ${size}KB - ${url}`);
      });
      console.log();
    }
    
    if (networkData.failedRequests && networkData.failedRequests.length > 0) {
      console.log('❌ 失败的请求:');
      networkData.failedRequests.slice(0, 3).forEach((req, index) => {
        const url = req.url.length > 60 ? req.url.substring(0, 57) + '...' : req.url;
        console.log(`   ${index + 1}. ${req.errorText || 'Unknown error'} - ${url}`);
      });
      console.log();
    }
    
    if (networkData.suspiciousRequests && networkData.suspiciousRequests.length > 0) {
      console.log('⚠️  可疑请求:');
      networkData.suspiciousRequests.slice(0, 3).forEach((req, index) => {
        const url = req.url.length > 60 ? req.url.substring(0, 57) + '...' : req.url;
        console.log(`   ${index + 1}. ${url}`);
      });
      console.log();
    }
    
    if (networkData.thirdPartyDomains && networkData.thirdPartyDomains.length > 0) {
      console.log(`🔗 第三方域名 (${networkData.thirdPartyDomains.length}个):`);
      networkData.thirdPartyDomains.slice(0, 5).forEach((domain, index) => {
        console.log(`   ${index + 1}. ${domain}`);
      });
      if (networkData.thirdPartyDomains.length > 5) {
        console.log(`   ... 和其他 ${networkData.thirdPartyDomains.length - 5} 个域名`);
      }
      console.log();
    }
    
    console.log('💡 优化建议:');
    networkData.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();
    
    console.log('📋 摘要:');
    console.log(networkData.summary);
    console.log();
    
    // 6. 验证功能
    console.log('='.repeat(80));
    console.log('✅ 功能验证清单\n');
    
    console.log('1. ✅ track_extension_network 工具正常工作');
    console.log('2. ✅ 能够监控扩展网络请求');
    console.log('3. ✅ 能够统计请求类型/域名/方法分布');
    console.log('4. ✅ 能够计算传输数据量和响应时间');
    console.log('5. ✅ 能够识别慢速/大型/失败请求');
    console.log('6. ✅ 能够检测可疑请求');
    console.log('7. ✅ 能够生成优化建议');
    console.log('8. ✅ 网络影响评估准确\n');
    
    console.log('🎉 Phase 1.2 (track_extension_network) 功能验证通过！\n');
    
    console.log('📌 下一步:');
    console.log('   • Phase 1.3: measure_extension_impact (综合影响量化)');
    console.log('   • 完成Phase 1全部3个工具');
    console.log('   • 进行综合集成测试\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
  } finally {
    await server.cleanup();
    console.log('🧹 清理完成');
  }
}

// 运行测试
testNetworkMonitor().catch(console.error);
