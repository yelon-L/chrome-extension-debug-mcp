# Chrome Debug MCP Server

MCP server providing Chrome browser automation capabilities with support for userscripts and extensions.

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

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Add the configuration above to your Roo Code settings at:
- VSCode: `%APPDATA%/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Claude Desktop: `%APPDATA%/Anthropic/Claude/config/claude_desktop_config.json`

4. Replace `path/to/chrome-debug-mcp` with the actual path to your installation.

## Requirements

- Node.js v14 or higher
- Chrome browser installed
- VSCode + Roo Code extension or Claude Desktop App

## Tools

- `launch_chrome`: Launch Chrome with various configurations
- `evaluate`: Execute JavaScript in the browser context
- `get_console_logs`: Retrieve browser console logs
- `click`: Click on page elements
- `type`: Type text into input fields
- `select`: Select options from dropdowns
- `hover`: Hover over elements
- `wait_for_selector`: Wait for elements to appear
- `screenshot`: Capture page screenshots
- `get_text`: Get element text content
- `get_attribute`: Get element attributes
- `set_viewport`: Configure viewport size
- `navigate`: Navigate to URLs

For full tool documentation, see [COMMANDS.md](./COMMANDS.md).

## Testing

```bash
npm run build
npm test
```

## Known Issues

- Chrome must be installed and accessible
- Extensions require non-headless mode
- Some websites may detect automation

## Support

For issues and questions:
- Open an issue on GitHub
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)