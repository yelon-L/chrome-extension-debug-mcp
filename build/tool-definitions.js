export const TOOLS = [
    // Core browser features
    {
        name: 'launch_browser',
        description: 'Launch browser in debug mode',
        inputSchema: {
            type: 'object',
            properties: {
                browserType: {
                    type: 'string',
                    enum: ['chromium', 'firefox', 'webkit'],
                    description: 'Browser type to launch',
                    default: 'chromium'
                },
                url: {
                    type: 'string',
                    description: 'URL to navigate to'
                }
            },
            required: ['url']
        }
    },
    // Tab management
    {
        name: 'create_tab',
        description: 'Create a new tab',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to open in new tab'
                }
            },
            required: ['url']
        }
    },
    {
        name: 'switch_tab',
        description: 'Switch to a different tab',
        inputSchema: {
            type: 'object',
            properties: {
                index: {
                    type: 'number',
                    description: 'Index of tab to switch to'
                }
            },
            required: ['index']
        }
    },
    {
        name: 'list_tabs',
        description: 'List all open tabs',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'close_tab',
        description: 'Close current tab',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    // Page actions
    {
        name: 'navigate',
        description: 'Navigate to a URL',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to navigate to'
                },
                waitUntil: {
                    type: 'string',
                    enum: ['load', 'domcontentloaded', 'networkidle'],
                    description: 'When to consider navigation successful',
                    default: 'load'
                }
            },
            required: ['url']
        }
    },
    {
        name: 'click',
        description: 'Click an element on the page',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector of element to click'
                },
                button: {
                    type: 'string',
                    enum: ['left', 'right', 'middle'],
                    description: 'Mouse button to click with',
                    default: 'left'
                },
                clickCount: {
                    type: 'number',
                    description: 'Number of times to click',
                    default: 1
                }
            },
            required: ['selector']
        }
    },
    {
        name: 'type',
        description: 'Type text into an input field',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector of input field'
                },
                text: {
                    type: 'string',
                    description: 'Text to type'
                },
                delay: {
                    type: 'number',
                    description: 'Delay between keystrokes in milliseconds',
                    default: 0
                }
            },
            required: ['selector', 'text']
        }
    },
    // Resource interception
    {
        name: 'intercept_requests',
        description: 'Start intercepting network requests',
        inputSchema: {
            type: 'object',
            properties: {
                patterns: {
                    type: 'array',
                    description: 'URL patterns to intercept',
                    items: {
                        type: 'string'
                    }
                },
                action: {
                    type: 'string',
                    enum: ['block', 'modify', 'log'],
                    description: 'Action to take on matched requests',
                    default: 'log'
                }
            },
            required: ['patterns']
        }
    },
    {
        name: 'stop_intercepting',
        description: 'Stop intercepting network requests',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    // GM API features
    {
        name: 'gm_addStyle',
        description: 'Add CSS styles to the page',
        inputSchema: {
            type: 'object',
            properties: {
                css: {
                    type: 'string',
                    description: 'CSS styles to add'
                }
            },
            required: ['css']
        }
    },
    {
        name: 'gm_getValue',
        description: 'Get a stored value',
        inputSchema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Key to retrieve'
                },
                defaultValue: {
                    type: 'string',
                    description: 'Default value if key not found'
                }
            },
            required: ['key']
        }
    },
    {
        name: 'gm_setValue',
        description: 'Store a value',
        inputSchema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Key to store'
                },
                value: {
                    type: 'string',
                    description: 'Value to store'
                }
            },
            required: ['key', 'value']
        }
    },
    {
        name: 'gm_deleteValue',
        description: 'Delete a stored value',
        inputSchema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Key to delete'
                }
            },
            required: ['key']
        }
    },
    {
        name: 'gm_notification',
        description: 'Show a notification',
        inputSchema: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'Notification text'
                },
                title: {
                    type: 'string',
                    description: 'Notification title',
                    default: ''
                },
                image: {
                    type: 'string',
                    description: 'URL of notification icon',
                    default: ''
                },
                timeout: {
                    type: 'number',
                    description: 'Time in milliseconds before notification closes',
                    default: 0
                }
            },
            required: ['text']
        }
    },
    {
        name: 'gm_setClipboard',
        description: 'Copy text to clipboard',
        inputSchema: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'Text to copy'
                },
                info: {
                    type: 'string',
                    enum: ['text', 'html'],
                    description: 'Type of content',
                    default: 'text'
                }
            },
            required: ['text']
        }
    },
    {
        name: 'gm_xmlhttpRequest',
        description: 'Make a cross-origin HTTP request',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to request'
                },
                method: {
                    type: 'string',
                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                    description: 'HTTP method',
                    default: 'GET'
                },
                headers: {
                    type: 'object',
                    description: 'Request headers',
                    additionalProperties: true
                },
                data: {
                    type: 'string',
                    description: 'Request body'
                },
                timeout: {
                    type: 'number',
                    description: 'Request timeout in milliseconds',
                    default: 0
                }
            },
            required: ['url']
        }
    }
];