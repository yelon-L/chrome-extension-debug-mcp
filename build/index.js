#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    InitializeRequestSchema,
    ErrorCode,
    McpError
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { TOOLS } from './tool-definitions.js';

// Configure logging
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `mcp-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Redirect console output to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
    const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');
    fs.appendFileSync(LOG_FILE, `[LOG] ${message}\n`);
};

console.error = (...args) => {
    const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');
    fs.appendFileSync(LOG_FILE, `[ERROR] ${message}\n`);
};

const log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');
    
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
};

// Clear log at startup
fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] MCP Server Starting...\n`);

// State
let browser = null;
let context = null;
let page = null;
let pages = [];
let activeInterceptions = new Map();

// GM API implementation
const GM_API = `
window.GM_addStyle = function(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
};

window.GM_getValue = function(key, defaultValue) {
    const value = localStorage.getItem('GM_' + key);
    return value !== null ? JSON.parse(value) : defaultValue;
};

window.GM_setValue = function(key, value) {
    localStorage.setItem('GM_' + key, JSON.stringify(value));
};

window.GM_deleteValue = function(key) {
    localStorage.removeItem('GM_' + key);
};

window.GM_notification = function(details) {
    if (typeof details === 'string') {
        details = { text: details };
    }
    
    const { text, title = '', image = '', timeout = 0, onclick, ondone } = details;
    
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                const notification = new Notification(title, {
                    body: text,
                    icon: image
                });
                
                if (onclick) notification.onclick = onclick;
                if (timeout) setTimeout(() => notification.close(), timeout);
                if (ondone) notification.onclose = ondone;
            }
        });
    }
};

window.GM_setClipboard = async function(text, info = 'text') {
    try {
        if (info === 'html') {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([text], { type: 'text/html' }),
                    'text/plain': new Blob([text.replace(/<[^>]*>/g, '')], { type: 'text/plain' })
                })
            ]);
        } else {
            await navigator.clipboard.writeText(text);
        }
        return true;
    } catch (error) {
        console.error('GM_setClipboard failed:', error);
        return false;
    }
};

window.GM_xmlhttpRequest = function(details) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(details.method || 'GET', details.url);
        
        if (details.headers) {
            Object.entries(details.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
        }
        
        xhr.timeout = details.timeout || 0;
        
        xhr.onload = function() {
            resolve({
                status: xhr.status,
                statusText: xhr.statusText,
                responseHeaders: xhr.getAllResponseHeaders(),
                response: xhr.response,
                responseText: xhr.responseText
            });
        };
        
        xhr.onerror = reject;
        xhr.ontimeout = reject;
        
        xhr.send(details.data);
    });
};`;

