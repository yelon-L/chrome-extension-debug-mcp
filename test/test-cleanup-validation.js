#!/usr/bin/env node

/**
 * 资源清理验证测试
 * 专门测试cleanup机制是否正常工作
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function testCleanup() {
  console.log('\n🧪 资源清理验证测试\n');

  const server = new ChromeDebugServer();

  try {
    console.log('1️⃣ 连接Chrome...');
    await server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ 连接成功');

    console.log('\n2️⃣ 快速功能测试...');
    const extResult = await server.handleListExtensions({});
    const extensions = JSON.parse(extResult.content[0].text);
    console.log(`✅ 找到 ${extensions.length} 个扩展`);

    console.log('\n3️⃣ 清理资源...');
    await server.cleanup();
    console.log('✅ 清理完成');

    console.log('\n🎉 测试完成，进程应该在3秒内退出...');
    
    // 监控进程退出
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      console.log(`⏰ ${countdown--} 秒后强制退出...`);
      if (countdown < 0) {
        clearInterval(countdownInterval);
        console.log('🏁 正常退出');
        process.exit(0);
      }
    }, 1000);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    try {
      await server.cleanup();
    } catch (cleanupError) {
      console.error('⚠️ 清理失败:', cleanupError.message);
    }
    process.exit(1);
  }
}

// 60秒超时保护
setTimeout(() => {
  console.error('\n⏰ 60秒超时，强制退出');
  process.exit(1);
}, 60000);

testCleanup();
