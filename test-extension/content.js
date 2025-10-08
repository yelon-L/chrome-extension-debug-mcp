// Content Script for MCP测试
console.log('[Content Script] 扩展已注入页面');
console.log('[Content Script] Extension ID:', chrome.runtime.id);
console.log('[Content Script] 页面URL:', window.location.href);

// 监听页面加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Content Script] DOM加载完成');
  
  // 创建测试元素
  const testDiv = document.createElement('div');
  testDiv.id = 'mcp-extension-test';
  testDiv.textContent = 'MCP扩展测试成功！';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 10000;
    font-size: 14px;
  `;
  document.body.appendChild(testDiv);
  
  console.log('[Content Script] 测试元素已添加到页面');
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] 收到来自background的消息:', message);
  sendResponse({status: 'success', from: 'content_script'});
});

// 定期发送测试日志
setInterval(() => {
  console.log('[Content Script] 心跳检测 -', new Date().toISOString());
}, 5000);

// 错误测试
console.error('[Content Script] 这是一个测试错误日志');
console.warn('[Content Script] 这是一个测试警告日志');

// 测试console的其他方法
console.info('[Content Script] 信息日志测试');
console.debug('[Content Script] 调试日志测试');
