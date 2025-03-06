# Using Chrome Debug MCP with LLMs

This guide explains how to set up and use the Chrome Debug MCP server with various Large Language Models (LLMs) and AI assistants.

## Prerequisites

- Chrome Debug MCP server installed and configured (see main [README.md](../README.md))
- An LLM platform or AI assistant that supports the Model Context Protocol (MCP)

## Configuration

### VSCode + Roo Code Extension

1. Ensure Chrome Debug MCP is properly configured in `cline_mcp_settings.json`:
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

2. The LLM will automatically detect and connect to the Chrome Debug MCP server when launched through VSCode.

### Claude Desktop App

1. Add the Chrome Debug MCP configuration to `claude_desktop_config.json`:
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

2. Restart the Claude Desktop App to apply changes.

## Usage Examples

### Basic Chrome Control

```javascript
// Launch Chrome and navigate to a URL
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "launch_chrome",
  arguments: {
    url: "https://example.com"
  }
})

// Evaluate JavaScript in the page
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "evaluate",
  arguments: {
    expression: "document.title"
  }
})
```

### Web Automation Tasks

```javascript
// Fill out a form
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "evaluate",
  arguments: {
    expression: `
      document.querySelector('#username').value = 'test';
      document.querySelector('#password').value = 'password';
      document.querySelector('form').submit();
    `
  }
})

// Extract data from the page
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "evaluate",
  arguments: {
    expression: `
      Array.from(document.querySelectorAll('.item')).map(el => ({
        title: el.querySelector('.title').textContent,
        price: el.querySelector('.price').textContent
      }))
    `
  }
})
```

### Userscript Integration

```javascript
// Inject a userscript for enhanced functionality
use_mcp_tool({
  server_name: "chrome-debug",
  tool_name: "launch_chrome",
  arguments: {
    url: "https://example.com",
    userscriptPath: "path/to/userscript.js"
  }
})
```

## Common Tasks

### Web Testing
- Launch Chrome with specific configurations
- Interact with web elements
- Extract page content
- Monitor console logs
- Inject test scripts

### Web Automation
- Fill out forms
- Click buttons and links
- Navigate between pages
- Handle authentication
- Extract data

### Browser Extension Development
- Load unpacked extensions
- Test extension functionality
- Debug extension code
- Monitor extension behavior

## Troubleshooting

### Chrome Won't Launch
1. Verify Chrome is installed and the path is correct
2. Check if Chrome is already running with remote debugging
3. Ensure no conflicting Chrome processes are running

### Connection Issues
1. Verify the debugging port is available
2. Check Chrome's remote debugging settings
3. Ensure firewall isn't blocking connections

### Userscript Problems
1. Verify userscript syntax is correct
2. Check userscript permissions
3. Monitor console for userscript errors

### Extension Loading Fails
1. Verify extension path is correct
2. Check extension manifest.json
3. Ensure extension is compatible with Chrome version

## Best Practices

1. **Resource Management**
   - Always close Chrome when finished
   - Clear console logs regularly
   - Manage Chrome profiles appropriately

2. **Error Handling**
   - Monitor console logs for errors
   - Implement proper error handling in scripts
   - Use try-catch blocks for evaluation

3. **Security**
   - Use secure protocols (https) when possible
   - Handle sensitive data appropriately
   - Follow Chrome security guidelines

4. **Performance**
   - Minimize unnecessary Chrome instances
   - Clean up resources after use
   - Optimize script evaluation

## Additional Resources

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [Puppeteer API Reference](https://pptr.dev/api)
- [Model Context Protocol Documentation](https://modelcontextprotocol.ai)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)