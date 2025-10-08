#!/usr/bin/env node
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');

async function testNewFeatures() {
  console.log('🧪 测试新开发的MCP功能...');
  
  // 启动服务器进程
  const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
  const serverProcess = spawn('node', [serverPath], { 
    stdio: ['pipe', 'pipe', 'inherit'] 
  });
  
  // 创建MCP客户端
  const transport = new StdioClientTransport({
    reader: serverProcess.stdout,
    writer: serverProcess.stdin
  });
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  try {
    // 连接到服务器
    await client.connect(transport);
    console.log('✅ MCP客户端连接成功');
    
    // 1. 测试工具列表
    console.log('\n📋 测试工具列表...');
    const tools = await client.listTools();
    console.log(`发现 ${tools.tools.length} 个工具:`);
    tools.tools.forEach((tool, i) => {
      console.log(`  ${i+1}. ${tool.name} - ${tool.description}`);
    });
    
    // 验证新增工具是否存在
    const expectedTools = ['click', 'type', 'screenshot', 'list_tabs', 'new_tab', 'switch_tab', 'close_tab'];
    const foundTools = tools.tools.map(t => t.name);
    const missingTools = expectedTools.filter(t => !foundTools.includes(t));
    
    if (missingTools.length === 0) {
      console.log('✅ 所有新增工具都已正确注册');
    } else {
      console.log('❌ 缺少工具:', missingTools);
    }
    
    // 2. 测试Chrome启动
    console.log('\n🌐 测试Chrome启动...');
    const testHtmlPath = 'file://' + path.resolve(__dirname, '..', 'test', 'test.html');
    const launchResult = await client.callTool('launch_chrome', {
      url: testHtmlPath
    });
    console.log('Chrome启动结果:', launchResult.content[0].text.substring(0, 200) + '...');
    
    // 3. 测试标签页管理
    console.log('\n📑 测试标签页管理...');
    const tabsResult = await client.callTool('list_tabs', {});
    console.log('当前标签页:', tabsResult.content[0].text);
    
    // 4. 测试新建标签页
    const newTabResult = await client.callTool('new_tab', {
      url: 'data:text/html,<h1>Test Page</h1><input id="test-input" placeholder="test"/><button id="test-btn">Click Me</button>'
    });
    console.log('新标签页创建:', newTabResult.content[0].text);
    
    // 5. 测试点击功能
    console.log('\n🖱️ 测试点击功能...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待页面加载
    const clickResult = await client.callTool('click', {
      selector: '#test-input'
    });
    console.log('点击结果:', clickResult.content[0].text);
    
    // 6. 测试输入功能
    console.log('⌨️ 测试输入功能...');
    const typeResult = await client.callTool('type', {
      selector: '#test-input',
      text: 'Hello MCP!',
      clear: true
    });
    console.log('输入结果:', typeResult.content[0].text);
    
    // 7. 测试截图功能
    console.log('📸 测试截图功能...');
    const screenshotResult = await client.callTool('screenshot', {
      returnBase64: true,
      fullPage: false
    });
    const base64Length = screenshotResult.content[0].text.length;
    console.log(`截图结果: Base64字符串长度 ${base64Length} (${base64Length > 1000 ? '✅' : '❌'})`);
    
    // 8. 测试控制台日志
    console.log('\n📝 测试控制台日志...');
    const logsResult = await client.callTool('get_console_logs', {
      clear: true
    });
    console.log('控制台日志:', logsResult.content[0].text);
    
    console.log('\n🎉 所有功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 清理
    await client.close();
    serverProcess.kill();
  }
}

testNewFeatures().catch(console.error);
