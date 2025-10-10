/**
 * 诊断扩展检测问题
 * 检查Chrome 9222的扩展状态并排查问题
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PORT = 9222;

class ExtensionDiagnostic {
  constructor() {
    this.server = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  async start() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         扩展检测问题诊断                                ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
      await this.startServer();
      await this.initialize();
      await this.attachToChrome();
      await this.diagnoseExtensions();
    } catch (error) {
      console.error('❌ 诊断失败:', error);
    } finally {
      this.cleanup();
    }
  }

  async startServer() {
    console.log('🚀 启动stdio服务器...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    this.server = spawn('node', [serverPath, `--port=${CHROME_PORT}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout.on('data', (data) => {
      const messages = data.toString().split('\n').filter(line => line.trim());
      for (const message of messages) {
        try {
          const response = JSON.parse(message);
          if (response.id && this.pendingRequests.has(response.id)) {
            const { resolve } = this.pendingRequests.get(response.id);
            this.pendingRequests.delete(response.id);
            resolve(response);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('Error')) {
        console.error('⚠️  Server Error:', msg.trim());
      }
    });

    await this.sleep(3000);
  }

  async initialize() {
    console.log('📡 1. 初始化MCP连接...');
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'diagnostic', version: '1.0.0' }
    });
    
    if (!result.result) {
      throw new Error('初始化失败');
    }
    console.log('   ✅ MCP初始化成功\n');
  }

  async attachToChrome() {
    console.log('📡 2. 连接到Chrome 9222...');
    const result = await this.sendRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { port: CHROME_PORT }
    });
    
    if (result.error) {
      console.error('   ❌ 连接失败:', result.error.message);
      throw new Error(result.error.message);
    }
    console.log('   ✅ 已连接到Chrome\n');
  }

  async diagnoseExtensions() {
    console.log('🔍 3. 诊断扩展检测...\n');
    
    // Test 1: list_extensions
    console.log('━'.repeat(60));
    console.log('测试 1: list_extensions 工具');
    console.log('━'.repeat(60));
    
    const extResult = await this.sendRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });

    if (extResult.error) {
      console.error('❌ list_extensions 失败:', extResult.error.message);
      console.log('\n可能原因:');
      console.log('  1. Chrome未正确连接');
      console.log('  2. CDP协议版本不兼容');
      console.log('  3. 权限问题\n');
      return;
    }

    const extensions = extResult.result;
    console.log('返回结果类型:', typeof extensions);
    console.log('是否为数组:', Array.isArray(extensions));
    
    if (typeof extensions === 'object' && extensions.content) {
      console.log('⚠️  检测到Response Builder格式');
      console.log('内容:', JSON.stringify(extensions, null, 2).substring(0, 500));
    } else if (Array.isArray(extensions)) {
      console.log(`✅ 检测到 ${extensions.length} 个扩展:\n`);
      
      if (extensions.length === 0) {
        console.log('⚠️  扩展列表为空！');
        console.log('\n可能原因:');
        console.log('  1. 扩展未加载到Chrome');
        console.log('  2. 扩展被禁用');
        console.log('  3. 扩展检测逻辑有问题\n');
      } else {
        extensions.forEach((ext, i) => {
          console.log(`${i + 1}. ${ext.name || '未知名称'}`);
          console.log(`   ID: ${ext.id || '无ID'}`);
          console.log(`   版本: ${ext.version || '未知'}`);
          console.log(`   启用: ${ext.enabled !== false ? '是' : '否'}`);
          console.log('');
        });
      }
    } else {
      console.log('⚠️  未知的返回格式');
      console.log('完整返回:', JSON.stringify(extensions, null, 2).substring(0, 1000));
    }

    // Test 2: 直接CDP查询
    console.log('\n━'.repeat(60));
    console.log('测试 2: 直接CDP查询扩展');
    console.log('━'.repeat(60));

    const cdpResult = await this.sendRequest('tools/call', {
      name: 'evaluate',
      arguments: {
        expression: `
          (async () => {
            try {
              const targets = await chrome.debugger.getTargets();
              const extensions = targets.filter(t => t.type === 'background_page' || t.type === 'service_worker');
              return {
                totalTargets: targets.length,
                extensionTargets: extensions.length,
                extensions: extensions.map(e => ({
                  id: e.id,
                  type: e.type,
                  title: e.title,
                  url: e.url
                }))
              };
            } catch (e) {
              return { error: e.message, stack: e.stack };
            }
          })()
        `
      }
    });

    if (cdpResult.error) {
      console.log('⚠️  CDP查询不可用 (正常，可能没有debugger权限)');
    } else {
      console.log('CDP查询结果:', JSON.stringify(cdpResult.result, null, 2).substring(0, 500));
    }

    // Test 3: 列出所有Chrome targets
    console.log('\n━'.repeat(60));
    console.log('测试 3: 列出所有Chrome Targets');
    console.log('━'.repeat(60));

    const tabsResult = await this.sendRequest('tools/call', {
      name: 'list_tabs',
      arguments: {}
    });

    if (!tabsResult.error) {
      console.log('✅ 成功获取tabs信息');
      
      // 尝试从tabs结果中提取信息
      if (tabsResult.result && tabsResult.result.content) {
        const content = tabsResult.result.content[0]?.text || '';
        console.log('Tabs内容 (前300字符):', content.substring(0, 300));
      }
    }

    // Test 4: 检查扩展上下文
    console.log('\n━'.repeat(60));
    console.log('测试 4: 检查可用的浏览器targets');
    console.log('━'.repeat(60));

    const evalResult = await this.sendRequest('tools/call', {
      name: 'evaluate',
      arguments: {
        expression: `
          (() => {
            // 检查是否在扩展上下文
            const hasChrome = typeof chrome !== 'undefined';
            const hasRuntime = hasChrome && typeof chrome.runtime !== 'undefined';
            const hasManagement = hasChrome && typeof chrome.management !== 'undefined';
            
            return {
              environment: {
                hasChrome,
                hasRuntime,
                hasManagement,
                location: typeof location !== 'undefined' ? location.href : 'N/A'
              }
            };
          })()
        `
      }
    });

    if (!evalResult.error) {
      console.log('环境检测结果:', JSON.stringify(evalResult.result, null, 2));
    }

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  诊断总结                                ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (Array.isArray(extensions) && extensions.length > 0) {
      console.log('✅ 扩展检测正常，找到扩展');
    } else if (Array.isArray(extensions) && extensions.length === 0) {
      console.log('⚠️  扩展检测逻辑正常，但Chrome中无扩展');
      console.log('\n建议操作:');
      console.log('  1. 检查Chrome扩展页面: chrome://extensions');
      console.log('  2. 确认扩展已加载且已启用');
      console.log('  3. 检查扩展是否为MV3 Service Worker类型');
      console.log('  4. 尝试重新加载扩展\n');
    } else {
      console.log('❌ 扩展检测逻辑可能有问题');
      console.log('\n需要修复:');
      console.log('  1. 检查list_extensions工具实现');
      console.log('  2. 验证CDP协议调用');
      console.log('  3. 检查返回数据格式处理\n');
    }
  }

  sendRequest(method, params) {
    const id = this.requestId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }) + '\n');

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 15000);

      this.pendingRequests.get(id).timeout = timeout;
    }).finally(() => {
      const req = this.pendingRequests.get(id);
      if (req && req.timeout) clearTimeout(req.timeout);
    });
  }

  cleanup() {
    if (this.server && !this.server.killed) {
      this.server.kill('SIGTERM');
    }
    process.exit(0);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const diagnostic = new ExtensionDiagnostic();
diagnostic.start();

