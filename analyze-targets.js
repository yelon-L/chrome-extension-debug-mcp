#!/usr/bin/env node

/**
 * 分析Chrome目标 - 查看所有可能的扩展相关目标
 */

const MCP_SERVER = 'http://localhost:3000/message';

async function analyzeTargets() {
  console.log('分析Chrome目标...');
  
  try {
    // 连接Chrome
    const attachResponse = await fetch(MCP_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'attach_to_chrome', arguments: { host: 'localhost', port: 9222 } }
      })
    });
    
    const attachResult = await attachResponse.json();
    if (!attachResult.result) {
      console.log('❌ Chrome连接失败');
      return;
    }
    
    // 直接检查Chrome的 /json 端点
    console.log('\n1. 检查Chrome /json 端点:');
    const chromeJsonResponse = await fetch('http://localhost:9222/json');
    const chromeTargets = await chromeJsonResponse.json();
    
    console.log(`Chrome /json 返回 ${chromeTargets.length} 个目标:`);
    chromeTargets.forEach((target, i) => {
      console.log(`  ${i + 1}. Type: ${target.type}, URL: ${target.url}`);
      console.log(`      Title: ${target.title}`);
      console.log(`      ID: ${target.id}`);
      if (target.url?.includes('extension') || target.type?.includes('extension') || target.title?.includes('extension')) {
        console.log('      ⭐ 可能是扩展相关!');
      }
      console.log('');
    });
    
    // 检查 /json/list 端点
    console.log('\n2. 检查Chrome /json/list 端点:');
    try {
      const listResponse = await fetch('http://localhost:9222/json/list');
      const listTargets = await listResponse.json();
      console.log(`/json/list 返回 ${listTargets.length} 个目标`);
    } catch (e) {
      console.log('/json/list 不可用:', e.message);
    }
    
    // 使用evaluate检查扩展相关API
    console.log('\n3. 检查浏览器扩展API:');
    const evalResponse = await fetch(MCP_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: {
          name: 'evaluate',
          arguments: {
            expression: `
              JSON.stringify({
                hasChrome: typeof chrome !== 'undefined',
                hasExtensions: typeof chrome?.extension !== 'undefined',
                hasRuntime: typeof chrome?.runtime !== 'undefined',
                extensionId: chrome?.runtime?.id || 'none',
                manifestVersion: chrome?.runtime?.getManifest?.()?.manifest_version || 'none',
                extensionName: chrome?.runtime?.getManifest?.()?.name || 'none'
              }, null, 2)
            `
          }
        }
      })
    });
    
    const evalResult = await evalResponse.json();
    if (evalResult.result) {
      console.log('浏览器扩展API检查结果:');
      console.log(evalResult.result.content[0].text);
    }
    
  } catch (error) {
    console.log('❌ 分析失败:', error.message);
  }
}

analyzeTargets();
