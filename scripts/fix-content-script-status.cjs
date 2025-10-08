#!/usr/bin/env node
// 修复并验证 content_script_status 功能

const { spawn } = require('child_process');
const path = require('path');

class ContentScriptStatusFixer {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.responses = new Map();
    this.buffer = Buffer.alloc(0);
  }

  encodeMessage(message) {
    const payload = JSON.stringify(message) + '\n';
    return Buffer.from(payload, 'utf8');
  }

  sendMessage(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params
    };
    
    const encoded = this.encodeMessage(message);
    this.serverProcess.stdin.write(encoded);
    
    return new Promise((resolve, reject) => {
      this.responses.set(message.id, { resolve, reject });
      
      setTimeout(() => {
        if (this.responses.has(message.id)) {
          this.responses.delete(message.id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 15000);
    });
  }

  handleServerData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    const text = this.buffer.toString('utf8');
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const response = JSON.parse(line);
        
        if (response.id && this.responses.has(response.id)) {
          const { resolve, reject } = this.responses.get(response.id);
          this.responses.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || 'MCP Error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    
    this.buffer = Buffer.from(lines[lines.length - 1], 'utf8');
  }

  async startServer() {
    const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
    
    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.serverProcess.stdout.on('data', (data) => {
      this.handleServerData(data);
    });

    this.serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('[SW]') || output.includes('[CS]')) {
        console.log('🔧', output.trim());
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async fixAndTestContentScriptStatus() {
    console.log('🔧 修复并验证 content_script_status 功能\n');

    try {
      await this.startServer();

      // 1. 连接
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });
      console.log('✅ 连接成功');

      // 2. 获取扩展信息
      const extensionsResult = await this.sendMessage('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      const extensions = JSON.parse(extensionsResult.content[0].text);
      const extensionId = extensions.find(ext => ext.url && ext.url.includes('chrome-extension://'))?.url?.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
      console.log('✅ 扩展ID:', extensionId);

      // 3. 强制重载扩展以应用新权限
      console.log('\n🔄 重载扩展以应用新权限');
      try {
        const reloadResult = await this.sendMessage('tools/call', {
          name: 'reload_extension',
          arguments: { extensionId: extensionId }
        });
        console.log('✅ 扩展重载成功');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.log('⚠️ 扩展重载失败:', e.message);
      }

      // 4. 测试已存在的HTTP页面（避免权限问题）
      console.log('\n🌐 测试已存在的HTTP页面');
      const tabsResult = await this.sendMessage('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      const tabs = JSON.parse(tabsResult.content[0].text);
      console.log(`发现 ${tabs.length} 个标签页`);
      
      // 找一个HTTP页面进行测试
      const httpTab = tabs.find(tab => tab.url.startsWith('http://') && !tab.url.includes('localhost:8081'));
      if (!httpTab) {
        console.log('⚠️ 未找到合适的HTTP页面，创建一个新的');
        
        // 创建新的HTTP页面
        const newTabResult = await this.sendMessage('tools/call', {
          name: 'new_tab',
          arguments: { url: 'https://httpbin.org/html' }
        });
        const newTabInfo = JSON.parse(newTabResult.content[0].text);
        const testTabId = newTabInfo.id;
        console.log('✅ 创建测试页面:', testTabId);
        
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // 测试注入
        await this.testInjectionAndStatus(extensionId, testTabId, 'HTTP页面');
        
      } else {
        console.log('✅ 找到HTTP页面:', httpTab.url.substring(0, 50) + '...');
        await this.testInjectionAndStatus(extensionId, httpTab.id, 'HTTP页面');
      }

      // 5. 测试localhost页面
      const localhostTab = tabs.find(tab => tab.url.includes('localhost:8081'));
      if (localhostTab) {
        console.log('\n🏠 测试localhost页面');
        await this.testInjectionAndStatus(extensionId, localhostTab.id, 'localhost页面');
      }

    } catch (error) {
      console.error('❌ 修复失败:', error.message);
    } finally {
      this.stopServer();
    }
  }

  async testInjectionAndStatus(extensionId, tabId, pageType) {
    console.log(`\n💉 测试注入到 ${pageType} (${tabId})`);
    
    // 1. 注入测试脚本
    const injectionCode = `
      console.log('[CS-MCP] 开始执行注入脚本');
      
      // 创建明显的视觉标记
      const mcpDiv = document.createElement('div');
      mcpDiv.id = 'mcp-injection-marker';
      mcpDiv.style.cssText = \`
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 200px !important;
        height: 50px !important;
        background: #ff4444 !important;
        color: white !important;
        z-index: 999999 !important;
        font-size: 14px !important;
        padding: 10px !important;
        font-family: Arial !important;
        border: 3px solid yellow !important;
      \`;
      mcpDiv.textContent = 'MCP注入成功!';
      document.body.appendChild(mcpDiv);
      
      // 修改页面背景色
      document.body.style.backgroundColor = '#e6f3ff';
      document.body.setAttribute('data-mcp-injected', 'true');
      
      // 修改页面标题
      document.title = 'MCP-' + document.title;
      
      console.log('[CS-MCP] 注入脚本执行完成');
    `;

    try {
      const injectResult = await this.sendMessage('tools/call', {
        name: 'inject_content_script',
        arguments: {
          extensionId: extensionId,
          tabId: tabId,
          code: injectionCode
        }
      });
      console.log('✅ 注入API成功:', injectResult.content[0].text);
      
      // 等待执行
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. 检查DOM变化
      console.log('🔍 检查DOM变化');
      const domResult = await this.sendMessage('tools/call', {
        name: 'evaluate',
        arguments: {
          tabId: tabId,
          expression: `({
            title: document.title,
            backgroundColor: document.body.style.backgroundColor,
            mcpMarker: !!document.getElementById('mcp-injection-marker'),
            injectedAttr: document.body.getAttribute('data-mcp-injected'),
            bodyChildren: document.body.children.length
          })`
        }
      });
      
      const domData = JSON.parse(domResult.content[0].text);
      console.log('DOM检查结果:', JSON.stringify(domData.value, null, 2));
      
      // 3. 测试 content_script_status
      console.log('🔍 测试 content_script_status');
      const statusResult = await this.sendMessage('tools/call', {
        name: 'content_script_status',
        arguments: { tabId: tabId }
      });
      
      const statusData = JSON.parse(statusResult.content[0].text);
      console.log('Content Script状态:', statusData);
      
      // 4. 判断是否成功
      const success = domData.value.mcpMarker && domData.value.injectedAttr === 'true' && domData.value.title.includes('MCP-');
      if (success) {
        console.log(`🎉 ${pageType} 注入完全成功！`);
      } else {
        console.log(`⚠️ ${pageType} 注入可能有问题`);
      }
      
    } catch (e) {
      console.log(`❌ ${pageType} 注入失败:`, e.message);
    }
  }
}

const fixer = new ContentScriptStatusFixer();
fixer.fixAndTestContentScriptStatus().catch(console.error);
