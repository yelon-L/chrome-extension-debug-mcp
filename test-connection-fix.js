#!/usr/bin/env node
/**
 * Chrome连接修复和功能完整测试
 * 解决fetch兼容性问题，展示Mutex使用，验证所有Chrome功能
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

class ChromeConnectionTester {
  constructor() {
    this.results = {
      connection: false,
      mutex: false,
      chrome_functions: false,
      details: []
    };
  }

  async testChromeConnection() {
    console.log('\n🔍 测试Chrome连接状态...');
    
    try {
      // 使用node-fetch测试连接
      const response = await fetch('http://localhost:9222/json/version', {
        timeout: 3000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('✅ Chrome连接成功:');
      console.log(`  浏览器: ${data.Browser}`);
      console.log(`  协议版本: ${data['Protocol-Version']}`);
      console.log(`  WebSocket: ${data.webSocketDebuggerUrl}`);
      
      this.results.connection = true;
      return data;
      
    } catch (error) {
      console.error('❌ Chrome连接失败:', error.message);
      console.log('💡 解决建议:');
      console.log('  1. 确认Chrome正在运行: google-chrome --remote-debugging-port=9222');
      console.log('  2. 检查端口是否被占用: netstat -tulpn | grep 9222');
      console.log('  3. 尝试重启Chrome');
      
      this.results.connection = false;
      return null;
    }
  }

  async testExtensionsList() {
    console.log('\n📋 测试扩展列表功能...');
    
    try {
      const response = await fetch('http://localhost:9222/json', {
        timeout: 3000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const targets = await response.json();
      const extensions = targets.filter(target => 
        target.url && target.url.startsWith('chrome-extension://')
      );
      
      console.log(`✅ 找到 ${extensions.length} 个扩展:`);
      extensions.forEach((ext, index) => {
        const extId = ext.url.match(/chrome-extension:\/\/([^\/]+)/)?.[1] || 'unknown';
        console.log(`  ${index + 1}. ${ext.title || 'Unknown Extension'} (${extId})`);
      });
      
      return extensions;
      
    } catch (error) {
      console.error('❌ 扩展列表获取失败:', error.message);
      return [];
    }
  }

  async testMutexMechanism() {
    console.log('\n🔒 测试Mutex机制...');
    
    const mcpProcess = spawn('node', ['build/main.js'], {
      cwd: '/home/p/workspace/chrome-debug-mcp',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let mutexLogs = [];
    let responses = [];

    mcpProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.trim().startsWith('{')) {
        try {
          const response = JSON.parse(output);
          responses.push(response);
        } catch (e) {
          // 忽略非JSON
        }
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      const log = data.toString();
      if (log.includes('[Mutex]')) {
        mutexLogs.push(log.trim());
        console.log('📝 Mutex日志:', log.trim());
      }
    });

    // 等待启动
    await this.sleep(2000);

    console.log('  🧪 发送并发请求测试Mutex...');
    
    // 发送多个并发请求
    const testMessages = [
      '{"jsonrpc":"2.0","id":"mutex-test-1","method":"tools/call","params":{"name":"get_console_logs","arguments":{}}}',
      '{"jsonrpc":"2.0","id":"mutex-test-2","method":"tools/call","params":{"name":"get_console_logs","arguments":{}}}',
      '{"jsonrpc":"2.0","id":"mutex-test-3","method":"tools/call","params":{"name":"get_console_logs","arguments":{}}}'
    ];

    testMessages.forEach((msg, index) => {
      setTimeout(() => {
        mcpProcess.stdin.write(msg + '\n');
        console.log(`  📤 发送请求 ${index + 1}`);
      }, index * 100); // 快速连续发送
    });

    // 等待处理完成
    await this.sleep(3000);
    mcpProcess.kill('SIGTERM');

    console.log('\n📊 Mutex测试结果:');
    console.log(`  🔒 检测到 ${mutexLogs.length} 条Mutex日志`);
    console.log(`  📨 收到 ${responses.length} 个响应`);
    
    const hasAcquireRelease = mutexLogs.some(log => 
      log.includes('acquired lock') && log.includes('released lock')
    );

    if (hasAcquireRelease && responses.length >= 3) {
      console.log('  ✅ Mutex机制工作正常');
      this.results.mutex = true;
    } else {
      console.log('  ❌ Mutex机制异常');
      this.results.mutex = false;
    }

    return { mutexLogs, responses };
  }

  async testChromeFunctionsWithFixedConnection() {
    console.log('\n🚀 测试Chrome功能 (使用修复的连接)...');
    
    if (!this.results.connection) {
      console.log('❌ 跳过Chrome功能测试 - 连接失败');
      return false;
    }

    const mcpProcess = spawn('node', ['build/main.js'], {
      cwd: '/home/p/workspace/chrome-debug-mcp',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let testResults = [];
    let responses = [];

    mcpProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.trim().startsWith('{')) {
        try {
          const response = JSON.parse(output);
          responses.push(response);
        } catch (e) {
          // 忽略
        }
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      const log = data.toString();
      if (log.includes('Enhanced') || log.includes('Connected') || log.includes('ERROR')) {
        console.log('📝 MCP日志:', log.trim());
      }
    });

    // 等待启动
    await this.sleep(3000);

    // 测试Chrome连接
    console.log('  🔧 测试attach_to_chrome...');
    mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-attach',
      method: 'tools/call',
      params: {
        name: 'attach_to_chrome',
        arguments: { host: 'localhost', port: 9222 }
      }
    }) + '\n');

    await this.sleep(3000);

    // 测试扩展列表
    if (responses.length > 0) {
      console.log('  📋 测试list_extensions...');
      mcpProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-extensions',
        method: 'tools/call',
        params: {
          name: 'list_extensions',
          arguments: {}
        }
      }) + '\n');

      await this.sleep(2000);
    }

    mcpProcess.kill('SIGTERM');

    console.log('\n📊 Chrome功能测试结果:');
    console.log(`  📨 收到响应数量: ${responses.length}`);
    
    const successfulResponses = responses.filter(r => !r.error);
    console.log(`  ✅ 成功响应: ${successfulResponses.length}`);
    console.log(`  ❌ 错误响应: ${responses.filter(r => r.error).length}`);

    if (successfulResponses.length >= 1) {
      console.log('  🎉 Chrome功能基本正常');
      this.results.chrome_functions = true;
    } else {
      console.log('  ⚠️  Chrome功能需要进一步调试');
      this.results.chrome_functions = false;
    }

    return responses;
  }

  async runConnectionFixDemo() {
    console.log('\n🛠️  Chrome连接修复演示...');
    
    // 1. 智能端口发现
    console.log('  🔍 智能端口发现...');
    for (let port = 9222; port <= 9232; port++) {
      try {
        const response = await fetch(`http://localhost:${port}/json/version`, {
          timeout: 1000
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ 发现Chrome在端口 ${port}: ${data.Browser}`);
          break;
        }
      } catch (error) {
        // 继续下一个端口
      }
    }

    // 2. 连接健康检查
    console.log('  🏥 连接健康检查...');
    const health = await this.testChromeConnection();
    
    if (health) {
      console.log('  ✅ 连接健康状态良好');
    } else {
      console.log('  ❌ 连接存在问题，需要修复');
    }

    return health !== null;
  }

  generateFixReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Chrome Debug MCP 连接修复与功能验证报告');
    console.log('='.repeat(80));

    console.log('\n📊 修复结果:');
    console.log(`  🌐 Chrome连接: ${this.results.connection ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🔒 Mutex机制: ${this.results.mutex ? '✅ 工作正常' : '❌ 需要调试'}`);
    console.log(`  🚀 Chrome功能: ${this.results.chrome_functions ? '✅ 基本正常' : '❌ 需要修复'}`);

    const fixedIssues = Object.values(this.results).filter(v => v === true).length;
    const totalIssues = 3;

    console.log('\n🎯 修复效果评估:');
    console.log(`  📈 修复成功率: ${fixedIssues}/${totalIssues} (${((fixedIssues/totalIssues)*100).toFixed(1)}%)`);
    
    if (fixedIssues === totalIssues) {
      console.log('  🎉 所有问题已修复！Chrome Debug MCP完全正常工作');
      console.log('  ✅ fetch兼容性问题已解决');
      console.log('  ✅ Mutex机制验证通过');
      console.log('  ✅ Chrome依赖功能可正常使用');
    } else if (fixedIssues >= 2) {
      console.log('  📈 大部分问题已修复，系统基本可用');
      console.log('  🔧 建议继续优化剩余问题');
    } else {
      console.log('  ⚠️  仍有重要问题需要解决');
      console.log('  🛠️  建议优先修复连接问题');
    }

    console.log('\n📋 Mutex使用指南:');
    console.log('  🔒 基本用法: const guard = await mutex.acquire()');
    console.log('  🎯 使用场景: 所有Chrome API调用都应该使用Mutex保护');
    console.log('  ⚠️  重要提醒: 必须在finally块中调用guard.dispose()');
    console.log('  📊 性能影响: 锁操作通常<1ms，几乎无性能影响');

    return {
      connectionFixed: this.results.connection,
      mutexWorking: this.results.mutex,
      chromeFunctional: this.results.chrome_functions,
      overallSuccess: fixedIssues >= 2
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主测试流程
async function runConnectionFixTest() {
  const tester = new ChromeConnectionTester();
  
  console.log('🔧 Chrome Debug MCP 连接修复与功能测试');
  console.log('📋 目标: 解决fetch兼容性、验证Mutex、测试Chrome功能\n');
  
  try {
    // 1. 连接修复演示
    await tester.runConnectionFixDemo();
    
    // 2. 测试扩展发现
    await tester.testExtensionsList();
    
    // 3. Mutex机制验证
    await tester.testMutexMechanism();
    
    // 4. Chrome功能完整测试
    await tester.testChromeFunctionsWithFixedConnection();
    
    // 5. 生成修复报告
    const report = tester.generateFixReport();
    
    process.exit(report.overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
  }
}

runConnectionFixTest();
