// Background Service Worker for MCP测试
console.log('[Background] Service Worker 启动');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] 扩展已安装');
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 收到消息:', message, '来自:', sender.tab?.url);
  sendResponse({status: 'received', from: 'background'});
});

// 向所有标签页发送测试消息
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'test',
        message: 'Hello from background script!'
      }).catch(() => {
        // 忽略无法发送消息的标签页
      });
    }
  });
});

// 定期输出日志
setInterval(() => {
  console.log('[Background] 后台脚本心跳 -', new Date().toISOString());
}, 10000);

console.log('[Background] Service Worker 初始化完成');
