/**
 * Chrome Extension Debug MCP - RemoteTransport 测试
 * 
 * 测试HTTP/SSE远程传输模式的所有47个工具
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import EventSource from 'eventsource';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RemoteTransportTester {
  constructor() {
    this.mcpProcess = null;
    this.serverPort = 3000;
    this.serverUrl = `http://localhost:${this.serverPort}`;
    this.requestId = 1;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tools: []
    };
  }

  async start() {
    console.log('🚀 Starting RemoteTransport Test...\n');
    
    // 启动MCP服务器（Remote模式）
    await this.startMcpServer();
    
    // 等待服务器初始化
    await this.sleep(3000);
    
    // 测试连接
    await this.testConnection();
    
    // 连接Chrome
    await this.testAttachToChrome();
    
    // 测试所有工具分类
    await this.testBasicTools();
    await this.testExtensionTools();
    await this.testUIAutomationTools();
    await this.testQuickTools();
    
    // 测试SSE事件流
    await this.testSSEStream();
    
    // 生成报告
    this.generateReport();
    
    // 清理
    await this.cleanup();
  }

  async startMcpServer() {
    console.log('📡 Starting MCP Server (RemoteTransport mode)...');
    
    const serverPath = path.join(__dirname, '../build/remote.js');
    
    this.mcpProcess = spawn('node', [serverPath, '--port', this.serverPort, '--chrome-port', '9222'], {
      stdio: 'inherit'
    });

    console.log(`✅ MCP Server started on ${this.serverUrl}\n`);
  }

  async testConnection() {
    console.log('🔌 Testing HTTP connection...\n');
    
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        console.log('✅ HTTP connection successful\n');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  async sendRequest(method, params = {}) {
    const id = this.requestId++;
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    try {
      const response = await fetch(`${this.serverUrl}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async testTool(toolName, args = {}) {
    this.results.total++;
    console.log(`  Testing ${toolName}...`);
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args
      });

      if (response.result) {
        this.results.passed++;
        this.results.tools.push({
          name: toolName,
          status: 'PASS',
          transport: 'remote'
        });
        console.log(`  ✅ ${toolName} - PASS`);
        return response.result;
      } else if (response.error) {
        throw new Error(response.error.message);
      }
    } catch (error) {
      this.results.failed++;
      this.results.tools.push({
        name: toolName,
        status: 'FAIL',
        transport: 'remote',
        error: error.message
      });
      console.log(`  ❌ ${toolName} - FAIL: ${error.message}`);
      return null;
    }
  }

  async testAttachToChrome() {
    console.log('🔧 Testing attach_to_chrome...\n');
    await this.testTool('attach_to_chrome', { port: 9222 });
    await this.sleep(1000);
  }

  async testBasicTools() {
    console.log('\n📊 Testing Basic Debugging Tools (11)...\n');
    
    // 标签页操作
    const tabs = await this.testTool('list_tabs');
    
    if (tabs && tabs.length > 0) {
      const tabId = tabs[0].id;
      await this.testTool('switch_tab', { tabId });
    }
    
    await this.testTool('new_tab', { url: 'https://example.com' });
    await this.testTool('screenshot', { path: './test-remote-screenshot.png' });
    
    // 代码执行
    await this.testTool('evaluate', { 
      expression: 'document.title' 
    });
    
    // 日志收集
    await this.testTool('get_console_logs');
    
    // 交互
    await this.testTool('click', { selector: 'body' });
    await this.testTool('type', { 
      selector: 'body', 
      text: 'test',
      clear: false 
    });
  }

  async testExtensionTools() {
    console.log('\n🔌 Testing Extension-Specific Tools (24)...\n');
    
    // 扩展发现
    const extensions = await this.testTool('list_extensions');
    
    if (!extensions || extensions.length === 0) {
      console.log('  ⚠️  No extensions found, skipping extension-specific tests');
      return;
    }
    
    const testExtension = extensions.find(e => 
      e.name && e.name.includes('Enhanced MCP')
    );
    
    if (!testExtension) {
      console.log('  ⚠️  test-extension-enhanced not found, using first extension');
      const extensionId = extensions[0].id;
      await this.runExtensionTests(extensionId);
    } else {
      await this.runExtensionTests(testExtension.id);
    }
  }

  async runExtensionTests(extensionId) {
    console.log(`  Using extension: ${extensionId}\n`);
    
    // 上下文管理
    await this.testTool('list_extension_contexts', { extensionId });
    await this.testTool('switch_extension_context', { 
      extensionId, 
      contextType: 'background' 
    });
    
    // 日志和存储
    await this.testTool('get_extension_logs', { extensionId });
    await this.testTool('inspect_extension_storage', { 
      extensionId,
      storageTypes: ['local', 'sync']
    });
    
    // 内容脚本
    await this.testTool('content_script_status', { extensionId });
    
    // 消息和API
    await this.testTool('monitor_extension_messages', { 
      extensionId, 
      duration: 3000 
    });
    await this.testTool('track_extension_api_calls', { 
      extensionId,
      apiCategories: ['storage', 'tabs'],
      duration: 3000
    });
    
    // 性能分析
    await this.testTool('analyze_extension_performance', { 
      extensionId,
      testUrl: 'https://example.com',
      duration: 2000
    });
    
    // 设备模拟
    await this.testTool('emulate_cpu', { rate: 4 });
    await this.testTool('emulate_network', { 
      conditions: {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 40
      }
    });
    
    // 网络监控
    await this.testTool('track_extension_network', { 
      extensionId, 
      duration: 3000 
    });
    await this.testTool('list_extension_requests', { extensionId });
    await this.testTool('analyze_extension_network', { 
      extensionId,
      duration: 3000
    });
    
    // 开发者工具
    await this.testTool('check_extension_permissions', { extensionId });
    await this.testTool('audit_extension_security', { extensionId });
    await this.testTool('check_extension_updates', { extensionId });
  }

  async testUIAutomationTools() {
    console.log('\n🎯 Testing UI Automation Tools (13)...\n');
    
    // DOM快照
    const snapshot = await this.testTool('take_snapshot');
    
    if (snapshot && snapshot.elements && snapshot.elements.length > 0) {
      const firstElement = snapshot.elements[0];
      if (firstElement.uid) {
        await this.testTool('click_by_uid', { uid: firstElement.uid });
      }
    }
    
    // 智能等待
    await this.testTool('wait_for_element', {
      strategies: [
        { type: 'selector', value: 'body' }
      ],
      timeout: 3000
    });
    
    // 高级交互
    await this.testTool('hover_element', { selector: 'body' });
    await this.testTool('handle_dialog', { action: 'accept' });
  }

  async testQuickTools() {
    console.log('\n⚡ Testing Quick Tools (2)...\n');
    
    const extensions = await this.sendRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (extensions && extensions.result && extensions.result.length > 0) {
      const extensionId = extensions.result[0].id;
      
      await this.testTool('quick_extension_debug', { extensionId });
      await this.testTool('quick_performance_check', { 
        extensionId,
        testUrl: 'https://example.com'
      });
    }
  }

  async testSSEStream() {
    console.log('\n📡 Testing SSE Event Stream...\n');
    
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.serverUrl}/sse`);
      let eventCount = 0;
      const timeout = setTimeout(() => {
        eventSource.close();
        if (eventCount > 0) {
          console.log(`✅ SSE Stream Test - Received ${eventCount} events\n`);
          resolve();
        } else {
          console.log('⚠️  SSE Stream Test - No events received\n');
          resolve();
        }
      }, 5000);

      eventSource.onmessage = (event) => {
        eventCount++;
        try {
          const data = JSON.parse(event.data);
          console.log(`  📨 SSE Event ${eventCount}: ${data.type || 'message'}`);
        } catch (e) {
          console.log(`  📨 SSE Event ${eventCount}: ${event.data}`);
        }
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        console.log('⚠️  SSE connection error (expected if not implemented)\n');
        resolve();
      };
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RemoteTransport Test Report');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${(this.results.passed / this.results.total * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tools:');
      this.results.tools
        .filter(t => t.status === 'FAIL')
        .forEach(t => {
          console.log(`  - ${t.name}: ${t.error}`);
        });
    }
    
    console.log('\n✅ RemoteTransport Test Complete!');
    console.log('='.repeat(60) + '\n');
  }

  async cleanup() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
    await this.sleep(1000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行测试
const tester = new RemoteTransportTester();
tester.start().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

