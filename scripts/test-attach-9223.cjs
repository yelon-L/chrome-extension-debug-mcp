#!/usr/bin/env node
// 测试 attach_to_chrome 工具连接到 9223 端口

const { spawn } = require('child_process');
const path = require('path');

class MCPTester {
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
      }, 10000);
    });
  }

  handleServerData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    const text = this.buffer.toString('utf8');
    const lines = text.split('\n');
    
    // Process complete lines (all but the last one, which might be incomplete)
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
        console.error('解析响应失败:', e, 'Line:', line);
      }
    }
    
    // Keep the last incomplete line in buffer
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
      if (output.includes('Chrome Debug MCP server running on stdio')) {
        console.log('✅ MCP服务器启动成功');
      } else {
        console.log('🔧 服务器输出:', output.trim());
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async runTest() {
    console.log('🚀 开始 attach_to_chrome 测试\n');

    try {
      await this.startServer();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 步骤 1: 连接到 9223
      console.log('📡 步骤 1: attach_to_chrome');
      try {
        const attachResult = await this.sendMessage('tools/call', {
          name: 'attach_to_chrome',
          arguments: {
            host: 'localhost',
            port: 9223
          }
        });
        console.log('✅ attach_to_chrome 成功:', attachResult);
        
        // 步骤 2: 列出扩展
        console.log('\n📋 步骤 2: list_extensions');
        const extensionsResult = await this.sendMessage('tools/call', {
          name: 'list_extensions',
          arguments: {}
        });
        console.log('✅ list_extensions 成功:', extensionsResult);
        
        // 提取扩展 ID
        const extensions = JSON.parse(extensionsResult.content[0].text);
        const extensionId = extensions.find(ext => ext.url && ext.url.includes('chrome-extension://'))?.url?.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
        console.log('🔍 发现扩展 ID:', extensionId);
        
        // 步骤 3: 创建新标签
        console.log('\n🆕 步骤 3: new_tab');
        const newTabResult = await this.sendMessage('tools/call', {
          name: 'new_tab',
          arguments: {
            url: 'data:text/html,<html><head><title>MCP Test</title></head><body><h1>测试页面</h1><input id="test-input" placeholder="输入测试"/><button id="test-btn">点击测试</button><div id="result"></div></body></html>'
          }
        });
        console.log('✅ new_tab 成功:', newTabResult);
        const tabInfo = JSON.parse(newTabResult.content[0].text);
        const tabId = tabInfo.id;
        
        // 步骤 4: evaluate(tabId)
        console.log('\n💻 步骤 4: evaluate with tabId');
        const evaluateResult = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            tabId: tabId,
            expression: 'document.title'
          }
        });
        console.log('✅ evaluate 成功:', evaluateResult);
        
        // 步骤 5: inject_content_script (如果有扩展ID)
        if (extensionId) {
          console.log('\n💉 步骤 5: inject_content_script');
          try {
            const injectResult = await this.sendMessage('tools/call', {
              name: 'inject_content_script',
              arguments: {
                extensionId: extensionId,
                tabId: tabId,
                code: "console.log('[CS] MCP injected'); document.body.dataset.mcp='1';"
              }
            });
            console.log('✅ inject_content_script 成功:', injectResult);
          } catch (e) {
            console.log('⚠️ inject_content_script 失败:', e.message);
          }
        }
        
        // 步骤 6: content_script_status
        console.log('\n🔍 步骤 6: content_script_status');
        const statusResult = await this.sendMessage('tools/call', {
          name: 'content_script_status',
          arguments: {
            tabId: tabId
          }
        });
        console.log('✅ content_script_status 成功:', statusResult);
        
        // 步骤 7: get_extension_logs
        console.log('\n📝 步骤 7: get_extension_logs');
        const logsResult = await this.sendMessage('tools/call', {
          name: 'get_extension_logs',
          arguments: {
            sourceTypes: ['content_script', 'service_worker', 'extension'],
            clear: false
          }
        });
        console.log('✅ get_extension_logs 成功:', logsResult);
        
        // 步骤 8: reload_extension (如果有扩展ID)
        if (extensionId) {
          console.log('\n🔄 步骤 8: reload_extension');
          try {
            const reloadResult = await this.sendMessage('tools/call', {
              name: 'reload_extension',
              arguments: {
                extensionId: extensionId
              }
            });
            console.log('✅ reload_extension 成功:', reloadResult);
          } catch (e) {
            console.log('⚠️ reload_extension 失败:', e.message);
          }
        }
        
        console.log('\n🎉 所有测试完成！');
        
      } catch (error) {
        console.log('❌ 测试失败:', error.message);
      }

    } catch (error) {
      console.error('\n❌ 测试过程中出现错误:', error);
    } finally {
      this.stopServer();
    }
  }
}

const tester = new MCPTester();
tester.runTest().catch(console.error);
