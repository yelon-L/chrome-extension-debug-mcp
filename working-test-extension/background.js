// Working Test Extension Background
console.log('[Working Extension] Background service worker started at', new Date().toISOString());

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Working Extension] Extension installed/updated:', details.reason);
});

// 定期输出日志以保持service worker活跃
let logCounter = 0;
setInterval(() => {
  logCounter++;
  console.log(`[Working Extension] Background heartbeat #${logCounter}`, new Date().toISOString());
}, 15000);

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Working Extension] Received message:', message, 'from tab:', sender.tab?.id);
  sendResponse({status: 'received', timestamp: Date.now()});
});

console.log('[Working Extension] Background initialization complete');
