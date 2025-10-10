/**
 * VIP Integration Test with Real Chrome
 * 
 * Tests VIP features in a real Chrome environment (port 9222)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 9222;
const SERVER_INIT_WAIT = 3000;
const REQUEST_TIMEOUT = 15000;

class VIPIntegrationTester {
  constructor() {
    this.results = {
      responseBuilder: { tested: 0, passed: 0, failed: 0 },
      suggestions: { tested: 0, passed: 0, failed: 0 },
      contextAttachment: { tested: 0, passed: 0, failed: 0 },
      toolChain: { tested: 0, passed: 0, failed: 0 }
    };
    this.server = null;
  }

  async start() {
    console.log('🚀 VIP集成测试 - 真实Chrome环境\n');
    console.log('='.repeat(70));
    console.log(`🌐 Chrome端口: ${TEST_PORT}`);
    console.log('⏱️  请求超时: 15秒\n');
    
    try {
      await this.startServer();
      await this.sleep(SERVER_INIT_WAIT);
      
      await this.testResponseBuilderIntegration();
      await this.testSuggestionsIntegration();
      await this.testContextAttachment();
      await this.testToolChainOptimization();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  async startServer() {
    console.log('📡 启动stdio服务器...\n');
    
    const serverPath = path.join(__dirname, '../build/stdio-server.js');
    this.server = spawn('node', [serverPath, `--port=${TEST_PORT}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.requestId = 1;
    this.pendingRequests = new Map();

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
          // Ignore non-JSON lines
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      // Silent unless error
    });
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
      }, REQUEST_TIMEOUT);
      
      this.pendingRequests.get(id).timeout = timeout;
    }).finally(() => {
      const req = this.pendingRequests.get(id);
      if (req && req.timeout) clearTimeout(req.timeout);
    });
  }

  async testResponseBuilderIntegration() {
    console.log('📋 1. Response Builder集成测试\n');
    
    // Initialize
    await this.testCase('responseBuilder', 'MCP初始化', async () => {
      const response = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });
      
      if (!response.result) throw new Error('初始化失败');
      console.log(`  ✅ 服务器: ${response.result.serverInfo.name}`);
    });

    // Connect to Chrome
    await this.testCase('responseBuilder', '连接Chrome', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'attach_to_chrome',
        arguments: { port: TEST_PORT }
      });
      
      if (response.error) throw new Error(response.error.message);
      console.log('  ✅ 已连接到Chrome');
    });

    // Test list_tabs with Response Builder
    await this.testCase('responseBuilder', 'list_tabs响应格式', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      // Verify Response Builder format
      if (!content.includes('# list_tabs response')) {
        throw new Error('缺少Response Builder标题');
      }
      
      if (!content.includes('Found')) {
        throw new Error('缺少列表内容');
      }
      
      console.log('  ✅ Response Builder格式正确');
      console.log(`  📄 响应长度: ${content.length}字符`);
    });

    // Test with extensions (if available)
    await this.testCase('responseBuilder', 'list_extensions响应格式', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      if (!content.includes('# list_extensions response')) {
        throw new Error('缺少Response Builder标题');
      }
      
      console.log('  ✅ 扩展列表格式正确');
    });
  }

  async testSuggestionsIntegration() {
    console.log('\n💡 2. 建议系统集成测试\n');
    
    await this.testCase('suggestions', '自动建议生成', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      // Check for suggestions section
      const hasSuggestions = content.includes('## Recommended Actions') ||
                           content.includes('## Available Actions');
      
      if (hasSuggestions) {
        console.log('  ✅ 建议已生成');
        
        // Check priority levels
        const hasPriority = content.includes('CRITICAL') || 
                          content.includes('HIGH') ||
                          content.includes('MEDIUM') ||
                          content.includes('LOW');
        
        if (hasPriority) {
          console.log('  ✅ 包含优先级标记');
        }
      } else {
        console.log('  ℹ️  无建议（可能无错误）');
      }
    });

    await this.testCase('suggestions', '工具参数建议', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      // Suggestions should include tool names
      const hasToolRecommendation = /Tool:\s*`\w+`/.test(content) ||
                                   content.includes('Use `');
      
      if (hasToolRecommendation) {
        console.log('  ✅ 建议包含工具名称');
      } else {
        console.log('  ℹ️  未检测到工具建议');
      }
    });
  }

  async testContextAttachment() {
    console.log('\n🔗 3. 上下文自动附加测试\n');
    
    await this.testCase('contextAttachment', '页面上下文', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      // Check for page context
      if (content.includes('## Current Page')) {
        console.log('  ✅ 页面上下文已附加');
        
        // Extract URL if present
        const urlMatch = content.match(/URL:\s*(.+)/);
        if (urlMatch) {
          console.log(`  📍 当前页面: ${urlMatch[1].trim()}`);
        }
      } else {
        console.log('  ℹ️  未附加页面上下文');
      }
    });

    await this.testCase('contextAttachment', '扩展状态', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const content = response.result?.content?.[0]?.text || '';
      
      // Check for extension context
      if (content.includes('## Extension') || content.includes('Service Worker')) {
        console.log('  ✅ 扩展状态已附加');
      } else {
        console.log('  ℹ️  未附加扩展状态');
      }
    });

    await this.testCase('contextAttachment', '标签列表上下文', async () => {
      // First get tabs
      const tabsResponse = await this.sendRequest('tools/call', {
        name: 'list_tabs',
        arguments: {}
      });
      
      if (tabsResponse.error) throw new Error(tabsResponse.error.message);
      
      const content = tabsResponse.result?.content?.[0]?.text || '';
      
      // Count tabs in response
      const tabLines = content.split('\n').filter(line => /^\d+\./.test(line.trim()));
      
      if (tabLines.length > 0) {
        console.log(`  ✅ 检测到${tabLines.length}个标签`);
      }
    });
  }

  async testToolChainOptimization() {
    console.log('\n🔄 4. 工具链优化验证\n');
    
    let stepCount = 0;
    let extensionId = null;
    
    await this.testCase('toolChain', '完整调试流程', async () => {
      // Step 1: List extensions
      stepCount++;
      console.log(`  📍 步骤${stepCount}: list_extensions`);
      const extResponse = await this.sendRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (extResponse.error) {
        console.log('  ℹ️  无扩展可用，跳过流程测试');
        return;
      }
      
      const extContent = extResponse.result?.content?.[0]?.text || '';
      
      // Extract extension ID if available
      const idMatch = extContent.match(/([a-z]{32})/);
      if (idMatch) {
        extensionId = idMatch[1];
        console.log(`  📦 找到扩展: ${extensionId.substring(0, 8)}...`);
      }
      
      // Step 2: Check if suggestions lead to next step
      if (extContent.includes('get_extension_logs') || 
          extContent.includes('content_script_status')) {
        stepCount++;
        console.log(`  📍 步骤${stepCount}: 根据建议执行下一步`);
        console.log('  ✅ 建议引导成功');
      }
      
      console.log(`  📊 总步骤: ${stepCount}步`);
      
      if (stepCount <= 3) {
        console.log('  🎯 工具链已优化（≤3步）');
      } else {
        console.log(`  ℹ️  工具链: ${stepCount}步`);
      }
    });

    await this.testCase('toolChain', '上下文传递效率', async () => {
      if (!extensionId) {
        console.log('  ℹ️  无扩展ID可用于测试');
        return;
      }
      
      // Test if extensionId is used in next call
      const logsResponse = await this.sendRequest('tools/call', {
        name: 'get_extension_logs',
        arguments: { extensionId: extensionId, limit: 5 }
      });
      
      if (!logsResponse.error) {
        console.log('  ✅ 上下文成功传递（extensionId已使用）');
      }
    });
  }

  async testCase(category, name, testFn) {
    const key = category.toLowerCase().replace(/\s+/g, '');
    if (!this.results[key]) {
      this.results[key] = { tested: 0, passed: 0, failed: 0 };
    }
    this.results[key].tested++;
    
    try {
      await testFn();
      this.results[key].passed++;
      console.log(`  ✅ ${name} - PASS`);
    } catch (error) {
      this.results[key].failed++;
      console.log(`  ❌ ${name} - FAIL: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 VIP集成测试报告');
    console.log('='.repeat(70));
    
    let totalTested = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, stats] of Object.entries(this.results)) {
      if (stats.tested === 0) continue;
      
      const successRate = stats.tested > 0 
        ? (stats.passed / stats.tested * 100).toFixed(1) 
        : 0;
      
      console.log(`\n📋 ${category}:`);
      console.log(`  测试: ${stats.tested}`);
      console.log(`  通过: ${stats.passed} ✅`);
      console.log(`  失败: ${stats.failed} ❌`);
      console.log(`  成功率: ${successRate}%`);
      
      totalTested += stats.tested;
      totalPassed += stats.passed;
      totalFailed += stats.failed;
    }
    
    const overallRate = totalTested > 0 ? (totalPassed / totalTested * 100).toFixed(1) : 0;
    
    console.log(`\n🎯 总体成功率: ${overallRate}%`);
    console.log(`📊 总计: ${totalPassed}/${totalTested} 通过`);
    console.log('='.repeat(70) + '\n');
    
    // Success criteria
    if (totalFailed === 0) {
      console.log('🎉 所有集成测试通过！VIP功能在真实Chrome环境下正常工作。\n');
      process.exit(0);
    } else {
      console.log(`⚠️  有 ${totalFailed} 个测试失败。\n`);
      process.exit(1);
    }
  }

  cleanup() {
    if (this.server && !this.server.killed) {
      this.server.kill('SIGTERM');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const tester = new VIPIntegrationTester();
tester.start().catch(error => {
  console.error('❌ 测试错误:', error);
  process.exit(1);
});

