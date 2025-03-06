# Chrome Debug MCP Server

A Model Context Protocol (MCP) server for controlling Chrome through Chrome DevTools Protocol (CDP) and Puppeteer. This server provides AI assistants with the ability to:

- Launch Chrome with various configurations
- Inject userscripts with GM_ function support
- Load Chrome extensions
- Capture console logs
- Evaluate JavaScript in the browser context

## Requirements

- Node.js v18 or higher
- Chrome browser installed
- npm v8 or higher

## Installation Options

### Option 1: Roo Code / Cline VSCode Extension

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/chrome-debug-mcp.git
   cd chrome-debug-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

4. Add the server to Cline's MCP settings:
   - Open VS Code
   - Open the settings file at:
     ```
     Windows: %APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json
     Mac: ~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json
     Linux: ~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json
     ```
   - Add the following configuration:
     ```json
     {
       "mcpServers": {
         "chrome-debug": {
           "command": "node",
           "args": ["PATH_TO_REPO/chrome-debug-mcp/build/index.js"],
           "disabled": false,
           "alwaysAllow": []
         }
       }
     }
     ```
   - Replace PATH_TO_REPO with the actual path to your cloned repository

### Option 2: Claude Desktop App

1. Follow steps 1-3 from Option 1 above

2. Add the server to Claude Desktop's settings:
   - Open Claude Desktop
   - Open the settings file at:
     ```
     Windows: %APPDATA%\Claude\claude_desktop_config.json
     Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
     Linux: ~/.config/Claude/claude_desktop_config.json
     ```
   - Add the same configuration as shown in Option 1, adjusting the path accordingly

## Available Tools

### launch_chrome
Launch Chrome with specific configurations:
- url: Navigate to a specific URL
- executablePath: Use custom Chrome executable
- loadExtension: Load unpacked extension
- disableExtensionsExcept: Disable all extensions except specified one
- disableAutomationControlled: Hide automation controlled banner
- userscriptPath: Inject userscript into the page

### get_console_logs
Retrieve console output:
- clear: Whether to clear logs after retrieving

### evaluate
Execute JavaScript in the browser context:
- expression: JavaScript code to evaluate

## Example Usage

```javascript
// Launch Chrome and navigate to a page
await use_mcp_tool("chrome-debug", "launch_chrome", {
  url: "https://example.com"
});

// Evaluate JavaScript
await use_mcp_tool("chrome-debug", "evaluate", {
  expression: "document.title"
});

// Get console logs
await use_mcp_tool("chrome-debug", "get_console_logs", {
  clear: true
});
```

## Features

- Full Chrome DevTools Protocol support
- Automated browser control
- Greasemonkey-style userscript injection
- Console log capture
- Extension loading support
- Cross-origin request support
- Graceful cleanup on shutdown

## Development

To modify the server:

1. Make changes in the `src` directory
2. Run `npm run build` to compile
3. Restart the MCP server

## Troubleshooting

1. If Chrome fails to launch:
   - Ensure Chrome is installed
   - Try providing explicit path to Chrome executable
   - Check system permissions

2. If connection fails:
   - Verify the path in MCP settings is correct
   - Ensure Node.js is installed and in PATH
   - Check if port 9222 is available

3. If extensions don't load:
   - Verify extension path is absolute
   - Ensure extension is unpacked
   - Check extension manifest version

## License

ISC License