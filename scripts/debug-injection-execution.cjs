#!/usr/bin/env node
// 专门调试注入脚本执行问题

const { spawn } = require('child_process');
const path = require('path');

class InjectionDebugger {
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

  async debugInjectionExecution() {
    console.log('🔍 调试注入脚本执行问题\n');

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

      // 3. 创建测试页面
      console.log('\n🆕 创建测试页面');
      const newTabResult = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: {
          url: 'data:text/html,<html><head><title>Injection Debug</title></head><body><h1 id="title">原始标题</h1><div id="result">未修改</div><script>console.log("页面加载完成");</script></body></html>'
        }
      });
      const tabInfo = JSON.parse(newTabResult.content[0].text);
      const tabId = tabInfo.id;
      console.log('✅ 标签页ID:', tabId);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. 测试多种注入方式
      const testCases = [
        {
          name: '简单DOM修改',
          code: 'document.getElementById("result").textContent = "简单修改成功"; console.log("[CS-TEST] 简单修改执行");'
        },
        {
          name: '添加CSS样式',
          code: 'document.body.style.backgroundColor = "lightblue"; document.body.style.border = "3px solid red"; console.log("[CS-TEST] 样式修改执行");'
        },
        {
          name: '创建新元素',
          code: 'var div = document.createElement("div"); div.id = "mcp-test"; div.textContent = "MCP注入测试"; div.style.cssText = "position:fixed;top:10px;right:10px;background:yellow;padding:10px;z-index:9999;"; document.body.appendChild(div); console.log("[CS-TEST] 元素创建执行");'
        },
        {
          name: '修改页面标题',
          code: 'document.title = "MCP注入成功"; document.getElementById("title").textContent = "MCP修改后的标题"; console.log("[CS-TEST] 标题修改执行");'
        }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n💉 测试 ${i+1}: ${testCase.name}`);
        
        try {
          const injectResult = await this.sendMessage('tools/call', {
            name: 'inject_content_script',
            arguments: {
              extensionId: extensionId,
              tabId: tabId,
              code: testCase.code
            }
          });
          console.log('API结果:', injectResult.content[0].text);
          
          // 等待执行
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 检查效果
          const checkResult = await this.sendMessage('tools/call', {
            name: 'evaluate',
            arguments: {
              tabId: tabId,
              expression: `({
                title: document.title,
                titleElement: document.getElementById("title")?.textContent || "NOT_FOUND",
                resultElement: document.getElementById("result")?.textContent || "NOT_FOUND",
                backgroundColor: document.body.style.backgroundColor,
                border: document.body.style.border,
                testElement: document.getElementById("mcp-test") ? "FOUND" : "NOT_FOUND"
              })`
            }
          });
          
          const checkData = JSON.parse(checkResult.content[0].text);
          console.log('DOM检查:', JSON.stringify(checkData.value, null, 2));
          
        } catch (e) {
          console.log('❌ 测试失败:', e.message);
        }
      }

      // 5. 检查日志中是否有执行痕迹
      console.log('\n📝 检查扩展日志');
      const logsResult = await this.sendMessage('tools/call', {
        name: 'get_extension_logs',
        arguments: {
          sourceTypes: ['content_script', 'service_worker', 'extension', 'page'],
          clear: false
        }
      });
      
      const logs = logsResult.content[0].text;
      console.log('\n最近的日志输出:');
      console.log('='.repeat(60));
      // 只显示最后的相关日志
      const lines = logs.split('\n');
      const recentLines = lines.slice(-20);
      console.log(recentLines.join('\n'));
      console.log('='.repeat(60));
      
      // 统计执行结果
      const csTestLogs = lines.filter(line => line.includes('[CS-TEST]'));
      console.log(`✅ 找到 ${csTestLogs.length} 条测试执行日志`);
      csTestLogs.forEach(log => console.log('  -', log));

    } catch (error) {
      console.error('❌ 调试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const injectionDebugger = new InjectionDebugger();
injectionDebugger.debugInjectionExecution().catch(console.error);
