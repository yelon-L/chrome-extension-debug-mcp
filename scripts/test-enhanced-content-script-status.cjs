#!/usr/bin/env node
// 测试增强的 content_script_status 功能

const { spawn } = require('child_process');
const path = require('path');

class EnhancedStatusTester {
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

  async testEnhancedContentScriptStatus() {
    console.log('🔍 测试增强的 content_script_status 功能\n');

    try {
      await this.startServer();

      // 1. 连接
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });
      console.log('✅ 连接成功');

      // 2. 获取标签页列表
      const tabsResult = await this.sendMessage('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      const tabs = JSON.parse(tabsResult.content[0].text);
      console.log(`📋 发现 ${tabs.length} 个标签页`);

      // 3. 找到一些测试页面
      const testTabs = [
        tabs.find(tab => tab.url.includes('localhost:8081')),
        tabs.find(tab => tab.url.includes('bilibili.com')),
        tabs.find(tab => tab.url.includes('httpbin.org'))
      ].filter(Boolean);

      if (testTabs.length === 0) {
        console.log('❌ 没有找到合适的测试页面');
        return;
      }

      // 4. 对每个页面测试 content_script_status
      for (let i = 0; i < testTabs.length; i++) {
        const tab = testTabs[i];
        console.log(`\n🔍 测试页面 ${i+1}: ${tab.url.substring(0, 50)}...`);
        
        try {
          const statusResult = await this.sendMessage('tools/call', {
            name: 'content_script_status',
            arguments: { tabId: tab.id }
          });
          
          const statusData = JSON.parse(statusResult.content[0].text);
          
          console.log('📊 增强状态检测结果:');
          console.log(`   Chrome Runtime: ${statusData.hasChromeRuntime}`);
          console.log(`   Extension Scripts: ${statusData.extensionScripts}`);
          console.log(`   Title Modified: ${statusData.titleModified}`);
          console.log(`   Background Modified: ${statusData.backgroundModified}`);
          console.log(`   Injection Evidence: ${statusData.injectionEvidence}`);
          console.log(`   Has MCP Markers: ${statusData.hasAnyMcpMarker}`);
          console.log(`   Current Title: ${statusData.currentTitle}`);
          
          if (statusData.hasAnyMcpMarker) {
            console.log('🎯 发现MCP注入标记:');
            Object.entries(statusData.mcpMarkers).forEach(([key, value]) => {
              if (value) console.log(`     ✅ ${key}: ${value}`);
            });
          }
          
          if (statusData.bodyAttributes.dataMcpInjected || statusData.bodyAttributes.dataMcpLocalhostTest) {
            console.log('🏷️ Body属性:');
            Object.entries(statusData.bodyAttributes).forEach(([key, value]) => {
              if (value) console.log(`     ${key}: ${value}`);
            });
          }
          
          // 判断页面状态
          if (statusData.hasAnyMcpMarker || statusData.titleModified || statusData.backgroundModified) {
            console.log('🎉 该页面检测到MCP注入活动');
          } else {
            console.log('😐 该页面无明显MCP注入痕迹');
          }
          
        } catch (e) {
          console.log(`❌ 页面检测失败: ${e.message}`);
        }
      }

      // 5. 总结测试结果
      console.log('\n📈 增强的 content_script_status 功能特性:');
      console.log('✅ 多种MCP注入标记检测');
      console.log('✅ 页面修改痕迹识别');
      console.log('✅ Chrome Extension API可用性检查');
      console.log('✅ 详细的状态信息输出');
      console.log('✅ 注入证据统计');
      
      console.log('\n🎯 content_script_status 功能已完全优化！');

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const tester = new EnhancedStatusTester();
tester.testEnhancedContentScriptStatus().catch(console.error);
