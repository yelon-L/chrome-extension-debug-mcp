// ==UserScript==
// @name        Test Script
// @namespace   test
// @match       https://example.com/*
// @version     1.0
// @description Test userscript for Chrome Debug MCP
// ==/UserScript==

console.log('Userscript loaded successfully');
GM_setValue('testKey', 'testValue');
console.log('GM_getValue test:', GM_getValue('testKey', 'not found'));

// Add a test element to the page
const div = document.createElement('div');
div.id = 'userscript-test';
div.textContent = 'Added by userscript';
div.style.backgroundColor = 'yellow';
div.style.padding = '10px';
div.style.position = 'fixed';
div.style.top = '10px';
div.style.right = '10px';
document.body.appendChild(div);
