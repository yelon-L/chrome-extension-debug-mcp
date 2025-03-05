console.log('Background script loaded - ' + new Date().toISOString());

chrome.browserAction.onClicked.addListener((tab) => {
  console.log('Browser action clicked - ' + new Date().toISOString());
  
  chrome.tabs.executeScript(tab.id, {
    code: `
      console.log('Injected script running - ' + new Date().toISOString());
      const div = document.createElement('div');
      div.id = 'extension-test-element';
      div.textContent = 'Extension Test - ' + new Date().toISOString();
      div.style.cssText = 'position: fixed; top: 10px; left: 10px; background: red; color: white; padding: 10px; z-index: 999999; border: 2px solid black;';
      document.body.appendChild(div);
      console.log('Test element added');
    `
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    } else {
      console.log('Script injected successfully');
    }
  });
});