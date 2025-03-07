# Chrome Debug MCP Commands Reference

This document provides a comprehensive reference for all commands and functions available in the Chrome Debug MCP server.

## MCP Tools

### launch_chrome
Launches Chrome in debug mode with customizable configuration.

**Parameters:**
- `url` (string, optional): URL to navigate to after launch
- `executablePath` (string, optional): Path to Chrome executable (uses bundled Chrome if not provided)
- `userDataDir` (string, optional): Path to user data directory (uses default Chrome profile if not provided)
- `loadExtension` (string, optional): Path to unpacked extension directory to load
- `disableExtensionsExcept` (string, optional): Path to extension that should remain enabled while others are disabled
- `disableAutomationControlled` (boolean, optional): Disable Chrome's "Automation Controlled" mode
- `userscriptPath` (string, optional): Path to userscript file to inject

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "url": "https://example.com",
  "loadExtension": "C:\\path\\to\\extension",
  "disableAutomationControlled": true
}
</arguments>
</use_mcp_tool>
```

### get_console_logs
Retrieves console logs from the Chrome instance.

**Parameters:**
- `clear` (boolean, optional): Whether to clear logs after retrieving

**Example:**
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

### evaluate
Executes JavaScript code in the browser context.

**Parameters:**
- `expression` (string, required): JavaScript code to evaluate

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>evaluate</tool_name>
<arguments>
{
  "expression": "document.title"
}
</arguments>
</use_mcp_tool>
```

## Userscript Functions

### GM_setValue(key: string, value: any)
Stores a value persistently using Chrome's localStorage.

```javascript
// Store values
GM_setValue('myKey', 'myValue');
GM_setValue('myObject', { foo: 'bar' });
```

### GM_getValue(key: string, defaultValue?: any)
Retrieves a previously stored value.

```javascript
// Retrieve values
const myValue = GM_getValue('myKey', 'default');
const myObject = GM_getValue('myObject', {});
```

### GM_xmlhttpRequest(details: object)
Makes HTTP requests that bypass same-origin policy restrictions.

```javascript
GM_xmlhttpRequest({
  url: 'https://api.example.com/data',
  onload: function(response) {
    console.log(response.responseText);
  },
  onerror: function(error) {
    console.error('Request failed:', error);
  }
});
```

### GM_addStyle(css: string)
Adds custom CSS styles to the page.

```javascript
GM_addStyle(`
  .my-custom-class {
    background: red;
    color: white;
    padding: 10px;
  }
`);
```

### GM_openInTab(url: string)
Opens a URL in a new browser tab.

```javascript
GM_openInTab('https://example.com');
```

### GM_registerMenuCommand(name: string, fn: function)
Registers a command in the userscript menu (stub implementation).

```javascript
GM_registerMenuCommand('My Command', function() {
  console.log('Command executed');
});
```

## Error Handling

The server may return the following error codes:

- `ErrorCode.InternalError`: Server-side error occurred
- `ErrorCode.InvalidParams`: Invalid tool parameters provided
- `ErrorCode.MethodNotFound`: Requested tool does not exist

## Best Practices

1. Always check for successful Chrome launch before using other tools
2. Use absolute paths for extension and userscript loading
3. Clear console logs periodically to prevent memory issues
4. Handle errors appropriately in userscripts
5. Test userscripts in a standard browser before using with the MCP server
6. Use `disableAutomationControlled` when websites detect automation
7. Monitor memory usage and restart Chrome if needed