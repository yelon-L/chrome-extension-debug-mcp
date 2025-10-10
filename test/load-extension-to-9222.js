/**
 * Helper script to load test-extension-enhanced to Chrome 9222
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadExtension() {
  console.log('📦 加载test-extension-enhanced到Chrome 9222...\n');

  const serverPath = path.join(__dirname, '../build/stdio-server.js');
  const extPath = path.join(__dirname, '../test-extension-enhanced');

  const server = spawn('node', [serverPath, '--port=9222'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let requestId = 1;
  const pendingRequests = new Map();

  server.stdout.on('data', (data) => {
    const messages = data.toString().split('\n').filter(line => line.trim());
    for (const message of messages) {
      try {
        const response = JSON.parse(message);
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve } = pendingRequests.get(response.id);
          pendingRequests.delete(response.id);
          resolve(response);
        }
      } catch (e) {
        // Ignore
      }
    }
  });

  const sendRequest = (method, params) => {
    const id = requestId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }) + '\n');

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Timeout'));
        }
      }, 10000);
    });
  };

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize
    console.log('1. 初始化MCP...');
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'loader', version: '1.0.0' }
    });
    console.log('   ✅ MCP初始化完成\n');

    // Attach to Chrome
    console.log('2. 连接到Chrome 9222...');
    await sendRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { port: 9222 }
    });
    console.log('   ✅ 已连接\n');

    // List current extensions
    console.log('3. 检查当前扩展...');
    const extResult = await sendRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (extResult.result && Array.isArray(extResult.result)) {
      console.log(`   📋 发现 ${extResult.result.length} 个扩展:\n`);
      extResult.result.forEach((ext, i) => {
        console.log(`   ${i + 1}. ${ext.name} (${ext.id.substring(0, 12)}...)`);
      });
    } else {
      console.log('   ℹ️  当前无扩展加载');
    }

    console.log('\n📝 手动操作提示:');
    console.log('   1. 在Chrome中打开 chrome://extensions');
    console.log('   2. 启用"开发者模式"');
    console.log(`   3. 点击"加载已解压的扩展程序"并选择: ${extPath}`);
    console.log('   4. 加载完成后，再次运行测试脚本\n');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    server.kill('SIGTERM');
    process.exit(0);
  }
}

loadExtension();



