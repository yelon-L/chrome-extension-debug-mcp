/**
 * Chrome Extension Debug MCP - 安全的快速传输模式测试
 * 
 * 包含超时保护和完整的错误处理
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OVERALL_TIMEOUT = 120000; // 2分钟整体超时
const REQUEST_TIMEOUT = 10000;  // 10秒请求超时
const SERVER_INIT_WAIT = 3000;  // 3秒服务器初始化等待

class SafeQuickTransportTester {
  constructor() {
    this.results = {
      stdio: { tested: 0, passed: 0, failed: 0 },
      remote: { tested: 0, passed: 0, failed: 0 }
    };
    this.overallTimer = null;
    this.activeServers = [];
  }

  async start() {
    console.log('⚡ 安全的快速传输模式测试\n');
    console.log('='.repeat(60));
    console.log(`⏱️  整体超时: ${OVERALL_TIMEOUT / 1000}秒`);
    console.log(`⏱️  请求超时: ${REQUEST_TIMEOUT / 1000}秒\n`);
    
    // 设置整体超时
    this.overallTimer = setTimeout(() => {
      console.error('\n❌ 整体超时！强制退出...');
      this.cleanup();
      process.exit(1);
    }, OVERALL_TIMEOUT);
    
    try {
      // 测试stdio
      await this.testStdio();
      
      await this.sleep(2000);
      
      // 测试RemoteTransport
      await this.testRemote();
      
      // 生成报告
      this.generateReport();
    } catch (error) {
      console.error('\n❌ 测试过程中发生错误:', error);
      this.cleanup();
      process.exit(1);
    } finally {
      clearTimeout(this.overallTimer);
      this.cleanup();
    }
  }

  async testStdio() {
    console.log('\n📡 1. Testing stdio Transport...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    const server = spawn('node', [serverPath, '--port', '9222'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.activeServers.push(server);
    
    let requestId = 1;
    const pendingRequests = new Map();
    let serverReady = false;
    
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
        } catch (e) {
          // 非JSON输出，可能是日志
          if (message.includes('stdio server running')) {
            serverReady = true;
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      // 日志输出
      if (data.toString().includes('stdio server running')) {
        serverReady = true;
      }
    });
    
    const sendRequest = (method, params) => {
      const id = requestId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, REQUEST_TIMEOUT);
        
        pendingRequests.set(id, { 
          resolve: (res) => {
            clearTimeout(timer);
            resolve(res);
          }, 
          reject 
        });
        
        try {
          server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
        } catch (error) {
          clearTimeout(timer);
          pendingRequests.delete(id);
          reject(error);
        }
      });
    };
    
    // 等待服务器初始化
    console.log(`  ⏳ 等待服务器初始化 (${SERVER_INIT_WAIT}ms)...`);
    await this.sleep(SERVER_INIT_WAIT);
    
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
        } else if (response.error) {
          this.results.stdio.failed++;
          console.log(`  ❌ ${test.name} - FAIL: ${response.error.message}`);
        } else {
          this.results.stdio.failed++;
          console.log(`  ❌ ${test.name} - FAIL: Unknown error`);
        }
      } catch (error) {
        this.results.stdio.failed++;
        console.log(`  ❌ ${test.name} - ERROR: ${error.message}`);
      }
    }
    
    // 清理服务器
    server.kill('SIGTERM');
    
    // 等待进程退出
    await new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        server.kill('SIGKILL');
        resolve();
      }, 2000);
      
      server.on('exit', () => {
        clearTimeout(killTimer);
        resolve();
      });
    });
    
    const index = this.activeServers.indexOf(server);
    if (index > -1) {
      this.activeServers.splice(index, 1);
    }
    
    console.log('\n✅ stdio测试完成');
  }

  async testRemote() {
    console.log('\n📡 2. Testing RemoteTransport...\n');
    
    const serverPath = path.join(__dirname, '../build/remote.js');
    const server = spawn('node', [serverPath, '--port', '3000', '--chrome-port', '9222'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    this.activeServers.push(server);
    
    // 等待服务器初始化
    console.log(`  ⏳ 等待服务器初始化 (${SERVER_INIT_WAIT}ms)...`);
    await this.sleep(SERVER_INIT_WAIT);
    
    const serverUrl = 'http://localhost:3000';
    let requestId = 1;
    
    const sendRequest = async (method, params) => {
      const id = requestId++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      try {
        const response = await fetch(`${serverUrl}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
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
        } else if (response.error) {
          this.results.remote.failed++;
          console.log(`  ❌ ${test.name} - FAIL: ${response.error.message}`);
        } else {
          this.results.remote.failed++;
          console.log(`  ❌ ${test.name} - FAIL: Unknown error`);
        }
      } catch (error) {
        this.results.remote.failed++;
        console.log(`  ❌ ${test.name} - ERROR: ${error.message}`);
      }
    }
    
    // 清理服务器
    server.kill('SIGTERM');
    
    // 等待进程退出
    await new Promise((resolve) => {
      const killTimer = setTimeout(() => {
        server.kill('SIGKILL');
        resolve();
      }, 2000);
      
      server.on('exit', () => {
        clearTimeout(killTimer);
        resolve();
      });
    });
    
    const index = this.activeServers.indexOf(server);
    if (index > -1) {
      this.activeServers.splice(index, 1);
    }
    
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
    if (this.results.stdio.tested > 0) {
      console.log(`  成功率: ${(this.results.stdio.passed / this.results.stdio.tested * 100).toFixed(1)}%`);
    }
    
    console.log('\n📋 RemoteTransport模式:');
    console.log(`  测试: ${this.results.remote.tested}`);
    console.log(`  通过: ${this.results.remote.passed} ✅`);
    console.log(`  失败: ${this.results.remote.failed} ❌`);
    if (this.results.remote.tested > 0) {
      console.log(`  成功率: ${(this.results.remote.passed / this.results.remote.tested * 100).toFixed(1)}%`);
    }
    
    console.log('\n✅ 快速测试完成！');
    console.log('='.repeat(60) + '\n');
    
    // 判断是否全部通过
    const allPassed = (this.results.stdio.failed + this.results.remote.failed) === 0;
    process.exit(allPassed ? 0 : 1);
  }

  cleanup() {
    // 清理所有活动的服务器进程
    for (const server of this.activeServers) {
      try {
        server.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }
    this.activeServers = [];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行测试
const tester = new SafeQuickTransportTester();
tester.start().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

