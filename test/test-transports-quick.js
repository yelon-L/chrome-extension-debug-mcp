/**
 * Chrome Extension Debug MCP - 快速传输模式测试
 * 
 * 快速验证stdio和RemoteTransport的核心功能
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QuickTransportTester {
  constructor() {
    this.results = {
      stdio: { tested: 0, passed: 0, failed: 0 },
      remote: { tested: 0, passed: 0, failed: 0 }
    };
  }

  async start() {
    console.log('⚡ 快速传输模式测试\n');
    console.log('='.repeat(60));
    
    // 测试stdio
    await this.testStdio();
    
    await this.sleep(2000);
    
    // 测试RemoteTransport
    await this.testRemote();
    
    // 生成报告
    this.generateReport();
  }

  async testStdio() {
    console.log('\n📡 1. Testing stdio Transport...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    const server = spawn('node', [serverPath, '--port', '9222']);
    
    let requestId = 1;
    const pendingRequests = new Map();
    
    // 处理响应
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
        } catch (e) {}
      }
    });
    
    const sendRequest = (method, params) => {
      const id = requestId++;
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Timeout'));
          }
        }, 10000);
      });
    };
    
    await this.sleep(2000);
    
    // 测试核心工具
    const tests = [
      { name: 'attach_to_chrome', params: { port: 9222 } },
      { name: 'list_tabs', params: {} },
      { name: 'list_extensions', params: {} }
    ];
    
    for (const test of tests) {
      this.results.stdio.tested++;
      try {
        const response = await sendRequest('tools/call', {
          name: test.name,
          arguments: test.params
        });
        
        if (response.result) {
          this.results.stdio.passed++;
          console.log(`  ✅ ${test.name} - PASS`);
        } else {
          this.results.stdio.failed++;
          console.log(`  ❌ ${test.name} - FAIL`);
        }
      } catch (error) {
        this.results.stdio.failed++;
        console.log(`  ❌ ${test.name} - ERROR: ${error.message}`);
      }
    }
    
    server.kill();
    console.log('\n✅ stdio测试完成');
  }

  async testRemote() {
    console.log('\n📡 2. Testing RemoteTransport...\n');
    
    const serverPath = path.join(__dirname, '../build/remote.js');
    const server = spawn('node', [serverPath, '--port', '3000', '--chrome-port', '9222']);
    
    await this.sleep(3000);
    
    const serverUrl = 'http://localhost:3000';
    let requestId = 1;
    
    const sendRequest = async (method, params) => {
      const id = requestId++;
      const response = await fetch(`${serverUrl}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
      });
      return await response.json();
    };
    
    // 测试核心工具
    const tests = [
      { name: 'attach_to_chrome', params: { port: 9222 } },
      { name: 'list_tabs', params: {} },
      { name: 'list_extensions', params: {} }
    ];
    
    for (const test of tests) {
      this.results.remote.tested++;
      try {
        const response = await sendRequest('tools/call', {
          name: test.name,
          arguments: test.params
        });
        
        if (response.result) {
          this.results.remote.passed++;
          console.log(`  ✅ ${test.name} - PASS`);
        } else {
          this.results.remote.failed++;
          console.log(`  ❌ ${test.name} - FAIL`);
        }
      } catch (error) {
        this.results.remote.failed++;
        console.log(`  ❌ ${test.name} - ERROR: ${error.message}`);
      }
    }
    
    server.kill();
    console.log('\n✅ RemoteTransport测试完成');
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 快速测试报告');
    console.log('='.repeat(60));
    
    console.log('\n📋 stdio模式:');
    console.log(`  测试: ${this.results.stdio.tested}`);
    console.log(`  通过: ${this.results.stdio.passed} ✅`);
    console.log(`  失败: ${this.results.stdio.failed} ❌`);
    console.log(`  成功率: ${(this.results.stdio.passed / this.results.stdio.tested * 100).toFixed(1)}%`);
    
    console.log('\n📋 RemoteTransport模式:');
    console.log(`  测试: ${this.results.remote.tested}`);
    console.log(`  通过: ${this.results.remote.passed} ✅`);
    console.log(`  失败: ${this.results.remote.failed} ❌`);
    console.log(`  成功率: ${(this.results.remote.passed / this.results.remote.tested * 100).toFixed(1)}%`);
    
    console.log('\n✅ 快速测试完成！');
    console.log('='.repeat(60) + '\n');
    
    // 判断是否全部通过
    const allPassed = (this.results.stdio.failed + this.results.remote.failed) === 0;
    process.exit(allPassed ? 0 : 1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行测试
const tester = new QuickTransportTester();
tester.start().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

