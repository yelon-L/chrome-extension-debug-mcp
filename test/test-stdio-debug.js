/**
 * stdio 服务器调试脚本 - 最简化测试
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log('🔍 stdio 服务器调试测试\n');
  
  const serverPath = path.join(__dirname, '../build/stdio-server.js');
  const server = spawn('node', [serverPath, '--port', '9222'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  console.log('✅ 服务器已启动\n');
  
  // 监听所有输出
  server.stdout.on('data', (data) => {
    console.log('[stdout]', data.toString());
  });
  
  server.stderr.on('data', (data) => {
    console.log('[stderr]', data.toString());
  });
  
  server.on('error', (error) => {
    console.error('[error]', error);
  });
  
  // 等待初始化
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 发送 initialize 请求
  console.log('\n📤 发送 initialize 请求...');
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  // 等待响应
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 发送 tools/list 请求
  console.log('\n📤 发送 tools/list 请求...');
  const toolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(toolsRequest) + '\n');
  
  // 等待响应
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n🛑 关闭服务器...');
  server.kill();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('\n✅ 测试完成');
  process.exit(0);
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

