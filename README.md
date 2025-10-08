# Chrome Extension Debug MCP

🚀 **A comprehensive Chrome extension debugging solution built on the Model Context Protocol (MCP)**

This MCP server provides powerful Chrome extension debugging capabilities through the Chrome DevTools Protocol (CDP) and Puppeteer, enabling seamless extension development, testing, and debugging directly from your IDE.

## ✨ Key Features

### 🔧 **Extension Debugging Lifecycle**
- **Complete debugging workflow**: Load → Inject → Monitor → Reload → Diagnose
- **MV3 extension support**: Service Workers, chrome.scripting API, permissions management
- **Real-time log aggregation**: Automatic collection and classification of extension logs
- **Multi-context debugging**: Pages, extensions, service workers, content scripts

### 🎯 **Core MCP Tools**

#### Browser Connection & Management
- **`attach_to_chrome`** - Connect to existing Chrome instance via remote debugging
- **`launch_chrome`** - Start Chrome with extension loading and custom configurations
- **`list_tabs`** - List all open browser tabs with metadata
- **`new_tab`** - Create new tabs with optional navigation
- **`switch_tab`** / **`close_tab`** - Tab management operations

#### Extension Development & Debugging
- **`list_extensions`** - Discover loaded extensions and service workers
- **`reload_extension`** - Hot reload MV3 extensions via Service Worker restart
- **`inject_content_script`** - Dynamic content script injection into specific tabs
- **`content_script_status`** - Multi-dimensional injection detection and evidence analysis
- **`get_extension_logs`** - Categorized log collection (page/extension/service_worker/content_script)

#### Page Interaction & Automation
- **`click`** - Element interaction with CSS selectors
- **`type`** - Text input with clearing and delay options
- **`screenshot`** - Page/element capture with base64 support
- **`evaluate`** - JavaScript execution with tab-specific targeting

## 🚀 Installation

### Prerequisites
- **Node.js 16+** - Runtime environment
- **Chrome Browser** - Target debugging browser
- **MCP Client** - VSCode/Cursor/Windsurf with MCP support, Claude Desktop, etc.

### Build Steps
```bash
git clone https://github.com/yelon-L/chrome-extension-debug-mcp.git
cd chrome-extension-debug-mcp
npm install
npm run build
```

## ⚙️ Configuration

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "chrome-extension-debug": {
      "command": "node",
      "args": ["/path/to/chrome-extension-debug-mcp/build/index.js"]
    }
  }
}
```

### VSCode/Cursor/Windsurf (Cline)
Add to `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "chrome-extension-debug": {
      "command": "node", 
      "args": ["/path/to/chrome-extension-debug-mcp/build/index.js"],
      "disabled": false
    }
  }
}
```

### Continue.dev
Add to `config.json`:
```json
{
  "mcpServers": {
    "chrome-extension-debug": {
      "command": "node",
      "args": ["/path/to/chrome-extension-debug-mcp/build/index.js"]
    }
  }
}
```

## 📖 Usage Examples

### 🔌 Extension Development Workflow

#### 1. Launch Chrome with Extension Loading
```javascript
// Start Chrome with your extension loaded for debugging
use_mcp_tool("chrome-extension-debug", "launch_chrome", {
  loadExtension: "/path/to/your/extension",
  userDataDir: "/tmp/extension-debug-profile",
  url: "https://example.com"
})
```

#### 2. Connect to Existing Chrome Instance
```javascript
// Attach to Chrome running with --remote-debugging-port=9222
use_mcp_tool("chrome-extension-debug", "attach_to_chrome", {
  host: "localhost",
  port: 9222
})
```

#### 3. Extension Discovery & Management
```javascript
// List all loaded extensions and service workers
use_mcp_tool("chrome-extension-debug", "list_extensions", {})

// Hot reload your extension during development
use_mcp_tool("chrome-extension-debug", "reload_extension", {
  extensionId: "your-extension-id"
})
```

#### 4. Content Script Debugging
```javascript
// Inject debugging code into a specific tab
use_mcp_tool("chrome-extension-debug", "inject_content_script", {
  extensionId: "your-extension-id",
  tabId: "tab_1",
  code: "console.log('Debug injection'); document.body.style.border = '2px solid red';"
})

// Check injection status and evidence
use_mcp_tool("chrome-extension-debug", "content_script_status", {
  tabId: "tab_1"
})
```

#### 5. Log Collection & Analysis
```javascript
// Collect categorized extension logs
use_mcp_tool("chrome-extension-debug", "get_extension_logs", {
  sourceTypes: ["extension", "service_worker", "content_script"],
  clear: false
})
```

### 🌐 Basic Browser Automation
```javascript
// Tab management
use_mcp_tool("chrome-extension-debug", "new_tab", {
  url: "https://developer.chrome.com/docs/extensions/"
})

// Page interaction
use_mcp_tool("chrome-extension-debug", "click", {
  selector: ".download-button"
})

