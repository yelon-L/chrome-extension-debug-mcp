// Injected Script for MCP Debug Test Extension
// 这个脚本运行在页面上下文中，可以访问页面的window对象

(function() {
  'use strict';
  
  console.log('[Injected Script] 🎯 页面脚本开始执行');
  
  // 全局标记，表明扩展已注入
  window.mcpDebugExtensionInjected = {
    version: '2.0.0',
    injectedAt: Date.now(),
    features: [
      'global-variable-injection',
      'function-overrides',
      'event-listeners',
      'dom-monitoring'
    ]
  };
  
  // 扩展全局函数（可能与页面函数冲突）
  window.debugExtension = function() {
    return window.mcpDebugExtensionInjected;
  };
  
  // 可能冲突的全局变量
  window.Extension = window.Extension || {};
  window.Extension.debug = true;
  window.Extension.name = 'MCP Debug Test';
  
  // 覆盖一些常见的全局函数（用于冲突测试）
  const originalConsoleLog = console.log;
  
  // 监控console.log调用
  console.log = function(...args) {
    // 调用原始函数
    originalConsoleLog.apply(console, args);
    
    // 额外的扩展逻辑
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('[Injected Script]')) {
      // 这是扩展自己的日志，跳过处理
      return;
    }
    
    // 记录页面的console.log调用
    originalConsoleLog('[Injected Script] 📊 页面日志拦截:', ...args);
  };
  
  // 监控页面加载状态
  const pageLoadStartTime = performance.now();
  
  function checkPageLoadStatus() {
    const loadTime = performance.now() - pageLoadStartTime;
    
    console.log('[Injected Script] 📈 页面状态检查:', {
      readyState: document.readyState,
      loadTime: loadTime.toFixed(2) + 'ms',
      elementCount: document.querySelectorAll('*').length,
      hasExtensionElements: document.querySelectorAll('[data-extension-injected]').length
    });
  }
  
  // DOM内容加载完成时
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Injected Script] 🚀 DOM内容加载完成');
      checkPageLoadStatus();
      initializeExtensionFeatures();
    });
  } else {
    // DOM已经加载完成
    setTimeout(() => {
      console.log('[Injected Script] 🚀 DOM已经就绪');
      checkPageLoadStatus();
      initializeExtensionFeatures();
    }, 100);
  }
  
  // 初始化扩展功能
  function initializeExtensionFeatures() {
    console.log('[Injected Script] 🔧 初始化扩展功能');
    
    // 1. 添加全局样式
    addGlobalStyles();
    
    // 2. 创建调试面板
    createDebugPanel();
    
    // 3. 监听页面事件
    setupEventListeners();
    
    // 4. 创建可能的冲突元素
    createConflictElements();
    
    console.log('[Injected Script] ✅ 扩展功能初始化完成');
  }
  
  // 添加全局样式
  function addGlobalStyles() {
    const style = document.createElement('style');
    style.id = 'mcp-debug-injected-styles';
    style.textContent = `
      /* 由注入脚本添加的样式 */
      .mcp-debug-injected-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 280px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        padding: 12px;
        border-radius: 8px;
        z-index: 2147483647;
        border: 1px solid #00ff00;
        box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
      }
      
      .mcp-debug-title {
        color: #00ff00;
        font-weight: bold;
        margin-bottom: 8px;
        text-align: center;
      }
      
      .mcp-debug-info {
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
      }
      
      .mcp-debug-value {
        color: #ffff00;
      }
      
      /* 可能造成冲突的样式 */
      * {
        --injected-script-active: true;
      }
    `;
    
    document.head.appendChild(style);
    console.log('[Injected Script] 🎨 全局样式已添加');
  }
  
  // 创建调试面板
  function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'mcp-debug-injected-panel';
    panel.className = 'mcp-debug-injected-panel';
    panel.innerHTML = `
      <div class="mcp-debug-title">🔍 MCP Debug 注入脚本</div>
      <div class="mcp-debug-info">
        <span>状态:</span>
        <span class="mcp-debug-value" id="debug-status">活跃</span>
      </div>
      <div class="mcp-debug-info">
        <span>运行时间:</span>
        <span class="mcp-debug-value" id="debug-uptime">0s</span>
      </div>
      <div class="mcp-debug-info">
        <span>页面元素:</span>
        <span class="mcp-debug-value" id="debug-elements">-</span>
      </div>
      <div class="mcp-debug-info">
        <span>扩展元素:</span>
        <span class="mcp-debug-value" id="debug-ext-elements">-</span>
      </div>
    `;
    
    // 添加点击事件
    panel.addEventListener('click', () => {
      console.log('[Injected Script] 🖱️ 调试面板被点击');
      
      // 切换面板大小
      const isCompact = panel.style.height === '30px';
      panel.style.height = isCompact ? 'auto' : '30px';
      panel.style.overflow = isCompact ? 'visible' : 'hidden';
      
      if (!isCompact) {
        panel.innerHTML = '<div class="mcp-debug-title">🔍 MCP Debug (点击展开)</div>';
      } else {
        // 恢复完整内容
        initializeExtensionFeatures();
      }
    });
    
    document.body.appendChild(panel);
    console.log('[Injected Script] 📊 调试面板已创建');
    
    // 定期更新信息
    updateDebugPanel();
    setInterval(updateDebugPanel, 2000);
  }
  
  // 更新调试面板
  function updateDebugPanel() {
    const uptime = Math.floor((Date.now() - window.mcpDebugExtensionInjected.injectedAt) / 1000);
    const totalElements = document.querySelectorAll('*').length;
    const extElements = document.querySelectorAll('[data-extension-injected], [data-extension-id]').length;
    
    const uptimeElement = document.getElementById('debug-uptime');
    const elementsElement = document.getElementById('debug-elements');
    const extElementsElement = document.getElementById('debug-ext-elements');
    
    if (uptimeElement) uptimeElement.textContent = uptime + 's';
    if (elementsElement) elementsElement.textContent = totalElements;
    if (extElementsElement) extElementsElement.textContent = extElements;
  }
  
  // 设置事件监听器
  function setupEventListeners() {
    // 监听页面点击
    document.addEventListener('click', (event) => {
      console.log('[Injected Script] 🖱️ 页面点击:', {
        target: event.target.tagName,
        id: event.target.id || '(无ID)',
        className: event.target.className || '(无class)',
        isExtensionElement: event.target.hasAttribute('data-extension-injected')
      });
    });
    
    // 监听键盘事件
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        console.log('[Injected Script] ⌨️ 调试快捷键触发');
        event.preventDefault();
        
        // 显示调试信息
        alert(`MCP Debug 扩展状态:\n\n${JSON.stringify(window.mcpDebugExtensionInjected, null, 2)}`);
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      console.log('[Injected Script] 👋 页面即将卸载');
    });
    
    console.log('[Injected Script] 👂 事件监听器已设置');
  }
  
  // 创建可能冲突的元素
  function createConflictElements() {
    // 创建重复ID元素
    const conflictElement = document.createElement('div');
    conflictElement.id = 'main'; // 常见的可能冲突的ID
    conflictElement.className = 'injected-conflict-test';
    conflictElement.style.display = 'none';
    conflictElement.setAttribute('data-conflict-source', 'injected-script');
    
    document.body.appendChild(conflictElement);
    
    // 创建高z-index元素
    const highZElement = document.createElement('div');
    highZElement.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      z-index: 2147483646;
      width: 1px;
      height: 1px;
    `;
    highZElement.setAttribute('data-high-z-injected', 'true');
    
    document.body.appendChild(highZElement);
    
    console.log('[Injected Script] ⚠️ 冲突测试元素已创建');
  }
  
  // 定期生成日志
  setInterval(() => {
    const logTypes = [
      () => console.log('[Injected Script] 💓 心跳检测 - 脚本运行正常'),
      () => console.info('[Injected Script] 📈 页面监控:', {
        elements: document.querySelectorAll('*').length,
        scripts: document.querySelectorAll('script').length,
        styles: document.querySelectorAll('style, link[rel="stylesheet"]').length
      }),
      () => console.warn('[Injected Script] ⚠️ 示例警告 - 监控到页面变化'),
      () => console.debug('[Injected Script] 🐛 调试信息 - 扩展功能正常')
    ];
    
    // 随机选择一种日志类型
    logTypes[Math.floor(Math.random() * logTypes.length)]();
  }, 7000);
  
  // 监控DOM变化
  const observer = new MutationObserver((mutations) => {
    const significantChanges = mutations.filter(mutation => 
      mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
    );
    
    if (significantChanges.length > 0) {
      console.log('[Injected Script] 🔄 DOM变化监控:', {
        mutations: significantChanges.length,
        addedNodes: significantChanges.reduce((sum, m) => sum + m.addedNodes.length, 0),
        removedNodes: significantChanges.reduce((sum, m) => sum + m.removedNodes.length, 0)
      });
    }
  });
  
  // 开始观察DOM变化
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
  
  console.log('[Injected Script] ✨ 注入脚本初始化完成');
  
})();

// 导出调试函数到全局作用域
window.mcpDebugInfo = function() {
  return {
    injectedScript: window.mcpDebugExtensionInjected,
    pageInfo: {
      url: window.location.href,
      title: document.title,
      elementCount: document.querySelectorAll('*').length,
      extensionElements: document.querySelectorAll('[data-extension-injected]').length
    }
  };
};

console.log('[Injected Script] 🌍 全局调试函数已导出');
