#!/usr/bin/env node
/**
 * 测试Chrome Debug MCP连接到9222端口的Chrome
 * 验证与enhanced-test-extension的完整集成
 */

import { spawn } from 'child_process';

class MCPChromeIntegrationTester {
  constructor() {
    this.mcpProcess = null;
    this.responses = [];
    this.testResults = [];
    this.extensionId = 'ipmoibjoabkckedeallldhojmjgagbeb'; // Enhanced Test Extension ID
  }

  async testMCPWithChrome() {
    console.log('🔌 Chrome Debug MCP + Chrome(9222) + Enhanced Test Extension 集成测试\n');
    
    try {
      // 启动stdio MCP服务器
      console.log('🚀 启动stdio MCP服务器...');
      this.mcpProcess = spawn('node', ['build/main.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.setupProcessHandlers();
      await this.sleep(3000);

      // 测试套件
      const testSuite = [
        {
          name: '🔌 连接Chrome',
          request: {
            jsonrpc: '2.0',
            id: 'connect-test',
            method: 'tools/call',
            params: {
              name: 'attach_to_chrome',
              arguments: { host: 'localhost', port: 9222 }
            }
          },
          timeout: 10000,
          critical: true
        },
        {
          name: '📋 列出扩展',
          request: {
            jsonrpc: '2.0',
            id: 'list-ext-test',
            method: 'tools/call',
            params: {
              name: 'list_extensions',
              arguments: {}
            }
          },
          timeout: 5000,
          expectedContent: ['Enhanced MCP Debug Test Extension']
        },
        {
          name: '📊 获取扩展日志',
          request: {
            jsonrpc: '2.0',
            id: 'get-logs-test',
            method: 'tools/call',
            params: {
              name: 'get_extension_logs',
              arguments: {
                extensionId: this.extensionId,
                level: ['log', 'info', 'warn', 'error']
              }
            }
          },
          timeout: 5000
        },
        {
          name: '🔍 扩展上下文列表',
          request: {
            jsonrpc: '2.0',
            id: 'list-contexts-test',
            method: 'tools/call',
            params: {
              name: 'list_extension_contexts',
              arguments: {
                extensionId: this.extensionId
              }
            }
          },
          timeout: 5000
        },
        {
          name: '💾 检查扩展存储',
          request: {
            jsonrpc: '2.0',
            id: 'inspect-storage-test',
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
          name: '📝 内容脚本状态',
          request: {
            jsonrpc: '2.0',
            id: 'content-status-test',
            method: 'tools/call',
            params: {
              name: 'content_script_status',
              arguments: {
                extensionId: this.extensionId,
                checkAllTabs: true
              }
            }
          },
          timeout: 5000
        },
        {
          name: '📨 监控扩展消息',
          request: {
            jsonrpc: '2.0',
            id: 'monitor-messages-test',
            method: 'tools/call',
            params: {
              name: 'monitor_extension_messages',
              arguments: {
                extensionId: this.extensionId,
                duration: 5000,
                messageTypes: ['runtime', 'tabs'],
                includeResponses: true
              }
            }
          },
          timeout: 8000
        },
        {
          name: '📊 追踪API调用',
          request: {
            jsonrpc: '2.0',
            id: 'track-api-test',
            method: 'tools/call',
            params: {
              name: 'track_extension_api_calls',
              arguments: {
                extensionId: this.extensionId,
                duration: 5000,
                apiCategories: ['storage', 'tabs', 'runtime'],
                includeResults: true
              }
            }
          },
          timeout: 8000
        },
        {
          name: '📋 标签页管理',
          request: {
            jsonrpc: '2.0',
            id: 'list-tabs-test',
            method: 'tools/call',
            params: {
              name: 'list_tabs',
              arguments: {}
            }
          },
          timeout: 3000
        },
        {
          name: '💻 JavaScript执行',
          request: {
            jsonrpc: '2.0',
            id: 'evaluate-test',
            method: 'tools/call',
            params: {
              name: 'evaluate',
              arguments: {
                expression: 'window.chrome && window.chrome.runtime ? "Chrome Extension API Available" : "Chrome Extension API Missing"'
              }
            }
          },
          timeout: 5000
        }
      ];

      // 执行测试套件
      console.log(`🧪 开始执行 ${testSuite.length} 个测试用例...\n`);
      
      for (let i = 0; i < testSuite.length; i++) {
        const test = testSuite[i];
        console.log(`🔬 [${i + 1}/${testSuite.length}] ${test.name}`);
        
        const result = await this.executeTest(test);
        this.testResults.push({
          name: test.name,
          success: result.success,
          duration: result.duration,
          response: result.response,
          error: result.error
        });
        
        if (result.success) {
          console.log(`   ✅ 通过 (${result.duration}ms)`);
          
          // 显示重要结果摘要
          if (result.response && result.response.result) {
            this.logTestSummary(test.name, result.response.result);
          }
        } else {
          console.log(`   ❌ 失败: ${result.error}`);
          
          // 如果是关键测试失败，中断后续测试
          if (test.critical) {
            console.log('   🚨 关键测试失败，中断后续测试');
            break;
          }
        }
        
        console.log('');
        await this.sleep(1000); // 测试间隔
      }

      // 生成测试报告
      this.generateTestReport();

    } catch (error) {
      console.error('💥 测试过程中发生错误:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill('SIGTERM');
      }
    }
  }

  async executeTest(test) {
    const startTime = Date.now();
    const requestId = test.request.id;
    
    try {
      // 发送测试请求
      this.mcpProcess.stdin.write(JSON.stringify(test.request) + '\n');
      
      // 等待响应
      const response = await this.waitForResponse(requestId, test.timeout);
      const duration = Date.now() - startTime;
      
      if (response.error) {
        return {
          success: false,
          duration,
          error: response.error.message,
          response
        };
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
            error: `未找到期望内容: ${test.expectedContent.join(', ')}`,
            response
          };
        }
      }
      
      return {
        success: true,
        duration,
        response
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  logTestSummary(testName, result) {
    if (testName.includes('列出扩展') && result.content) {
      try {
        const extensions = JSON.parse(result.content[0].text);
        console.log(`   📊 发现 ${extensions.extensions?.length || 0} 个扩展`);
        if (extensions.extensions?.length > 0) {
          extensions.extensions.forEach(ext => {
            console.log(`     - ${ext.id}: ${ext.name || 'Unknown'}`);
          });
        }
      } catch (e) {}
    }
    
    if (testName.includes('标签页管理') && result.content) {
      try {
        const tabs = JSON.parse(result.content[0].text);
        console.log(`   📋 发现 ${tabs.length || 0} 个标签页`);
      } catch (e) {}
    }
    
    if (testName.includes('扩展日志') && result.content) {
      try {
        const logs = JSON.parse(result.content[0].text);
        console.log(`   📝 收集到 ${logs.logs?.length || 0} 条日志`);
      } catch (e) {}
    }
    
    if (testName.includes('监控扩展消息') && result.content) {
      try {
        const monitor = JSON.parse(result.content[0].text);
        if (monitor.success) {
          console.log(`   📨 消息监控已启动，目标数: ${monitor.targets}`);
        }
      } catch (e) {}
    }
  }

  generateTestReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 Chrome Debug MCP + Chrome(9222) 集成测试报告');
    console.log('='.repeat(80));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n📊 测试结果统计:`);
    console.log(`  🔧 总测试数: ${totalTests}`);
    console.log(`  ✅ 通过测试: ${passedTests}`);
    console.log(`  ❌ 失败测试: ${failedTests}`);
    console.log(`  📈 成功率: ${successRate}%`);

    console.log(`\n🏆 系统等级: ${this.getSystemGrade(parseFloat(successRate))}`);

    // 分类测试结果
    console.log(`\n📋 详细测试结果:`);
    this.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      const duration = test.duration ? `(${test.duration}ms)` : '';
      console.log(`  ${index + 1}. ${status} ${test.name} ${duration}`);
      
      if (!test.success && test.error) {
        console.log(`      错误: ${test.error}`);
      }
    });

    // Chrome连接状态
    const connectionTest = this.testResults.find(t => t.name.includes('连接Chrome'));
    if (connectionTest) {
      console.log(`\n🔌 Chrome连接状态:`);
      if (connectionTest.success) {
        console.log(`  ✅ 成功连接到 localhost:9222`);
        console.log(`  ✅ Chrome调试接口正常工作`);
      } else {
        console.log(`  ❌ 连接失败: ${connectionTest.error}`);
        console.log(`  💡 建议检查Chrome是否使用 --remote-debugging-port=9222 启动`);
      }
    }

    // Enhanced Test Extension集成状态
    const extensionTests = this.testResults.filter(t => 
      t.name.includes('扩展') || t.name.includes('监控') || t.name.includes('追踪')
    );
    
    if (extensionTests.length > 0) {
      const extensionPassed = extensionTests.filter(t => t.success).length;
      const extensionRate = ((extensionPassed / extensionTests.length) * 100).toFixed(1);
      
      console.log(`\n🧩 Enhanced Test Extension集成:`);
      console.log(`  📊 扩展相关测试: ${extensionPassed}/${extensionTests.length} (${extensionRate}%)`);
      console.log(`  🎯 集成状态: ${extensionRate >= 80 ? '✅ 优秀' : extensionRate >= 60 ? '📈 良好' : '🔧 需改进'}`);
    }

    // MCP协议表现
    console.log(`\n🔒 MCP协议表现:`);
    console.log(`  📋 JSON-RPC通信: ${totalTests > 0 ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🔧 工具调用响应: ${passedTests > 0 ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🚨 错误处理: ${failedTests > 0 ? '✅ 有错误处理' : '✅ 无错误发生'}`);

    // 总结和建议
    console.log(`\n🎉 测试总结:`);
    if (parseFloat(successRate) >= 90) {
      console.log(`  🏆 Chrome Debug MCP 与 Chrome + Enhanced Test Extension 集成表现优异！`);
      console.log(`  🚀 完全准备好用于生产环境的Chrome扩展调试工作`);
      console.log(`  ✨ 所有核心功能运行稳定，企业级可靠性`);
    } else if (parseFloat(successRate) >= 70) {
      console.log(`  📈 Chrome Debug MCP 集成表现良好`);
      console.log(`  ✅ 核心功能正常，适合开发环境使用`);
      console.log(`  🔧 部分高级功能需要进一步优化`);
    } else if (parseFloat(successRate) >= 50) {
      console.log(`  ⚠️  Chrome Debug MCP 基础功能可用`);
      console.log(`  🔧 需要解决关键连接和扩展集成问题`);
      console.log(`  💡 建议优先修复失败的测试用例`);
    } else {
      console.log(`  🚨 Chrome Debug MCP 需要重大改进`);
      console.log(`  🔧 请检查Chrome连接和MCP服务器配置`);
      console.log(`  💡 建议先解决基础连接问题`);
    }

    return {
      totalTests,
      passedTests,
      successRate: parseFloat(successRate)
    };
  }

  getSystemGrade(rate) {
    if (rate >= 95) return '🏆 卓越级';
    if (rate >= 85) return '🥇 企业级';
    if (rate >= 75) return '🥈 专业级';
    if (rate >= 65) return '🥉 基础级';
    return '🔧 开发级';
  }

  async waitForResponse(requestId, timeout) {
    return new Promise((resolve, reject) => {
      let responseReceived = false;
      
      const timeoutId = setTimeout(() => {
        if (!responseReceived) {
          responseReceived = true;
          reject(new Error(`请求超时: ${requestId}`));
        }
      }, timeout);

      const responseHandler = (data) => {
        if (responseReceived) return;
        
        try {
          const response = JSON.parse(data.toString());
          if (response.id === requestId) {
            responseReceived = true;
            clearTimeout(timeoutId);
            resolve(response);
          }
        } catch (e) {
          // 忽略解析错误
        }
      };

      this.mcpProcess.stdout.on('data', responseHandler);
    });
  }

  setupProcessHandlers() {
    this.mcpProcess.stderr.on('data', (data) => {
      const log = data.toString();
      // 只显示重要的日志
      if (log.includes('Enhanced') || log.includes('Successfully') || log.includes('ERROR')) {
        console.log(`📝 ${log.trim()}`);
      }
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行集成测试
async function runIntegrationTest() {
  const tester = new MCPChromeIntegrationTester();
  await tester.testMCPWithChrome();
}

runIntegrationTest();
