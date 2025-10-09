// Simple background script - no continuous activity

console.log('Simple Test Extension: Background loaded');

// Only respond to messages, no periodic activities
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Simple Test Extension: Message received', message);
  sendResponse({ status: 'ok' });
  return true;
});

// Simple storage test on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Simple Test Extension: Installed');
  chrome.storage.local.set({ installTime: Date.now() });
});
