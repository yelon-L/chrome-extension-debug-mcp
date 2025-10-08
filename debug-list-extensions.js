#!/usr/bin/env node

/**
 * 调试list_extensions功能 - 查看所有目标信息
 */

const DEBUG = true;
const log = (...args) => DEBUG && console.log('[DEBUG]', ...args);

// 服务器配置
const MCP_SERVER = {
  baseURL: 'http://localhost:3000',
  httpEndpoint: '/message'
};

// 发送HTTP请求到MCP服务器
async function sendMCPRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: method,
    params: params
  };
  
  try {
    const response = await fetch(`${MCP_SERVER.baseURL}${MCP_SERVER.httpEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    log('❌ 请求失败:', error.message);
    throw error;
  }
}

async function debugListExtensions() {
  log('开始调试list_extensions功能...');
  
  try {
    // 1. 重新连接确保状态正确
    log('1. 重新连接Chrome...');
    const attachResponse = await sendMCPRequest('tools/call', {
      name: 'attach_to_chrome',
      arguments: { host: 'localhost', port: 9222 }
    });
    
    if (attachResponse.result) {
      log('✅ Chrome连接成功');
    } else {
      log('❌ Chrome连接失败');
      return;
    }
    
    // 2. 先调用原始的list_extensions查看结果
    log('2. 调用原始list_extensions...');
    const extensionsResponse = await sendMCPRequest('tools/call', {
      name: 'list_extensions',
      arguments: {}
    });
    
    if (extensionsResponse.result) {
      const extensionsText = extensionsResponse.result.content[0].text;
      log('原始结果:', extensionsText);
      const extensions = JSON.parse(extensionsText);
      log(`原始结果解析: 找到 ${extensions.length} 个扩展目标`);
    }
    
    // 3. 使用evaluate直接调用CDP API来调试
    log('3. 直接调用CDP Target.getTargets()进行调试...');
    const debugResponse = await sendMCPRequest('tools/call', {
      name: 'evaluate',
      arguments: {
        expression: `
          (async () => {
            try {
              // 获取CDP客户端 - 从全局或从管理器获取
              const chromeManager = window.chromeManager || globalThis.chromeManager;
              if (!chromeManager) {
                return { error: 'ChromeManager not found in global scope' };
              }
              
              const cdp = chromeManager.getCdpClient();
              if (!cdp) {
                return { error: 'CDP client not available' };
              }
              
              const { Target } = cdp;
              const result = await Target.getTargets();
              
              // 返回所有目标信息用于调试
              const allTargets = (result.targetInfos || []).map(info => ({
                id: info.targetId,
                type: info.type,
                url: info.url || '',
                title: info.title || '',
                attached: info.attached || false
              }));
              
              // 应用过滤逻辑
              const filtered = allTargets.filter(info => {
                return (info.url?.startsWith('chrome-extension://')) || (info.type === 'service_worker');
              });
              
              return {
                total: allTargets.length,
                allTargets: allTargets,
                filteredCount: filtered.length,
                filtered: filtered,
                debug: {
                  hasExtensionUrls: allTargets.some(t => t.url?.startsWith('chrome-extension://')),
                  hasServiceWorkers: allTargets.some(t => t.type === 'service_worker'),
                  targetTypes: [...new Set(allTargets.map(t => t.type))]
                }
              };
            } catch (error) {
              return { error: error.message, stack: error.stack };
            }
          })()
        `
      }
    });
    
    if (debugResponse.result) {
      const debugText = debugResponse.result.content[0].text;
      log('调试结果:', debugText);
      
      try {
        const debugData = JSON.parse(debugText);
        if (debugData.error) {
          log('❌ 调试执行错误:', debugData.error);
        } else {
          log('✅ 调试成功:');
          log(`  总目标数: ${debugData.total}`);
          log(`  过滤后数量: ${debugData.filteredCount}`);
          log(`  目标类型: ${debugData.debug.targetTypes.join(', ')}`);
          log(`  有扩展URL: ${debugData.debug.hasExtensionUrls}`);
          log(`  有Service Worker: ${debugData.debug.hasServiceWorkers}`);
          
          log('所有目标:');
          debugData.allTargets.forEach((target, i) => {
            log(`  ${i + 1}. Type: ${target.type}, URL: ${target.url}, Title: ${target.title}`);
          });
          
          if (debugData.filtered.length > 0) {
            log('过滤后的扩展目标:');
            debugData.filtered.forEach((target, i) => {
              log(`  ${i + 1}. Type: ${target.type}, URL: ${target.url}, Title: ${target.title}`);
            });
          } else {
            log('⚠️ 过滤后没有找到扩展目标');
            
            // 检查是否有可能的扩展相关目标
            const possibleExtensions = debugData.allTargets.filter(t => 
              t.url?.includes('extension') || 
              t.title?.includes('extension') || 
              t.type?.includes('extension')
            );
            
            if (possibleExtensions.length > 0) {
              log('可能的扩展相关目标:');
              possibleExtensions.forEach((target, i) => {
                log(`  ${i + 1}. Type: ${target.type}, URL: ${target.url}, Title: ${target.title}`);
              });
            }
          }
        }
      } catch (parseError) {
        log('❌ 解析调试结果失败:', parseError);
        log('原始调试输出:', debugText);
      }
    } else {
      log('❌ 调试evaluate调用失败:', debugResponse.error);
    }
    
  } catch (error) {
    log('❌ 调试过程中发生错误:', error.message);
  }
}

// 运行调试
debugListExtensions().catch(console.error);
