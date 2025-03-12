# Chrome Debug MCP Commands Reference

This document provides a comprehensive reference for all commands and functions available in the Chrome Debug MCP server.

## MCP Tools

### Common Use Cases

#### Web Scraping
- Use `launch_chrome` with custom profile for authenticated sessions
- Combine `wait_for_selector` and `get_text` for data extraction
- Use `screenshot` for visual verification
- Monitor errors with `get_console_logs`

#### Form Automation
- `type` for input fields
- `select` for dropdowns
- `click` for form submission
- `wait_for_selector` for validation messages

#### Multi-Tab Workflows
- `new_tab` for parallel processing
- `switch_tab` to manage multiple workflows
- `list_tabs` to track open processes
- `close_tab` for cleanup

#### Visual Testing
- `set_viewport` for consistent dimensions
- `screenshot` for capturing states
- `evaluate` for triggering UI changes
- `wait_for_selector` for animation completion

#### Extension Testing
- `launch_chrome` with extension loading
- `get_console_logs` for extension debugging
- `evaluate` for interacting with extension APIs
- Custom profile management for extension state

#### State Monitoring
- `wait_for_state_change` for dynamic content updates
- `watch_url_changes` for URL and history tracking
- `intercept_network` for API request monitoring
- Combine with console logs for comprehensive debugging

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
### State Monitoring

#### wait_for_state_change
Waits for application state changes after navigation/interaction.

**Parameters:**
- `timeout` (number, optional): How long to wait for state changes (ms)
- `selector` (string, optional): Optional DOM selector to watch

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>wait_for_state_change</tool_name>
<arguments>
{
  "timeout": 5000,
  "selector": "#dynamic-content"
}
</arguments>
</use_mcp_tool>
```

#### watch_url_changes
Monitors and logs URL changes with associated state.

**Parameters:**
- `duration` (number, required): How long to watch for changes (ms)
- `includeState` (boolean, optional): Whether to include app state snapshots

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>watch_url_changes</tool_name>
<arguments>
{
  "duration": 10000,
  "includeState": true
}
</arguments>
</use_mcp_tool>
```

#### intercept_network
Monitors and logs network requests.

**Parameters:**
- `patterns` (array, required): URL patterns to watch
- `includeHeaders` (boolean, optional): Include request/response headers

