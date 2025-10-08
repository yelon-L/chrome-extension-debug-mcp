// Simple background service worker
console.log('[Simple Extension] Background service worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Simple Extension] Extension installed');
});

// Keep the service worker alive
setInterval(() => {
  console.log('[Simple Extension] Service worker heartbeat', new Date().toISOString());
}, 10000);
