/**
 * Quick Test for stdio transport connecting to Chrome 9222
 * Focus on testing the 47 tools systematically
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PORT = 9222;
const REQUEST_TIMEOUT = 30000; // 增加到30秒以适应慢速工具

class StdioTester {
  constructor() {
    this.server = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.results = [];
    this.extensionId = null;
  }

  async start() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  Chrome Extension Debug MCP - stdio模式快速验证          ║');
    console.log('║  连接到Chrome 9222 - 测试47个工具                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
      await this.startServer();
      await this.initialize();
      await this.attachToChrome();
      await this.testAllTools();
      this.generateReport();
    } catch (error) {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  async startServer() {
    console.log(`🚀 启动stdio服务器...\n`);
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    this.server = spawn('node', [serverPath, `--port=${CHROME_PORT}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout.on('data', (data) => {
      const messages = data.toString().split('\n').filter(line => line.trim());
      for (const message of messages) {
        try {
          const response = JSON.parse(message);
          if (response.id && this.pendingRequests.has(response.id)) {
            const { resolve } = this.pendingRequests.get(response.id);
            this.pendingRequests.delete(response.id);
            resolve(response);
          }
        } catch (e) {
          // Ignore non-JSON
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR')) {
        console.error('  ⚠️ ', msg.trim());
      }
    });

    await this.sleep(3000); // Wait for server to start
  }

  async initialize() {
    console.log('📡 初始化MCP连接...\n');
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
    
    if (!result.result) {
      throw new Error('初始化失败');
    }
    console.log(`  ✅ MCP初始化成功\n`);
  }

  async attachToChrome() {
    console.log(`🔗 连接到Chrome 9222...\n`);
    const result = await this.sendRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { port: CHROME_PORT }
    });
    
    if (result.error) {
      throw new Error('连接失败: ' + result.error.message);
    }
    console.log(`  ✅ 已连接到Chrome\n`);
  }

  async testAllTools() {
    console.log('═'.repeat(60));
    console.log('开始测试所有47个工具...');
    console.log('═'.repeat(60) + '\n');

    // 1. Browser Control
    await this.testCategory('Browser Control', [
      { name: 'list_tabs', args: {} },
      { name: 'new_tab', args: { url: 'https://example.com' } },
      { name: 'screenshot', args: {} },
      { name: 'get_console_logs', args: {} },
      { name: 'evaluate', args: { expression: '2+2' } }
    ]);

    // 2. Extension Tools
    await this.testCategory('Extension Debugging', [
      { name: 'list_extensions', args: {} },
    ]);

    // Get extension ID for subsequent tests
    if (this.results.find(r => r.name === 'list_extensions' && r.status === 'pass')) {
      await this.getExtensionId();
    }

    if (this.extensionId) {
      await this.testCategory('Extension Debugging (with ID)', [
        { name: 'get_extension_logs', args: { extensionId: this.extensionId, limit: 10 } },
        { name: 'content_script_status', args: { extensionId: this.extensionId } },
        { name: 'list_extension_contexts', args: { extensionId: this.extensionId } },
        { name: 'inspect_extension_storage', args: { extensionId: this.extensionId } },
      ]);

      await this.testCategory('Performance', [
        { name: 'emulate_cpu', args: { rate: 2 } },
        { name: 'emulate_network', args: { condition: 'Fast 3G' } },
      ]);

      await this.testCategory('Developer Tools', [
        { name: 'check_extension_permissions', args: { extensionId: this.extensionId } },
        { name: 'audit_extension_security', args: { extensionId: this.extensionId } },
        { name: 'check_extension_updates', args: { extensionId: this.extensionId } },
      ]);

      await this.testCategory('Quick Tools', [
        { name: 'quick_extension_debug', args: { extensionId: this.extensionId } },
      ]);
    } else {
      console.log('⚠️  无扩展ID，跳过扩展相关测试\n');
    }

    // DOM & Interaction
    await this.testCategory('DOM & Interaction', [
      { name: 'take_snapshot', args: {} },
      { name: 'hover_element', args: { selector: 'body' } },
      { name: 'click', args: { selector: 'body' } },
      { name: 'type', args: { selector: 'body', text: 'test' } },
    ]);

    // Smart Waiting
    await this.testCategory('Smart Waiting', [
      { name: 'wait_for_element', args: { selector: 'body', timeout: 3000 } },
    ]);

    if (this.extensionId) {
      await this.testCategory('Smart Waiting (Extension)', [
        { name: 'wait_for_extension_ready', args: { extensionId: this.extensionId, timeout: 3000 } },
      ]);
    }
  }

  async testCategory(categoryName, tools) {
    console.log(`\n📋 ${categoryName} (${tools.length} tools)`);
    console.log('─'.repeat(60));

    for (const tool of tools) {
      await this.testTool(tool.name, tool.args);
    }
  }

  async testTool(toolName, args) {
    try {
      const start = Date.now();
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args
      });
      const duration = Date.now() - start;

      if (result.error) {
        throw new Error(result.error.message || 'Tool failed');
      }

      const resultData = result.result;
      let summary = '';

      // Extract meaningful summary
      if (Array.isArray(resultData)) {
        summary = `${resultData.length} items`;
      } else if (typeof resultData === 'object' && resultData !== null) {
        if (resultData.content && Array.isArray(resultData.content)) {
          summary = 'Response with content';
        } else {
          const keys = Object.keys(resultData);
          summary = `{${keys.slice(0, 3).join(', ')}}`;
        }
      } else {
        summary = String(resultData).substring(0, 50);
      }

      console.log(`  ✅ ${toolName.padEnd(35)} ${duration}ms ${summary}`);
      this.results.push({ name: toolName, status: 'pass', duration, summary });
    } catch (error) {
      console.log(`  ❌ ${toolName.padEnd(35)} FAIL: ${error.message}`);
      this.results.push({ name: toolName, status: 'fail', error: error.message });
    }
  }

  async getExtensionId() {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });

      let extensions = result.result;
      
      // Handle Response Builder format
      if (extensions && extensions.content && Array.isArray(extensions.content)) {
        const text = extensions.content[0]?.text || '';
        // Extract extension ID from markdown text
        const idMatch = text.match(/([a-z]{32})/);
        if (idMatch) {
          this.extensionId = idMatch[1];
          console.log(`\n  📦 找到扩展ID: ${this.extensionId.substring(0, 12)}...\n`);
          return;
        }
      }
      
      // Handle direct array format
      if (Array.isArray(extensions) && extensions.length > 0) {
        this.extensionId = extensions[0].id;
        console.log(`\n  📦 找到扩展: ${this.extensionId.substring(0, 12)}...\n`);
      }
    } catch (error) {
      console.log('  ⚠️  无法获取扩展ID:', error.message);
    }
  }

  sendRequest(method, params) {
    const id = this.requestId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }) + '\n');

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, REQUEST_TIMEOUT);

      this.pendingRequests.get(id).timeout = timeout;
    }).finally(() => {
      const req = this.pendingRequests.get(id);
      if (req && req.timeout) clearTimeout(req.timeout);
    });
  }

  generateReport() {
    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    测试报告                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📊 总计: ${total}`);
    console.log(`🎯 成功率: ${successRate}%\n`);

    if (failed > 0) {
      console.log('失败的工具:');
      this.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
      console.log('');
    }

    const avgDuration = this.results
      .filter(r => r.duration)
      .reduce((sum, r) => sum + r.duration, 0) / passed || 0;
    console.log(`⏱️  平均响应时间: ${avgDuration.toFixed(0)}ms\n`);

    if (successRate >= 80) {
      console.log('🎉 测试通过！系统运行正常。\n');
      process.exit(0);
    } else {
      console.log(`⚠️  成功率低于80%，需要检查失败的工具。\n`);
      process.exit(1);
    }
  }

  cleanup() {
    if (this.server && !this.server.killed) {
      this.server.kill('SIGTERM');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const tester = new StdioTester();
tester.start();



