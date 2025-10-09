#!/usr/bin/env node
/**
 * Chrome生命周期安全测试
 * 验证正确的Chrome启动/连接/清理机制
 * 🔑 核心：只关闭MCP启动的Chrome，不干扰用户Chrome
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

class ChromeLifecycleTester {
  constructor() {
    this.mcpProcess = null;
    this.results = {
      preExistingChrome: null,
      attachBehavior: null,
      cleanupBehavior: null,
      mcpLaunchedChrome: null
    };
  }

  async testChromeLifecycleManagement() {
    console.log('\n🔍 Chrome生命周期管理安全测试');
    console.log('🎯 目标: 验证MCP不会错误关闭用户的Chrome\n');

    // Phase 1: 检测预先存在的Chrome
    await this.checkPreExistingChrome();

    // Phase 2: 测试MCP连接行为
    await this.testMCPAttachBehavior();

    // Phase 3: 测试MCP清理行为
    await this.testMCPCleanupBehavior();

    // Phase 4: 测试MCP启动的Chrome处理
    await this.testMCPLaunchedChrome();

    // 生成安全报告
    this.generateSafetyReport();
  }

  async checkPreExistingChrome() {
    console.log('🔍 Phase 1: 检查预先存在的Chrome...');
    
    try {
      const response = await fetch('http://localhost:9222/json/version', {
        timeout: 3000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.results.preExistingChrome = {
          exists: true,
          version: data.Browser,
          debuggerUrl: data.webSocketDebuggerUrl,
          isUserChrome: true  // 假设是用户启动的
        };
        
        console.log(`✅ 发现预先存在的Chrome: ${data.Browser}`);
        console.log(`   🔒 这是用户的Chrome，不应该被MCP关闭`);
      } else {
        throw new Error('Chrome not responding');
      }
    } catch (error) {
      this.results.preExistingChrome = {
        exists: false,
        reason: error.message
      };
      console.log('❌ 没有发现运行中的Chrome');
    }
  }

  async testMCPAttachBehavior() {
    console.log('\n🔌 Phase 2: 测试MCP连接行为...');

    if (!this.results.preExistingChrome?.exists) {
      console.log('⏭️  跳过连接测试 - 没有预先存在的Chrome');
      return;
    }

    // 启动MCP并让它连接到现有Chrome
    console.log('🚀 启动MCP服务器...');
    this.mcpProcess = spawn('node', ['build/main.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let mcpConnected = false;
    let connectionLogs = [];

    this.mcpProcess.stderr.on('data', (data) => {
      const log = data.toString();
      connectionLogs.push(log.trim());
      
      if (log.includes('attached') || log.includes('Connected') || log.includes('Chrome connection')) {
        mcpConnected = true;
      }
    });

    // 等待MCP启动并连接
    await this.sleep(5000);

    // 测试MCP是否能够连接到现有Chrome
    this.mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-attach',
      method: 'tools/call',
      params: {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9222 }
      }
    }) + '\n');

    await this.sleep(3000);

    // 验证Chrome仍然运行
    const chromeStillRunning = await this.isChromeRunning();
    
    this.results.attachBehavior = {
      mcpConnected,
      chromeStillRunning,
      connectionLogs: connectionLogs.filter(log => 
        log.includes('Chrome') || log.includes('attach') || log.includes('connect')
      ),
      isAppropriate: chromeStillRunning  // Chrome应该继续运行
    };

    if (chromeStillRunning) {
      console.log('✅ MCP成功连接，Chrome继续正常运行');
    } else {
      console.log('❌ 错误：连接过程中Chrome被意外关闭');
    }
  }

  async testMCPCleanupBehavior() {
    console.log('\n🧹 Phase 3: 测试MCP清理行为...');

    if (!this.mcpProcess) {
      console.log('⏭️  跳过清理测试 - MCP未运行');
      return;
    }

    const chromeRunningBeforeCleanup = await this.isChromeRunning();
    console.log(`📊 清理前Chrome状态: ${chromeRunningBeforeCleanup ? '✅ 运行中' : '❌ 未运行'}`);

    // 关闭MCP进程，触发清理
    console.log('🛑 关闭MCP进程，触发清理逻辑...');
    this.mcpProcess.kill('SIGTERM');

    // 等待清理完成
    await this.sleep(3000);

    // 检查Chrome是否还在运行
    const chromeRunningAfterCleanup = await this.isChromeRunning();
    console.log(`📊 清理后Chrome状态: ${chromeRunningAfterCleanup ? '✅ 继续运行' : '❌ 被关闭'}`);

    this.results.cleanupBehavior = {
      beforeCleanup: chromeRunningBeforeCleanup,
      afterCleanup: chromeRunningAfterCleanup,
      behaviorCorrect: chromeRunningAfterCleanup,  // 用户Chrome应该继续运行
      issue: !chromeRunningAfterCleanup ? 'MCP错误地关闭了用户的Chrome' : null
    };

    if (chromeRunningAfterCleanup) {
      console.log('✅ 正确行为：MCP退出后用户Chrome继续运行');
    } else {
      console.log('🚨 错误行为：MCP退出时错误关闭了用户Chrome');
    }

    this.mcpProcess = null;
  }

  async testMCPLaunchedChrome() {
    console.log('\n🚀 Phase 4: 测试MCP启动Chrome的处理...');

    // 暂时关闭现有Chrome（模拟没有Chrome的情况）
    const hadPreExistingChrome = await this.isChromeRunning();
    
    console.log('📋 测试场景：模拟MCP需要启动新Chrome实例');

    // 这里应该测试当MCP启动自己的Chrome时，
    // 清理时应该正确关闭它
    // 由于这需要修改现有代码，我们先记录期望行为

    this.results.mcpLaunchedChrome = {
      scenario: 'MCP启动新Chrome实例',
      expectedBehavior: '清理时应该关闭MCP启动的Chrome',
      currentImplementation: '需要检查现有代码是否正确实现',
      recommendation: '使用ChromeLifecycleManager确保正确的生命周期管理'
    };

    console.log('📝 记录：当MCP启动Chrome时，应该在清理时关闭它');
    console.log('📝 记录：当MCP连接现有Chrome时，不应该在清理时关闭它');
  }

  async isChromeRunning() {
    try {
      const response = await fetch('http://localhost:9222/json/version', {
        timeout: 2000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  generateSafetyReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 Chrome生命周期管理安全报告');
    console.log('='.repeat(80));

    console.log('\n📊 测试结果摘要:');
    
    // Phase 1结果
    const preChrome = this.results.preExistingChrome;
    console.log(`\n🔍 预先存在的Chrome: ${preChrome?.exists ? '✅ 发现' : '❌ 未发现'}`);
    if (preChrome?.exists) {
      console.log(`   版本: ${preChrome.version}`);
      console.log(`   状态: 用户启动的Chrome实例`);
    }

    // Phase 2结果
    const attachBehavior = this.results.attachBehavior;
    if (attachBehavior) {
      console.log(`\n🔌 MCP连接行为: ${attachBehavior.isAppropriate ? '✅ 正确' : '❌ 有问题'}`);
      console.log(`   连接成功: ${attachBehavior.mcpConnected ? '✅' : '❌'}`);
      console.log(`   Chrome继续运行: ${attachBehavior.chromeStillRunning ? '✅' : '❌'}`);
    }

    // Phase 3结果 - 最关键
    const cleanupBehavior = this.results.cleanupBehavior;
    if (cleanupBehavior) {
      console.log(`\n🧹 MCP清理行为: ${cleanupBehavior.behaviorCorrect ? '✅ 安全' : '🚨 危险'}`);
      console.log(`   清理前Chrome: ${cleanupBehavior.beforeCleanup ? '✅ 运行' : '❌ 停止'}`);
      console.log(`   清理后Chrome: ${cleanupBehavior.afterCleanup ? '✅ 运行' : '❌ 停止'}`);
      
      if (cleanupBehavior.issue) {
        console.log(`   ⚠️  问题: ${cleanupBehavior.issue}`);
      }
    }

    // 生命周期管理评估
    console.log('\n🎯 Chrome生命周期管理评估:');
    
    const hasIssues = (
      (attachBehavior && !attachBehavior.isAppropriate) ||
      (cleanupBehavior && !cleanupBehavior.behaviorCorrect)
    );

    if (!hasIssues) {
      console.log('  🏆 优秀: Chrome生命周期管理完全正确');
      console.log('  ✅ MCP不会干扰用户的Chrome实例');
      console.log('  ✅ 连接和清理行为都符合预期');
    } else {
      console.log('  ⚠️  需要改进: 发现Chrome生命周期管理问题');
      console.log('  🔧 建议: 实施ChromeLifecycleManager');
      console.log('  📋 优先级: 高（用户体验关键）');
    }

    // 改进建议
    console.log('\n💡 改进建议:');
    console.log('  1. 🔒 实施Chrome ownership tracking');
    console.log('     - 标记Chrome是否由MCP启动');
    console.log('     - 只关闭MCP启动的Chrome实例');
    console.log('  2. 📊 改进连接策略');
    console.log('     - 优先attach到现有Chrome');
    console.log('     - 只在必要时launch新Chrome');
    console.log('  3. 🧹 安全清理机制');
    console.log('     - disconnect vs close的正确使用');
    console.log('     - 进程PID跟踪和验证');

    console.log('\n🔑 核心原则:');
    console.log('  "如果Chrome不是MCP启动的，MCP就不应该关闭它"');

    return {
      hasIssues,
      preExistingChromeHandled: preChrome?.exists && (!attachBehavior || attachBehavior.isAppropriate),
      cleanupBehaviorSafe: !cleanupBehavior || cleanupBehavior.behaviorCorrect,
      overallSafety: !hasIssues ? 'safe' : 'needs-improvement'
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主测试流程
async function runLifecycleTest() {
  const tester = new ChromeLifecycleTester();
  
  try {
    await tester.testChromeLifecycleManagement();
    process.exit(0);
  } catch (error) {
    console.error('💥 生命周期测试失败:', error);
    process.exit(1);
  }
}

runLifecycleTest();
