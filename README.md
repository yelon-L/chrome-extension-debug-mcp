# Chrome Debug MCP Playwright

A Model Context Protocol (MCP) implementation for browser automation using Playwright, with full Greasemonkey API support.

## Features

### Core Browser Features
- Browser launch and management
- Multi-tab support with create/switch/close capabilities
- Page navigation and interaction
- Screenshot capture

### Greasemonkey API Support
- GM_addStyle for CSS injection
- GM_getValue/GM_setValue for data storage
- GM_deleteValue for storage cleanup
- GM_notification for desktop notifications
- GM_setClipboard for clipboard operations
- GM_xmlhttpRequest for cross-origin requests

### Resource Management
- Network request interception
- Request blocking, modification, and logging
- Resource type filtering

### Debug Features
- Detailed logging system
- Log file organization
- Clean interface output

## Installation

```bash
npm install chrome-debug-mcp-playwright
```

## Quick Start

```javascript
// Launch browser
tool browser launch_browser --url "https://example.com" --browserType "chromium"

// Use GM functions
tool browser gm_setValue --key "setting" --value "test"
tool browser gm_getValue --key "setting"

// Intercept requests
tool browser intercept_requests --patterns ["*.jpg", "*.css"] --action "block"
```

## Documentation
- [Commands](COMMANDS.md) - Detailed command documentation with examples
- Full command list with usage examples available in COMMANDS.md

## Core Features

### Browser Management
```javascript
// Launch browser
tool browser launch_browser --url "https://example.com"

// Create new tab
tool browser create_tab --url "https://example.com"

// Switch between tabs
tool browser switch_tab --index 1
```

### Greasemonkey API
```javascript
// Add custom styles
tool browser gm_addStyle --css "body { background: #f0f0f0; }"

// Store data
tool browser gm_setValue --key "setting" --value "test"

// Make cross-origin requests
tool browser gm_xmlhttpRequest --url "https://api.example.com/data" --method "GET"
```

### Resource Interception
```javascript
// Block image loading
tool browser intercept_requests --patterns ["*.jpg", "*.png"] --action "block"

// Log all CSS requests
tool browser intercept_requests --patterns ["*.css"] --action "log"
```

## Implementation Details

### Logging System
- All debug output redirected to log files
- Timestamped entries
- Organized in logs directory
- Clean interface output

### Error Handling
- Detailed error logging
- Proper cleanup on errors
- Resource management

## Dependencies
- Playwright: Browser automation
- @modelcontextprotocol/sdk: MCP implementation

## Development

### Prerequisites
- Node.js 16 or higher
- npm 7 or higher

### Setup
```bash
git clone https://github.com/yourusername/chrome-debug-mcp-playwright.git
cd chrome-debug-mcp-playwright
npm install
```

## License

MIT License - See LICENSE file for details.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Acknowledgments

Based on the original [chrome-debug-mcp](https://github.com/robertheadley/chrome-debug-mcp) by Robert Headley.