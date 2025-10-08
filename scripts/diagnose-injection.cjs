#!/usr/bin/env node
// 诊断注入问题

const { spawn } = require('child_process');
const path = require('path');

class InjectionDiagnoser {
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

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async runDiagnosis() {
    console.log('🔬 诊断注入功能问题\n');

    try {
      await this.startServer();

      // 连接
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });
      console.log('✅ 已连接到Chrome');

      // 获取扩展信息
      const extensionsResult = await this.sendMessage('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      const extensions = JSON.parse(extensionsResult.content[0].text);
      const extensionId = extensions.find(ext => ext.url && ext.url.includes('chrome-extension://'))?.url?.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
      console.log('🧩 扩展ID:', extensionId);

      // 测试1: 尝试在Service Worker中直接执行代码并检查错误
      console.log('\n🧪 测试1: 直接在Service Worker中执行代码');
      try {
        const swTestResult = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            expression: `
              // 在当前页面执行，但通过chrome.scripting测试
              (async () => {
                try {
                  // 检查chrome.scripting API是否可用
                  console.log('[SW-TEST] chrome对象:', !!chrome);
                  console.log('[SW-TEST] chrome.scripting:', !!chrome?.scripting);
                  console.log('[SW-TEST] executeScript函数:', typeof chrome?.scripting?.executeScript);
                  return {
                    hasChromeScripting: !!(chrome && chrome.scripting && chrome.scripting.executeScript),
                    chromeScriptingType: typeof chrome?.scripting?.executeScript
                  };
                } catch (e) {
                  console.log('[SW-TEST] 错误:', e.message);
                  return { error: e.message };
                }
              })()
            `
          }
        });
        console.log('Service Worker测试结果:', JSON.stringify(swTestResult, null, 2));
      } catch (e) {
        console.log('❌ Service Worker测试失败:', e.message);
      }

      // 测试2: 检查tabs权限
      console.log('\n🧪 测试2: 检查标签页权限');
      const tabsResult = await this.sendMessage('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      const tabs = JSON.parse(tabsResult.content[0].text);
      console.log('当前标签页数量:', tabs.length);
      console.log('标签页信息:', tabs.map(t => ({ id: t.id, url: t.url.substring(0, 50) + '...' })));

      // 测试3: 尝试注入到一个简单的HTTP页面而不是data URL
      console.log('\n🧪 测试3: 创建一个简单的测试页面并尝试注入');
      
      // 先创建一个新标签页访问一个公开网站
      const httpTabResult = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: {
          url: 'https://httpbin.org/html'  // 一个简单的测试网站
        }
      });
      const httpTabInfo = JSON.parse(httpTabResult.content[0].text);
      const httpTabId = httpTabInfo.id;
      console.log('📄 创建HTTP测试页面:', httpTabId);
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 尝试注入脚本
      console.log('💉 尝试注入到HTTP页面...');
      try {
        const injectResult = await this.sendMessage('tools/call', {
          name: 'inject_content_script',
          arguments: {
            extensionId: extensionId,
            tabId: httpTabId,
            code: `
              console.log('[CS-HTTP] HTTP页面注入成功');
              document.body.style.border = '5px solid red';
              console.log('[CS-HTTP] 已添加红色边框');
            `
          }
        });
        console.log('HTTP注入结果:', injectResult);
        
        // 等待一下再检查
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查是否有边框
        const borderCheckResult = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            tabId: httpTabId,
            expression: `({
              borderStyle: document.body.style.border,
              hasBorder: document.body.style.border.includes('red')
            })`
          }
        });
        
        const borderCheck = JSON.parse(borderCheckResult.content[0].text);
        console.log('边框检查:', borderCheck);
        
        if (borderCheck.value.hasBorder) {
          console.log('🎉 HTTP页面注入成功！');
        } else {
          console.log('❌ HTTP页面注入也失败');
        }
        
      } catch (e) {
        console.log('❌ HTTP页面注入失败:', e.message);
      }

      // 测试4: 检查最新的日志
      console.log('\n🧪 测试4: 检查所有日志');
      const allLogsResult = await this.sendMessage('tools/call', {
        name: 'get_extension_logs',
        arguments: {
          sourceTypes: ['content_script', 'service_worker', 'extension', 'page'],
          clear: false
        }
      });
      
      const allLogs = allLogsResult.content[0].text;
      console.log('所有日志:');
      console.log('='.repeat(60));
      console.log(allLogs);
      console.log('='.repeat(60));

    } catch (error) {
      console.error('❌ 诊断失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const diagnoser = new InjectionDiagnoser();
diagnoser.runDiagnosis().catch(console.error);