// Tool handlers
const handlers = {
    async launch_browser(args) {
        log('Launching browser with args:', args);
        try {
            if (!args.url) {
                throw new McpError(ErrorCode.InvalidParams, 'URL is required');
            }

            if (browser) {
                log('Closing existing browser');
                await browser.close();
                browser = null;
                context = null;
                page = null;
                pages = [];
                activeInterceptions.clear();
            }

            log('Creating new browser instance');
            browser = await chromium.launch({
                headless: false,
                args: ['--no-sandbox']
            });

            log('Creating browser context');
            context = await browser.newContext({
                bypassCSP: true
            });
            
            log('Creating new page');
            page = await context.newPage();
            pages = [page];

            // Inject GM API
            await page.addInitScript(GM_API);

            log('Navigating to:', args.url);
            await page.goto(args.url);

            log('Browser launch successful');
            return {
                content: [{
                    type: 'text',
                    text: `Browser launched and navigated to ${args.url}`
                }]
            };
        } catch (error) {
            log('Launch error:', error);
            throw error;
        }
    },

    async create_tab(args) {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const newPage = await context.newPage();
        await newPage.addInitScript(GM_API);
        await newPage.goto(args.url);
        pages.push(newPage);
        page = newPage;
        return {
            content: [{
                type: 'text',
                text: `New tab created at index ${pages.length - 1}`
            }]
        };
    },

    async switch_tab(args) {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        if (args.index < 0 || args.index >= pages.length) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid tab index');
        }
        page = pages[args.index];
        return {
            content: [{
                type: 'text',
                text: `Switched to tab ${args.index}`
            }]
        };
    },

    async list_tabs() {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const titles = await Promise.all(pages.map(p => p.title()));
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(titles.map((title, index) => ({ index, title })))
            }]
        };
    },

    async close_tab() {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const index = pages.indexOf(page);
        await page.close();
        pages = pages.filter(p => p !== page);
        page = pages[Math.min(index, pages.length - 1)];
        return {
            content: [{
                type: 'text',
                text: `Closed tab ${index}`
            }]
        };
    },

    async gm_addStyle(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const result = await page.evaluate((css) => {
            return !!window.GM_addStyle(css);
        }, args.css);
        return {
            content: [{
                type: 'text',
                text: result ? 'Style added successfully' : 'Failed to add style'
            }]
        };
    },

    async gm_getValue(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const result = await page.evaluate(({key, defaultValue}) => {
            return window.GM_getValue(key, defaultValue);
        }, args);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result)
            }]
        };
    },

    async gm_setValue(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        await page.evaluate(({key, value}) => {
            window.GM_setValue(key, value);
        }, args);
        return {
            content: [{
                type: 'text',
                text: `Value set for key: ${args.key}`
            }]
        };
    },

    async gm_deleteValue(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        await page.evaluate((key) => {
            window.GM_deleteValue(key);
        }, args.key);
        return {
            content: [{
                type: 'text',
                text: `Value deleted for key: ${args.key}`
            }]
        };
    },

    async gm_notification(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        await page.evaluate((details) => {
            window.GM_notification(details);
        }, args);
        return {
            content: [{
                type: 'text',
                text: 'Notification sent'
            }]
        };
    },

    async gm_setClipboard(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const result = await page.evaluate(({text, info}) => {
            return window.GM_setClipboard(text, info);
        }, args);
        return {
            content: [{
                type: 'text',
                text: result ? 'Text copied to clipboard' : 'Failed to copy text'
            }]
        };
    },

    async gm_xmlhttpRequest(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        const response = await page.evaluate((details) => {
            return window.GM_xmlhttpRequest(details);
        }, args);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response)
            }]
        };
    },

    async intercept_requests(args) {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        log('Setting up request interception:', args);

        await this.stop_intercepting({ patterns: args.patterns });

        try {
            const handler = async (route, request) => {
                const url = request.url();
                const type = request.resourceType();
                log(`Intercepted ${type} request for: ${url}`);

                if (args.types && !args.types.includes(type)) {
                    await route.continue();
                    return;
                }

                switch (args.action) {
                    case 'block':
                        log(`Blocking request: ${url}`);
                        await route.abort();
                        break;

                    case 'modify':
                        log(`Modifying request: ${url}`);
                        await route.continue({
                            headers: {
                                ...request.headers(),
                                'X-Modified-By': 'MCP'
                            }
                        });
                        break;

                    case 'log':
                    default:
                        log(`Logging request: ${url}`);
                        await route.continue();
                }
            };

            for (const pattern of args.patterns) {
                await context.route(pattern, handler);
                activeInterceptions.set(pattern, handler);
            }

            return {
                content: [{
                    type: 'text',
                    text: `Started intercepting requests for patterns: ${args.patterns.join(', ')}`
                }]
            };
        } catch (error) {
            log('Interception setup error:', error);
            throw new McpError(ErrorCode.InternalError, `Failed to setup interception: ${error.message}`);
        }
    },

    async stop_intercepting(args) {
        if (!context) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        log('Stopping request interception');

        try {
            if (args?.patterns) {
                for (const pattern of args.patterns) {
                    const handler = activeInterceptions.get(pattern);
                    if (handler) {
                        await context.unroute(pattern, handler);
                        activeInterceptions.delete(pattern);
                    }
                }
            } else {
                for (const [pattern, handler] of activeInterceptions) {
                    await context.unroute(pattern, handler);
                }
                activeInterceptions.clear();
            }

            return {
                content: [{
                    type: 'text',
                    text: 'Stopped request interception'
                }]
            };
        } catch (error) {
            log('Error stopping interception:', error);
            throw new McpError(ErrorCode.InternalError, `Failed to stop interception: ${error.message}`);
        }
    },

    async click(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        await page.click(args.selector, args);
        return { content: [{ type: 'text', text: `Clicked element: ${args.selector}` }] };
    },

    async type(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        await page.type(args.selector, args.text, { delay: args.delay });
        return { content: [{ type: 'text', text: `Typed text into: ${args.selector}` }] };
    },

    async navigate(args) {
        if (!page) throw new McpError(ErrorCode.InternalError, 'Browser not launched');
        log('Navigating to:', args.url);
        try {
            await page.goto(args.url, { 
                waitUntil: args.waitUntil || 'load',
                timeout: 30000
            });
            return {
                content: [{
                    type: 'text',
                    text: `Navigated to: ${args.url}`
                }]
            };
        } catch (error) {
            log('Navigation error:', error);
            throw new McpError(ErrorCode.InternalError, `Navigation failed: ${error.message}`);
        }
    }
};

// Create server instance
const server = new Server(
    {
        name: 'chrome-debug-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false, subscribe: false },
            resourceTemplates: { listChanged: false }
        },
    }
);

// Set up request handlers
server.setRequestHandler(InitializeRequestSchema, async () => {
    log('Handling initialize request');
    return {
        protocolVersion: '2024-11-05',
        serverInfo: {
            name: 'chrome-debug-mcp',
            version: '1.0.0',
        },
        capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false, subscribe: false },
            resourceTemplates: { listChanged: false }
        }
    };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    log('Handling tools/list request');
    return { tools: TOOLS };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    log('Handling resources/list request');
    return { resources: [] };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    log('Handling resources/templates/list request');
    return { resourceTemplates: [] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    log('Tool request:', request.params.name, request.params.arguments);
    
    const tool = TOOLS.find(t => t.name === request.params.name);
    if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    const handler = handlers[request.params.name];
    if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `No handler for tool: ${request.params.name}`);
    }

    try {
        const result = await handler.call(handlers, request.params.arguments || {});
        log('Tool execution successful:', request.params.name);
        return result;
    } catch (error) {
        log('Tool execution error:', error);
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error.message}`
        );
    }
});

// Handle errors
server.onerror = (error) => {
    log('Server error:', error);
};

// Handle notification for server initialization
server.onnotification = (message) => {
    log('Received notification:', message);
    if (message.method === 'notifications/initialized') {
        log('Sending serverInitialized notification');
        server.sendNotification('notifications/serverInitialized');
    }
};

// Handle cleanup
process.on('SIGINT', async () => {
    log('Cleaning up...');
    if (browser) {
        await browser.close();
    }
    await server.close();
    process.exit(0);
});

// Start server
log('Starting server...');
const transport = new StdioServerTransport();

server.connect(transport)
    .then(() => {
        log('Server running on stdio');
    })
    .catch(error => {
        log('Server startup error:', error);
        process.exit(1);
    });
