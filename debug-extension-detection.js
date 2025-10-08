#!/usr/bin/env node

/**
 * 调试扩展检测问题 - 对比不同检测方法
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

async function debugExtensionDetection() {
  console.log('🔍 调试扩展检测问题...\n');
  
  try {
    // 连接Chrome
    const attachResult = await sendMCPRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { host: 'localhost', port: 9222 }
    });
    if (!attachResult.result) return;
    console.log('✅ Chrome连接成功\n');
    
    // 1. 测试list_extensions
    console.log('1️⃣ 测试list_extensions API:');
    const listExtResult = await sendMCPRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (listExtResult.result) {
      const extensions = JSON.parse(listExtResult.result.content[0].text);
      console.log(`   结果: ${extensions.length} 个扩展目标`);
      console.log(`   详情: ${JSON.stringify(extensions, null, 2)}\n`);
    }
    
    // 2. 直接检查Chrome JSON API
    console.log('2️⃣ 检查Chrome /json API:');
    const chromeResponse = await fetch('http://localhost:9222/json');
    const chromeTargets = await chromeResponse.json();
    
    const extensionTargets = chromeTargets.filter(t => 
      t.url?.includes('chrome-extension://') || 
      t.type === 'service_worker' ||
      t.title?.includes('extension')
    );
    
    console.log(`   总目标: ${chromeTargets.length}`);
    console.log(`   扩展相关: ${extensionTargets.length}`);
    
    if (extensionTargets.length > 0) {
      console.log('   扩展目标详情:');
      extensionTargets.forEach((target, i) => {
        console.log(`     ${i + 1}. Type: ${target.type}`);
        console.log(`        URL: ${target.url}`);
        console.log(`        Title: ${target.title}`);
        console.log(`        ID: ${target.id}\n`);
      });
    }
    
    // 3. 启用开发者模式并重新检测
    console.log('3️⃣ 启用开发者模式:');
    
    // 找到extensions页面
    const tabsResult = await sendMCPRequest('tools/call', {
      name: 'list_tabs',
      arguments: {}
    });
    const tabs = JSON.parse(tabsResult.result.content[0].text);
    const extensionsTab = tabs.find(tab => tab.url.includes('chrome://extensions'));
    
    if (extensionsTab) {
      // 点击开发者模式开关
      const clickResult = await sendMCPRequest('tools/call', {
        name: 'click',
        arguments: {
          selector: 'cr-toggle[label="开发者模式"]',
          tabId: extensionsTab.id
        }
      });
      
      if (clickResult.result) {
        console.log('   ✅ 已尝试启用开发者模式');
        
        // 等待页面更新
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 重新检测
        console.log('\n4️⃣ 开发者模式下重新检测:');
        
        // 重新调用list_extensions
        const listExtResult2 = await sendMCPRequest('tools/call', {
          name: 'list_extensions',
          arguments: {}
        });
        
        if (listExtResult2.result) {
          const extensions2 = JSON.parse(listExtResult2.result.content[0].text);
          console.log(`   list_extensions结果: ${extensions2.length} 个扩展目标`);
          if (extensions2.length > 0) {
            console.log(`   详情: ${JSON.stringify(extensions2, null, 2)}`);
          }
        }
        
        // 重新检查Chrome JSON API
        const chromeResponse2 = await fetch('http://localhost:9222/json');
        const chromeTargets2 = await chromeResponse2.json();
        const extensionTargets2 = chromeTargets2.filter(t => 
          t.url?.includes('chrome-extension://') || 
          t.type === 'service_worker'
        );
        
        console.log(`   Chrome API结果: ${extensionTargets2.length} 个扩展目标`);
        if (extensionTargets2.length > 0) {
          extensionTargets2.forEach((target, i) => {
            console.log(`     ${i + 1}. Type: ${target.type}, URL: ${target.url}`);
          });
        }
        
        // 截图验证开发者模式已启用
        await sendMCPRequest('tools/call', {
          name: 'screenshot',
          arguments: {
            path: '/home/p/workspace/chrome-debug-mcp/extensions-page-devmode-enabled.png',
            fullPage: true,
            tabId: extensionsTab.id
          }
        });
        console.log('   📸 开发者模式截图已保存');
      }
    }
    
    // 5. 总结对比
    console.log('\n5️⃣ 总结:');
    console.log('   - 截图显示: Video SRT Ext MVP 0.4.0 存在');
    console.log('   - list_extensions: 未检测到');
    console.log('   - 可能原因: 扩展Service Worker未在Target.getTargets()中显示');
    console.log('   - 建议: 检查扩展是否为MV3类型，或Target API的调用时机');
    
  } catch (error) {
    console.log('❌ 调试失败:', error.message);
  }
}

debugExtensionDetection();
