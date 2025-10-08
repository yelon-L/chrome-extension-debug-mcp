#!/usr/bin/env node

/**
 * 测试带扩展的list_extensions功能
 */

const MCP_SERVER = 'http://localhost:3000/message';

async function sendMCPRequest(method, params) {
  const response = await fetch(MCP_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    })
  });
  return await response.json();
}

async function testWithExtension() {
  console.log('开始测试带扩展的list_extensions...');
  
  try {
    // 1. 连接Chrome
    console.log('1. 连接Chrome...');
    const attachResult = await sendMCPRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { host: 'localhost', port: 9222 }
    });
    
    if (!attachResult.result) {
      console.log('❌ Chrome连接失败');
      return;
    }
    console.log('✅ Chrome连接成功');
    
    // 2. 打开chrome://extensions页面
    console.log('2. 打开chrome://extensions页面...');
    const newTabResult = await sendMCPRequest('tools/call', {
      name: 'new_tab',
      arguments: { url: 'chrome://extensions' }
    });
    
    if (newTabResult.result) {
      console.log('✅ 扩展页面已打开');
    }
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 再次调用list_extensions
    console.log('3. 检查扩展...');
    const extensionsResult = await sendMCPRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (extensionsResult.result) {
      const extensions = JSON.parse(extensionsResult.result.content[0].text);
      console.log(`找到 ${extensions.length} 个扩展目标`);
      
      if (extensions.length === 0) {
        console.log('⚠️ 仍然没有找到扩展目标');
        console.log('让我们试试加载测试扩展...');
        
        // 4. 重新启动Chrome并加载测试扩展
        await testLoadExtension();
      } else {
        console.log('✅ 找到扩展:');
        extensions.forEach((ext, i) => {
          console.log(`  ${i + 1}. Type: ${ext.type}, URL: ${ext.url}`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

async function testLoadExtension() {
  console.log('4. 尝试重启Chrome并加载测试扩展...');
  
  try {
    // 获取当前tabs
    const tabsResult = await sendMCPRequest('tools/call', {
      name: 'list_tabs',
      arguments: {}
    });
    
    console.log('当前tabs信息:', JSON.parse(tabsResult.result.content[0].text));
    
    // 建议用户重新启动Chrome with extension
    console.log('\n建议操作:');
    console.log('1. 关闭当前Chrome');
    console.log('2. 用以下命令重启Chrome:');
    console.log('   google-chrome --remote-debugging-port=9222 --load-extension=/home/p/workspace/chrome-debug-mcp/test-extension --user-data-dir=/tmp/chrome-debug-ext');
    console.log('3. 重新运行测试');
    
  } catch (error) {
    console.log('❌ 扩展加载测试失败:', error.message);
  }
}

testWithExtension();
