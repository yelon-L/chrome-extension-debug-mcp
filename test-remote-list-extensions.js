#!/usr/bin/env node

/**
 * 远程传输测试脚本 - 测试v2.1.0的HTTP/SSE功能
 */

const DEBUG = true;
const log = (...args) => DEBUG && console.log('[REMOTE-TEST]', ...args);

// 服务器配置
const MCP_SERVER = {
  baseURL: 'http://localhost:3000',
  healthEndpoint: '/health',
  httpEndpoint: '/message',
  sseEndpoint: '/sse'
};

// 发送HTTP请求到MCP服务器
async function sendMCPRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: method,
    params: params
  };
  
  log(`发送请求: ${method}`, params);
  
  try {
    const response = await fetch(`${MCP_SERVER.baseURL}${MCP_SERVER.httpEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    log('收到响应:', result);
    return result;
  } catch (error) {
    log('❌ 请求失败:', error.message);
    throw error;
  }
}

async function testRemoteExtensions() {
  log('开始测试远程传输的list_extensions功能...');
  
  try {
    // 1. 健康检查
    log('1. 检查服务器健康状态...');
    const healthResponse = await fetch(`${MCP_SERVER.baseURL}${MCP_SERVER.healthEndpoint}`);
    const health = await healthResponse.json();
    log('服务器状态:', health);
    
    // 2. 列出工具
    log('2. 获取可用工具列表...');
    const toolsResponse = await sendMCPRequest('tools/list');
    if (toolsResponse.result && toolsResponse.result.tools) {
      const listExtensionsTool = toolsResponse.result.tools.find(tool => tool.name === 'list_extensions');
      if (listExtensionsTool) {
        log('✅ 找到list_extensions工具:', listExtensionsTool.description);
      } else {
        log('❌ 未找到list_extensions工具');
        return;
      }
    }
    
    // 3. 连接Chrome
    log('3. 连接到Chrome (localhost:9222)...');
    const attachResponse = await sendMCPRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: {
        host: 'localhost',
        port: 9222
      }
    });
    
    if (attachResponse.result) {
      log('Chrome连接成功:', attachResponse.result.content[0].text);
    } else {
      log('❌ Chrome连接失败:', attachResponse.error);
      return;
    }
    
    // 4. 调用list_extensions
    log('4. 调用list_extensions...');
    const extensionsResponse = await sendMCPRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (extensionsResponse.result) {
      const extensionsText = extensionsResponse.result.content[0].text;
      log('Extensions响应:', extensionsText);
      
      try {
        const extensions = JSON.parse(extensionsText);
        log(`✅ 解析成功，找到 ${extensions.length} 个扩展目标`);
        
        if (extensions.length === 0) {
          log('⚠️ 没有找到扩展目标，这可能是因为:');
          log('  - Chrome以headless模式运行');
          log('  - 没有安装扩展');
          log('  - 扩展在headless模式下未加载');
          
          // 尝试加载一个测试扩展页面来验证功能
          log('5. 尝试加载扩展页面进行验证...');
          await testWithExtensionPage();
        } else {
          log('✅ 找到的扩展目标:');
          extensions.forEach((ext, i) => {
            log(`  ${i + 1}. Type: ${ext.type}, URL: ${ext.url}, ID: ${ext.id}`);
          });
        }
      } catch (parseError) {
        log('❌ 解析extensions响应失败:', parseError);
      }
    } else {
      log('❌ list_extensions调用失败:', extensionsResponse.error);
    }
    
  } catch (error) {
    log('❌ 测试过程中发生错误:', error.message);
  }
}

async function testWithExtensionPage() {
  try {
    // 创建一个新标签页访问chrome://extensions
    log('创建新标签页访问chrome://extensions...');
    const newTabResponse = await sendMCPRequest('tools/call', {
      name: 'new_tab',
      arguments: {
        url: 'chrome://extensions'
      }
    });
    
    if (newTabResponse.result) {
      log('新标签页创建成功');
      
      // 稍等片刻让页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 再次尝试list_extensions
      log('重新调用list_extensions...');
      const extensionsResponse = await sendMCPRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (extensionsResponse.result) {
        const extensionsText = extensionsResponse.result.content[0].text;
        const extensions = JSON.parse(extensionsText);
        log(`重新扫描找到 ${extensions.length} 个扩展目标`);
        
        extensions.forEach((ext, i) => {
          log(`  ${i + 1}. Type: ${ext.type}, URL: ${ext.url}, ID: ${ext.id}`);
        });
      }
    }
  } catch (error) {
    log('扩展页面测试失败:', error.message);
  }
}

// 运行测试
testRemoteExtensions().catch(console.error);
