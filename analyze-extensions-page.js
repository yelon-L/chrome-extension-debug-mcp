#!/usr/bin/env node

/**
 * 分析chrome://extensions/页面内容并截图
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

async function analyzeExtensionsPage() {
  console.log('分析chrome://extensions/页面...');
  
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
    
    // 2. 获取当前标签页列表，找到extensions页面
    console.log('2. 查找extensions页面...');
    const tabsResult = await sendMCPRequest('tools/call', {
      name: 'list_tabs',
      arguments: {}
    });
    
    const tabs = JSON.parse(tabsResult.result.content[0].text);
    const extensionsTab = tabs.find(tab => tab.url.includes('chrome://extensions'));
    
    if (!extensionsTab) {
      console.log('❌ 未找到chrome://extensions页面');
      return;
    }
    
    console.log(`✅ 找到extensions页面: ${extensionsTab.id} - ${extensionsTab.title}`);
    
    // 3. 切换到extensions页面
    console.log('3. 切换到extensions页面...');
    const switchResult = await sendMCPRequest('tools/call', {
      name: 'switch_tab',
      arguments: { tabId: extensionsTab.id }
    });
    
    if (switchResult.result) {
      console.log('✅ 成功切换到extensions页面');
    }
    
    // 4. 截图查看页面
    console.log('4. 截图页面...');
    const screenshotResult = await sendMCPRequest('tools/call', {
      name: 'screenshot',
      arguments: {
        path: '/home/p/workspace/chrome-debug-mcp/extensions-page.png',
        fullPage: true,
        tabId: extensionsTab.id
      }
    });
    
    if (screenshotResult.result) {
      console.log('✅ 截图已保存到: /home/p/workspace/chrome-debug-mcp/extensions-page.png');
    } else {
      console.log('❌ 截图失败:', screenshotResult.error);
    }
    
    // 5. 分析页面DOM内容
    console.log('5. 分析页面DOM内容...');
    const analyzeResult = await sendMCPRequest('tools/call', {
      name: 'evaluate',
      arguments: {
        expression: `
          JSON.stringify({
            title: document.title,
            url: location.href,
            extensionCards: document.querySelectorAll('extensions-item').length,
            extensionManager: !!document.querySelector('extensions-manager'),
            toolbarInfo: document.querySelector('extensions-toolbar') ? {
              hasDevMode: !!document.querySelector('#devMode'),
              hasLoadUnpacked: !!document.querySelector('#loadUnpacked'),
              hasPackExtensions: !!document.querySelector('#packExtensions')
            } : null,
            extensionsList: Array.from(document.querySelectorAll('extensions-item')).map(item => ({
              name: item.querySelector('#name')?.textContent || '',
              id: item.getAttribute('id') || '',
              enabled: item.querySelector('#enableToggle')?.checked || false,
              description: item.querySelector('#description')?.textContent || ''
            })),
            noExtensionsMessage: document.querySelector('.no-items')?.textContent || '',
            devModeEnabled: document.querySelector('#devMode')?.checked || false,
            bodyClasses: Array.from(document.body.classList),
            errorMessages: Array.from(document.querySelectorAll('.error')).map(el => el.textContent)
          }, null, 2)
        `,
        tabId: extensionsTab.id
      }
    });
    
    if (analyzeResult.result) {
      console.log('✅ 页面分析结果:');
      const analysis = JSON.parse(analyzeResult.result.content[0].text);
      
      console.log('\n📋 页面基本信息:');
      console.log(`  标题: ${analysis.title}`);
      console.log(`  URL: ${analysis.url}`);
      console.log(`  开发者模式: ${analysis.devModeEnabled ? '已启用' : '未启用'}`);
      
      console.log('\n🧩 扩展信息:');
      console.log(`  扩展卡片数量: ${analysis.extensionCards}`);
      
      if (analysis.extensionsList.length > 0) {
        console.log('  已安装的扩展:');
        analysis.extensionsList.forEach((ext, i) => {
          console.log(`    ${i + 1}. ${ext.name} (${ext.enabled ? '已启用' : '已禁用'})`);
          console.log(`       ID: ${ext.id}`);
          console.log(`       描述: ${ext.description}`);
        });
      } else {
        console.log('  没有找到已安装的扩展');
        if (analysis.noExtensionsMessage) {
          console.log(`  页面消息: ${analysis.noExtensionsMessage}`);
        }
      }
      
      console.log('\n🛠️ 工具栏功能:');
      if (analysis.toolbarInfo) {
        console.log(`  开发者模式开关: ${analysis.toolbarInfo.hasDevMode ? '存在' : '不存在'}`);
        console.log(`  加载未打包扩展: ${analysis.toolbarInfo.hasLoadUnpacked ? '存在' : '不存在'}`);
        console.log(`  打包扩展: ${analysis.toolbarInfo.hasPackExtensions ? '存在' : '不存在'}`);
      }
      
      if (analysis.errorMessages.length > 0) {
        console.log('\n⚠️ 错误信息:');
        analysis.errorMessages.forEach(msg => console.log(`  - ${msg}`));
      }
      
    } else {
      console.log('❌ 页面分析失败:', analyzeResult.error);
    }
    
    // 6. 尝试启用开发者模式来查看更多信息
    if (analyzeResult.result && !JSON.parse(analyzeResult.result.content[0].text).devModeEnabled) {
      console.log('\n6. 尝试启用开发者模式...');
      const enableDevModeResult = await sendMCPRequest('tools/call', {
        name: 'click',
        arguments: {
          selector: '#devMode',
          tabId: extensionsTab.id
        }
      });
      
      if (enableDevModeResult.result) {
        console.log('✅ 已尝试启用开发者模式');
        
        // 等待页面更新
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 重新截图
        console.log('重新截图...');
        await sendMCPRequest('tools/call', {
          name: 'screenshot',
          arguments: {
            path: '/home/p/workspace/chrome-debug-mcp/extensions-page-devmode.png',
            fullPage: true,
            tabId: extensionsTab.id
          }
        });
        console.log('✅ 开发者模式截图已保存');
      }
    }
    
  } catch (error) {
    console.log('❌ 分析失败:', error.message);
  }
}

analyzeExtensionsPage();
