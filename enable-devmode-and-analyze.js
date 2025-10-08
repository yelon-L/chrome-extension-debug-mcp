#!/usr/bin/env node

/**
 * 手动启用开发者模式并重新分析
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

async function enableDevModeAndAnalyze() {
  console.log('🔧 启用开发者模式并重新分析...\n');
  
  try {
    // 连接Chrome
    await sendMCPRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { host: 'localhost', port: 9222 }
    });
    
    // 找到extensions页面
    const tabsResult = await sendMCPRequest('tools/call', {
      name: 'list_tabs',
      arguments: {}
    });
    const tabs = JSON.parse(tabsResult.result.content[0].text);
    const extensionsTab = tabs.find(tab => tab.url.includes('chrome://extensions'));
    
    if (!extensionsTab) {
      console.log('❌ 未找到extensions页面');
      return;
    }
    
    console.log('1️⃣ 切换到extensions页面...');
    await sendMCPRequest('tools/call', {
      name: 'switch_tab',
      arguments: { tabId: extensionsTab.id }
    });
    
    // 尝试多种选择器来点击开发者模式
    console.log('2️⃣ 尝试启用开发者模式...');
    
    const selectors = [
      'cr-toggle',  // 通用选择器
      '#devMode',   // ID选择器
      '[aria-label*="开发者"]',  // 中文aria-label
      '[aria-label*="Developer"]', // 英文aria-label
      'cr-toggle[aria-label*="开发者"]',
      'cr-toggle[aria-label*="Developer"]'
    ];
    
    let clicked = false;
    for (const selector of selectors) {
      try {
        console.log(`   尝试选择器: ${selector}`);
        const clickResult = await sendMCPRequest('tools/call', {
          name: 'click',
          arguments: {
            selector: selector,
            tabId: extensionsTab.id
          }
        });
        
        if (clickResult.result) {
          console.log(`   ✅ 使用选择器 ${selector} 成功点击`);
          clicked = true;
          break;
        } else {
          console.log(`   ❌ 选择器 ${selector} 失败:`, clickResult.error?.message || '未知错误');
        }
      } catch (e) {
        console.log(`   ❌ 选择器 ${selector} 异常:`, e.message);
      }
    }
    
    if (!clicked) {
      console.log('⚠️ 无法点击开发者模式开关，尝试使用坐标点击...');
      // 根据截图，开发者模式开关在右上角
      const coordinateClickResult = await sendMCPRequest('tools/call', {
        name: 'evaluate',
        arguments: {
          expression: `
            // 查找开发者模式元素
            const devModeElement = document.querySelector('cr-toggle') || 
                                 document.querySelector('#devMode') ||
                                 document.querySelector('[aria-label*="开发者"]') ||
                                 Array.from(document.querySelectorAll('*')).find(el => 
                                   el.textContent?.includes('开发者模式') || 
                                   el.getAttribute('aria-label')?.includes('开发者')
                                 );
            
            if (devModeElement) {
              devModeElement.click();
              'clicked via script'
            } else {
              'developer mode element not found'
            }
          `,
          tabId: extensionsTab.id
        }
      });
      
      if (coordinateClickResult.result) {
        const result = JSON.parse(coordinateClickResult.result.content[0].text);
        console.log(`   脚本点击结果: ${result}`);
        clicked = result === 'clicked via script';
      }
    }
    
    if (clicked) {
      // 等待页面更新
      console.log('3️⃣ 等待页面更新...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 重新截图
      console.log('4️⃣ 重新截图...');
      await sendMCPRequest('tools/call', {
        name: 'screenshot',
        arguments: {
          path: '/home/p/workspace/chrome-debug-mcp/extensions-devmode-final.png',
          fullPage: true,
          tabId: extensionsTab.id
        }
      });
      console.log('   📸 截图已保存');
      
      // 重新测试list_extensions
      console.log('5️⃣ 重新测试list_extensions...');
      const listExtResult = await sendMCPRequest('tools/call', {
        name: 'list_extensions',
        arguments: {}
      });
      
      if (listExtResult.result) {
        const extensions = JSON.parse(listExtResult.result.content[0].text);
        console.log(`   结果: ${extensions.length} 个扩展目标`);
        if (extensions.length > 0) {
          console.log('   详情:', JSON.stringify(extensions, null, 2));
        } else {
          console.log('   仍然没有检测到扩展');
        }
      }
      
      // 重新检查Chrome API
      console.log('6️⃣ 重新检查Chrome API...');
      const chromeResponse = await fetch('http://localhost:9222/json');
      const chromeTargets = await chromeResponse.json();
      console.log(`   总目标数: ${chromeTargets.length}`);
      
      // 显示所有目标
      chromeTargets.forEach((target, i) => {
        console.log(`   ${i + 1}. Type: ${target.type}, URL: ${target.url}`);
        if (target.url?.includes('extension') || target.type?.includes('service')) {
          console.log(`      ⭐ 可能的扩展目标!`);
        }
      });
    }
    
  } catch (error) {
    console.log('❌ 操作失败:', error.message);
  }
}

enableDevModeAndAnalyze();
