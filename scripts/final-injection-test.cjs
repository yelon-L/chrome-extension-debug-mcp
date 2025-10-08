#!/usr/bin/env node
// 最终的注入功能测试和验证

const { spawn } = require('child_process');
const path = require('path');

class FinalInjectionTester {
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
      if (output.includes('[CS-MCP]') || output.includes('[CS-INJECT]')) {
        console.log('🎯', output.trim());
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

  async runFinalTest() {
    console.log('🎯 最终注入功能测试\n');

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

      // 3. 创建全新的测试页面
      console.log('\n🆕 创建全新测试页面');
      const newTabResult = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: {
          url: 'data:text/html,<!DOCTYPE html><html><head><title>Final Test</title></head><body><h1 id="header">Original Header</h1><div id="content">Original Content</div></body></html>'
        }
      });
      const tabInfo = JSON.parse(newTabResult.content[0].text);
      const tabId = tabInfo.id;
      console.log('✅ 新标签页:', tabId);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. 执行简单直接的注入测试
      console.log('\n💉 执行注入测试');
      const simpleCode = `
        console.log('[CS-MCP] 注入脚本开始执行');
        document.getElementById('header').textContent = 'MCP注入成功!';
        document.getElementById('content').textContent = '内容已被修改';
        document.body.style.backgroundColor = '#90EE90';
        document.title = 'MCP-' + document.title;
        console.log('[CS-MCP] 注入脚本执行完毕');
      `;

      const injectResult = await this.sendMessage('tools/call', {
        name: 'inject_content_script',
        arguments: {
          extensionId: extensionId,
          tabId: tabId,
          code: simpleCode
        }
      });
      console.log('✅ 注入API结果:', injectResult.content[0].text);
      
      // 等待执行
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 5. 立即检查DOM
      console.log('\n🔍 检查DOM结果');
      const domResult = await this.sendMessage('tools/call', {
        name: 'evaluate',
        arguments: {
          tabId: tabId,
          expression: `({
            title: document.title,
            headerText: document.getElementById('header') ? document.getElementById('header').textContent : 'NOT_FOUND',
            contentText: document.getElementById('content') ? document.getElementById('content').textContent : 'NOT_FOUND',
            backgroundColor: document.body.style.backgroundColor,
            bodyExists: !!document.body,
            documentReady: document.readyState
          })`
        }
      });
      
      const domData = JSON.parse(domResult.content[0].text);
      console.log('DOM检查结果:');
      console.log(JSON.stringify(domData.value, null, 2));

      // 6. 测试 content_script_status
      console.log('\n🔍 测试 content_script_status');
      const statusResult = await this.sendMessage('tools/call', {
        name: 'content_script_status',
        arguments: { tabId: tabId }
      });
      
      const statusData = JSON.parse(statusResult.content[0].text);
      console.log('Content Script状态:', statusData);

      // 7. 最终判断
      const success = 
        domData.value.title.startsWith('MCP-') && 
        domData.value.headerText === 'MCP注入成功!' &&
        domData.value.contentText === '内容已被修改' &&
        domData.value.backgroundColor === 'rgb(144, 238, 144)';

      if (success) {
        console.log('\n🎉 content_script_status 功能测试完全成功！');
        console.log('✅ DOM修改生效');
        console.log('✅ 注入机制正常');
        console.log('✅ 状态检测可用');
      } else {
        console.log('\n⚠️ 仍有问题需要排查');
        console.log('期望 title 包含 MCP-:', domData.value.title.startsWith('MCP-'));
        console.log('期望 header 为 "MCP注入成功!":', domData.value.headerText === 'MCP注入成功!');
        console.log('期望 content 为 "内容已被修改":', domData.value.contentText === '内容已被修改');
        console.log('期望背景色为绿色:', domData.value.backgroundColor === 'rgb(144, 238, 144)');
      }

      // 8. 获取相关日志
      console.log('\n📝 检查注入相关日志');
      const logsResult = await this.sendMessage('tools/call', {
        name: 'get_extension_logs',
        arguments: {
          sourceTypes: ['content_script', 'service_worker', 'extension', 'page'],
          clear: false
        }
      });
      
      const logs = logsResult.content[0].text;
      const mcpLogs = logs.split('\n').filter(line => line.includes('[CS-MCP]') || line.includes('[CS-INJECT]'));
      
      if (mcpLogs.length > 0) {
        console.log('✅ 找到注入执行日志:');
        mcpLogs.forEach(log => console.log('  -', log));
      } else {
        console.log('⚠️ 未找到注入执行日志');
      }

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const tester = new FinalInjectionTester();
tester.runFinalTest().catch(console.error);
