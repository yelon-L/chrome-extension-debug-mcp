# Chrome Debug MCP Server

A Model Context Protocol (MCP) server for debugging Chrome and managing userscript interactions.

## Features

- Launch Chrome in debug mode
- Get console logs from Chrome
- Evaluate JavaScript in Chrome's context
- Support for userscript injection
- Chrome extension management

## Installation

```bash
npm install
```

## Usage

```bash
# Build the project
npm run build

# Start the server
node build/index.js
```

## MCP Tools

### launch_chrome
Launch Chrome in debug mode with optional parameters:
- url: URL to navigate to
- executablePath: Path to Chrome executable
- loadExtension: Path to unpacked extension directory
- disableExtensionsExcept: Path to extension that should remain enabled
- disableAutomationControlled: Disable Chrome's "Automation Controlled" mode
- userscriptPath: Path to userscript file to inject

### get_console_logs
Get console logs from Chrome:
- clear: Whether to clear logs after retrieving (optional)

### evaluate
Evaluate JavaScript in Chrome:
- expression: JavaScript code to evaluate

## Testing

The server includes tests to verify functionality:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT