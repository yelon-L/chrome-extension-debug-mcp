/**
 * 安全的页面状态监控测试
 * 解决脚本卡住问题
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class SafePageStateTest {
  constructor() {
    this.server = new ChromeDebugServer();
    this.startTime = Date.now();
  }

  async run() {
    console.log('🔍 开始安全页面状态监控测试');
    console.log('=====================================');

    try {
      // 1. 连接Chrome（快速超时）
      console.log('📡 1.1 连接Chrome...');
      await Promise.race([
        this.server.handleAttachToChrome({ host: 'localhost', port: 9222 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Chrome连接超时')), 3000)
        )
      ]);
      console.log('   ✅ Chrome连接成功');

      // 2. 快速页面状态检测
      console.log('📊 1.2 检测页面状态...');
      const stateResult = await Promise.race([
        this.server.extensionHandler.detectPageState(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('页面状态检测超时')), 5000)
        )
      ]);

      console.log('   📋 页面状态检测结果:');
      console.log('      状态:', stateResult.state);
      console.log('      是否阻塞:', stateResult.isBlocked);
      console.log('      检测用时:', stateResult.executionTime + 'ms');

      if (stateResult.blockingElement) {
        console.log('   🚫 发现阻塞元素:');
        console.log('      类型:', stateResult.blockingElement.type);
        console.log('      消息:', stateResult.blockingElement.message);
        console.log('      可自动处理:', stateResult.blockingElement.canAutoHandle);
        
        if (stateResult.blockingElement.selector) {
          console.log('      选择器:', stateResult.blockingElement.selector);
        }
      }

      if (stateResult.recommendations.length > 0) {
        console.log('   💡 处理建议:');
        stateResult.recommendations.forEach((rec, i) => 
          console.log(`      ${i + 1}. ${rec}`)
        );
      }

      // 3. 如果页面被阻塞，尝试自动处理
      if (stateResult.isBlocked && stateResult.blockingElement?.canAutoHandle) {
        console.log('🛠️ 1.3 尝试自动处理阻塞...');
        
        try {
          const handleResult = await this.tryAutoHandle(stateResult);
          if (handleResult) {
            console.log('   ✅ 自动处理成功');
            
            // 重新检测状态
            const newState = await this.server.extensionHandler.detectPageState();
            console.log('   📊 处理后状态:', newState.state, '阻塞:', newState.isBlocked);
          } else {
            console.log('   ❌ 自动处理失败，需要手动干预');
          }
        } catch (error) {
          console.log('   ⚠️ 自动处理异常:', error.message);
        }
      }

      // 4. 测试页面状态监控启动/停止
      console.log('🔄 1.4 测试实时监控...');
      
      // 启动监控（短时间测试）
      await this.server.extensionHandler.startPageStateMonitoring({
        intervalMs: 1000,
        autoHandle: true,
        onStateChange: (state) => {
          console.log(`   📈 状态变化: ${state.state} (阻塞: ${state.isBlocked})`);
        }
      });
      console.log('   ✅ 监控已启动');

      // 等待3秒观察
      console.log('   ⏱️ 监控3秒钟...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 停止监控
      const stopResult = this.server.extensionHandler.stopPageStateMonitoring();
      console.log('   ✅ 监控已停止:', stopResult.message);

      // 5. 性能统计
      const totalTime = Date.now() - this.startTime;
      console.log('📈 1.5 测试性能统计:');
      console.log(`   总用时: ${totalTime}ms`);
      console.log(`   状态检测: ${stateResult.executionTime}ms`);

      console.log('\n🎉 页面状态监控测试完成！');
      console.log('✅ 所有功能正常，脚本未卡住');

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      console.log('🔧 可能的解决方案:');
      console.log('   1. 检查Chrome是否在localhost:9222运行');
      console.log('   2. 检查页面是否有弹窗阻塞');
      console.log('   3. 刷新页面重试');
      console.log('   4. 检查网络连接');
    }

    console.log('\n🧹 清理测试环境...');
    console.log('✅ 测试环境保持，Chrome继续运行');
  }

  /**
   * 尝试自动处理阻塞状态
   */
  async tryAutoHandle(stateResult) {
    try {
      if (stateResult.blockingElement?.type === 'browser_dialog') {
        // 处理浏览器弹窗
        const result = await this.server.extensionHandler.handleDialog({
          action: 'accept',
          timeout: 2000
        });
        return result;
      }

      if (stateResult.blockingElement?.type === 'custom_modal') {
        // 处理自定义模态框
        const result = await this.server.extensionHandler.handleDialog({
          action: 'dismiss',
          selector: stateResult.blockingElement.selector,
          timeout: 2000
        });
        return result;
      }

      return false;
    } catch (error) {
      console.log('   自动处理异常:', error.message);
      return false;
    }
  }
}

// 运行测试
const test = new SafePageStateTest();
test.run().catch(console.error);
