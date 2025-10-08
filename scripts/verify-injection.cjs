#!/usr/bin/env node
// 验证注入脚本是否真正执行

const { spawn } = require('child_process');
const path = require('path');

class InjectionVerifier {
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
      }, 8000);
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
        // console.error('解析响应失败:', e, 'Line:', line);
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
      if (output.includes('[CS] MCP injected')) {
        console.log('🎉 发现注入日志:', output.trim());
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

  async runTest() {
    console.log('🧪 验证内容脚本注入效果\n');

    try {
      await this.startServer();

      // 连接
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });

      // 创建标签页
      const newTabResult = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: {
          url: 'data:text/html,<html><head><title>Injection Test</title></head><body><h1>注入测试</h1><p>ID为1的元素: <span id="marker">未修改</span></p></body></html>'
        }
      });
      const tabInfo = JSON.parse(newTabResult.content[0].text);
      const tabId = tabInfo.id;
      console.log('📄 创建测试页面:', tabId);

      // 获取扩展ID
      const extensionsResult = await this.sendMessage('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      const extensions = JSON.parse(extensionsResult.content[0].text);
      const extensionId = extensions.find(ext => ext.url && ext.url.includes('chrome-extension://'))?.url?.match(/chrome-extension:\/\/([^\/]+)/)?.[1];

      // 注入脚本，修改页面元素
      console.log('💉 注入脚本，修改页面...');
      await this.sendMessage('tools/call', {
        name: 'inject_content_script',
        arguments: {
          extensionId: extensionId,
          tabId: tabId,
          code: `
            console.log('[CS] MCP injected - script executing');
            document.getElementById('marker').textContent = '✅ 已被注入脚本修改';
            document.body.dataset.injected = 'true';
            console.log('[CS] DOM modified successfully');
          `
        }
      });

      // 等待执行
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 检查DOM是否被修改
      console.log('🔍 检查DOM修改...');
      const checkResult = await this.sendMessage('tools/call', {
        name: 'evaluate',
        arguments: {
          tabId: tabId,
          expression: `({
            markerText: document.getElementById('marker')?.textContent || 'NOT_FOUND',
            bodyDataset: document.body.dataset.injected || 'NOT_SET',
            hasMarker: !!document.getElementById('marker')
          })`
        }
      });

      const domCheck = JSON.parse(checkResult.content[0].text);
      console.log('DOM检查结果:', domCheck);

      if (domCheck.value.markerText.includes('✅') && domCheck.value.bodyDataset === 'true') {
        console.log('🎉 注入成功！脚本已正确执行并修改DOM');
      } else {
        console.log('❌ 注入可能失败，DOM未被修改');
        console.log('   - marker文本:', domCheck.value.markerText);
        console.log('   - body dataset:', domCheck.value.bodyDataset);
      }

      // 检查日志
      console.log('\n📝 检查扩展日志...');
      const logsResult = await this.sendMessage('tools/call', {
        name: 'get_extension_logs',
        arguments: {
          sourceTypes: ['content_script', 'service_worker', 'extension', 'page'],
          clear: false
        }
      });

      const logs = logsResult.content[0].text;
      console.log('收集到的日志:', logs.length > 10 ? '有内容' : '空白');
      
      if (logs.includes('[CS] MCP injected') || logs.includes('[CS] DOM modified')) {
        console.log('✅ 在日志中找到注入脚本的输出');
      } else {
        console.log('⚠️ 日志中未找到注入脚本输出');
      }

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const verifier = new InjectionVerifier();
verifier.runTest().catch(console.error);