**Example:**
```javascript
<use_mcp_tool>
<server_name>chrome-debug</server_name>
<tool_name>intercept_network</tool_name>
<arguments>
{
  "patterns": ["https://api.example.com/*"],
  "includeHeaders": true
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

### Script Information

#### GM_info
Get metadata about the current userscript.

```javascript
console.log(GM_info.script.name);    // Script name
console.log(GM_info.scriptHandler);  // 'Chrome Debug MCP'
console.log(GM_info.version);        // Version string
```

### Storage Management

#### GM_setValue(key: string, value: any)
Stores a value persistently using Chrome's localStorage.

```javascript
GM_setValue('myKey', 'myValue');
GM_setValue('myObject', { foo: 'bar' });
```

#### GM_getValue(key: string, defaultValue?: any)
Retrieves a previously stored value.

```javascript
const myValue = GM_getValue('myKey', 'default');
const myObject = GM_getValue('myObject', {});
```

#### GM_deleteValue(key: string)
Deletes a stored value.

```javascript
GM_deleteValue('myKey');
```

#### GM_listValues()
Lists all stored value keys.

```javascript
const keys = GM_listValues(); // Returns array of keys
```

### HTTP Requests

#### GM_xmlhttpRequest(details: object)
Makes HTTP requests that bypass same-origin policy restrictions.

```javascript
GM_xmlhttpRequest({
  url: 'https://api.example.com/data',
  method: 'POST',                    // GET, POST, PUT, DELETE, etc.
  headers: {                         // Custom headers
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  data: JSON.stringify({ foo: 'bar' }), // Request body
  binary: false,                     // Handle binary responses
  timeout: 5000,                     // Request timeout in ms
  onload: function(response) {
    console.log(response.responseText);
    console.log(response.responseHeaders);
    console.log(response.status);
  },
  onerror: function(error) {
    console.error('Request failed:', error);
  },
  onprogress: function(progress) {   // Progress updates
    console.log('Progress:', progress.loaded / progress.total);
  }
});
```

### System Integration

#### GM_setClipboard(text: string, info?: string)
Copies text to the clipboard.

```javascript
GM_setClipboard('Text to copy');
GM_setClipboard('<b>HTML</b>', 'text/html');
```

#### GM_notification(details: object | string)
Shows desktop notifications with robust fallback behavior and enhanced features.

**Parameters:**
- `details`: String for simple notifications, or object with:
  - `title` (string, optional): Notification title
  - `text` (string, required): Notification content
  - `image` (string, optional): URL for notification icon
  - `timeout` (number, optional): Auto-close timeout in milliseconds (0 for no timeout)
  - `onclick` (function, optional): Click handler with automatic window focus
  - `ondone` (function, optional): Completion callback

**Features:**
- Automatic permission handling
- Multi-level fallback system:
  1. Native browser notifications
  2. Custom UI overlay with similar behavior
  3. Console output as last resort
- Window focus management for click handlers
- Timeout and lifecycle management
- Persistent notifications (timeout: 0)

**Examples:**
```javascript
// Simple text notification
GM_notification('Quick message');

// Timed notification with completion tracking
GM_notification({
  title: 'Timer',
  text: 'Closes in 5 seconds',
  timeout: 5000,
  ondone: () => console.log('Timer complete')
});

// Interactive persistent notification
GM_notification({
  title: 'Action Required',
  text: 'Click to respond',
  timeout: 0,  // Stay open until clicked
  onclick: () => {
    console.log('User responded');
    // Handle interaction
  }
});

// Rich notification with all features
GM_notification({
  title: '🎉 Rich Content',
  text: 'Full-featured notification',
  image: 'icon.png',
  timeout: 3000,
  onclick: () => {
    window.focus();
    console.log('Notification clicked');
  },
  ondone: () => console.log('Notification closed')
});
```

**Fallback Behavior:**
1. Attempts native notifications with permission request
2. Falls back to custom UI overlay if:
   - Notifications not supported
   - Permission denied
   - Native notification fails
3. Ultimate fallback to console if UI creation fails

**Best Practices:**
- Use timeouts appropriate for content importance
- Provide clear click actions when interactive
- Handle both success and failure cases in callbacks
- Consider using emoji in titles for better visibility
- Test with permissions both granted and denied

### Resource Management

#### GM_getResourceText(name: string)
Gets the content of a resource as text.

```javascript
const resourceText = GM_getResourceText('myResource');
```

#### GM_getResourceURL(name: string)
Gets the URL of a resource.

```javascript
const resourceUrl = GM_getResourceURL('myImage');
```

### Page Modification

#### GM_addStyle(css: string)
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

## State Monitoring Best Practices

### Dynamic Content Handling
1. Use `wait_for_state_change` to detect DOM mutations:
   - Set appropriate timeouts based on expected response times
   - Provide specific selectors when possible
   - Consider using with console logs for debugging

2. Monitor URL changes in single-page applications:
   - Use `watch_url_changes` with sufficient duration
   - Enable state snapshots for debugging
   - Track history API calls and routing changes

3. Network Request Monitoring:
   - Use specific patterns with `intercept_network` to reduce overhead
   - Include headers when debugging authentication issues
   - Combine with console logs for comprehensive debugging

4. General Tips:
   - Chain state monitoring tools appropriately
   - Handle timeouts and errors gracefully
   - Clean up monitoring when no longer needed
   - Consider memory usage in long-running monitoring
  }
`);
```

### Navigation

#### GM_openInTab(url: string, options?: object)
Opens a URL in a new browser tab with advanced options.

```javascript
// Simple usage
GM_openInTab('https://example.com');

// Advanced usage
const tab = GM_openInTab('https://example.com', {
  active: true,     // Focus the new tab
  insert: true,     // Insert after current tab
  setParent: true   // Set opener relationship
});

tab.onclose = () => console.log('Tab closed');
tab.close();        // Close the tab
```

### Menu Management

#### GM_registerMenuCommand(name: string, fn: function, accessKey?: string)
Registers a command in the userscript menu.

```javascript
const commandId = GM_registerMenuCommand('My Command', function() {
  console.log('Command executed');
}, 'C');
```

#### GM_unregisterMenuCommand(id: string)
Removes a previously registered menu command.

```javascript
GM_unregisterMenuCommand(commandId);
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