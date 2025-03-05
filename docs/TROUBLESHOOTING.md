# Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Chrome Debug MCP server.

## Common Issues and Solutions

### 1. Chrome Won't Launch

**Symptoms:**
- Error message about failing to launch Chrome
- Chrome process hangs
- No Chrome window appears

**Solutions:**

1. Check Chrome Installation:
```bash
# Verify Chrome executable path
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version
```

2. Check for Running Instances:
```bash
# Windows:
taskkill /F /IM chrome.exe
# Linux:
pkill chrome
```

3. Try with explicit executable path:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
}
</arguments>
</use_mcp_tool>
```

### 2. Extensions Not Loading

**Symptoms:**
- Extension appears to load but doesn't function
- No extension icons in Chrome
- No extension console logs

**Solutions:**

1. Verify extension path is absolute:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "loadExtension": "C:\\full\\path\\to\\extension"
}
</arguments>
</use_mcp_tool>
```

2. Check extension manifest:
- For manifest v2: Ensure `manifest_version` is 2
- For manifest v3: Include proper host permissions

3. Try loading extension in normal Chrome first to verify it works

### 3. Userscript Issues

**Symptoms:**
- Userscript doesn't run
- GM functions not available
- Script errors in console

**Solutions:**

1. Verify script loads:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>evaluate</tool_name>
<arguments>
{
  "expression": "!!window.GM_setValue"
}
</arguments>
</use_mcp_tool>
```

2. Check userscript metadata block:
```javascript
// ==UserScript==
// @name        Your Script
// @match       *://*/*
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==
```

3. Test GM functions manually:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>evaluate</tool_name>
<arguments>
{
  "expression": "GM_setValue('test', 'value'); GM_getValue('test')"
}
</arguments>
</use_mcp_tool>
```

### 4. Console Logs Not Appearing

**Symptoms:**
- `get_console_logs` returns empty or missing logs
- Console messages not captured

**Solutions:**

1. Ensure CDP client is connected:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>evaluate</tool_name>
<arguments>
{
  "expression": "console.log('Test message ' + Date.now())"
}
</arguments>
</use_mcp_tool>
```

2. Check logs immediately after:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>get_console_logs</tool_name>
<arguments>
{
  "clear": false
}
</arguments>
</use_mcp_tool>
```

3. Restart the MCP server if logs still don't appear

### 5. Automation Detection Issues

**Symptoms:**
- Websites detect automation
- "Chrome is being controlled by automated software" banner
- Website features blocked

**Solutions:**

1. Launch with automation mode disabled:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "disableAutomationControlled": true
}
</arguments>
</use_mcp_tool>
```

2. Verify navigator.webdriver:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>evaluate</tool_name>
<arguments>
{
  "expression": "navigator.webdriver"
}
</arguments>
</use_mcp_tool>
```

### 6. Performance Issues

**Symptoms:**
- Chrome runs slowly
- High memory usage
- Slow script execution

**Solutions:**

1. Clear console logs regularly:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>get_console_logs</tool_name>
<arguments>
{
  "clear": true
}
</arguments>
</use_mcp_tool>
```

2. Restart Chrome periodically:
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "url": "about:blank"
}
</arguments>
</use_mcp_tool>
```

## Debugging Steps

1. Enable verbose logging:
   - Set `DEBUG = true` in the server code
   - Check system console for detailed logs

2. Check Chrome DevTools:
   - Open DevTools in the automated Chrome instance
   - Look for errors in the Console panel
   - Check Network panel for request issues

3. Test in isolation:
   - Try running Chrome without extensions
   - Test userscripts individually
   - Verify URLs are accessible

4. Common error codes:
   - `ErrorCode.InternalError`: Server-side issue
   - `ErrorCode.InvalidParams`: Bad tool arguments
   - `ErrorCode.MethodNotFound`: Invalid tool name

## Getting Help

1. Check issues on GitHub
2. Include in bug reports:
   - Chrome version
   - Operating system
   - Complete error messages
   - Steps to reproduce
   - Relevant code snippets

## Prevention Tips

1. Always use absolute paths
2. Test userscripts in standard browser first
3. Keep Chrome up to date
4. Monitor memory usage
5. Regular server restarts
6. Validate all URLs before navigation
7. Check extension compatibility