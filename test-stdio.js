#!/usr/bin/env node
/**
 * 测试stdio模式的增强功能
 */

import { spawn } from 'child_process';

async function testStdioEnhanced() {
  console.log('🎯 [Stdio Test] Starting enhanced stdio mode tests...');
  
  const mcpProcess = spawn('npm', ['start'], { 
    cwd: '/home/p/workspace/chrome-debug-mcp',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseCount = 0;
  const responses = [];
  
  mcpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.trim().startsWith('{')) {
      try {
        const response = JSON.parse(output);
        responses.push(response);
        console.log(`📥 [Response ${++responseCount}]:`, JSON.stringify(response, null, 2));
      } catch (e) {
        // Not a JSON response
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('📝 [MCP Log]:', data.toString().trim());
  });

  // Test sequence
  const tests = [
    // Test 1: Attach with enhanced features
    {
      name: 'Enhanced Attach',
      message: {
        jsonrpc: '2.0',
        id: 'test-attach',
        method: 'tools/call',
        params: {
          name: 'attach_to_chrome',
          arguments: {}
        }
      }
    },
    // Test 2: Fast extension listing
    {
      name: 'Fast Extension List',
      message: {
        jsonrpc: '2.0', 
        id: 'test-extensions',
        method: 'tools/call',
        params: {
          name: 'list_extensions',
          arguments: {}
        }
      }
    }
  ];

  // Send tests with delay
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`🚀 [Test ${i + 1}] ${test.name}...`);
    
    const startTime = Date.now();
    mcpProcess.stdin.write(JSON.stringify(test.message) + '\n');
    
    // Wait for response
    await new Promise(resolve => {
      const checkResponse = () => {
        if (responses.length > i) {
          const duration = Date.now() - startTime;
          console.log(`⚡ [Performance] ${test.name} completed in ${duration}ms`);
          resolve();
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ [Stdio Test] All tests completed!');
  console.log(`📊 [Summary] Total responses: ${responses.length}`);
  
  // Cleanup
  mcpProcess.kill('SIGTERM');
  process.exit(0);
}

testStdioEnhanced().catch(error => {
  console.error('❌ [Stdio Test] Failed:', error);
  process.exit(1);
});
