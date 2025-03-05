# GM Functions Documentation

This document explains the Greasemonkey-style (GM_) functions available to userscripts in the Chrome Debug MCP environment.

## Available Functions

### GM_setValue(key: string, value: any)
Stores a value persistently using Chrome's localStorage.

```javascript
// Store a value
GM_setValue('myKey', 'myValue');
GM_setValue('myObject', { foo: 'bar' });
```

**Note**: Values are automatically JSON-serialized before storage.

### GM_getValue(key: string, defaultValue?: any)
Retrieves a previously stored value. Returns defaultValue if the key doesn't exist.

```javascript
// Retrieve values
const myValue = GM_getValue('myKey', 'default');
const myObject = GM_getValue('myObject', {});
```

**Note**: Values are automatically JSON-parsed when retrieved.

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

**Note**: This is a simplified implementation that only supports basic GET requests. For more complex requests, consider using the browser's fetch API.

### GM_addStyle(css: string)
Adds custom CSS styles to the page.

```javascript
// Add custom styles
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
// Open a link in new tab
GM_openInTab('https://example.com');
```

### GM_registerMenuCommand(name: string, fn: function)
Registers a command in the userscript menu (stub implementation).

```javascript
// Register a menu command
GM_registerMenuCommand('My Command', function() {
  console.log('Command executed');
});
```

**Note**: This is a stub implementation and does not currently create actual menu items.

## Example Usage

Here's a complete example showing how to use these functions in a userscript:

```javascript
// ==UserScript==
// @name        Example Script
// @namespace   example
// @match       https://example.com/*
// @version     1.0
// @description Example of GM functions usage
// ==/UserScript==

// Store user preferences
GM_setValue('theme', 'dark');

// Add custom styles based on preferences
const theme = GM_getValue('theme', 'light');
if (theme === 'dark') {
  GM_addStyle(`
    body {
      background: #1a1a1a;
      color: #ffffff;
    }
  `);
}

// Make an API request
GM_xmlhttpRequest({
  url: 'https://api.example.com/data',
  onload: function(response) {
    const data = JSON.parse(response.responseText);
    console.log('Data received:', data);
  },
  onerror: function(error) {
    console.error('Request failed:', error);
  }
});

// Add a menu command
GM_registerMenuCommand('Toggle Theme', function() {
  const currentTheme = GM_getValue('theme', 'light');
  GM_setValue('theme', currentTheme === 'light' ? 'dark' : 'light');
  location.reload();
});
```

## Implementation Details

The GM functions are injected into the page when Chrome is launched with a userscript. They provide a simplified but functional subset of the standard Greasemonkey API.

### Storage
- Uses Chrome's localStorage with a 'GM_' prefix
- Values are automatically serialized/deserialized using JSON
- Persistent across page reloads

### Network Requests
- Implemented using the Fetch API
- Bypasses same-origin policy restrictions
- Currently only supports basic GET requests

### Styling
- Injects `<style>` elements into the document head
- Styles persist until page reload

### Limitations
1. GM_xmlhttpRequest is simplified compared to full Greasemonkey implementation
2. GM_registerMenuCommand is a stub and doesn't create actual menu items
3. Some advanced Greasemonkey functions are not implemented

## Security Considerations

1. Values stored using GM_setValue are visible to any JavaScript on the page
2. Network requests are visible in the browser's network panel
3. Added styles can be modified by other scripts on the page

## Future Improvements

1. Enhanced GM_xmlhttpRequest with full Greasemonkey compatibility
2. Proper menu command implementation
3. Secure storage implementation
4. Additional GM_ functions from the Greasemonkey API