# Chrome Debug MCP Server

A Model Context Protocol (MCP) server for debugging Chrome and managing userscript interactions.

## Features

- Launch Chrome in debug mode
- Get console logs from Chrome
- Evaluate JavaScript in Chrome's context
- Support for userscript injection
- Chrome extension management

## Requirements

- Node.js 16.x or higher
- Chrome/Chromium browser
- Windows, macOS, or Linux operating system

## Dependencies

This project uses the following open-source packages:
- [@modelcontextprotocol/sdk](https://github.com/ModelContext/protocol) - MCP SDK for server implementation
- [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) - Chrome DevTools Protocol implementation
- [puppeteer-core](https://github.com/puppeteer/puppeteer) - Chrome automation and debugging capabilities
- [TypeScript](https://www.typescriptlang.org/) - For type-safe JavaScript development

## Installation

### RooCode Installation

1. Open RooCode settings
2. Add the following to your MCP server configuration:

```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["path/to/chrome-debug-mcp/build/index.js"],
      "env": {}
    }
  }
}
```

Replace `path/to/chrome-debug-mcp` with the actual path to this repository on your system.

### Manual Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
node build/index.js
```

## MCP Tools

### launch_chrome
Launch Chrome in debug mode with optional parameters:
```typescript
{
  url?: string;                    // URL to navigate to
  executablePath?: string;         // Path to Chrome executable
  loadExtension?: string;          // Path to unpacked extension directory
  disableExtensionsExcept?: string; // Path to extension that should remain enabled
  disableAutomationControlled?: boolean; // Disable Chrome's "Automation Controlled" mode
  userscriptPath?: string;         // Path to userscript file to inject
}
```

### get_console_logs
Get console logs from Chrome:
```typescript
{
  clear?: boolean; // Whether to clear logs after retrieving
}
```

### evaluate
Evaluate JavaScript in Chrome:
```typescript
{
  expression: string; // JavaScript code to evaluate
}
```

## Testing

The server includes comprehensive tests:
```bash
npm test
```

## Security

This server runs with the same permissions as Chrome's debugging protocol. Use caution when evaluating untrusted JavaScript or loading untrusted extensions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Model Context Protocol](https://github.com/ModelContext/protocol)
- [Chrome Remote Interface](https://github.com/cyrus-and/chrome-remote-interface)
- [Puppeteer](https://pptr.dev/)