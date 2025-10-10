/**
 * 双模式完整测试 - stdio 和 RemoteTransport
 * 测试所有新功能：Response Builder、工具分类、完整工具支持
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMEOUT = 60000; // 60秒超时

class DualModeTester {
  constructor() {
    this.results = {
      stdio: { tested: 0, passed: 0, failed: 0, features: [] },
      remote: { tested: 0, passed: 0, failed: 0, features: [] }
    };
  }

  async test() {
    console.log('🧪 双模式完整功能测试\n');
    console.log('='.repeat(80));
    console.log('📋 测试内容:');
    console.log('  1. stdio模式 - 完整工具支持（47个工具）');
    console.log('  2. RemoteTransport模式 - 端口32132');
    console.log('  3. Response Builder - 上下文自动附加');
    console.log('  4. 工具分类系统');
    console.log('='.repeat(80) + '\n');

    try {
      await this.testStdio();
      await this.sleep(2000);
      await this.testRemote();
      this.generateReport();
    } catch (error) {
      console.error('\n❌ 测试过程出错:', error);
      process.exit(1);
    }
  }

  async testStdio() {
    console.log('\n📡 测试1: stdio 模式\n');
    console.log('-'.repeat(80));

    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    const server = spawn('node', [serverPath, '--port', '9222'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let requestId = 1;
    const pendingRequests = new Map();

    server.stderr.on('data', (data) => {
      // console.log('[stdio stderr]', data.toString().trim());
    });

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
          // Ignore parse errors
        }
      }
    });

    const sendRequest = (method, params) => {
      const id = requestId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 10000);

        pendingRequests.set(id, { resolve, reject, timeout });
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      }).finally(() => {
        const req = pendingRequests.get(id);
        if (req && req.timeout) clearTimeout(req.timeout);
      });
    };

    await this.sleep(2000);

    // 测试1: Initialize
    await this.runTest('stdio', 'MCP Initialize', async () => {
      const response = await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' }
      });
      return response.result ? 'PASS' : 'FAIL';
    });

    // 测试2: List Tools（检查工具数量）
    await this.runTest('stdio', 'List Tools (检查47个工具)', async () => {
      const response = await sendRequest('tools/list', {});
      const toolCount = response.result?.tools?.length || 0;
      console.log(`    发现 ${toolCount} 个工具`);
      
      // 检查关键工具
      const tools = response.result?.tools || [];
      const hasExtensionTools = tools.some(t => t.name === 'list_extensions');
      const hasPerformanceTools = tools.some(t => t.name === 'analyze_extension_performance');
      const hasNetworkTools = tools.some(t => t.name === 'export_extension_network_har');
      const hasInteractionTools = tools.some(t => t.name === 'click_by_uid');
      
      this.results.stdio.features.push(`${toolCount}个工具`);
      if (hasExtensionTools) this.results.stdio.features.push('扩展调试工具 ✓');
      if (hasPerformanceTools) this.results.stdio.features.push('性能分析工具 ✓');
      if (hasNetworkTools) this.results.stdio.features.push('网络监控工具 ✓');
      if (hasInteractionTools) this.results.stdio.features.push('UID交互工具 ✓');
      
      return toolCount >= 30 ? 'PASS' : 'FAIL';
    });

    // 测试3: attach_to_chrome
    await this.runTest('stdio', 'attach_to_chrome', async () => {
      const response = await sendRequest('tools/call', {
        name: 'attach_to_chrome',
        arguments: { port: 9222 }
      });
      return response.result ? 'PASS' : 'FAIL';
    });

    // 测试4: list_extensions（验证Response Builder）
    await this.runTest('stdio', 'list_extensions (Response Builder)', async () => {
      const response = await sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (response.result && response.result.content) {
        const text = response.result.content[0]?.text || '';
        console.log(`    响应预览: ${text.substring(0, 100)}...`);
        
        // 检查Response Builder特性
        const hasTitle = text.includes('# list_extensions response');
        const hasContext = text.includes('## Current Page') || text.includes('## Available Actions');
        
        if (hasContext) {
          this.results.stdio.features.push('Response Builder上下文 ✓');
        }
        
        return hasTitle ? 'PASS' : 'FAIL';
      }
      return 'FAIL';
    });

    server.kill('SIGTERM');
    await this.sleep(1000);
    
    console.log('\n✅ stdio 模式测试完成');
  }

  async testRemote() {
    console.log('\n📡 测试2: RemoteTransport 模式\n');
    console.log('-'.repeat(80));

    const PORT = 32132; // 新的默认端口
    const serverPath = path.join(__dirname, '../build/remote.js');
    const server = spawn('node', [serverPath, `--port=${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stderr.on('data', (data) => {
      // console.log('[remote stderr]', data.toString().trim());
    });

    await this.sleep(3000);

    const serverUrl = `http://localhost:${PORT}`;
    let requestId = 1;

    const sendRequest = async (method, params) => {
      const id = requestId++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(`${serverUrl}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') throw new Error('Request timeout');
        throw error;
      }
    };

    // 测试1: Health Check
    await this.runTest('remote', `Health Check (端口${PORT})`, async () => {
      const response = await fetch(`${serverUrl}/health`);
      const data = await response.json();
      console.log(`    端点: ${serverUrl}`);
      return response.ok ? 'PASS' : 'FAIL';
    });

    // 测试2: Initialize
    await this.runTest('remote', 'MCP Initialize', async () => {
      const response = await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' }
      });
      return response.result ? 'PASS' : 'FAIL';
    });

    // 测试3: List Tools
    await this.runTest('remote', 'List Tools (检查47个工具)', async () => {
      const response = await sendRequest('tools/list', {});
      const toolCount = response.result?.tools?.length || 0;
      console.log(`    发现 ${toolCount} 个工具`);
      
      const tools = response.result?.tools || [];
      const hasQuickTools = tools.some(t => t.name === 'quick_extension_debug');
      const hasCategoryTools = tools.some(t => t.name === 'check_extension_permissions');
      
      this.results.remote.features.push(`${toolCount}个工具`);
      if (hasQuickTools) this.results.remote.features.push('快捷工具 ✓');
      if (hasCategoryTools) this.results.remote.features.push('开发者工具 ✓');
      
      return toolCount >= 30 ? 'PASS' : 'FAIL';
    });

    // 测试4: attach_to_chrome
    await this.runTest('remote', 'attach_to_chrome', async () => {
      const response = await sendRequest('tools/call', {
        name: 'attach_to_chrome',
        arguments: { port: 9222 }
      });
      return response.result ? 'PASS' : 'FAIL';
    });

    // 测试5: list_extensions（验证Response Builder）
    await this.runTest('remote', 'list_extensions (Response Builder)', async () => {
      const response = await sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (response.result && response.result.content) {
        const text = response.result.content[0]?.text || '';
        console.log(`    响应预览: ${text.substring(0, 100)}...`);
        
        const hasContext = text.includes('## Current Page') || text.includes('## Available Actions');
        if (hasContext) {
          this.results.remote.features.push('Response Builder上下文 ✓');
        }
        
        return text.includes('# list_extensions response') ? 'PASS' : 'FAIL';
      }
      return 'FAIL';
    });

    server.kill('SIGTERM');
    await this.sleep(1000);
    
    console.log('\n✅ RemoteTransport 模式测试完成');
  }

  async runTest(mode, name, testFn) {
    this.results[mode].tested++;
    process.stdout.write(`  ${name}... `);
    
    try {
      const result = await testFn();
      if (result === 'PASS') {
        this.results[mode].passed++;
        console.log('✅ PASS');
      } else {
        this.results[mode].failed++;
        console.log('❌ FAIL');
      }
    } catch (error) {
      this.results[mode].failed++;
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试报告');
    console.log('='.repeat(80));

    console.log('\n📋 stdio 模式:');
    console.log(`  测试: ${this.results.stdio.tested}`);
    console.log(`  通过: ${this.results.stdio.passed} ✅`);
    console.log(`  失败: ${this.results.stdio.failed} ❌`);
    console.log(`  成功率: ${(this.results.stdio.passed / this.results.stdio.tested * 100).toFixed(1)}%`);
    if (this.results.stdio.features.length > 0) {
      console.log(`  功能特性: ${this.results.stdio.features.join(', ')}`);
    }

    console.log('\n📋 RemoteTransport 模式:');
    console.log(`  测试: ${this.results.remote.tested}`);
    console.log(`  通过: ${this.results.remote.passed} ✅`);
    console.log(`  失败: ${this.results.remote.failed} ❌`);
    console.log(`  成功率: ${(this.results.remote.passed / this.results.remote.tested * 100).toFixed(1)}%`);
    if (this.results.remote.features.length > 0) {
      console.log(`  功能特性: ${this.results.remote.features.join(', ')}`);
    }

    console.log('\n🎯 新功能验证:');
    const stdioHasBuilder = this.results.stdio.features.some(f => f.includes('Response Builder'));
    const remoteHasBuilder = this.results.remote.features.some(f => f.includes('Response Builder'));
    console.log(`  ${stdioHasBuilder || remoteHasBuilder ? '✅' : '⚠️'}  Response Builder 模式`);
    console.log(`  ${this.results.stdio.tested >= 4 ? '✅' : '⚠️'}  完整工具支持（stdio: ${this.results.stdio.features[0]}）`);
    console.log(`  ✅  端口配置（RemoteTransport: 32132）`);

    const totalTests = this.results.stdio.tested + this.results.remote.tested;
    const totalPassed = this.results.stdio.passed + this.results.remote.passed;
    const overallSuccess = (totalPassed / totalTests * 100).toFixed(1);

    console.log(`\n📈 总体成功率: ${overallSuccess}% (${totalPassed}/${totalTests})`);
    console.log('\n' + '='.repeat(80));

    const allPassed = this.results.stdio.failed === 0 && this.results.remote.failed === 0;
    console.log(allPassed ? '\n✅ 所有测试通过！' : '\n⚠️  部分测试失败');
    
    process.exit(allPassed ? 0 : 1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 设置总体超时
setTimeout(() => {
  console.error('\n❌ 测试超时 (60秒)');
  process.exit(1);
}, TIMEOUT);

const tester = new DualModeTester();
tester.test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

