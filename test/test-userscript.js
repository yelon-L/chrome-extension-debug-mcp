// ==UserScript==
// @name         Test Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Test script for chrome-debug MCP
// @author       Roo
// @match        https://example.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    console.log('Userscript loaded!');
    GM_addStyle('body { border: 5px solid red; }');
})();
