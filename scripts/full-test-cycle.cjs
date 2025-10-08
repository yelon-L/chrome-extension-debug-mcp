#!/usr/bin/env node
// 完整的测试周期：重载扩展，然后测试注入

const { spawn } = require('child_process');
const path = require('path');

class FullTester {
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
      if (output.includes('[CS] MCP injected') || output.includes('[SW]')) {
        console.log('🔧 服务器输出:', output.trim());
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

  async runFullTest() {
    console.log('🧪 完整扩展调试功能测试\n');

    try {
      await this.startServer();

      // 1. 连接
      console.log('📡 步骤 1: 连接到Chrome');
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });
      console.log('✅ 连接成功');

      // 2. 获取扩展信息
      console.log('\n📋 步骤 2: 获取扩展信息');
      const extensionsResult = await this.sendMessage('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      const extensions = JSON.parse(extensionsResult.content[0].text);
      const extensionId = extensions.find(ext => ext.url && ext.url.includes('chrome-extension://'))?.url?.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
      console.log('✅ 扩展ID:', extensionId);

      // 3. 重载扩展以应用最新的权限
      console.log('\n🔄 步骤 3: 重载扩展（应用新权限）');
      try {
        const reloadResult = await this.sendMessage('tools/call', {
          name: 'reload_extension',
          arguments: { extensionId: extensionId }
        });
        console.log('✅ 扩展重载成功:', reloadResult.content[0].text);
        
        // 等待重载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.log('⚠️ 扩展重载失败:', e.message);
      }

      // 4. 创建测试页面（使用HTTP URL而不是data URL）
      console.log('\n🆕 步骤 4: 创建HTTP测试页面');
      const newTabResult = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: {
          url: 'https://httpbin.org/html'
        }
      });
      const tabInfo = JSON.parse(newTabResult.content[0].text);
      const tabId = tabInfo.id;
      console.log('✅ 创建标签页:', tabId);
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 5. 注入内容脚本
      console.log('\n💉 步骤 5: 注入内容脚本');
      try {
        const injectResult = await this.sendMessage('tools/call', {
          name: 'inject_content_script',
          arguments: {
            extensionId: extensionId,
            tabId: tabId,
            code: `
              console.log('[CS] MCP注入成功 - HTTP页面');
              document.body.style.border = '5px solid green';
              document.body.setAttribute('data-mcp-injected', 'true');
              console.log('[CS] DOM已修改，添加绿色边框');
            `
          }
        });
        console.log('✅ 注入结果:', injectResult.content[0].text);
      } catch (e) {
        console.log('❌ 注入失败:', e.message);
      }

      // 等待注入执行
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 6. 检查注入效果
      console.log('\n🔍 步骤 6: 检查注入效果');
      try {
        const checkResult = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            tabId: tabId,
            expression: `({
              hasBorder: document.body.style.border.includes('green'),
              isInjected: document.body.getAttribute('data-mcp-injected') === 'true',
              borderStyle: document.body.style.border
            })`
          }
        });
        
        const checkData = JSON.parse(checkResult.content[0].text);
        console.log('DOM检查结果:', checkData.value);
        
        if (checkData.value.hasBorder && checkData.value.isInjected) {
          console.log('🎉 注入功能完全正常！');
        } else {
          console.log('⚠️ 注入可能有问题');
        }
      } catch (e) {
        console.log('❌ DOM检查失败:', e.message);
      }

      // 7. 检查Content Script状态
      console.log('\n🔍 步骤 7: 检查Content Script状态');
      try {
        const statusResult = await this.sendMessage('tools/call', {
          name: 'content_script_status',
          arguments: { tabId: tabId }
        });
        
        const status = JSON.parse(statusResult.content[0].text);
        console.log('Content Script状态:', status);
      } catch (e) {
        console.log('❌ 状态检查失败:', e.message);
      }

      // 8. 获取扩展日志
      console.log('\n📝 步骤 8: 获取扩展日志');
      try {
        const logsResult = await this.sendMessage('tools/call', {
          name: 'get_extension_logs',
          arguments: {
            sourceTypes: ['content_script', 'service_worker', 'extension'],
            clear: false
          }
        });
        
        const logs = logsResult.content[0].text;
        console.log('扩展日志:');
        console.log('='.repeat(50));
        console.log(logs);
        console.log('='.repeat(50));
        
        if (logs.includes('[CS] MCP注入成功')) {
          console.log('✅ 在日志中找到注入脚本输出');
        } else {
          console.log('⚠️ 日志中未找到注入脚本输出');
        }
      } catch (e) {
        console.log('❌ 日志获取失败:', e.message);
      }

      console.log('\n🎉 完整测试周期完成！');

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const tester = new FullTester();
tester.runFullTest().catch(console.error);
