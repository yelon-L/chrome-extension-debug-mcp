#!/usr/bin/env node
/**
 * 测试Remote Transport JSON格式化修复
 * 验证返回的JSON不包含多余换行符
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

class RemoteJSONTester {
  constructor() {
    this.mcpProcess = null;
  }

  async testRemoteJSONFormatting() {
    console.log('🧪 测试Remote Transport JSON格式化修复\n');
    
    // 启动remote MCP服务器
    console.log('🚀 启动remote MCP服务器...');
    this.mcpProcess = spawn('node', ['build/main.js', '--transport', 'http', '--port', '31232'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 等待服务器启动
    await this.sleep(6000);

    try {
      // 测试健康检查
      console.log('🔍 测试健康检查JSON格式...');
      const healthResponse = await fetch('http://localhost:31232/health');
      const healthText = await healthResponse.text();
      console.log('健康检查响应长度:', healthText.length);
      console.log('健康检查响应内容:', healthText);
      console.log('包含换行符:', healthText.includes('\n') ? '是' : '否');

      // 测试MCP调用
      console.log('\n📡 测试MCP调用JSON格式...');
      
      const testMessage = {
        jsonrpc: '2.0',
        id: 'json-format-test',
        method: 'tools/call',
        params: {
          name: 'attach_to_chrome',
          arguments: { host: 'localhost', port: 9222 }
        }
      };

      const mcpResponse = await fetch('http://localhost:31232/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });

      if (mcpResponse.ok) {
        const responseText = await mcpResponse.text();
        console.log('MCP响应长度:', responseText.length);
        console.log('包含换行符:', responseText.includes('\n') ? '是' : '否');
        console.log('包含多个空格:', responseText.includes('  ') ? '是' : '否');
        
        // 检查是否是有效的紧凑JSON
        try {
          const parsed = JSON.parse(responseText);
          const compactJson = JSON.stringify(parsed);
          const isCompact = responseText.length === compactJson.length;
          console.log('JSON格式:', isCompact ? '✅ 紧凑格式' : '⚠️  包含格式化');
          
          if (!isCompact) {
            console.log('原始长度:', responseText.length);
            console.log('紧凑长度:', compactJson.length);
            console.log('多余字符:', responseText.length - compactJson.length);
          }
        } catch (e) {
          console.log('❌ JSON解析失败');
        }
        
        // 显示响应的开头部分
        console.log('响应开头:', responseText.substring(0, 200) + '...');
        
      } else {
        console.log('❌ MCP调用失败:', mcpResponse.status);
      }

      // 测试扩展列表API
      console.log('\n📋 测试扩展列表API JSON格式...');
      
      const extMessage = {
        jsonrpc: '2.0',
        id: 'ext-format-test',
        method: 'tools/call',
        params: {
          name: 'list_extensions',
          arguments: {}
        }
      };

      const extResponse = await fetch('http://localhost:31232/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extMessage)
      });

      if (extResponse.ok) {
        const extText = await extResponse.text();
        console.log('扩展列表响应长度:', extText.length);
        console.log('包含换行符:', extText.includes('\n') ? '是' : '否');
        
        // 检查content字段中的JSON
        try {
          const parsed = JSON.parse(extText);
          if (parsed.result && parsed.result.content && parsed.result.content[0]) {
            const contentText = parsed.result.content[0].text;
            console.log('content字段包含换行符:', contentText.includes('\n') ? '是' : '否');
            console.log('content字段包含缩进:', contentText.includes('  ') ? '是' : '否');
            
            // 检查content是否是紧凑JSON
            try {
              const contentParsed = JSON.parse(contentText);
              const compactContent = JSON.stringify(contentParsed);
              const isContentCompact = contentText.length === compactContent.length;
              console.log('Content JSON格式:', isContentCompact ? '✅ 紧凑格式' : '⚠️  包含格式化');
            } catch (e) {
              console.log('Content不是JSON格式');
            }
          }
        } catch (e) {
          console.log('响应解析失败');
        }
      }

    } catch (error) {
      console.error('测试过程中发生错误:', error.message);
    } finally {
      // 清理
      if (this.mcpProcess) {
        this.mcpProcess.kill('SIGTERM');
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行测试
async function runTest() {
  const tester = new RemoteJSONTester();
  await tester.testRemoteJSONFormatting();
}

runTest();
