// Background Service Worker for MCP 扩展调试功能测试
console.log('[Background] 🚀 Service Worker 启动 - 测试开始');
console.info('[Background] 扩展信息:', {
  id: chrome.runtime.id,
  version: chrome.runtime.getManifest().version,
  manifestVersion: chrome.runtime.getManifest().manifest_version
});

// 性能监控开始
const startTime = performance.now();

// 扩展安装和启动处理
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] ✅ 扩展已安装/更新:', details.reason);
  
  // 测试不同的存储API
  await testStorageAPIs();
  
  // 设置定时器
  setupAlarms();
  
  // 初始化全局变量 (用于冲突检测测试)
  globalThis.ext_mcpDebugTest = {
    version: '2.0.0',
    startTime: Date.now(),
    requestCount: 0
  };
  
  console.info('[Background] 📊 初始化性能:', {
    initTime: performance.now() - startTime,
    memoryUsage: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
    } : 'N/A'
  });
});

// 存储API测试函数
async function testStorageAPIs() {
  try {
    console.log('[Background] 🗄️ 测试存储API...');
    
    // Local Storage 测试
    await chrome.storage.local.set({
      'mcp-test-local': {
        timestamp: Date.now(),
        data: 'Local storage test data',
        counter: Math.floor(Math.random() * 1000)
      }
    });
    
    // Sync Storage 测试
    await chrome.storage.sync.set({
      'mcp-test-sync': {
        userPreference: 'debug-mode-enabled',
        theme: 'dark',
        lastSync: new Date().toISOString()
      }
    });
    
    // Session Storage 测试 (如果支持)
    if (chrome.storage.session) {
      await chrome.storage.session.set({
        'mcp-test-session': {
          sessionId: crypto.randomUUID(),
          activeTab: 'unknown',
          tempData: 'This will be cleared on restart'
        }
      });
    }
    
    console.log('[Background] ✅ 存储测试完成');
    
    // 检查存储使用量
    const localUsage = await chrome.storage.local.getBytesInUse();
    const syncUsage = await chrome.storage.sync.getBytesInUse();
    
    console.info('[Background] 📈 存储使用量:', {
      local: localUsage + ' bytes',
      sync: syncUsage + ' bytes'
    });
    
  } catch (error) {
    console.error('[Background] ❌ 存储测试失败:', error);
  }
}

// 设置定时器
function setupAlarms() {
  chrome.alarms.create('mcp-debug-heartbeat', { 
    delayInMinutes: 1, 
    periodInMinutes: 1 
  });
  
  chrome.alarms.create('mcp-debug-cleanup', {
    delayInMinutes: 5,
    periodInMinutes: 5
  });
  
  console.log('[Background] ⏰ 定时器已设置');
}

// 定时器事件处理
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'mcp-debug-heartbeat':
      console.log('[Background] 💓 定时心跳检测 -', new Date().toISOString());
      
      // 更新全局计数器
      if (globalThis.ext_mcpDebugTest) {
        globalThis.ext_mcpDebugTest.requestCount++;
      }
      
      // 检查标签页状态
      const tabs = await chrome.tabs.query({});
      console.info('[Background] 📋 当前标签页数量:', tabs.length);
      
      // 随机生成不同级别的日志
      const logTypes = [
        () => console.log('[Background] 📝 普通日志消息'),
        () => console.info('[Background] ℹ️ 信息级别消息'),
        () => console.warn('[Background] ⚠️ 警告级别消息'),
        () => console.debug('[Background] 🐛 调试级别消息')
      ];
      
      logTypes[Math.floor(Math.random() * logTypes.length)]();
      break;
      
    case 'mcp-debug-cleanup':
      console.log('[Background] 🧹 执行清理任务');
      await performCleanup();
      break;
  }
});

// 清理任务
async function performCleanup() {
  try {
    // 清理旧的session数据
    if (chrome.storage.session) {
      await chrome.storage.session.clear();
      console.log('[Background] ✅ Session 存储已清理');
    }
    
    // 更新本地存储
    await chrome.storage.local.set({
      'mcp-last-cleanup': new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Background] ❌ 清理任务失败:', error);
  }
}

// 消息处理 - 支持多种消息类型
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 📨 收到消息:', message.type, '来自:', sender.tab?.url);
  
  switch (message.type) {
    case 'get-extension-info':
      sendResponse({
        status: 'success',
        data: {
          id: chrome.runtime.id,
          version: chrome.runtime.getManifest().version,
          permissions: chrome.runtime.getManifest().permissions,
          uptime: Date.now() - (globalThis.ext_mcpDebugTest?.startTime || Date.now())
        }
      });
      break;
      
    case 'test-storage':
      testStorageAPIs().then(() => {
        sendResponse({ status: 'storage-test-complete' });
      });
      return true; // 异步响应
      
    case 'simulate-error':
      console.error('[Background] 🔥 模拟错误:', new Error('这是一个测试错误'));
      sendResponse({ status: 'error-simulated' });
      break;
      
    case 'performance-test':
      const perfStart = performance.now();
      // 模拟一些计算
      for (let i = 0; i < 100000; i++) {
        Math.random() * i;
      }
      const perfEnd = performance.now();
      
      console.log('[Background] ⚡ 性能测试完成:', (perfEnd - perfStart).toFixed(2) + 'ms');
      sendResponse({ 
        status: 'performance-test-complete',
        duration: perfEnd - perfStart
      });
      break;
      
    default:
      console.warn('[Background] ❓ 未知消息类型:', message.type);
      sendResponse({ status: 'unknown-message-type' });
  }
});

// 标签页事件监听
chrome.tabs.onCreated.addListener((tab) => {
  console.log('[Background] 🆕 新标签页创建:', tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[Background] 🔄 标签页加载完成:', tab.url);
    
    // 向新加载的页面发送初始化消息
    chrome.tabs.sendMessage(tabId, {
      type: 'tab-loaded',
      message: 'Background detected tab load completion',
      timestamp: Date.now()
    }).catch(() => {
      // 忽略无法发送消息的页面
    });
  }
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] 💤 Service Worker 即将挂起');
});

self.addEventListener('error', (event) => {
  console.error('[Background] 🚨 全局错误:', event.error);
});

// 初始化完成
const initTime = performance.now() - startTime;
console.log('[Background] ✨ Service Worker 初始化完成 -', initTime.toFixed(2) + 'ms');

// 故意制造一个警告
console.warn('[Background] ⚠️ 这是一个故意的测试警告消息');

// 定期输出不同级别的日志用于测试
setInterval(() => {
  const logLevel = ['log', 'info', 'warn', 'error'][Math.floor(Math.random() * 4)];
  console[logLevel](`[Background] 📊 定期${logLevel}消息 -`, {
    timestamp: new Date().toISOString(),
    memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A',
    requestCount: globalThis.ext_mcpDebugTest?.requestCount || 0
  });
}, 8000);
