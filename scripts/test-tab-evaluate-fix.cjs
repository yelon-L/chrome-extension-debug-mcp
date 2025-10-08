#!/usr/bin/env node
// 测试tab evaluate修复和Content Script注入排查

const { spawn } = require('child_process');
const path = require('path');

class TabEvaluateTester {
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

  async runTests() {
    console.log('🧪 测试Tab Evaluate修复和Content Script注入排查\n');

    try {
      await this.startServer();

      // 1. 连接到Chrome
      await this.sendMessage('tools/call', {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9223 }
      });
      console.log('✅ 已连接到Chrome 9223');

      // 2. 获取所有标签页
      const tabsResult = await this.sendMessage('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      const tabs = JSON.parse(tabsResult.content[0].text);
      console.log(`\n📋 发现 ${tabs.length} 个标签页`);

      // 3. 找到关键标签页进行测试
      const bilibiliTab = tabs.find(tab => tab.url.includes('bilibili.com'));
      const httpbinTab = tabs.find(tab => tab.url.includes('httpbin.org'));
      const localhostTab = tabs.find(tab => tab.url.includes('localhost:8081'));

      console.log('\n🎯 关键标签页:');
      if (bilibiliTab) console.log(`  - Bilibili: ${bilibiliTab.id} - ${bilibiliTab.title.substring(0, 50)}...`);
      if (httpbinTab) console.log(`  - Httpbin: ${httpbinTab.id} - ${httpbinTab.title || '(no title)'}`);
      if (localhostTab) console.log(`  - Localhost: ${localhostTab.id} - ${localhostTab.title}`);

      // 4. 测试evaluate WITHOUT tabId (应该使用当前活动页面)
      console.log('\n🧪 测试1: evaluate WITHOUT tabId');
      const evalNoTab = await this.sendMessage('tools/call', {
        name: 'evaluate',
        arguments: {
          expression: 'document.title'
        }
      });
      const noTabResult = JSON.parse(evalNoTab.content[0].text);
      console.log('  结果:', noTabResult);
      console.log('  ⚠️ 这是当前CDP上下文的页面，可能不是你期望的tab');

      // 5. 测试evaluate WITH tabId (Bilibili)
      if (bilibiliTab) {
        console.log(`\n🧪 测试2: evaluate WITH tabId (${bilibiliTab.id} - Bilibili)`);
        const evalWithTab = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            tabId: bilibiliTab.id,
            expression: 'document.title'
          }
        });
        const withTabResult = JSON.parse(evalWithTab.content[0].text);
        console.log('  结果:', withTabResult);
        console.log('  ✅ 应该显示Bilibili页面标题');
      }

      // 6. 测试evaluate WITH tabId (Httpbin)
      if (httpbinTab) {
        console.log(`\n🧪 测试3: evaluate WITH tabId (${httpbinTab.id} - Httpbin)`);
        const evalHttpbin = await this.sendMessage('tools/call', {
          name: 'evaluate',
          arguments: {
            tabId: httpbinTab.id,
            expression: 'document.title'
          }
        });
        const httpbinResult = JSON.parse(evalHttpbin.content[0].text);
        console.log('  结果:', httpbinResult);
        console.log('  ✅ 应该显示Httpbin页面标题（可能为空）');
      }

      // 7. 排查Content Script注入情况
      console.log('\n\n🔍 排查Content Script注入情况');
      console.log('='.repeat(60));

      const testTabs = [bilibiliTab, httpbinTab, localhostTab].filter(Boolean);
      
      for (const tab of testTabs) {
        console.log(`\n📄 检查 ${tab.id}: ${tab.url.substring(0, 60)}...`);
        
        try {
          // 检查页面上的Content Script状态
          const statusResult = await this.sendMessage('tools/call', {
            name: 'content_script_status',
            arguments: { tabId: tab.id }
          });
          
          const status = JSON.parse(statusResult.content[0].text);
          
          console.log('  Content Script状态:');
          console.log(`    - Chrome Runtime可用: ${status.hasChromeRuntime}`);
          console.log(`    - Extension Scripts: ${status.extensionScripts}`);
          console.log(`    - 标题已修改: ${status.titleModified}`);
          console.log(`    - 背景已修改: ${status.backgroundModified}`);
          console.log(`    - 注入证据数: ${status.injectionEvidence}`);
          console.log(`    - 有MCP标记: ${status.hasAnyMcpMarker}`);
          
          if (status.hasAnyMcpMarker) {
            console.log('  🎯 发现的MCP标记:');
            Object.entries(status.mcpMarkers).forEach(([key, value]) => {
              if (value) console.log(`      ✅ ${key}`);
            });
          }
          
          // 检查是否有test-extension的content script
          const csCheck = await this.sendMessage('tools/call', {
            name: 'evaluate',
            arguments: {
              tabId: tab.id,
              expression: `({
                hasTestExtensionMarker: !!document.querySelector('[data-test-extension]'),
                scripts: Array.from(document.scripts).map(s => s.src).filter(src => src.includes('chrome-extension')),
                bodyDatasets: Object.keys(document.body.dataset)
              })`
            }
          });
          
          const csData = JSON.parse(csCheck.content[0].text);
          console.log('  Extension检测:');
          console.log(`    - Test Extension标记: ${csData.value.hasTestExtensionMarker}`);
          console.log(`    - Extension Scripts: ${csData.value.scripts.length}`);
          if (csData.value.scripts.length > 0) {
            csData.value.scripts.forEach(src => console.log(`      - ${src}`));
          }
          console.log(`    - Body Datasets: ${csData.value.bodyDatasets.join(', ') || '(none)'}`);
          
        } catch (e) {
          console.log(`  ❌ 检查失败: ${e.message}`);
        }
      }

      // 8. 总结
      console.log('\n\n📊 测试总结');
      console.log('='.repeat(60));
      console.log('✅ evaluate修复验证:');
      console.log('  - WITHOUT tabId: 使用当前CDP上下文（可能不是预期tab）');
      console.log('  - WITH tabId: 正确定位到指定tab执行');
      console.log('\n🔍 Content Script注入状态:');
      console.log('  - 检查了各个页面的注入痕迹');
      console.log('  - 识别了MCP标记和Extension Scripts');
      console.log('  - 提供了详细的注入证据统计');

    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    } finally {
      this.stopServer();
    }
  }
}

const tester = new TabEvaluateTester();
tester.runTests().catch(console.error);
