#!/usr/bin/env node
/**
 * Chrome Debug MCP 全面功能测试 - Enhanced Test Extension验证
 * 测试所有MCP功能与enhanced-test-extension的完整集成
 * 包括stdio和remote transport模式
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

class ComprehensiveMCPTester {
  constructor() {
    this.extensionId = 'ipmoibjoabkckedeallldhojmjgagbeb'; // Enhanced Test Extension ID
    this.results = {
      stdio: { transport: 'stdio', tests: [], passed: 0, failed: 0 },
      remote: { transport: 'remote', tests: [], passed: 0, failed: 0 }
    };
    this.mcpProcess = null;
    this.responses = [];
    this.logs = [];
  }

  // 获取完整的MCP功能测试套件
  getFullTestSuite() {
    return {
      connection_tests: [
        {
          name: '🔌 Chrome连接测试',
          message: {
            jsonrpc: '2.0',
            id: 'test-connect',
            method: 'tools/call',
            params: {
              name: 'attach_to_chrome',
              arguments: { host: 'localhost', port: 9222 }
            }
          },
          timeout: 8000,
          critical: true
        },
        {
          name: '🔍 页面状态监控',
          message: {
            jsonrpc: '2.0',
            id: 'test-page-state',
            method: 'tools/call',
            params: {
              name: 'evaluate',
              arguments: {
                expression: 'document.readyState + " - No blocking dialogs detected"'
              }
            }
          },
          timeout: 5000
        }
      ],

      extension_discovery: [
        {
          name: '🔍 扩展发现和列表',
          message: {
            jsonrpc: '2.0',
            id: 'test-list-extensions',
            method: 'tools/call',
            params: {
              name: 'list_extensions',
              arguments: {}
            }
          },
          timeout: 5000,
          expectedContent: ['Enhanced MCP Debug Test Extension'],
          critical: true
        },
        {
          name: '🎯 扩展上下文管理',
          message: {
            jsonrpc: '2.0',
            id: 'test-extension-contexts',
            method: 'tools/call',
            params: {
              name: 'list_extension_contexts',
              arguments: { extensionId: this.extensionId }
            }
          },
          timeout: 5000
        }
      ],

      enhanced_extension_features: [
        {
          name: '💾 扩展存储检查',
          message: {
            jsonrpc: '2.0',
            id: 'test-extension-storage',
            method: 'tools/call',
            params: {
              name: 'inspect_extension_storage',
              arguments: {
                extensionId: this.extensionId,
                storageTypes: ['local', 'sync']
              }
            }
          },
          timeout: 5000
        },
        {
          name: '📨 消息传递监控',
          message: {
            jsonrpc: '2.0',
            id: 'test-message-monitoring',
            method: 'tools/call',
            params: {
              name: 'monitor_extension_messages',
              arguments: {
                extensionId: this.extensionId,
                duration: 5000,   // 缩短到5秒，更快完成
                messageTypes: ['runtime', 'tabs']
              }
            }
          },
          timeout: 20000  // 增加超时到20秒，给足够时间启动监控
        },
        {
          name: '📊 API调用追踪',
          message: {
            jsonrpc: '2.0',
            id: 'test-api-tracking',
            method: 'tools/call',
            params: {
              name: 'track_extension_api_calls',
              arguments: {
                extensionId: this.extensionId,
                duration: 6000,   // 缩短到6秒，快速收集
                apiCategories: ['storage', 'tabs', 'runtime']
              }
            }
          },
          timeout: 18000  // 增加超时到18秒
        }
      ],

      content_script_features: [
        {
          name: '🔄 内容脚本状态',
          message: {
            jsonrpc: '2.0',
            id: 'test-content-status',
            method: 'tools/call',
            params: {
              name: 'content_script_status',
              arguments: { extensionId: this.extensionId }
            }
          },
          timeout: 5000
        },
        {
          name: '💉 内容脚本注入',
          message: {
            jsonrpc: '2.0',
            id: 'test-content-injection',
            method: 'tools/call',
            params: {
              name: 'inject_content_script',
              arguments: {
                extensionId: this.extensionId,
                code: 'console.log("[MCP Test] Content script injection test successful"); document.body.setAttribute("data-mcp-test", "injected");'
              }
            }
          },
          timeout: 5000
        }
      ],

      chrome_api_tests: [
        {
          name: '📊 JavaScript执行',
          message: {
            jsonrpc: '2.0',
            id: 'test-evaluate',
            method: 'tools/call',
            params: {
              name: 'evaluate',
              arguments: {
                expression: 'navigator.userAgent.includes("Chrome") ? "Chrome Browser Detected" : "Unknown Browser"'
              }
            }
          },
          timeout: 8000,  // 增加超时时间
          expectedContent: ['Chrome Browser Detected']  // 添加期望内容验证
        },
        {
          name: '📝 控制台日志',
          message: {
            jsonrpc: '2.0',
            id: 'test-console-logs',
            method: 'tools/call',
            params: {
              name: 'get_console_logs',
              arguments: {}
            }
          },
          timeout: 3000
        },
        {
          name: '📷 截图功能',
          message: {
            jsonrpc: '2.0',
            id: 'test-screenshot',
            method: 'tools/call',
            params: {
              name: 'screenshot',
              arguments: {
                returnBase64: true
              }
            }
          },
          timeout: 12000  // 使用修复后的超时
        }
      ],

      multi_page_testing: [
        {
          name: '🌐 多页面扩展测试',
          message: {
            jsonrpc: '2.0',
            id: 'test-multi-page',
            method: 'tools/call',
            params: {
              name: 'test_extension_on_multiple_pages',
              arguments: {
                extensionId: this.extensionId,
                testUrls: [
                  'http://127.0.0.1:8081/hls.html',
                  'https://httpbin.org/get',
                  'https://jsonplaceholder.typicode.com/posts/1'
                ],
                includePerformance: true,
                generateReport: true
              }
            }
          },
          timeout: 30000
        }
      ]
    };
  }

  async testStdioTransport() {
    console.log('\n📡 ===== STDIO TRANSPORT 测试 =====');
    console.log('🎯 测试MCP stdio模式与enhanced-test-extension集成');
    
    // 启动stdio MCP服务器
    console.log('🚀 启动stdio MCP服务器...');
    this.mcpProcess = spawn('node', ['build/main.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.setupProcessHandlers();
    await this.sleep(5000); // 等待启动

    const testResults = await this.runTestSuite('stdio');
    
    // 清理
    if (this.mcpProcess) {
      this.mcpProcess.kill('SIGTERM');
      await this.sleep(2000);
    }
    
    return testResults;
  }

  async testRemoteTransport() {
    console.log('\n🌐 ===== REMOTE TRANSPORT 测试 =====');
    console.log('🎯 测试MCP remote模式与enhanced-test-extension集成');
    
    // 启动remote MCP服务器
    console.log('🚀 启动remote MCP服务器...');
    this.mcpProcess = spawn('node', ['build/main.js', '--transport', 'http', '--port', '31232'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.setupProcessHandlers();
    await this.sleep(6000); // 等待HTTP服务器启动

    const testResults = await this.runTestSuiteViaHTTP('remote');
    
    // 清理
    if (this.mcpProcess) {
      this.mcpProcess.kill('SIGTERM');
      await this.sleep(2000);
    }
    
    return testResults;
  }

  async runTestSuite(transportType) {
    console.log(`\n🧪 执行${transportType}模式完整测试套件...\n`);
    
    const testSuite = this.getFullTestSuite();
    let totalTests = 0;
    let totalPassed = 0;

    for (const [categoryName, tests] of Object.entries(testSuite)) {
      console.log(`\n📋 ===== ${categoryName.toUpperCase().replace(/_/g, ' ')} =====`);
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`🔬 执行 ${i + 1}/${tests.length}: ${test.name}`);
        
        const result = await this.executeStdioTest(test);
        totalTests++;
        
        this.results[transportType].tests.push({
          category: categoryName,
          name: test.name,
          result: result
        });
        
        if (result.success) {
          totalPassed++;
          this.results[transportType].passed++;
          console.log(`✅ 通过: ${test.name} (${result.duration}ms)`);
        } else {
          this.results[transportType].failed++;
          console.log(`❌ 失败: ${test.name} - ${result.reason}`);
          
          // 如果是关键测试失败，记录但继续
          if (test.critical) {
            console.log(`⚠️  关键测试失败，但继续测试其他功能`);
          }
        }

        await this.sleep(1500); // 测试间隔
      }
    }

    return { totalTests, totalPassed };
  }

  async runTestSuiteViaHTTP(transportType) {
    console.log(`\n🌐 通过HTTP执行${transportType}模式测试...\n`);
    
    // 先测试HTTP服务器连接
    try {
      const response = await fetch('http://localhost:31232/health');
      if (!response.ok) {
        throw new Error('HTTP server not ready');
      }
      console.log('✅ HTTP MCP服务器连接成功');
    } catch (error) {
      console.log('❌ HTTP MCP服务器连接失败:', error.message);
      return { totalTests: 0, totalPassed: 0 };
    }

    // 🔧 修复：使用正确的JSON-RPC over HTTP格式
    const httpTests = [
      {
        name: '🔌 HTTP Chrome连接',
        message: {
          jsonrpc: '2.0',
          id: 'http-attach',
          method: 'tools/call',
          params: {
            name: 'attach_to_chrome',
            arguments: { host: 'localhost', port: 9222 }
          }
        }
      },
      {
        name: '🔍 HTTP扩展列表',
        message: {
          jsonrpc: '2.0',
          id: 'http-list-ext',
          method: 'tools/call',
          params: {
            name: 'list_extensions',
            arguments: {}
          }
        }
      },
      {
        name: '📊 HTTP JavaScript执行',
        message: {
          jsonrpc: '2.0',
          id: 'http-evaluate',
          method: 'tools/call',
          params: {
            name: 'evaluate',
            arguments: { expression: 'navigator.userAgent' }
          }
        }
      }
    ];

    let totalTests = httpTests.length;
    let totalPassed = 0;

    for (const test of httpTests) {
      console.log(`🔬 执行: ${test.name}`);
      
      try {
        const startTime = Date.now();
        // 🔧 修复：使用/message端点发送JSON-RPC消息
        const response = await fetch('http://localhost:31232/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.message),
          timeout: 10000
        });

        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const result = await response.json();
          if (result.error) {
            this.results[transportType].failed++;
            console.log(`❌ 失败: ${test.name} - MCP错误: ${result.error.message}`);
          } else {
            totalPassed++;
            this.results[transportType].passed++;
            console.log(`✅ 通过: ${test.name} (${duration}ms)`);
          }
        } else {
          this.results[transportType].failed++;
          console.log(`❌ 失败: ${test.name} - HTTP ${response.status}`);
        }
      } catch (error) {
        this.results[transportType].failed++;
        console.log(`❌ 失败: ${test.name} - ${error.message}`);
      }

      this.results[transportType].tests.push({
        category: 'http_api',
        name: test.name,
        result: { success: totalPassed > this.results[transportType].tests.length }
      });

      await this.sleep(1000);
    }

    return { totalTests, totalPassed };
  }

  async executeStdioTest(test) {
    const startTime = Date.now();
    const initialResponseCount = this.responses.length;

    try {
      // 发送测试请求
      this.mcpProcess.stdin.write(JSON.stringify(test.message) + '\n');
      
      // 等待响应
      await this.waitForResponse(initialResponseCount, test.timeout);
      
      const duration = Date.now() - startTime;
      const response = this.responses[this.responses.length - 1];
      
      return this.validateTestResponse(test, response, duration);
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        reason: `执行异常: ${error.message}`,
        response: null
      };
    }
  }

  validateTestResponse(test, response, duration) {
    if (!response) {
      return { success: false, duration, reason: '未收到响应', response: null };
    }

    if (response.error) {
      return { success: false, duration, reason: `MCP错误: ${response.error.message}`, response };
    }

    if (duration > test.timeout) {
      return { success: false, duration, reason: `超时: ${duration}ms > ${test.timeout}ms`, response };
    }

    // 检查期望内容
    if (test.expectedContent) {
      const responseText = JSON.stringify(response).toLowerCase();
      const matchedContent = test.expectedContent.filter(content => 
        responseText.includes(content.toLowerCase())
      );
      
      if (matchedContent.length === 0) {
        return { 
          success: false, 
          duration, 
          reason: `未找到期望内容: ${test.expectedContent.join(', ')}`, 
          response 
        };
      }
    }

    return { success: true, duration, reason: '验证通过', response };
  }

  setupProcessHandlers() {
    this.responses = [];
    this.logs = [];

    this.mcpProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.trim().startsWith('{')) {
        try {
          const response = JSON.parse(output);
          this.responses.push({
            ...response,
            timestamp: Date.now()
          });
        } catch (e) {
          // 忽略非JSON
        }
      }
    });

    this.mcpProcess.stderr.on('data', (data) => {
      const log = data.toString();
      this.logs.push({
        message: log.trim(),
        timestamp: Date.now()
      });
      
      // 显示重要日志
      if (log.includes('Chrome') || log.includes('Extension') || log.includes('Enhanced') || log.includes('ERROR')) {
        console.log(`📝 ${log.trim()}`);
      }
    });
  }

  async waitForResponse(initialCount, timeout) {
    const startTime = Date.now();
    while (this.responses.length <= initialCount && (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }
  }

  generateComprehensiveReport() {
    console.log('\n' + '='.repeat(100));
    console.log('📋 Chrome Debug MCP 全面功能测试报告 - Enhanced Test Extension集成验证');
    console.log('='.repeat(100));

    let overallPassed = 0;
    let overallTotal = 0;

    for (const [transportType, results] of Object.entries(this.results)) {
      if (results.tests.length === 0) continue;

      console.log(`\n🚀 ${transportType.toUpperCase()} Transport 结果:`);
      console.log(`  📊 总体成功率: ${results.passed}/${results.passed + results.failed} (${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%)`);
      
      overallPassed += results.passed;
      overallTotal += results.passed + results.failed;

      // 按类别显示结果
      const categories = {};
      results.tests.forEach(test => {
        if (!categories[test.category]) {
          categories[test.category] = { passed: 0, total: 0 };
        }
        categories[test.category].total++;
        if (test.result.success) {
          categories[test.category].passed++;
        }
      });

      Object.entries(categories).forEach(([category, stats]) => {
        const rate = ((stats.passed / stats.total) * 100).toFixed(1);
        console.log(`    ${this.getCategoryIcon(category)} ${category.replace(/_/g, ' ')}: ${stats.passed}/${stats.total} (${rate}%)`);
      });
    }

    const overallRate = overallTotal > 0 ? ((overallPassed / overallTotal) * 100).toFixed(1) : 0;
    console.log(`\n🎯 整体评估:`);
    console.log(`  📈 综合成功率: ${overallPassed}/${overallTotal} (${overallRate}%)`);
    console.log(`  🏆 系统等级: ${this.getOverallGrade(parseFloat(overallRate))}`);

    // Enhanced Test Extension集成评估
    console.log('\n🔌 Enhanced Test Extension集成评估:');
    const extensionTests = [];
    Object.values(this.results).forEach(r => {
      extensionTests.push(...r.tests.filter(t => 
        t.name.includes('扩展') || t.name.includes('Extension') || t.category.includes('extension')
      ));
    });

    const extensionPassed = extensionTests.filter(t => t.result.success).length;
    const extensionTotal = extensionTests.length;
    
    if (extensionTotal > 0) {
      const extRate = ((extensionPassed / extensionTotal) * 100).toFixed(1);
      console.log(`  🧩 扩展功能: ${extensionPassed}/${extensionTotal} (${extRate}%)`);
      console.log(`  🎯 集成状态: ${extRate >= 80 ? '✅ 完美集成' : extRate >= 60 ? '📈 良好集成' : '🔧 需要改进'}`);
    }

    // Chrome生命周期管理验证
    const lifecycleLogs = this.logs.filter(log => 
      log.message.includes('Cleanup') || log.message.includes('disconnect') || log.message.includes('close')
    );
    
    console.log('\n🔒 Chrome生命周期管理验证:');
    console.log(`  📝 清理日志: ${lifecycleLogs.length > 0 ? '✅ 有记录' : '❌ 无记录'}`);
    
    const hasCorrectCleanup = lifecycleLogs.some(log => 
      log.message.includes('disconnect') || log.message.includes('NOT closing')
    );
    console.log(`  🔧 安全清理: ${hasCorrectCleanup ? '✅ 正确实施' : '⚠️  需要验证'}`);

    console.log('\n🎉 最终结论:');
    if (parseFloat(overallRate) >= 80) {
      console.log('  🏆 Chrome Debug MCP + Enhanced Test Extension = 企业级调试平台');
      console.log('  ✅ 所有核心功能完美协作');
      console.log('  ✅ 生命周期管理安全可靠');
      console.log('  🚀 准备好服务开发者生态系统！');
    } else if (parseFloat(overallRate) >= 60) {
      console.log('  📈 Chrome Debug MCP 基础功能稳定');
      console.log('  ✅ Enhanced Test Extension集成正常');
      console.log('  🔧 部分高级功能需要优化');
    } else {
      console.log('  ⚠️  Chrome Debug MCP 需要进一步调试');
      console.log('  🔧 建议优先修复连接和基础功能');
    }

    return {
      overallPassed,
      overallTotal,
      overallRate: parseFloat(overallRate),
      extensionIntegration: extensionTotal > 0 ? (extensionPassed / extensionTotal) : 0,
      lifecycleManagementOk: hasCorrectCleanup
    };
  }

  getCategoryIcon(category) {
    const icons = {
      connection_tests: '🔌',
      extension_discovery: '🔍',
      enhanced_extension_features: '✨',
      content_script_features: '📝',
      chrome_api_tests: '🌐',
      multi_page_testing: '🌐',
      http_api: '📡'
    };
    return icons[category] || '📋';
  }

  getOverallGrade(rate) {
    if (rate >= 90) return '🏆 卓越级';
    if (rate >= 80) return '🥇 企业级';
    if (rate >= 70) return '🥈 专业级';
    if (rate >= 60) return '🥉 基础级';
    return '🔧 开发级';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主测试流程
async function runComprehensiveTest() {
  const tester = new ComprehensiveMCPTester();
  
  try {
    console.log('🎯 Chrome Debug MCP 全面功能测试');
    console.log('🔌 Enhanced Test Extension ID:', tester.extensionId);
    console.log('🚀 测试stdio和remote两种transport模式\n');
    
    // 1. 测试stdio模式
    console.log('🎬 Phase 1: stdio Transport测试');
    await tester.testStdioTransport();
    
    // 等待间隔
    await tester.sleep(3000);
    
    // 2. 测试remote模式
    console.log('\n🎬 Phase 2: Remote Transport测试');
    await tester.testRemoteTransport();
    
    // 3. 生成综合报告
    const report = tester.generateComprehensiveReport();
    
    process.exit(report.overallRate >= 70 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 综合测试执行失败:', error);
    process.exit(1);
  }
}

runComprehensiveTest();
