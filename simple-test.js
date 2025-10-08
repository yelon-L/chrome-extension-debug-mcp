#!/usr/bin/env node

/**
 * 简化测试 - 调用list_extensions查看调试信息
 */

const MCP_SERVER = 'http://localhost:3000/message';

async function testListExtensions() {
  console.log('开始测试list_extensions...');
  
  try {
    // 1. 连接Chrome
    console.log('1. 连接Chrome...');
    const attachResponse = await fetch(MCP_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'attach_to_chrome',
          arguments: { host: 'localhost', port: 9222 }
        }
      })
    });
    
    const attachResult = await attachResponse.json();
    if (attachResult.result) {
      console.log('✅ Chrome连接成功');
    } else {
      console.log('❌ Chrome连接失败:', attachResult.error);
      return;
    }
    
    // 2. 调用list_extensions（会显示详细调试信息）
    console.log('2. 调用list_extensions...');
    const extensionsResponse = await fetch(MCP_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'list_extensions',
          arguments: {}
        }
      })
    });
    
    const extensionsResult = await extensionsResponse.json();
    if (extensionsResult.result) {
      console.log('✅ list_extensions调用成功');
      console.log('结果:', extensionsResult.result.content[0].text);
    } else {
      console.log('❌ list_extensions调用失败:', extensionsResult.error);
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testListExtensions();
