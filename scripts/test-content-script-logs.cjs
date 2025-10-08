#!/usr/bin/env node
/**
 * 测试Content Script日志捕获功能
 */

const { spawn } = require('child_process');
const path = require('path');

class ContentScriptLogTester {
  constructor() {
    this.serverProcess = null;
    this.messageId = 1;
    this.responses = new Map();
    this.buffer = Buffer.alloc(0);
  }

  encodeMessage(message) {
    const payload = JSON.stringify(message);
    const length = Buffer.byteLength(payload, 'utf8');
    return Buffer.concat([
      Buffer.from(`Content-Length: ${length}\r\n\r\n`, 'utf8'),
      Buffer.from(payload, 'utf8')
    ]);
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
      } else if (output.includes('Console [')) {
        console.log('📝 Console:', output.trim());
      } else if (output.includes('Error')) {
        console.error('❌ 服务器错误:', output);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await this.sendMessage('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'content-script-test', version: '1.0.0' }
      });
      console.log('✅ MCP协议初始化成功');
    } catch (error) {
      console.log('⚠️ MCP协议初始化可能失败，但继续测试...');
    }
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async runTest() {
    console.log('🧪 开始Content Script日志捕获测试...\n');

    try {
      await this.startServer();

      // 等待服务器完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 1. 启动Chrome并加载测试扩展
      console.log('🌐 1. 启动Chrome并加载测试扩展');
      const extensionPath = path.resolve(__dirname, '..', 'test-extension');
      
      try {
        await this.sendMessage('tools/call', {
          name: 'launch_chrome',
          arguments: {
            url: 'data:text/html,<html><head><title>Content Script Test</title></head><body><h1>测试页面</h1><p>等待Content Script注入...</p><script>console.log("页面脚本：页面已加载");</script></body></html>',
            loadExtension: extensionPath,
            disableExtensionsExcept: extensionPath,
            userDataDir: '/tmp/mcp-content-script-test'
          }
        });
        console.log('   ✅ Chrome启动成功，扩展已加载');
      } catch (error) {
        console.log('   ⚠️ Chrome启动可能失败，但继续测试...');
      }

      // 等待扩展加载和Content Script注入
      console.log('⏳ 等待扩展和Content Script加载...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 2. 获取console日志
      console.log('\n📝 2. 获取所有console日志');
      try {
        const logsResult = await this.sendMessage('tools/call', {
          name: 'get_console_logs',
          arguments: { clear: false }
        });

        if (logsResult && logsResult.content && logsResult.content[0]) {
          const logs = logsResult.content[0].text;
          console.log('获取到的日志:');
          console.log('=' .repeat(50));
          console.log(logs);
          console.log('=' .repeat(50));

          // 分析日志内容
          const logLines = logs.split('\n').filter(line => line.trim());
          const contentScriptLogs = logLines.filter(line => 
            line.includes('[content_script]') || 
            line.includes('Content Script') ||
            line.includes('chrome-extension://')
          );
          const backgroundLogs = logLines.filter(line => 
            line.includes('[service_worker]') || 
            line.includes('[extension]') ||
            line.includes('Background')
          );
          const pageLogs = logLines.filter(line => 
            line.includes('[page]') && !line.includes('Content Script')
          );

          console.log('\n📊 日志分析:');
          console.log(`   Content Script 日志: ${contentScriptLogs.length} 条`);
          console.log(`   Background/Extension 日志: ${backgroundLogs.length} 条`);
          console.log(`   页面脚本日志: ${pageLogs.length} 条`);
          console.log(`   总日志数: ${logLines.length} 条`);

          if (contentScriptLogs.length > 0) {
            console.log('\n✅ Content Script 日志捕获成功!');
            console.log('Content Script 日志示例:');
            contentScriptLogs.slice(0, 3).forEach(log => {
              console.log(`   ${log}`);
            });
          } else {
            console.log('\n❌ 没有捕获到Content Script日志');
            console.log('可能的原因:');
            console.log('   1. 扩展加载失败');
            console.log('   2. Content Script注入失败');
            console.log('   3. 执行上下文识别有问题');
            console.log('   4. 日志捕获逻辑需要改进');
          }

        } else {
          console.log('❌ 无法获取日志结果');
        }
      } catch (error) {
        console.log('❌ 获取日志失败:', error.message);
      }

      // 3. 执行JavaScript测试Content Script检测
      console.log('\n🔍 3. 测试Content Script检测');
      try {
        const evalResult = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            expression: `
              // 检测扩展相关对象
              const detection = {
                hasChromeRuntime: !!(window.chrome && window.chrome.runtime),
                extensionId: window.chrome && window.chrome.runtime && window.chrome.runtime.id,
                hasExtensionElement: !!document.getElementById('mcp-extension-test'),
                timestamp: new Date().toISOString()
              };
              
              console.log('[页面脚本] 扩展检测结果:', JSON.stringify(detection));
              detection;
            `
          }
        });

        if (evalResult && evalResult.content) {
          console.log('   扩展检测结果:', evalResult.content[0].text);
        }
      } catch (error) {
        console.log('   JavaScript执行失败:', error.message);
      }

      // 4. 等待更多日志生成
      console.log('\n⏳ 4. 等待更多日志生成...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 5. 再次获取日志看是否有新的Content Script日志
      try {
        const finalLogsResult = await this.sendMessage('tools/call', {
          name: 'get_console_logs',
          arguments: { clear: true }
        });

        if (finalLogsResult && finalLogsResult.content && finalLogsResult.content[0]) {
          const finalLogs = finalLogsResult.content[0].text;
          const finalLogLines = finalLogs.split('\n').filter(line => line.trim());
          const newContentScriptLogs = finalLogLines.filter(line => 
            line.includes('[content_script]') || 
            line.includes('Content Script')
          );

          console.log(`\n📊 最终日志统计: ${finalLogLines.length} 条总日志`);
          console.log(`   其中Content Script日志: ${newContentScriptLogs.length} 条`);

          if (newContentScriptLogs.length > 0) {
            console.log('\n🎉 Content Script日志捕获功能正常!');
          } else {
            console.log('\n🔧 Content Script日志捕获需要进一步优化');
          }
        }
      } catch (error) {
        console.log('获取最终日志失败:', error.message);
      }

    } catch (error) {
      console.error('\n❌ 测试过程中出现错误:', error);
    } finally {
      this.stopServer();
    }
  }
}

// 运行测试
const tester = new ContentScriptLogTester();
tester.runTest().catch(console.error);
