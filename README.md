# Chrome Debug MCP Server

A Model Context Protocol (MCP) server for controlling Chrome with debugging capabilities, userscript injection, and extension support.

## Features

### Chrome Control
- Launch Chrome with custom configurations
- Support for custom Chrome executable paths
- User profile management (default or custom user data directory)
- Extension support and management
- Disable Chrome's "Automation Controlled" banner

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