// Execute JavaScript with tab targeting
use_mcp_tool("chrome-extension-debug", "evaluate", {
  tabId: "tab_2",
  expression: "document.title"
})
```

## 📚 MCP Tools Reference

### 🔌 Extension Debugging Tools

#### `attach_to_chrome`
Connect to existing Chrome instance via remote debugging
- **`host`** (optional) - Chrome debugging host (default: "localhost")
- **`port`** (optional) - Chrome debugging port (default: 9222)
- **Returns**: Connection status and log aggregation setup

#### `list_extensions`
Discover loaded extensions and service workers
- **Returns**: Array of extension targets with IDs, URLs, and types

#### `reload_extension`
Hot reload MV3 extensions via Service Worker restart
- **`extensionId`** (required) - Chrome extension ID
- **Returns**: Reload confirmation

#### `inject_content_script`
Dynamically inject code into specific tabs via chrome.scripting API
- **`extensionId`** (required) - Extension ID with scripting permissions
- **`tabId`** (required) - Target tab identifier
- **`code`** (optional) - JavaScript code to execute
- **`files`** (optional) - Script files to inject
- **Returns**: Injection result

#### `content_script_status`
Multi-dimensional injection detection and evidence analysis
- **`tabId`** (required) - Tab to analyze
- **Returns**: Detailed injection status, MCP markers, and modification evidence

#### `get_extension_logs`
Categorized log collection from various sources
- **`sourceTypes`** (optional) - Filter by source: ["page", "extension", "service_worker", "content_script"]
- **`clear`** (optional) - Clear logs after retrieval (default: false)
- **Returns**: Categorized console logs

### 🌐 Browser Management Tools

#### `launch_chrome`
Start Chrome with extension loading capabilities
- **`url`** (optional) - Initial navigation URL
- **`executablePath`** (optional) - Custom Chrome executable path
- **`userDataDir`** (optional) - Custom user profile directory
- **`loadExtension`** (optional) - Extension directory to load
- **`disableExtensionsExcept`** (optional) - Disable all extensions except specified path
- **`disableAutomationControlled`** (optional) - Hide "Chrome is controlled by automated software"
- **`userscriptPath`** (optional) - Greasemonkey-style userscript to inject

#### `evaluate`
Execute JavaScript in page context with tab targeting
- **`expression`** (required) - JavaScript code to execute
- **`tabId`** (optional) - Specific tab to target
- **Returns**: Execution result

### 🖱️ Page Interaction Tools

#### `click` / `type` / `screenshot`
Standard page interaction tools with CSS selector support
- See original documentation for detailed parameters

#### `list_tabs` / `new_tab` / `switch_tab` / `close_tab`
Tab management operations
- **`tabId`** parameter for targeting specific tabs
- **`url`** parameter for new tab navigation

## 🧪 Testing & Validation

### Test Coverage
- **✅ 7/7 Core Tools** - All extension debugging tools fully validated
- **✅ Multi-Environment** - Tested in headless (Xvfb) and headed modes
- **✅ MV3 Compatibility** - Full Manifest V3 extension support
- **✅ Cross-Platform** - Linux, macOS, Windows support

### Test Scenarios
- Extension loading and hot reloading
- Content script injection and detection
- Log aggregation from multiple sources
- Remote debugging port connection
- Tab management and interaction

See `TEST_PLAN.md` and `PROGRESS.md` for detailed testing documentation.

## 🏗️ Architecture

### Core Technologies
- **[Puppeteer](https://pptr.dev/)** - Chrome automation and control
- **[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)** - Direct Chrome communication
- **[chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)** - CDP client implementation
- **[@modelcontextprotocol/sdk](https://github.com/ModelContextProtocol/sdk)** - MCP framework

### Extension Debugging Pipeline
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   IDE Client    │───▶│   MCP Server     │───▶│   Chrome CDP    │
│   (VSCode/etc)  │    │   (This Tool)    │    │   (Extensions)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Debug Commands │    │  Log Aggregation │    │ Extension APIs  │
│  Status Reports │    │  Target Discovery│    │ Script Injection│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🤝 Contributing

Contributions are welcome! Please see our development workflow:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Test** your changes with `npm test`
4. **Commit** with descriptive messages
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Setup
```bash
# Clone and setup
git clone https://github.com/yelon-L/chrome-extension-debug-mcp.git
cd chrome-extension-debug-mcp
npm install

# Build and test
npm run build
npm run test

# Start Chrome with remote debugging for testing
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **[Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)** - Official extension development guide
- **[Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)** - Core debugging protocol
- **[Model Context Protocol](https://modelcontextprotocol.ai)** - AI-IDE integration standard
- **[Puppeteer Team](https://pptr.dev/)** - Excellent Chrome automation library

---

**🎯 Ready to supercharge your Chrome extension development workflow?**

Get started with Chrome Extension Debug MCP and experience seamless extension debugging directly from your IDE!
