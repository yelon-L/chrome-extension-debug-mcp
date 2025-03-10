# Chrome Debug MCP Commands Reference

This document provides a comprehensive reference for all commands and functions available in the Chrome Debug MCP server.

## MCP Tools

### Browser Control

#### launch_chrome
Launches Chrome in debug mode with customizable configuration.

**Parameters:**
- `url` (string, optional): URL to navigate to after launch
- `executablePath` (string, optional): Path to Chrome executable
- `userDataDir` (string, optional): Path to user data directory
- `loadExtension` (string, optional): Path to unpacked extension
- `disableExtensionsExcept` (string, optional): Keep only specified extension enabled
- `disableAutomationControlled` (boolean, optional): Hide automation banner
- `userscriptPath` (string, optional): Path to userscript to inject

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>launch_chrome</tool_name>
<arguments>
{
  "url": "https://example.com",
  "disableAutomationControlled": true
}
</arguments>
</use_mcp_tool>
```

### Tab Management

#### list_tabs
Lists all open tabs with their IDs, titles, and URLs.

**Parameters:**
None required

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>list_tabs</tool_name>
<arguments>
{}
</use_mcp_tool>
```

#### new_tab
Opens a new tab with an optional URL.

**Parameters:**
- `url` (string, optional): URL to open in the new tab

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>new_tab</tool_name>
<arguments>
{
  "url": "https://example.com"
}
</use_mcp_tool>
```

#### close_tab
Closes a specific tab by ID.

**Parameters:**
- `tabId` (string, required): ID of the tab to close

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>close_tab</tool_name>
<arguments>
{
  "tabId": "tab-id-from-list-tabs"
}
</use_mcp_tool>
```

#### switch_tab
Switches to a specific tab by ID.

**Parameters:**
- `tabId` (string, required): ID of the tab to switch to

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>switch_tab</tool_name>
<arguments>
{
  "tabId": "tab-id-from-list-tabs"
}
</use_mcp_tool>
```

#### get_console_logs
Retrieves console logs from Chrome.

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

#### evaluate
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

### Page Interaction

#### click
Clicks an element on the page.

**Parameters:**
- `selector` (string, required): CSS selector for element to click
- `delay` (number, optional): Delay before clicking (milliseconds)
- `button` (string, optional): Mouse button ('left', 'right', 'middle')

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>click</tool_name>
<arguments>
{
  "selector": "#submit-button",
  "delay": 500
}
</arguments>
</use_mcp_tool>
```

#### type
Types text into an input field.

**Parameters:**
- `selector` (string, required): CSS selector for input field
- `text` (string, required): Text to type
- `delay` (number, optional): Delay between keystrokes (milliseconds)

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>type</tool_name>
<arguments>
{
  "selector": "#search-input",
  "text": "search query",
  "delay": 100
}
</arguments>
</use_mcp_tool>
```

#### select
Selects an option in a dropdown.

**Parameters:**
- `selector` (string, required): CSS selector for select element
- `value` (string, required): Option value to select

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>select</tool_name>
<arguments>
{
  "selector": "#country-select",
  "value": "US"
}
</arguments>
</use_mcp_tool>
```

#### hover
Hovers over an element.

**Parameters:**
- `selector` (string, required): CSS selector for element to hover

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>hover</tool_name>
<arguments>
{
  "selector": "#dropdown-menu"
}
</arguments>
</use_mcp_tool>
```

### Page Control

#### wait_for_selector
Waits for an element to appear on the page.

**Parameters:**
- `selector` (string, required): CSS selector to wait for
- `timeout` (number, optional): Timeout in milliseconds
- `visible` (boolean, optional): Whether element should be visible

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>wait_for_selector</tool_name>
<arguments>
{
  "selector": ".loading-complete",
  "timeout": 5000,
  "visible": true
}
</arguments>
</use_mcp_tool>
```

#### navigate
Navigates to a URL.

**Parameters:**
- `url` (string, required): URL to navigate to
- `waitUntil` (string, optional): Navigation completion condition
- `timeout` (number, optional): Navigation timeout in milliseconds

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>navigate</tool_name>
<arguments>
{
  "url": "https://example.com",
  "waitUntil": "networkidle0"
}
</arguments>
</use_mcp_tool>
```

### Page State

#### get_text
Gets text content of an element.

**Parameters:**
- `selector` (string, required): CSS selector for element

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>get_text</tool_name>
<arguments>
{
  "selector": ".article-content"
}
</arguments>
</use_mcp_tool>
```

#### get_attribute
Gets attribute value of an element.

**Parameters:**
- `selector` (string, required): CSS selector for element
- `attribute` (string, required): Attribute name to get

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>get_attribute</tool_name>
<arguments>
{
  "selector": "img",
  "attribute": "src"
}
</arguments>
</use_mcp_tool>
```

### Page Configuration

#### set_viewport
Sets the viewport size and properties.

**Parameters:**
- `width` (number, required): Viewport width in pixels
- `height` (number, required): Viewport height in pixels
- `deviceScaleFactor` (number, optional): Device scale factor
- `isMobile` (boolean, optional): Whether to emulate mobile device

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>set_viewport</tool_name>
<arguments>
{
  "width": 1920,
  "height": 1080,
  "deviceScaleFactor": 1
}
</arguments>
</use_mcp_tool>
```

#### screenshot
Takes a screenshot of the page or element.

**Parameters:**
- `path` (string, required): Output path for screenshot
- `selector` (string, optional): CSS selector for specific element
- `fullPage` (boolean, optional): Capture full scrollable page
- `quality` (number, optional): Image quality for JPEG (0-100)

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>screenshot</tool_name>
<arguments>
{
  "path": "screenshot.png",
  "fullPage": true
}
</arguments>
</use_mcp_tool>
```

## GM Functions

### GM_setValue(key: string, value: any)
Stores a value persistently using Chrome's localStorage.

```javascript
GM_setValue('myKey', 'myValue');
GM_setValue('myObject', { foo: 'bar' });
```

### GM_getValue(key: string, defaultValue?: any)
Retrieves a previously stored value.

```javascript
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
2. Use appropriate selectors that uniquely identify elements
3. Add appropriate delays when interacting with dynamic content
4. Handle timeouts and errors appropriately
5. Use viewport settings that match your automation needs
6. Clean up resources (close browser, clear logs) when done
7. Monitor memory usage for long-running automations