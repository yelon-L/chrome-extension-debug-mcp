// Content Script for MCP 扩展调试功能测试
const injectionStartTime = performance.now();

console.log('[Content Script] 🎯 扩展内容脚本开始注入 - URL:', window.location.href);
console.info('[Content Script] 📋 扩展信息:', {
  id: chrome.runtime.id,
  url: window.location.href,
  injectionTime: injectionStartTime,
  userAgent: navigator.userAgent.slice(0, 50) + '...'
});

// 全局变量设置 (用于冲突检测)
window.ext_mcpDebugTest = {
  injected: true,
  version: '2.0.0',
  injectionTime: injectionStartTime,
  elementCount: 0,
  messageCount: 0
};

// 全局扩展函数 (用于冲突检测)
window.Extension = window.Extension || {};
window.Extension.mcpDebug = {
  log: (msg) => console.log('[Extension.mcpDebug]', msg),
  test: () => 'MCP Debug Extension Active'
};

// 创建可检测的扩展标记
function createExtensionMarkers() {
  const markerDiv = document.createElement('div');
  markerDiv.id = 'mcp-extension-injected';
  markerDiv.setAttribute('data-extension-id', chrome.runtime.id);
  markerDiv.setAttribute('data-injected-by', 'mcp-debug-test');
  markerDiv.className = 'extension-injected mcp-debug-marker';
  markerDiv.style.display = 'none';
  
  // 添加到head以确保早期检测
  if (document.head) {
    document.head.appendChild(markerDiv);
  } else {
    document.documentElement.appendChild(markerDiv);
  }
  
  console.log('[Content Script] ✅ 扩展标记已创建');
}

// 立即创建标记
createExtensionMarkers();

// DOM加载完成后的处理
document.addEventListener('DOMContentLoaded', () => {
  const domReadyTime = performance.now();
  console.log('[Content Script] 🚀 DOM加载完成 - 耗时:', (domReadyTime - injectionStartTime).toFixed(2) + 'ms');
  
  // 创建多个测试元素以测试DOM修改检测
  createTestElements();
  
  // 注入CSS样式测试
  injectTestStyles();
  
  // 创建ID冲突测试
  createIdConflictTest();
  
  // 模拟高z-index元素
  createHighZIndexElements();
  
  // 注入额外脚本
  injectAdditionalScript();
  
  console.info('[Content Script] 📊 注入性能报告:', {
    domReadyTime: (domReadyTime - injectionStartTime).toFixed(2) + 'ms',
    totalElements: window.ext_mcpDebugTest.elementCount,
    memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
  });
});

// 创建测试元素
function createTestElements() {
  const elementsToCreate = [
    {
      id: 'mcp-debug-main-indicator',
      className: 'extension-widget mcp-debug-primary',
      text: '🔍 MCP Debug Extension Active',
      styles: {
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'linear-gradient(45deg, #4CAF50, #45a049)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        zIndex: '999999',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontFamily: 'Arial, sans-serif',
        cursor: 'pointer'
      }
    },
    {
      id: 'mcp-debug-status-bar',
      className: 'extension-status-bar',
      text: '📊 Injection Status: ✅ Active',
      styles: {
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: '#333',
        color: '#00ff00',
        padding: '8px 12px',
        borderRadius: '4px',
        zIndex: '999998',
        fontSize: '12px',
        fontFamily: 'monospace'
      }
    },
    {
      id: 'mcp-debug-performance-monitor',
      className: 'extension-perf-monitor',
      text: '⚡ Perf Monitor',
      styles: {
        position: 'fixed',
        top: '60px',
        right: '10px',
        background: '#2196F3',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        zIndex: '999997',
        fontSize: '11px'
      }
    }
  ];
  
  elementsToCreate.forEach(elementConfig => {
    const element = document.createElement('div');
    element.id = elementConfig.id;
    element.className = elementConfig.className;
    element.textContent = elementConfig.text;
    element.setAttribute('data-extension-injected', 'true');
    
    // 应用样式
    Object.assign(element.style, elementConfig.styles);
    
    // 添加点击事件
    element.addEventListener('click', () => {
      console.log('[Content Script] 🖱️ 用户点击了扩展元素:', elementConfig.id);
      
      // 发送消息到background
      chrome.runtime.sendMessage({
        type: 'performance-test',
        elementId: elementConfig.id,
        timestamp: Date.now()
      }).catch(() => {
        console.warn('[Content Script] ⚠️ 无法发送消息到background');
      });
    });
    
    document.body.appendChild(element);
    window.ext_mcpDebugTest.elementCount++;
  });
  
  console.log('[Content Script] ✅ 测试元素创建完成 - 总数:', window.ext_mcpDebugTest.elementCount);
}

// 注入CSS样式
function injectTestStyles() {
  const style = document.createElement('style');
  style.setAttribute('data-extension-id', chrome.runtime.id);
  style.textContent = `
    /* 由扩展注入的CSS样式 */
    .extension-injected {
      --extension-primary-color: #4CAF50;
      --extension-secondary-color: #45a049;
    }
    
    .mcp-debug-marker {
      visibility: hidden !important;
    }
    
    .extension-widget {
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .extension-widget:hover {
      transform: scale(1.05);
      border-color: #fff;
    }
    
    /* 故意创建高优先级样式 */
    * {
      --mcp-debug-injected: true;
    }
    
    /* 可能造成冲突的样式 */
    .container, .main, .content {
      --extension-modified: true;
    }
  `;
  
  document.head.appendChild(style);
  console.log('[Content Script] 🎨 CSS样式已注入');
}

