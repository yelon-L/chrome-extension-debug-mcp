# Chrome Debug MCP Server

A Model Context Protocol (MCP) server for controlling Chrome with debugging capabilities, userscript injection, and extension support.

## Use Case Scenarios

### 1. Web Scraping with Authentication
```javascript
// Launch Chrome with custom profile (containing cookies)
await launch_chrome({ userDataDir: "path/to/profile" })

// Navigate and wait for login form
await wait_for_selector({ selector: "#login-form" })
await type({ selector: "#username", text: "user" })
await type({ selector: "#password", text: "pass" })
await click({ selector: "#submit" })

// Wait for authenticated content and extract data
await wait_for_selector({ selector: ".content" })
const data = await get_text({ selector: ".data-table" })
```

### 2. Automated Testing with Console Monitoring
```javascript
// Launch with console monitoring
await launch_chrome({ url: "https://test-site.com" })

// Inject test script
await evaluate({ expression: `
  console.log('Starting tests...');
  runTests().then(results => {
    console.log('Tests complete:', results);
  });
`})

// Monitor test progress
const logs = await get_console_logs({ clear: false })
```

### 3. Multi-Tab Workflow Automation
```javascript
// Open multiple tabs for parallel processing
const tab1 = await new_tab({ url: "https://site1.com" })
const tab2 = await new_tab({ url: "https://site2.com" })

// Switch between tabs and process data
await switch_tab({ tabId: tab1 })
await process_site_1()

await switch_tab({ tabId: tab2 })
await process_site_2()
```

### 4. Enhanced Web Automation with Userscripts
```javascript
// Launch with userscript for enhanced functionality
await launch_chrome({
  url: "https://target-site.com",
  userscriptPath: "automation-helper.js"
})

// Use injected GM functions
await evaluate({
  expression: `
    GM_addStyle('.highlight { background: yellow; }');
    GM_setValue('lastRun', Date.now());
    await GM_notification('Processing complete!');
  `
})
```

### 5. Extension-Based Automation
```javascript
// Launch with specific extension enabled
await launch_chrome({
  loadExtension: "path/to/automation/extension",
  disableExtensionsExcept: "path/to/automation/extension",
  disableAutomationControlled: true
})

// Interact with extension-modified page
await wait_for_selector({ selector: "#extension-button" })
await click({ selector: "#extension-button" })
```

### 6. Visual Regression Testing
```javascript
// Set consistent viewport
await set_viewport({ width: 1920, height: 1080 })

// Capture baseline
await screenshot({
  path: "baseline.png",
  fullPage: true
})

// Make changes and compare
await click({ selector: "#theme-toggle" })
await screenshot({
  path: "comparison.png",
  fullPage: true
})
```

### 7. Form Automation with Validation
```javascript
// Fill complex form with error checking
await type({ selector: "#email", text: "test@example.com" })
await select({ selector: "#country", value: "US" })

// Wait for validation and check console for errors
await wait_for_selector({ selector: ".validation-complete" })
const logs = await get_console_logs({ clear: true })
if (logs.includes("validation error")) {
  // Handle error case
}
```

## Features

### Chrome Control
- Launch Chrome with custom configurations
- Support for custom Chrome executable paths
- User profile management (default or custom user data directory)
- Extension support and management
- Disable Chrome's "Automation Controlled" banner

### Page Automation
- Click, type, and interact with page elements
- Handle dropdowns and form inputs
- Hover and wait for elements
- Take screenshots of full page or elements
- Navigate between pages
- Set viewport size and device emulation
- Extract text and attributes from elements

### Tab Management
- List all open tabs with their IDs and URLs
- Open new tabs with specified URLs
- Close tabs by ID
- Switch between tabs
- Track and manage multiple tab states

### Debugging Capabilities
- Remote debugging via Chrome DevTools Protocol (CDP)
- Console log capture and monitoring
- JavaScript evaluation in page context
- Real-time console output streaming

### Userscript Support
- Inject userscripts into web pages
- Greasemonkey-style API support:
  - `GM_setValue`/`GM_getValue` for persistent storage
  - `GM_addStyle` for CSS injection
  - `GM_xmlhttpRequest` for cross-origin requests
  - `GM_openInTab` for new tab creation
  - `GM_registerMenuCommand` for menu commands

### Extension Integration
- Load unpacked extensions
- Maintain extension states and configurations
- Support for default Chrome profile extensions
- Selective extension enabling/disabling

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [Chrome](https://www.google.com/chrome/) browser installed
- [Visual Studio Code](https://code.visualstudio.com/)
- [Roo Code Extension](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline)

### Installing Roo Code Extension
1. Open Visual Studio Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Roo Code"
4. Click Install

### Setting up Chrome Debug MCP Server
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/chrome-debug-mcp.git
   cd chrome-debug-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Configure in Roo Code:
   Add to `cline_mcp_settings.json`:
   ```json
   {
     "mcpServers": {
       "chrome-debug": {
         "command": "node",
         "args": ["path/to/chrome-debug-mcp/build/index.js"],
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```

## Usage

For a complete reference of all available commands, tools, and functions, see [COMMANDS.md](docs/COMMANDS.md).

### Basic Chrome Launch
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "launch_chrome",
  arguments: {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    url: "https://example.com"
  }
})
```

### Launch with Custom Profile
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "launch_chrome",
  arguments: {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    userDataDir: "path/to/chrome/profile",
    disableAutomationControlled: true
  }
})
```

### Inject Userscript
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "launch_chrome",
  arguments: {
    url: "https://example.com",
    userscriptPath: "path/to/userscript.js"
  }
})
```

### Evaluate JavaScript
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "evaluate",
  arguments: {
    expression: "document.title"
  }
})
```

### Get Console Logs
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "get_console_logs",
  arguments: {
    clear: true
  }
})
```

### Page Interaction Examples

#### Click an Element
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "click",
  arguments: {
    selector: "#submit-button",
    delay: 500
  }
})
```

#### Type into Input
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "type",
  arguments: {
    selector: "#search-input",
    text: "search query",
    delay: 100
  }
})
```

#### Select from Dropdown
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "select",
  arguments: {
    selector: "#country-select",
    value: "US"
  }
})
```

#### Wait for Element
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "wait_for_selector",
  arguments: {
    selector: ".loading-complete",
    visible: true,
    timeout: 5000
  }
})
```

#### Take Screenshot
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "screenshot",
  arguments: {
    path: "screenshot.png",
    fullPage: true
  }
})
```

#### Set Viewport Size
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "set_viewport",
  arguments: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  }
})
```

### Tab Management Examples

#### List All Tabs
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "list_tabs",
  arguments: {}
})
```

#### Open New Tab
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "new_tab",
  arguments: {
    url: "https://example.com"
  }
})
```

#### Switch to Tab
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "switch_tab",
  arguments: {
    tabId: "tab-id-from-list-tabs"
  }
})
```

#### Close Tab
```javascript
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "close_tab",
  arguments: {
    tabId: "tab-id-from-list-tabs"
  }
})
```

## Dependencies

This project uses the following open-source packages:

- [Puppeteer](https://pptr.dev/) - Chrome automation library
- [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) - Chrome DevTools Protocol client
- [@modelcontextprotocol/sdk](https://github.com/ModelContextProtocol/sdk) - MCP SDK for server implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

See our [Contributing Guide](CONTRIBUTING.md) for details on making contributions.

## Acknowledgments

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Greasemonkey API](https://wiki.greasespot.net/Greasemonkey_Manual:API)
- [Model Context Protocol](https://modelcontextprotocol.ai)