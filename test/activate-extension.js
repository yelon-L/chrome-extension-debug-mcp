#!/usr/bin/env node

/**
 * 激活扩展并测试
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function activateAndTest() {
  const server = new ChromeDebugServer();
  
  console.log('🔧 激活扩展并测试\n');
  console.log('='.repeat(80));
  
  try {
    // 1. 连接 Chrome
    console.log('\n📌 步骤 1: 连接到 Chrome...');
    await server.handleAttachToChrome({ host: 'localhost', port: 9222 });
    console.log('✅ Chrome 连接成功\n');
    
    // 2. 打开 chrome://extensions 页面来激活扩展
    console.log('📌 步骤 2: 打开 chrome://extensions 页面...');
    await server.handleNewTab({ url: 'chrome://extensions' });
    console.log('✅ 扩展管理页面已打开\n');
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 再次检测扩展
    console.log('📌 步骤 3: 检测扩展...');
    const result = await server.handleListExtensions({});
    const extensions = JSON.parse(result.content[0].text);
    
    console.log(`✅ 检测到 ${extensions.length} 个扩展\n`);
    
    if (extensions.length > 0) {
      extensions.forEach((ext, index) => {
        console.log(`扩展 ${index + 1}:`);
        console.log(`  ID: ${ext.id}`);
        console.log(`  Title: ${ext.title}`);
        console.log(`  Type: ${ext.type}`);
        console.log(`  URL: ${ext.url}`);
        console.log('');
      });
    } else {
      console.log('⚠️ 仍然没有检测到扩展');
      console.log('\n说明：');
      console.log('1. 扩展可能被禁用');
      console.log('2. 扩展可能没有 background script');
      console.log('3. 需要手动在 Chrome 中启用扩展');
    }
    
    console.log('='.repeat(80));
    console.log('💡 提示: 如果仍然没有扩展，请：');
    console.log('1. 在 Chrome 中打开 chrome://extensions');
    console.log('2. 启用"开发者模式"');
    console.log('3. 点击"加载已解压的扩展程序"');
    console.log('4. 选择 ./enhanced-test-extension 目录\n');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    console.log('🧹 测试完成（保持 Chrome 运行）');
  }
}

activateAndTest().catch(console.error);
