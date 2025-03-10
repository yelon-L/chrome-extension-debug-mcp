// Tool definitions for Chrome Debug MCP

export const toolDefinitions = [
  {
    name: 'list_tabs',
    description: 'List all open tabs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'new_tab',
    description: 'Open a new tab',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to open in the new tab (optional)',
        },
      },
    },
  },
  {
    name: 'close_tab',
    description: 'Close a specific tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'ID of the tab to close',
        },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'switch_tab',
    description: 'Switch to a specific tab',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'ID of the tab to switch to',
        },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'launch_chrome',
    description: 'Launch Chrome in debug mode',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to (optional)',
        },
        executablePath: {
          type: 'string',
          description: 'Path to Chrome executable (optional, uses bundled Chrome if not provided)',
        },
        userDataDir: {
          type: 'string',
          description: 'Path to a specific user data directory (optional, uses default Chrome profile if not provided)',
        },
        loadExtension: {
          type: 'string',
          description: 'Path to unpacked extension directory to load (optional)',
        },
        disableExtensionsExcept: {
          type: 'string',
          description: 'Path to extension that should remain enabled while others are disabled (optional)',
        },
        disableAutomationControlled: {
          type: 'boolean',
          description: 'Disable Chrome\'s "Automation Controlled" mode (optional, default: false)',
        },
        userscriptPath: {
          type: 'string',
          description: 'Path to userscript file to inject (optional)',
        },
      },
    },
  },
  {
    name: 'get_console_logs',
    description: 'Get console logs from Chrome',
    inputSchema: {
      type: 'object',
      properties: {
        clear: {
          type: 'boolean',
          description: 'Whether to clear logs after retrieving',
        },
      },
    },
  },
  {
    name: 'evaluate',
    description: 'Evaluate JavaScript in Chrome',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'JavaScript code to evaluate',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'click',
    description: 'Click an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element to click',
        },
        delay: {
          type: 'number',
          description: 'Optional delay before clicking (in milliseconds)',
        },
        button: {
          type: 'string',
          enum: ['left', 'right', 'middle'],
          description: 'Mouse button to use',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'type',
    description: 'Type text into an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for input field',
        },
        text: {
          type: 'string',
          description: 'Text to type',
        },
        delay: {
          type: 'number',
          description: 'Optional delay between keystrokes (in milliseconds)',
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'select',
    description: 'Select an option in a dropdown',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for select element',
        },
        value: {
          type: 'string',
          description: 'Option value or label to select',
        },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'hover',
    description: 'Hover over an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element to hover',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'wait_for_selector',
    description: 'Wait for an element to appear on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to wait for',
        },
        timeout: {
          type: 'number',
          description: 'Optional timeout in milliseconds',
        },
        visible: {
          type: 'boolean',
          description: 'Whether element should be visible',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the page or element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to screenshot specific element',
        },
        path: {
          type: 'string',
          description: 'Output path for screenshot',
        },
        fullPage: {
          type: 'boolean',
          description: 'Whether to capture the full scrollable page',
        },
        quality: {
          type: 'number',
          description: 'Image quality (0-100) for JPEG',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        waitUntil: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
          description: 'When to consider navigation completed',
        },
        timeout: {
          type: 'number',
          description: 'Navigation timeout in milliseconds',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_text',
    description: 'Get text content of an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_attribute',
    description: 'Get attribute value of an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element',
        },
        attribute: {
          type: 'string',
          description: 'Attribute name to get',
        },
      },
      required: ['selector', 'attribute'],
    },
  },
  {
    name: 'set_viewport',
    description: 'Set the viewport size and properties',
    inputSchema: {
      type: 'object',
      properties: {
        width: {
          type: 'number',
          description: 'Viewport width in pixels',
        },
        height: {
          type: 'number',
          description: 'Viewport height in pixels',
        },
        deviceScaleFactor: {
          type: 'number',
          description: 'Device scale factor',
        },
        isMobile: {
          type: 'boolean',
          description: 'Whether to emulate mobile device',
        },
      },
      required: ['width', 'height'],
    },
  },
];