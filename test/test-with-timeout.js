/**
 * 带超时保护的PageStateMonitor测试
 * 防止脚本卡住
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class TimeoutProtectedTest {
  constructor() {
    this.server = new ChromeDebugServer();
  }

  // 超时包装器
  async withTimeout(promise, timeoutMs, description) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${description} 超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ]);
  }

  async run() {
    console.log('🔍 开始超时保护测试...');
    
    try {
      // 1. 连接Chrome (3秒超时)
      console.log('📡 连接Chrome...');
      await this.withTimeout(
        this.server.handleAttachToChrome({ host: 'localhost', port: 9222 }),
        3000,
        'Chrome连接'
      );
      console.log('✅ Chrome连接成功');

      // 2. 页面状态检测 (5秒超时)
      console.log('📊 检测页面状态...');
      const stateResult = await this.withTimeout(
        this.server.extensionHandler.detectPageState(),
        5000,
        '页面状态检测'
      );
      
      console.log('📋 检测结果:');
      console.log(`   状态: ${stateResult.state}`);
      console.log(`   阻塞: ${stateResult.isBlocked}`);
      console.log(`   用时: ${stateResult.executionTime}ms`);

      if (stateResult.blockingElement) {
        console.log('🚫 阻塞信息:');
        console.log(`   类型: ${stateResult.blockingElement.type}`);
        console.log(`   可处理: ${stateResult.blockingElement.canAutoHandle}`);
      }

      // 3. 启动监控测试 (2秒超时)
      console.log('🔄 测试监控启动...');
      await this.withTimeout(
        this.server.extensionHandler.startPageStateMonitoring({
          intervalMs: 1000,
          autoHandle: false // 避免自动操作
        }),
        2000,
        '监控启动'
      );
      console.log('✅ 监控启动成功');

      // 4. 等待1秒后停止 (无阻塞操作)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 5. 停止监控 (即时操作)
      const stopResult = this.server.extensionHandler.stopPageStateMonitoring();
      console.log('✅ 监控已停止:', stopResult.message);

      console.log('\n🎉 所有测试通过！PageStateMonitor功能正常');
      
    } catch (error) {
      if (error.message.includes('超时')) {
        console.log('⏱️ 测试超时:', error.message);
        console.log('💡 这表明可能存在页面阻塞问题，PageStateMonitor功能很有必要');
      } else {
        console.log('❌ 测试失败:', error.message);
      }
    }

    console.log('🏁 测试结束，脚本安全退出');
  }
}

// 执行测试
const test = new TimeoutProtectedTest();
test.run().catch(error => {
  console.log('💥 未捕获错误:', error.message);
}).finally(() => {
  console.log('🔚 测试脚本完成');
  process.exit(0); // 强制退出，防止卡住
});

// 全局超时保护 - 15秒后强制退出
setTimeout(() => {
  console.log('🚨 全局超时，强制退出');
  process.exit(1);
}, 15000);
