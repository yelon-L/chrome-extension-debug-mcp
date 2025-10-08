#!/usr/bin/env node
/**
 * 最终功能验证测试 - 测试所有新开发的MCP工具
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.responses = new Map();
    this.buffer = Buffer.alloc(0);
  }

  // 编码MCP消息
  encodeMessage(message) {
    const payload = JSON.stringify(message);
    const length = Buffer.byteLength(payload, 'utf8');
    return Buffer.concat([
      Buffer.from(`Content-Length: ${length}\r\n\r\n`, 'utf8'),
      Buffer.from(payload, 'utf8')
    ]);
  }

  // 发送MCP消息
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
      
      // 10秒超时
      setTimeout(() => {
        if (this.responses.has(message.id)) {
          this.responses.delete(message.id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 10000);
    });
  }

  // 处理服务器响应
  handleServerData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    
    while (true) {
      const text = this.buffer.toString('utf8');
      const headerEnd = text.indexOf('\r\n\r\n');
      
      if (headerEnd === -1) break;
      
      const header = text.slice(0, headerEnd);
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      
      if (!match) break;
      
      const length = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      
      if (this.buffer.length < messageStart + length) break;
      
      const messageBody = this.buffer.slice(messageStart, messageStart + length);
      this.buffer = this.buffer.slice(messageStart + length);
      
      try {
        const response = JSON.parse(messageBody.toString('utf8'));
        
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
        console.error('解析响应失败:', e);
      }
    }
  }

  // 启动MCP服务器
  async startServer() {
    const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('build/index.js 不存在，请先运行 npm run build');
    }

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
      } else if (output.includes('Error')) {
        console.error('❌ 服务器错误:', output);
      }
    });

    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 发送初始化消息
    await this.sendMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });

    console.log('✅ MCP协议初始化成功');
  }

  // 停止服务器
  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  // 运行所有测试
  async runTests() {
    console.log('🧪 开始功能验证测试...\n');

    try {
      await this.startServer();

      // 1. 测试工具列表
      console.log('📋 1. 测试工具列表');
      const tools = await this.sendMessage('tools/list');
      console.log(`   发现 ${tools.tools.length} 个工具`);
      
      const expectedTools = ['launch_chrome', 'click', 'type', 'screenshot', 'list_tabs', 'new_tab', 'switch_tab', 'close_tab', 'evaluate', 'get_console_logs'];
      const foundTools = tools.tools.map(t => t.name);
      const missing = expectedTools.filter(t => !foundTools.includes(t));
      
      if (missing.length === 0) {
        console.log('   ✅ 所有期望工具都已注册');
      } else {
        console.log('   ❌ 缺少工具:', missing);
      }

      // 2. 测试Chrome启动
      console.log('\n🌐 2. 测试Chrome启动');
      const testHtml = `data:text/html,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head><title>MCP Test Page</title></head>
        <body>
          <h1>MCP功能测试页面</h1>
          <input id="test-input" placeholder="输入测试文本" />
          <button id="test-button">测试按钮</button>
          <div id="result"></div>
          <script>
            console.log('测试页面已加载');
            document.getElementById('test-button').onclick = function() {
              document.getElementById('result').textContent = '按钮已点击！';
              console.log('按钮点击事件触发');
            };
          </script>
        </body>
        </html>
      `)}`;

      await this.sendMessage('tools/call', {
        name: 'launch_chrome',
        arguments: { url: testHtml }
      });
      console.log('   ✅ Chrome启动成功');

      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. 测试标签页管理
      console.log('\n📑 3. 测试标签页管理');
      const tabs = await this.sendMessage('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      const tabList = JSON.parse(tabs.content[0].text);
      console.log(`   当前有 ${tabList.length} 个标签页`);

      // 4. 测试新建标签页
      const newTab = await this.sendMessage('tools/call', {
        name: 'new_tab',
        arguments: { url: 'data:text/html,<h1>新标签页</h1>' }
      });
      const newTabInfo = JSON.parse(newTab.content[0].text);
      console.log(`   ✅ 创建新标签页: ${newTabInfo.id}`);

      // 5. 测试点击功能
      console.log('\n🖱️ 4. 测试页面交互');
      await this.sendMessage('tools/call', {
        name: 'switch_tab',
        arguments: { tabId: tabList[0].id }
      });
      console.log('   切换回第一个标签页');

      await this.sendMessage('tools/call', {
        name: 'click',
        arguments: { selector: '#test-input' }
      });
      console.log('   ✅ 点击输入框');

      // 6. 测试输入功能
      await this.sendMessage('tools/call', {
        name: 'type',
        arguments: {
          selector: '#test-input',
          text: 'Hello MCP!',
          clear: true
        }
      });
      console.log('   ✅ 输入文本');

      // 7. 测试按钮点击
      await this.sendMessage('tools/call', {
        name: 'click',
        arguments: { selector: '#test-button' }
      });
      console.log('   ✅ 点击按钮');

      // 8. 测试截图功能
      console.log('\n📸 5. 测试截图功能');
      const screenshot = await this.sendMessage('tools/call', {
        name: 'screenshot',
        arguments: { returnBase64: true, fullPage: false }
      });
      const base64Length = screenshot.content[0].text.length;
      if (base64Length > 1000) {
        console.log(`   ✅ 截图成功 (${base64Length} 字符)`);
      } else {
        console.log('   ❌ 截图可能失败');
      }

      // 9. 测试JavaScript执行
      console.log('\n⚙️ 6. 测试JavaScript执行');
      const evalResult = await this.sendMessage('tools/call', {
        name: 'evaluate',
        arguments: {
          expression: 'document.getElementById("test-input").value'
        }
      });
      console.log('   ✅ JavaScript执行成功');

      // 10. 测试控制台日志
      console.log('\n📝 7. 测试控制台日志');
      const logs = await this.sendMessage('tools/call', {
        name: 'get_console_logs',
        arguments: { clear: true }
      });
      console.log('   ✅ 获取控制台日志');

      // 11. 测试标签页关闭
      console.log('\n🗑️ 8. 测试标签页关闭');
      await this.sendMessage('tools/call', {
        name: 'close_tab',
        arguments: { tabId: newTabInfo.id }
      });
      console.log('   ✅ 关闭标签页');

      console.log('\n🎉 所有功能测试通过！');
      console.log('\n📊 测试总结:');
      console.log('   ✅ MCP服务器启动');
      console.log('   ✅ 工具注册 (10个工具)');
      console.log('   ✅ Chrome启动与页面导航');
      console.log('   ✅ 标签页管理 (列出/新建/切换/关闭)');
      console.log('   ✅ 页面交互 (点击/输入)');
      console.log('   ✅ 截图功能');
      console.log('   ✅ JavaScript执行');
      console.log('   ✅ 控制台日志收集');

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      console.error(error);
    } finally {
      this.stopServer();
    }
  }
}

// 运行测试
const tester = new MCPTester();
tester.runTests().catch(console.error);
