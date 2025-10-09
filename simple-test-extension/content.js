// Simple content script - minimal activity

console.log('Simple Test Extension: Content script loaded on', window.location.href);

// Only send one message on load, no periodic activities
chrome.runtime.sendMessage({ type: 'pageLoad', url: window.location.href }, (response) => {
  console.log('Simple Test Extension: Response from background', response);
});