// 创建ID冲突测试
function createIdConflictTest() {
  // 检查是否已存在同名ID
  const existingIds = ['header', 'main', 'content', 'footer'];
  
  existingIds.forEach(id => {
    if (document.getElementById(id)) {
      console.warn('[Content Script] ⚠️ 检测到ID冲突风险:', id);
      
      // 创建重复ID (故意的，用于测试冲突检测)
      const duplicateElement = document.createElement('div');
      duplicateElement.id = id;
      duplicateElement.className = 'extension-duplicate-id-test';
      duplicateElement.style.display = 'none';
      duplicateElement.setAttribute('data-conflict-test', 'true');
      
      document.body.appendChild(duplicateElement);
    }
  });
}

// 创建高z-index元素
function createHighZIndexElements() {
  for (let i = 0; i < 3; i++) {
    const highZElement = document.createElement('div');
    highZElement.className = 'extension-high-z-test';
    highZElement.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: 1px;
      height: 1px;
      z-index: ${50000 + i * 1000};
      background: transparent;
    `;
    highZElement.setAttribute('data-high-z-test', 'true');
    
    document.body.appendChild(highZElement);
  }
  
  console.log('[Content Script] 🏗️ 高z-index测试元素已创建');
}

// 注入额外脚本
function injectAdditionalScript() {
  const script = document.createElement('script');
  script.textContent = `
    // 由扩展注入的页面脚本
    (function() {
      window.mcpDebugInjected = true;
      window.mcpDebugTimestamp = Date.now();
      
      // 全局函数
      window.mcpDebugInfo = function() {
        return {
          injected: true,
          extensionId: '${chrome.runtime.id}',
          timestamp: window.mcpDebugTimestamp
        };
      };
      
      console.log('[Injected Script] 📝 页面脚本注入完成');
    })();
  `;
  
  document.head.appendChild(script);
  console.log('[Content Script] 💉 额外脚本已注入');
}

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] 📨 收到background消息:', message.type);
  window.ext_mcpDebugTest.messageCount++;
  
  switch (message.type) {
    case 'tab-loaded':
      console.info('[Content Script] 🔄 Background确认标签页加载');
      updatePerformanceMonitor();
      sendResponse({ 
        status: 'acknowledged',
        injectionInfo: window.ext_mcpDebugTest
      });
      break;
      
    case 'get-injection-status':
      sendResponse({
        status: 'injected',
        data: {
          ...window.ext_mcpDebugTest,
          domElements: document.querySelectorAll('[data-extension-injected]').length,
          hasConflicts: document.querySelectorAll('.extension-duplicate-id-test').length > 0
        }
      });
      break;
      
    case 'simulate-content-error':
      console.error('[Content Script] 🔥 模拟内容脚本错误:', new Error('Content script test error'));
      sendResponse({ status: 'error-simulated' });
      break;
      
    default:
      sendResponse({ status: 'unknown-message', type: message.type });
  }
});

// 更新性能监控显示
function updatePerformanceMonitor() {
  const monitor = document.getElementById('mcp-debug-performance-monitor');
  if (monitor) {
    const uptime = ((Date.now() - injectionStartTime) / 1000).toFixed(1);
    monitor.textContent = `⚡ 运行: ${uptime}s | 消息: ${window.ext_mcpDebugTest.messageCount}`;
  }
}

// 定期更新和日志
setInterval(() => {
  const currentTime = Date.now();
  const uptime = ((currentTime - injectionStartTime) / 1000).toFixed(1);
  
  // 随机生成不同级别的日志
  const logTypes = [
    () => console.log('[Content Script] 💓 心跳检测 - 运行时间:', uptime + 's'),
    () => console.info('[Content Script] 📈 状态报告:', {
      uptime: uptime + 's',
      elements: window.ext_mcpDebugTest.elementCount,
      messages: window.ext_mcpDebugTest.messageCount,
      url: window.location.href
    }),
    () => console.warn('[Content Script] ⚠️ 示例警告消息'),
    () => console.debug('[Content Script] 🐛 调试信息 - 时间戳:', currentTime)
  ];
  
  logTypes[Math.floor(Math.random() * logTypes.length)]();
  
  // 更新性能监控
  updatePerformanceMonitor();
  
}, 6000);

// 错误和警告测试
console.error('[Content Script] ❌ 这是一个测试错误日志 - 用于验证日志过滤功能');
console.warn('[Content Script] ⚠️ 这是一个测试警告日志 - 用于验证级别过滤');
console.info('[Content Script] ℹ️ 信息级别日志测试 - 扩展已成功注入');
console.debug('[Content Script] 🐛 调试级别日志测试 - 详细信息记录');

// 页面卸载前的清理
window.addEventListener('beforeunload', () => {
  console.log('[Content Script] 👋 页面即将卸载 - 清理资源');
});

// 监听DOM变化
const observer = new MutationObserver((mutations) => {
  let addedNodes = 0;
  mutations.forEach(mutation => {
    addedNodes += mutation.addedNodes.length;
  });
  
  if (addedNodes > 0) {
    console.debug('[Content Script] 🔄 DOM变化检测 - 新增节点:', addedNodes);
  }
});

// 开始观察
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

console.log('[Content Script] ✨ 内容脚本初始化完成 - 注入耗时:', (performance.now() - injectionStartTime).toFixed(2) + 'ms');
