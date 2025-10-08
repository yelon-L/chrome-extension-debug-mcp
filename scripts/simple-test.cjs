#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

async function testMCPServer() {
  console.log('🧪 启动MCP服务器测试...');
  
  const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
  const child = spawn('node', [serverPath], { 
    stdio: ['pipe', 'pipe', 'inherit'] 
  });

  // 发送tools/list请求
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  const payload = JSON.stringify(request);
  const message = `Content-Length: ${payload.length}\r\n\r\n${payload}`;
  
  child.stdin.write(message);
  
  // 读取响应
  let response = '';
  child.stdout.on('data', (data) => {
    response += data.toString();
    console.log('📨 收到响应:', response);
    
    // 简单解析响应
    if (response.includes('tools')) {
      console.log('✅ 服务器正常启动，工具列表获取成功！');
      
      // 尝试解析工具列表
      try {
        const lines = response.split('\r\n\r\n');
        if (lines.length > 1) {
          const jsonResponse = JSON.parse(lines[1]);
          if (jsonResponse.result && jsonResponse.result.tools) {
            console.log('🔧 发现工具数量:', jsonResponse.result.tools.length);
            jsonResponse.result.tools.forEach((tool, i) => {
              console.log(`  ${i+1}. ${tool.name} - ${tool.description}`);
            });
          }
        }
      } catch (e) {
        console.log('⚠️  响应解析失败，但服务器已启动');
      }
      
      child.kill();
      process.exit(0);
    }
  });
  
  // 5秒超时
  setTimeout(() => {
    console.log('❌ 测试超时');
    child.kill();
    process.exit(1);
  }, 5000);
  
  child.on('error', (err) => {
    console.error('❌ 服务器启动失败:', err);
    process.exit(1);
  });
}

testMCPServer().catch(console.error);
