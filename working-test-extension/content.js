// Working Test Extension Content Script
console.log('[Working Extension] Content script injected on:', window.location.href);

// 创建扩展标记元素
const marker = document.createElement('div');
marker.id = 'working-extension-marker';
marker.setAttribute('data-extension-injected', 'true');
marker.setAttribute('data-extension-id', chrome.runtime.id);
marker.className = 'extension-injected working-extension-element';
marker.style.cssText = `
  position: fixed;
  top: 5px;
  left: 5px;
  background: #4CAF50;
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  z-index: 99999;
  border-radius: 3px;
  font-family: monospace;
`;
marker.textContent = '✅ Working Extension Active';

// 添加到页面
document.body.appendChild(marker);

// 创建一些用于检测的元素
const hiddenMarker = document.createElement('div');
hiddenMarker.id = 'extension-detection-marker';
hiddenMarker.setAttribute('data-injected-by', 'working-test-extension');
hiddenMarker.style.display = 'none';
document.head.appendChild(hiddenMarker);

// 发送消息到background
chrome.runtime.sendMessage({
  type: 'content-script-loaded',
  url: window.location.href,
  timestamp: Date.now()
}).catch(() => {
  console.log('[Working Extension] Could not send message to background');
});

// 定期输出日志
let contentLogCounter = 0;
setInterval(() => {
  contentLogCounter++;
  console.log(`[Working Extension] Content script heartbeat #${contentLogCounter} on`, window.location.href);
}, 20000);

console.log('[Working Extension] Content script initialization complete');
