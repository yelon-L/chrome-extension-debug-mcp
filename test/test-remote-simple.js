/**
 * Remote Transport 简单测试
 * 测试 remote.js 是否能正常启动和响应
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMEOUT = 30000; // 30秒超时

async function test() {
  console.log('🔍 Remote Transport 稳定性测试\n');
  
  const serverPath = path.join(__dirname, '../build/remote.js');
  console.log(`📦 服务器路径: ${serverPath}\n`);
  
  // 启动remote server
  const port = 3333;
  console.log(`🚀 启动 remote server (端口 ${port})...`);
  const server = spawn('node', [serverPath, `--port=${port}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // 收集输出
  server.stdout.on('data', (data) => {
    console.log('[stdout]', data.toString().trim());
  });
  
  server.stderr.on('data', (data) => {
    console.log('[stderr]', data.toString().trim());
  });
  
  server.on('error', (error) => {
    console.error('[error]', error);
    process.exit(1);
  });
  
  server.on('exit', (code, signal) => {
    console.log(`[exit] 服务器退出: code=${code}, signal=${signal}`);
  });
  
  // 等待服务器初始化
  console.log('\n⏳ 等待服务器初始化 (3秒)...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 测试 HTTP 端点
  console.log('📡 测试 HTTP 端点...\n');
  
  try {
    // 1. Health check
    console.log('1️⃣ Health Check:');
    const healthResponse = await fetch(`http://localhost:${port}/health`);
    console.log(`   状态: ${healthResponse.status} ${healthResponse.statusText}`);
    const healthData = await healthResponse.text();
    console.log(`   响应: ${healthData}\n`);
    
    // 2. Initialize
    console.log('2️⃣ MCP Initialize:');
    const initResponse = await fetch(`http://localhost:${port}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' }
        }
      })
    });
    const initData = await initResponse.json();
    console.log(`   响应: ${JSON.stringify(initData, null, 2)}\n`);
    
    // 3. List tools
    console.log('3️⃣ List Tools:');
    const toolsResponse = await fetch(`http://localhost:${port}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const toolsData = await toolsResponse.json();
    if (toolsData.result && toolsData.result.tools) {
      console.log(`   发现 ${toolsData.result.tools.length} 个工具:`);
      toolsData.result.tools.slice(0, 5).forEach(t => {
        console.log(`   - ${t.name}`);
      });
      console.log(`   ...\n`);
    } else {
      console.log(`   响应: ${JSON.stringify(toolsData, null, 2)}\n`);
    }
    
    console.log('✅ Remote 模式测试成功！\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
  
  // 清理
  console.log('🛑 关闭服务器...');
  server.kill('SIGTERM');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!server.killed) {
    console.log('⚠️ 服务器未正常关闭，强制终止...');
    server.kill('SIGKILL');
  }
  
  console.log('\n✅ 测试完成');
  process.exit(0);
}

// 设置超时
const timer = setTimeout(() => {
  console.error('\n❌ 测试超时 (30秒)');
  process.exit(1);
}, TIMEOUT);

test().catch(error => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
}).finally(() => {
  clearTimeout(timer);
});

