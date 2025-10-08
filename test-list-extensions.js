#!/usr/bin/env node

/**
 * 测试脚本 - 直接测试list_extensions功能
 */

import { ChromeDebugServer } from './build/ChromeDebugServer.js';

const DEBUG = true;
const log = (...args) => DEBUG && console.log('[TEST]', ...args);

async function testListExtensions() {
  log('开始测试list_extensions功能...');
  
  const server = new ChromeDebugServer();
  
  try {
    // 1. 连接到Chrome
    log('连接到Chrome (localhost:9222)...');
    const attachResult = await server.handleAttachToChrome({ 
      host: 'localhost', 
      port: 9222 
    });
    log('连接结果:', attachResult.content[0].text);
    
    // 2. 测试list_extensions
    log('调用list_extensions...');
    const extensionsResult = await server.handleListExtensions({});
    log('Extensions结果:', extensionsResult.content[0].text);
    
    // 3. 解析结果
    try {
      const extensions = JSON.parse(extensionsResult.content[0].text);
      log('找到的扩展数量:', extensions.length);
      
      if (extensions.length === 0) {
        log('⚠️ 没有找到任何扩展');
        log('这可能是因为:');
        log('1. Chrome没有安装任何扩展');
        log('2. Chrome以headless模式运行，某些扩展可能不会加载');
        log('3. 需要加载测试扩展');
      } else {
        log('✅ 找到扩展:');
        extensions.forEach((ext, i) => {
          log(`  ${i + 1}. Type: ${ext.type}, URL: ${ext.url}`);
        });
      }
    } catch (parseError) {
      log('❌ 解析扩展结果失败:', parseError);
    }
    
  } catch (error) {
    log('❌ 测试失败:', error.message);
    log('错误详情:', error);
  } finally {
    // 清理
    await server.cleanup();
    log('测试完成，已清理资源');
  }
}

// 运行测试
testListExtensions().catch(console.error);
