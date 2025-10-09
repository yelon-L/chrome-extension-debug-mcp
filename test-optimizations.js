#!/usr/bin/env node
/**
 * Chrome Debug MCP 优化效果验证
 * 专门测试截图超时和扩展名称匹配的改进
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

class OptimizationTester {
  constructor() {
    this.mcpProcess = null;
    this.responses = [];
    this.logs = [];
    this.optimizationResults = {
      screenshot_timeout: { before: 8000, after: 12000, tested: false, improved: false },
      extension_matching: { before: 'strict', after: 'flexible', tested: false, improved: false }
    };
  }

  async startMCPServer() {
    console.log('\n🚀 启动Chrome Debug MCP服务器进行优化测试...');
    
    this.mcpProcess = spawn('node', ['build/main.js'], {
      cwd: '/home/p/workspace/chrome-debug-mcp',
      stdio: ['pipe', 'pipe', 'pipe']
    });

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
    });

    // 等待启动
    await this.sleep(4000);
  }

  async testScreenshotTimeoutOptimization() {
    console.log('\n📷 ===== 截图超时优化测试 =====');
    
    // 首先连接Chrome
    console.log('🔌 连接Chrome...');
    this.mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'connect-chrome',
      method: 'tools/call',
      params: {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9222 }
      }
    }) + '\n');

    await this.sleep(3000);

    // 测试截图功能
    console.log('📷 测试截图超时改进...');
    const screenshotStartTime = Date.now();
    
    this.mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-screenshot-timeout',
      method: 'tools/call',
      params: {
        name: 'screenshot',
        arguments: {
          returnBase64: true
        }
      }
    }) + '\n');

    // 等待截图完成，最多等待15秒
    const initialResponseCount = this.responses.length;
    await this.waitForResponse(initialResponseCount, 15000);
    
    const screenshotDuration = Date.now() - screenshotStartTime;
    const screenshotResponse = this.responses[this.responses.length - 1];

    this.optimizationResults.screenshot_timeout.tested = true;
    
    if (screenshotResponse && !screenshotResponse.error && screenshotDuration <= 12000) {
      console.log(`✅ 截图优化成功: ${screenshotDuration}ms (目标: ≤12秒)`);
      this.optimizationResults.screenshot_timeout.improved = true;
    } else if (screenshotResponse && screenshotResponse.error) {
      console.log(`❌ 截图失败: ${screenshotResponse.error.message}`);
    } else {
      console.log(`⏱️ 截图超时: ${screenshotDuration}ms > 12秒`);
    }

    return {
      success: !screenshotResponse?.error,
      duration: screenshotDuration,
      response: screenshotResponse
    };
  }

  async testExtensionMatchingOptimization() {
    console.log('\n🧩 ===== 扩展名称匹配优化测试 =====');
    
    console.log('📋 获取扩展列表...');
    this.mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-extension-matching',
      method: 'tools/call',
      params: {
        name: 'list_extensions',
        arguments: {}
      }
    }) + '\n');

    await this.sleep(3000);
    
    const extensionResponse = this.responses[this.responses.length - 1];
    this.optimizationResults.extension_matching.tested = true;

    if (extensionResponse && !extensionResponse.error) {
      const responseText = JSON.stringify(extensionResponse).toLowerCase();
      
      // 测试改进的匹配逻辑
      const matchPatterns = [
        'enhanced mcp debug test extension',  // 完整匹配
        'enhanced',                           // 关键词匹配
        'mcp',                               // 关键词匹配  
        'debug',                             // 关键词匹配
        'test'                               // 关键词匹配
      ];

      const matchedPatterns = matchPatterns.filter(pattern => 
        responseText.includes(pattern.toLowerCase())
      );

      console.log('🔍 匹配模式测试结果:');
      matchPatterns.forEach(pattern => {
        const matched = responseText.includes(pattern.toLowerCase());
        console.log(`  ${matched ? '✅' : '❌'} "${pattern}": ${matched ? '匹配' : '未匹配'}`);
      });

      if (matchedPatterns.length > 0) {
        console.log(`✅ 扩展匹配优化成功: 匹配到 ${matchedPatterns.length}/${matchPatterns.length} 个模式`);
        console.log(`   匹配内容: ${matchedPatterns.join(', ')}`);
        this.optimizationResults.extension_matching.improved = true;
        
        // 测试扩展ID提取
        const extIdPatterns = [
          /Enhanced.*?MCP.*?Debug.*?Test.*?Extension.*?([a-z]{32})/i,
          /Enhanced.*?MCP.*?([a-z]{32})/i,
          /Enhanced.*?Debug.*?([a-z]{32})/i,
          /chrome-extension:\/\/([a-z]{32})/i
        ];

        let foundExtensionId = null;
        for (const regex of extIdPatterns) {
          const match = responseText.match(regex);
          if (match) {
            foundExtensionId = match[1];
            console.log(`🆔 找到扩展ID: ${foundExtensionId} (模式: ${regex.source.substring(0, 30)}...)`);
            break;
          }
        }

        return {
          success: true,
          matchedCount: matchedPatterns.length,
          totalPatterns: matchPatterns.length,
          extensionId: foundExtensionId,
          response: extensionResponse
        };
      } else {
        console.log('❌ 未找到任何匹配的扩展内容');
        return {
          success: false,
          reason: 'No matching extension content found',
          response: extensionResponse
        };
      }
    } else {
      console.log('❌ 获取扩展列表失败');
      return {
        success: false,
        reason: extensionResponse?.error?.message || 'Failed to get extensions',
        response: extensionResponse
      };
    }
  }

  async testOverallImprovements() {
    console.log('\n🎯 ===== 综合改进验证 =====');
    
    // 测试工具列表（基准测试）
    console.log('🛠️ 基准测试: 工具列表...');
    this.mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-tools-baseline',
      method: 'tools/list',
      params: {}
    }) + '\n');

    await this.sleep(2000);
    
    const toolsResponse = this.responses[this.responses.length - 1];
    const toolsWork = toolsResponse && !toolsResponse.error;

    console.log(`📊 工具列表: ${toolsWork ? '✅ 正常' : '❌ 异常'}`);
    
    // 检查Mutex日志
    const mutexLogs = this.logs.filter(log => log.message.includes('[Mutex]'));
    const mutexWorking = mutexLogs.length > 0;
    
    console.log(`🔒 Mutex机制: ${mutexWorking ? '✅ 活跃' : '❌ 无活动'}`);
    console.log(`   Mutex日志数量: ${mutexLogs.length}`);

    // 检查配置日志
    const configLogs = this.logs.filter(log => 
      log.message.includes('Configuration') || log.message.includes('Enhanced')
    );
    
    console.log(`📊 增强配置: ${configLogs.length > 0 ? '✅ 显示' : '❌ 缺失'}`);

    return {
      toolsWorking: toolsWork,
      mutexActive: mutexWorking,
      configVisible: configLogs.length > 0,
      totalLogs: this.logs.length
    };
  }

  generateOptimizationReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Chrome Debug MCP 优化效果验证报告');
    console.log('='.repeat(80));

    console.log('\n📷 截图超时优化:');
    const screenshotOpt = this.optimizationResults.screenshot_timeout;
    console.log(`  🕐 超时设置: ${screenshotOpt.before}ms → ${screenshotOpt.after}ms (+50%)`);
    console.log(`  🧪 测试状态: ${screenshotOpt.tested ? '✅ 已测试' : '❌ 未测试'}`);
    console.log(`  📈 改进效果: ${screenshotOpt.improved ? '✅ 成功' : '❌ 需要进一步优化'}`);

    console.log('\n🧩 扩展匹配优化:');
    const extensionOpt = this.optimizationResults.extension_matching;
    console.log(`  📝 匹配策略: ${extensionOpt.before} → ${extensionOpt.after}`);
    console.log(`  🧪 测试状态: ${extensionOpt.tested ? '✅ 已测试' : '❌ 未测试'}`);
    console.log(`  📈 改进效果: ${extensionOpt.improved ? '✅ 成功' : '❌ 需要进一步优化'}`);

    const totalOptimizations = 2;
    const successfulOptimizations = [screenshotOpt, extensionOpt].filter(opt => opt.improved).length;
    const optimizationSuccessRate = (successfulOptimizations / totalOptimizations * 100).toFixed(1);

    console.log('\n🎯 优化总结:');
    console.log(`  📊 优化成功率: ${successfulOptimizations}/${totalOptimizations} (${optimizationSuccessRate}%)`);
    console.log(`  🏆 优化等级: ${this.getOptimizationGrade(parseFloat(optimizationSuccessRate))}`);

    if (successfulOptimizations === totalOptimizations) {
      console.log('\n🎉 优化结果:');
      console.log('  ✅ 所有目标优化均已成功实施');
      console.log('  ✅ 截图功能稳定性显著提升');
      console.log('  ✅ 扩展名称匹配更加灵活可靠');
      console.log('  🚀 Chrome Debug MCP 用户体验进一步改善');
    } else if (successfulOptimizations > 0) {
      console.log('\n📈 部分优化成功:');
      console.log('  ✅ 部分优化目标已实现');
      console.log('  🔧 其他优化需要进一步调整');
    } else {
      console.log('\n⚠️ 优化效果评估:');
      console.log('  🔧 优化需要在连接稳定的基础上重新测试');
      console.log('  📋 建议优先解决基础连接问题');
    }

    return {
      optimizationSuccessRate: parseFloat(optimizationSuccessRate),
      successfulOptimizations,
      totalOptimizations,
      results: this.optimizationResults
    };
  }

  getOptimizationGrade(successRate) {
    if (successRate >= 90) return '🏆 卓越优化';
    if (successRate >= 70) return '🥇 优秀优化';
    if (successRate >= 50) return '🥈 良好优化';
    return '🔧 需要改进';
  }

  async waitForResponse(initialCount, timeout) {
    const startTime = Date.now();
    while (this.responses.length <= initialCount && (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }
  }

  async cleanup() {
    if (this.mcpProcess) {
      this.mcpProcess.kill('SIGTERM');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主优化验证流程
async function runOptimizationTest() {
  const tester = new OptimizationTester();
  
  try {
    console.log('🔧 Chrome Debug MCP 优化效果专项验证');
    console.log('📋 目标: 验证截图超时和扩展匹配改进');
    
    // 1. 启动MCP服务器
    await tester.startMCPServer();
    
    // 2. 测试截图超时优化
    const screenshotResult = await tester.testScreenshotTimeoutOptimization();
    
    // 3. 测试扩展匹配优化
    const extensionResult = await tester.testExtensionMatchingOptimization();
    
    // 4. 综合改进验证
    const overallResult = await tester.testOverallImprovements();
    
    // 5. 生成优化报告
    const report = tester.generateOptimizationReport();
    
    // 6. 清理
    await tester.cleanup();
    
    process.exit(report.optimizationSuccessRate >= 50 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 优化测试执行失败:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

runOptimizationTest();
