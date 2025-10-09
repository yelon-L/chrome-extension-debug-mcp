/**
 * Standardized tool definitions following Chrome DevTools MCP patterns
 */
/**
 * Chrome Management Tools
 */
export const chromeTools = [
    {
        name: 'attach_to_chrome',
        description: 'Connect to existing Chrome instance with enhanced stability and automatic retries',
        annotations: {
            title: 'Attach to Chrome',
            category: 'chrome',
            readOnlyHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {
                host: {
                    type: 'string',
                    description: 'Chrome host address',
                    default: 'localhost'
                },
                port: {
                    type: 'number',
                    description: 'Chrome remote debugging port',
                    default: 9222
                }
            }
        },
        handler: async (request, context) => {
            const result = await context.chromeManager.attachToChrome(request.params);
            const browser = context.chromeManager.getBrowser();
            if (browser) {
                context.pageManager.setBrowser(browser);
            }
            return {
                content: [{ type: 'text', text: result }]
            };
        }
    },
    {
        name: 'launch_chrome',
        description: 'Launch new Chrome instance with custom configuration',
        annotations: {
            title: 'Launch Chrome',
            category: 'chrome',
            readOnlyHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {
                headless: {
                    type: 'boolean',
                    description: 'Run in headless mode',
                    default: false
                },
                debugPort: {
                    type: 'number',
                    description: 'Debug port for remote debugging',
                    default: 9222
                },
                userDataDir: {
                    type: 'string',
                    description: 'Custom user data directory'
                }
            }
        },
        handler: async (request, context) => {
            const result = await context.chromeManager.launchChrome(request.params);
            const browser = context.chromeManager.getBrowser();
            if (browser) {
                context.pageManager.setBrowser(browser);
            }
            return {
                content: [{ type: 'text', text: result }]
            };
        }
    }
];
/**
 * Extension Tools
 */
export const extensionTools = [
    {
        name: 'list_extensions',
        description: 'List all installed Chrome extensions with caching for fast performance',
        annotations: {
            title: 'List Extensions',
            category: 'extension',
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                includeDisabled: {
                    type: 'boolean',
                    description: 'Include disabled extensions',
                    default: false
                }
            }
        },
        handler: async (request, context) => {
            return await context.extensionHandler.listExtensions(request.params);
        }
    },
    {
        name: 'switch_extension_context',
        description: 'Switch debugging context to specific extension',
        annotations: {
            title: 'Switch Extension Context',
            category: 'extension',
            readOnlyHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {
                extensionId: {
                    type: 'string',
                    description: 'Extension ID to switch to'
                },
                contextType: {
                    type: 'string',
                    enum: ['background', 'content_script', 'popup'],
                    description: 'Type of extension context'
                }
            },
            required: ['extensionId']
        },
        handler: async (request, context) => {
            return await context.extensionHandler.switchExtensionContext(request.params);
        }
    }
];
/**
 * Evaluation Tools
 */
export const evaluationTools = [
    {
        name: 'evaluate',
        description: 'Execute JavaScript code in current page or extension context',
        annotations: {
            title: 'Evaluate JavaScript',
            category: 'evaluation',
            readOnlyHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {
                expression: {
                    type: 'string',
                    description: 'JavaScript expression to evaluate'
                },
                returnByValue: {
                    type: 'boolean',
                    description: 'Return result by value instead of by reference',
                    default: true
                },
                awaitPromise: {
                    type: 'boolean',
                    description: 'Await promise results',
                    default: false
                }
            },
            required: ['expression']
        },
        handler: async (request, context) => {
            return await context.evaluationHandler.evaluate(request.params);
        }
    }
];
/**
 * Interaction Tools
 */
export const interactionTools = [
    {
        name: 'click',
        description: 'Click on page element using selector or coordinates',
        annotations: {
            title: 'Click Element',
            category: 'interaction',
            readOnlyHint: false
        },
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for element to click'
                },
                x: {
                    type: 'number',
                    description: 'X coordinate for click (alternative to selector)'
                },
                y: {
                    type: 'number',
                    description: 'Y coordinate for click (alternative to selector)'
                }
            }
        },
        handler: async (request, context) => {
            return await context.interactionHandler.click(request.params);
        }
    },
    {
        name: 'screenshot',
        description: 'Take screenshot of current page or specific element',
        annotations: {
            title: 'Take Screenshot',
            category: 'interaction',
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector to screenshot (optional, full page if not provided)'
                },
                fullPage: {
                    type: 'boolean',
                    description: 'Capture full scrollable page',
                    default: false
                }
            }
        },
        handler: async (request, context) => {
            return await context.interactionHandler.screenshot(request.params);
        }
    }
];
/**
 * Debug Tools
 */
export const debugTools = [
    {
        name: 'get_console_logs',
        description: 'Retrieve console logs from current page with filtering options',
        annotations: {
            title: 'Get Console Logs',
            category: 'debug',
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                clear: {
                    type: 'boolean',
                    description: 'Clear logs after retrieval',
                    default: false
                },
                level: {
                    type: 'string',
                    enum: ['log', 'info', 'warn', 'error', 'debug'],
                    description: 'Filter by log level'
                }
            }
        },
        handler: async (request, context) => {
            const logs = context.chromeManager.getConsoleLogs();
            if (request.params.clear) {
                context.chromeManager.clearConsoleLogs();
            }
            return {
                content: [{ type: 'text', text: logs.join('\n') || 'No console logs available' }]
            };
        }
    }
];
/**
 * All standard tools organized by category
 */
export const standardTools = {
    chrome: chromeTools,
    extension: extensionTools,
    evaluation: evaluationTools,
    interaction: interactionTools,
    debug: debugTools
};
/**
 * Flattened list of all tools
 */
export const allStandardTools = [
    ...chromeTools,
    ...extensionTools,
    ...evaluationTools,
    ...interactionTools,
    ...debugTools
];
//# sourceMappingURL=standard-tools.js.map