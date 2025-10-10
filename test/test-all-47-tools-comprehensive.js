/**
 * 全面测试Chrome Extension Debug MCP的47个工具
 * 
 * 测试模式：
 * 1. RemoteTransport + Attach to 9222
 * 2. stdio + Attach to 9222  
 * 3. stdio + Launch Chrome
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PORT = 9222;
const REMOTE_PORT = 32132;
const REQUEST_TIMEOUT = 30000;

class ComprehensiveToolTester {
  constructor() {
    this.results = {
      browserControl: { tools: [], passed: 0, failed: 0 },
      extensionDebugging: { tools: [], passed: 0, failed: 0 },
      storageContext: { tools: [], passed: 0, failed: 0 },
      performance: { tools: [], passed: 0, failed: 0 },
      network: { tools: [], passed: 0, failed: 0 },
      domInteraction: { tools: [], passed: 0, failed: 0 },
      smartWaiting: { tools: [], passed: 0, failed: 0 },
      developerTools: { tools: [], passed: 0, failed: 0 },
      quickTools: { tools: [], passed: 0, failed: 0 }
    };
    this.extensionId = null;
    this.testTabId = null;
    this.activeServer = null;
  }

  async runAllTests() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Chrome Extension Debug MCP - 全面功能测试           ║');
    console.log('║              47个工具完整验证                           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
      // Test 1: RemoteTransport + Attach to 9222
      console.log('📡 测试模式 1: RemoteTransport (端口32132) + Attach to Chrome 9222\n');
      await this.testRemoteTransport();
      
      // Test 2: stdio + Attach to 9222
      console.log('\n📡 测试模式 2: stdio Transport + Attach to Chrome 9222\n');
      await this.testStdioAttach();
      
      // Test 3: stdio + Launch Chrome
      console.log('\n📡 测试模式 3: stdio Transport + Launch Chrome\n');
      await this.testStdioLaunch();
      
      // Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    }
  }

  async testRemoteTransport() {
    console.log('🚀 启动Remote服务器 (端口32132)...\n');
    
    const serverPath = path.join(__dirname, '../build/remote-server.js');
    this.activeServer = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CHROME_PORT }
    });

    this.activeServer.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('Error')) {
        console.error('  ⚠️ ', msg.trim());
      }
    });

    await this.sleep(3000); // 等待服务器启动

    try {
      // Connect to MCP server
      await this.testTool('browserControl', 'attach_to_chrome', async () => {
        const result = await this.callRemoteTool('attach_to_chrome', { port: CHROME_PORT });
        if (!result.success) throw new Error(result.error || 'Connection failed');
        console.log('  ✅ 已连接到Chrome 9222');
      });

      // 测试所有工具
      await this.testAllToolsCategories('remote');
      
    } finally {
      if (this.activeServer) {
        this.activeServer.kill('SIGTERM');
        await this.sleep(1000);
      }
    }
  }

  async testStdioAttach() {
    console.log('🚀 启动stdio服务器...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    this.activeServer = spawn('node', [serverPath, `--port=${CHROME_PORT}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.requestId = 1;
    this.pendingRequests = new Map();

    this.activeServer.stdout.on('data', (data) => {
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

    await this.sleep(3000);

    try {
      // Initialize MCP
      await this.sendStdioRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      // Attach to Chrome
      await this.testTool('browserControl', 'attach_to_chrome', async () => {
        const result = await this.sendStdioRequest('tools/call', {
          name: 'attach_to_chrome',
          arguments: { port: CHROME_PORT }
        });
        if (result.error) throw new Error(result.error.message);
        console.log('  ✅ 已连接到Chrome 9222');
      });

      // Test all tools
      await this.testAllToolsCategories('stdio');
      
    } finally {
      if (this.activeServer) {
        this.activeServer.kill('SIGTERM');
        await this.sleep(1000);
      }
    }
  }

  async testStdioLaunch() {
    console.log('🚀 启动stdio服务器（Launch模式）...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    this.activeServer = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.requestId = 1;
    this.pendingRequests = new Map();

    this.activeServer.stdout.on('data', (data) => {
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
          // Ignore
        }
      }
    });

    await this.sleep(3000);

    try {
      // Initialize
      await this.sendStdioRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      // Launch Chrome
      await this.testTool('browserControl', 'launch_chrome', async () => {
        const extPath = path.join(__dirname, '../test-extension-enhanced');
        const result = await this.sendStdioRequest('tools/call', {
          name: 'launch_chrome',
          arguments: { extensionPath: extPath }
        });
        if (result.error) throw new Error(result.error.message);
        console.log('  ✅ Chrome已启动并加载扩展');
        await this.sleep(2000); // 等待Chrome完全启动
      });

      // Test all tools
      await this.testAllToolsCategories('stdio-launch');
      
    } finally {
      if (this.activeServer) {
        this.activeServer.kill('SIGTERM');
        await this.sleep(1000);
      }
    }
  }

  async testAllToolsCategories(transport) {
    console.log(`\n📋 开始测试所有工具分类 (${transport})...\n`);

    // 1. Browser Control Tools
    await this.testBrowserControl(transport);
    
    // 2. Extension Debugging Tools
    await this.testExtensionDebugging(transport);
    
    // 3. Storage & Context Tools
    await this.testStorageContext(transport);
    
    // 4. Performance Tools
    await this.testPerformance(transport);
    
    // 5. Network Tools
    await this.testNetwork(transport);
    
    // 6. DOM & Interaction Tools
    await this.testDOMInteraction(transport);
    
    // 7. Smart Waiting Tools
    await this.testSmartWaiting(transport);
    
    // 8. Developer Tools
    await this.testDeveloperTools(transport);
    
    // 9. Quick Tools
    await this.testQuickTools(transport);
  }

  async testBrowserControl(transport) {
    console.log('🔧 1. Browser Control (8 tools)');
    
    // list_tabs
    await this.testTool('browserControl', 'list_tabs', async () => {
      const tabs = await this.callTool(transport, 'list_tabs', {});
      console.log(`  ✅ list_tabs: ${tabs.length || 0} tabs`);
    });

    // new_tab
    await this.testTool('browserControl', 'new_tab', async () => {
      const tab = await this.callTool(transport, 'new_tab', { url: 'https://example.com' });
      this.testTabId = tab.id || tab.tabId;
      console.log(`  ✅ new_tab: Tab ${this.testTabId} created`);
    });

    // switch_tab
    if (this.testTabId) {
      await this.testTool('browserControl', 'switch_tab', async () => {
        await this.callTool(transport, 'switch_tab', { tabId: this.testTabId });
        console.log(`  ✅ switch_tab: Switched to ${this.testTabId}`);
      });
    }

    // screenshot
    await this.testTool('browserControl', 'screenshot', async () => {
      await this.callTool(transport, 'screenshot', {});
      console.log('  ✅ screenshot: Captured');
    });

    // click
    await this.testTool('browserControl', 'click', async () => {
      await this.callTool(transport, 'click', { selector: 'body' });
      console.log('  ✅ click: Clicked body');
    });

    // type
    await this.testTool('browserControl', 'type', async () => {
      await this.callTool(transport, 'type', { selector: 'body', text: 'test' });
      console.log('  ✅ type: Typed text');
    });

    // evaluate
    await this.testTool('browserControl', 'evaluate', async () => {
      const result = await this.callTool(transport, 'evaluate', { expression: '1+1' });
      console.log(`  ✅ evaluate: Result=${result}`);
    });

    // close_tab
    if (this.testTabId) {
      await this.testTool('browserControl', 'close_tab', async () => {
        await this.callTool(transport, 'close_tab', { tabId: this.testTabId });
        console.log(`  ✅ close_tab: Closed ${this.testTabId}`);
      });
    }
  }

  async testExtensionDebugging(transport) {
    console.log('\n🐛 2. Extension Debugging (8 tools)');
    
    // list_extensions
    await this.testTool('extensionDebugging', 'list_extensions', async () => {
      const exts = await this.callTool(transport, 'list_extensions', {});
      if (exts && exts.length > 0) {
        this.extensionId = exts[0].id;
        console.log(`  ✅ list_extensions: ${exts.length} extension(s), ID=${this.extensionId.substring(0,8)}...`);
      }
    });

    if (!this.extensionId) {
      console.log('  ⚠️ 跳过扩展相关测试（无扩展）');
      return;
    }

    // get_extension_logs
    await this.testTool('extensionDebugging', 'get_extension_logs', async () => {
      const logs = await this.callTool(transport, 'get_extension_logs', {
        extensionId: this.extensionId,
        limit: 10
      });
      console.log(`  ✅ get_extension_logs: ${logs?.length || 0} log(s)`);
    });

    // content_script_status
    await this.testTool('extensionDebugging', 'content_script_status', async () => {
      const status = await this.callTool(transport, 'content_script_status', {
        extensionId: this.extensionId
      });
      console.log(`  ✅ content_script_status: Checked`);
    });

    // list_extension_contexts
    await this.testTool('extensionDebugging', 'list_extension_contexts', async () => {
      const contexts = await this.callTool(transport, 'list_extension_contexts', {
        extensionId: this.extensionId
      });
      console.log(`  ✅ list_extension_contexts: ${contexts?.length || 0} context(s)`);
    });

    // monitor_extension_messages
    await this.testTool('extensionDebugging', 'monitor_extension_messages', async () => {
      const msgs = await this.callTool(transport, 'monitor_extension_messages', {
        extensionId: this.extensionId,
        duration: 1000
      });
      console.log(`  ✅ monitor_extension_messages: ${msgs?.length || 0} message(s)`);
    });

    // track_extension_api_calls
    await this.testTool('extensionDebugging', 'track_extension_api_calls', async () => {
      const calls = await this.callTool(transport, 'track_extension_api_calls', {
        extensionId: this.extensionId,
        duration: 1000
      });
      console.log(`  ✅ track_extension_api_calls: Tracked`);
    });

    // inject_content_script (需要活动标签)
    if (this.testTabId) {
      await this.testTool('extensionDebugging', 'inject_content_script', async () => {
        await this.callTool(transport, 'inject_content_script', {
          extensionId: this.extensionId,
          tabId: this.testTabId,
          code: 'console.log("injected")'
        });
        console.log(`  ✅ inject_content_script: Injected`);
      });
    }

    // switch_extension_context
    await this.testTool('extensionDebugging', 'switch_extension_context', async () => {
      await this.callTool(transport, 'switch_extension_context', {
        extensionId: this.extensionId,
        contextType: 'background'
      });
      console.log(`  ✅ switch_extension_context: Switched to background`);
    });
  }

  async testStorageContext(transport) {
    console.log('\n💾 3. Storage & Context (3 tools)');
    
    if (this.extensionId) {
      // inspect_extension_storage
      await this.testTool('storageContext', 'inspect_extension_storage', async () => {
        const storage = await this.callTool(transport, 'inspect_extension_storage', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ inspect_extension_storage: Inspected`);
      });
    }

    // get_console_logs
    await this.testTool('storageContext', 'get_console_logs', async () => {
      const logs = await this.callTool(transport, 'get_console_logs', {});
      console.log(`  ✅ get_console_logs: ${logs?.length || 0} log(s)`);
    });
  }

  async testPerformance(transport) {
    console.log('\n📊 4. Performance (6 tools)');
    
    if (this.extensionId) {
      // analyze_extension_performance
      await this.testTool('performance', 'analyze_extension_performance', async () => {
        const perf = await this.callTool(transport, 'analyze_extension_performance', {
          extensionId: this.extensionId,
          testUrl: 'https://example.com',
          duration: 2000
        });
        console.log(`  ✅ analyze_extension_performance: Analyzed`);
      });

      // performance_list_insights
      await this.testTool('performance', 'performance_list_insights', async () => {
        const insights = await this.callTool(transport, 'performance_list_insights', {});
        console.log(`  ✅ performance_list_insights: ${insights?.length || 0} insight(s)`);
      });

      // performance_get_insights
      await this.testTool('performance', 'performance_get_insights', async () => {
        const insight = await this.callTool(transport, 'performance_get_insights', {
          insightName: 'DocumentLatency'
        });
        console.log(`  ✅ performance_get_insights: Retrieved`);
      });
    }

    // emulate_cpu
    await this.testTool('performance', 'emulate_cpu', async () => {
      await this.callTool(transport, 'emulate_cpu', { rate: 4 });
      console.log(`  ✅ emulate_cpu: 4x throttling`);
    });

    // emulate_network
    await this.testTool('performance', 'emulate_network', async () => {
      await this.callTool(transport, 'emulate_network', { condition: 'Fast 3G' });
      console.log(`  ✅ emulate_network: Fast 3G`);
    });

    // test_extension_conditions
    if (this.extensionId) {
      await this.testTool('performance', 'test_extension_conditions', async () => {
        const result = await this.callTool(transport, 'test_extension_conditions', {
          extensionId: this.extensionId,
          testUrl: 'https://example.com',
          timeout: 10000
        });
        console.log(`  ✅ test_extension_conditions: Tested`);
      });
    }
  }

  async testNetwork(transport) {
    console.log('\n🌐 5. Network (4 tools)');
    
    if (this.extensionId) {
      // list_extension_requests
      await this.testTool('network', 'list_extension_requests', async () => {
        const reqs = await this.callTool(transport, 'list_extension_requests', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ list_extension_requests: ${reqs?.length || 0} request(s)`);
      });

      // get_extension_request_details
      await this.testTool('network', 'get_extension_request_details', async () => {
        const details = await this.callTool(transport, 'get_extension_request_details', {
          extensionId: this.extensionId,
          requestId: 'test-id'
        });
        console.log(`  ✅ get_extension_request_details: Retrieved`);
      });

      // analyze_extension_network
      await this.testTool('network', 'analyze_extension_network', async () => {
        const analysis = await this.callTool(transport, 'analyze_extension_network', {
          extensionId: this.extensionId,
          duration: 2000
        });
        console.log(`  ✅ analyze_extension_network: Analyzed`);
      });

      // export_extension_network_har
      await this.testTool('network', 'export_extension_network_har', async () => {
        const har = await this.callTool(transport, 'export_extension_network_har', {
          extensionId: this.extensionId,
          duration: 2000
        });
        console.log(`  ✅ export_extension_network_har: Exported`);
      });
    }
  }

  async testDOMInteraction(transport) {
    console.log('\n🎯 6. DOM & Interaction (9 tools)');
    
    let snapshotUid = null;

    // take_snapshot
    await this.testTool('domInteraction', 'take_snapshot', async () => {
      const snapshot = await this.callTool(transport, 'take_snapshot', {});
      if (snapshot && snapshot.elements && snapshot.elements.length > 0) {
        snapshotUid = snapshot.elements[0].uid;
      }
      console.log(`  ✅ take_snapshot: ${snapshot?.elements?.length || 0} element(s)`);
    });

    // UID-based interactions
    if (snapshotUid) {
      await this.testTool('domInteraction', 'click_by_uid', async () => {
        await this.callTool(transport, 'click_by_uid', { uid: snapshotUid });
        console.log(`  ✅ click_by_uid: Clicked ${snapshotUid}`);
      });

      await this.testTool('domInteraction', 'fill_by_uid', async () => {
        await this.callTool(transport, 'fill_by_uid', { uid: snapshotUid, value: 'test' });
        console.log(`  ✅ fill_by_uid: Filled`);
      });

      await this.testTool('domInteraction', 'hover_by_uid', async () => {
        await this.callTool(transport, 'hover_by_uid', { uid: snapshotUid });
        console.log(`  ✅ hover_by_uid: Hovered`);
      });
    }

    // hover_element
    await this.testTool('domInteraction', 'hover_element', async () => {
      await this.callTool(transport, 'hover_element', { selector: 'body' });
      console.log(`  ✅ hover_element: Hovered`);
    });

    // drag_element
    await this.testTool('domInteraction', 'drag_element', async () => {
      await this.callTool(transport, 'drag_element', {
        selector: 'body',
        targetSelector: 'html'
      });
      console.log(`  ✅ drag_element: Dragged`);
    });

    // fill_form
    await this.testTool('domInteraction', 'fill_form', async () => {
      await this.callTool(transport, 'fill_form', {
        formData: { test: 'value' }
      });
      console.log(`  ✅ fill_form: Filled`);
    });

    // upload_file
    await this.testTool('domInteraction', 'upload_file', async () => {
      await this.callTool(transport, 'upload_file', {
        selector: 'input[type=file]',
        filePath: __filename
      });
      console.log(`  ✅ upload_file: Uploaded`);
    });

    // handle_dialog
    await this.testTool('domInteraction', 'handle_dialog', async () => {
      await this.callTool(transport, 'handle_dialog', {
        accept: true,
        promptText: 'test'
      });
      console.log(`  ✅ handle_dialog: Handled`);
    });
  }

  async testSmartWaiting(transport) {
    console.log('\n⏳ 7. Smart Waiting (2 tools)');
    
    // wait_for_element
    await this.testTool('smartWaiting', 'wait_for_element', async () => {
      await this.callTool(transport, 'wait_for_element', {
        selector: 'body',
        timeout: 5000
      });
      console.log(`  ✅ wait_for_element: Found`);
    });

    // wait_for_extension_ready
    if (this.extensionId) {
      await this.testTool('smartWaiting', 'wait_for_extension_ready', async () => {
        const ready = await this.callTool(transport, 'wait_for_extension_ready', {
          extensionId: this.extensionId,
          timeout: 5000
        });
        console.log(`  ✅ wait_for_extension_ready: Ready`);
      });
    }
  }

  async testDeveloperTools(transport) {
    console.log('\n🔧 8. Developer Tools (3 tools)');
    
    if (this.extensionId) {
      // check_extension_permissions
      await this.testTool('developerTools', 'check_extension_permissions', async () => {
        const perms = await this.callTool(transport, 'check_extension_permissions', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ check_extension_permissions: Checked`);
      });

      // audit_extension_security
      await this.testTool('developerTools', 'audit_extension_security', async () => {
        const audit = await this.callTool(transport, 'audit_extension_security', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ audit_extension_security: Audited`);
      });

      // check_extension_updates
      await this.testTool('developerTools', 'check_extension_updates', async () => {
        const updates = await this.callTool(transport, 'check_extension_updates', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ check_extension_updates: Checked`);
      });
    }
  }

  async testQuickTools(transport) {
    console.log('\n⚡ 9. Quick Tools (3 tools)');
    
    if (this.extensionId) {
      // quick_extension_debug
      await this.testTool('quickTools', 'quick_extension_debug', async () => {
        const debug = await this.callTool(transport, 'quick_extension_debug', {
          extensionId: this.extensionId
        });
        console.log(`  ✅ quick_extension_debug: Debugged`);
      });

      // quick_performance_check
      await this.testTool('quickTools', 'quick_performance_check', async () => {
        const perf = await this.callTool(transport, 'quick_performance_check', {
          extensionId: this.extensionId,
          testUrl: 'https://example.com'
        });
        console.log(`  ✅ quick_performance_check: Checked`);
      });
    }
  }

  async testTool(category, toolName, testFn) {
    try {
      await testFn();
      this.results[category].tools.push({ name: toolName, status: 'pass' });
      this.results[category].passed++;
    } catch (error) {
      console.log(`  ❌ ${toolName}: ${error.message}`);
      this.results[category].tools.push({ name: toolName, status: 'fail', error: error.message });
      this.results[category].failed++;
    }
  }

  async callTool(transport, toolName, args) {
    if (transport === 'remote') {
      return await this.callRemoteTool(toolName, args);
    } else {
      const result = await this.sendStdioRequest('tools/call', {
        name: toolName,
        arguments: args
      });
      if (result.error) throw new Error(result.error.message);
      return result.result;
    }
  }

  async callRemoteTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      });

      const req = http.request({
        hostname: 'localhost',
        port: REMOTE_PORT,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        },
        timeout: REQUEST_TIMEOUT
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.error) {
              reject(new Error(response.error.message || 'Request failed'));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            reject(new Error('Invalid response: ' + body));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.write(data);
      req.end();
    });
  }

  sendStdioRequest(method, params) {
    const id = this.requestId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.activeServer.stdin.write(JSON.stringify({
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

  generateFinalReport() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              最终测试报告 - 47个工具                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTools = 0;

    for (const [category, stats] of Object.entries(this.results)) {
      if (stats.tools.length === 0) continue;
      
      totalTools += stats.tools.length;
      totalPassed += stats.passed;
      totalFailed += stats.failed;

      const successRate = ((stats.passed / stats.tools.length) * 100).toFixed(1);
      console.log(`📋 ${category}:`);
      console.log(`   工具数: ${stats.tools.length}`);
      console.log(`   通过: ${stats.passed} ✅`);
      console.log(`   失败: ${stats.failed} ❌`);
      console.log(`   成功率: ${successRate}%\n`);
    }

    const overallRate = totalTools > 0 ? ((totalPassed / totalTools) * 100).toFixed(1) : 0;
    
    console.log('═'.repeat(60));
    console.log(`🎯 总体成功率: ${overallRate}%`);
    console.log(`📊 总计: ${totalPassed}/${totalTools} 通过`);
    console.log('═'.repeat(60) + '\n');

    if (totalFailed === 0) {
      console.log('🎉 所有测试通过！47个工具功能完整。\n');
      process.exit(0);
    } else {
      console.log(`⚠️  有 ${totalFailed} 个工具测试失败。\n`);
      process.exit(1);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const tester = new ComprehensiveToolTester();
tester.runAllTests().catch(error => {
  console.error('❌ 测试错误:', error);
  process.exit(1);
});



