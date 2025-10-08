#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

async function verifyServer() {
  console.log('🧪 验证MCP服务器启动...');
  
  const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
  console.log('服务器路径:', serverPath);
  
  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let serverStarted = false;
  
  // 监听stderr输出 (服务器启动信息)
  child.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('服务器输出:', output.trim());
    
    if (output.includes('Chrome Debug MCP server running on stdio')) {
      serverStarted = true;
      console.log('✅ MCP服务器启动成功!');
      
      // 尝试发送一个MCP消息
      const initMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };
      
      const payload = JSON.stringify(initMessage);
      const message = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
      
      child.stdin.write(message);
      console.log('发送初始化消息...');
    }
  });
  
  // 监听stdout输出 (MCP响应)
  child.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('MCP响应:', response);
    
    if (response.includes('result')) {
      console.log('✅ MCP协议通信正常!');
      
      // 发送tools/list请求
      const toolsMessage = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      };
      
      const payload = JSON.stringify(toolsMessage);
      const message = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
      
      child.stdin.write(message);
      console.log('请求工具列表...');
    }
    
    if (response.includes('tools') && response.includes('click')) {
      console.log('✅ 新增工具已成功注册!');
      console.log('🎉 所有验证通过!');
      child.kill();
    }
  });
  
  child.on('error', (err) => {
    console.error('❌ 服务器启动失败:', err);
  });
  
  child.on('exit', (code) => {
    console.log('服务器进程退出，代码:', code);
  });
  
  // 5秒后超时
  setTimeout(() => {
    if (!serverStarted) {
      console.log('❌ 服务器启动超时');
    } else {
      console.log('⏰ 验证完成');
    }
    child.kill();
    process.exit(serverStarted ? 0 : 1);
  }, 8000);
}

verifyServer().catch(console.error);
