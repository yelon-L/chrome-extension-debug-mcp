/**
 * CLI argument parsing for Chrome Debug MCP
 * Borrowed from Chrome DevTools MCP design
 */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
export const cliOptions = {
    browserUrl: {
        type: 'string',
        description: 'Connect to a running Chrome instance using port forwarding (e.g., http://localhost:9222)',
        alias: 'u',
        coerce: (url) => {
            new URL(url); // Validate URL format
            return url;
        },
    },
    headless: {
        type: 'boolean',
        description: 'Whether to run Chrome in headless (no UI) mode',
        default: false,
    },
    executablePath: {
        type: 'string',
        description: 'Path to custom Chrome executable',
        conflicts: 'browserUrl',
        alias: 'e',
    },
    isolated: {
        type: 'boolean',
        description: 'Create a temporary user-data-dir that is automatically cleaned up after browser closes',
        default: false,
    },
    channel: {
        type: 'string',
        description: 'Specify Chrome channel to use (default: stable)',
        choices: ['stable', 'canary', 'beta', 'dev'],
        conflicts: ['browserUrl', 'executablePath'],
    },
    logFile: {
        type: 'string',
        description: 'Path to a file to write debug logs to (useful for bug reports)',
        alias: 'l',
    },
    viewport: {
        type: 'string',
        description: 'Initial viewport size for Chrome instances (e.g., 1280x720)',
        coerce: (arg) => {
            if (arg === undefined) {
                return;
            }
            const [width, height] = arg.split('x').map(Number);
            if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
                throw new Error('Invalid viewport format. Expected format: 1280x720');
            }
            return { width, height };
        },
    },
    proxyServer: {
        type: 'string',
        description: 'Proxy server configuration for Chrome (passed as --proxy-server)',
    },
    acceptInsecureCerts: {
        type: 'boolean',
        description: 'Ignore errors related to self-signed and expired certificates',
        default: false,
    },
    port: {
        type: 'number',
        description: 'Port number for HTTP transport mode (default: 31232)',
        default: 31232,
    },
    transport: {
        type: 'string',
        description: 'Transport mode for MCP server',
        choices: ['stdio', 'http'],
        default: 'stdio',
    },
};
export function parseArguments(version, argv = process.argv) {
    const parser = yargs(hideBin(argv))
        .scriptName('chrome-debug-mcp')
        .version(version)
        .options(cliOptions)
        .check((args) => {
        // Set default channel if none specified and not using browserUrl or executablePath
        if (!args.channel && !args.browserUrl && !args.executablePath) {
            args.channel = 'stable';
        }
        return true;
    })
        .example([
        ['$0', 'Start with default stdio transport and stable Chrome'],
        ['$0 --transport http --port 8080', 'Start HTTP server on port 8080'],
        ['$0 --browserUrl http://127.0.0.1:9222', 'Connect to existing Chrome instance'],
        ['$0 --channel beta --headless', 'Use Chrome Beta in headless mode'],
        ['$0 --channel canary --isolated', 'Use Chrome Canary with isolated profile'],
        ['$0 --executablePath /opt/chrome/chrome', 'Use custom Chrome executable'],
        ['$0 --viewport 1920x1080 --logFile /tmp/debug.log', 'Custom viewport with logging'],
        ['$0 --proxyServer http://proxy:8080', 'Use proxy server'],
        ['$0 --help', 'Show this help message'],
    ])
        .help()
        .wrap(Math.min(120, process.stdout.columns || 80));
    return parser.parseSync();
}
export function logStartupMessage(options, version) {
    console.error(`🚀 Chrome Debug MCP Server v${version}`);
    console.error(`📊 Configuration:`);
    console.error(`   Transport: ${options.transport}`);
    if (options.browserUrl) {
        console.error(`   Browser: Connect to ${options.browserUrl}`);
    }
    else if (options.executablePath) {
        console.error(`   Browser: Custom executable at ${options.executablePath}`);
    }
    else {
        console.error(`   Browser: Launch Chrome ${options.channel || 'stable'}`);
    }
    if (options.headless) {
        console.error(`   Mode: Headless`);
    }
    if (options.isolated) {
        console.error(`   Profile: Isolated (temporary)`);
    }
    if (options.viewport) {
        console.error(`   Viewport: ${options.viewport.width}x${options.viewport.height}`);
    }
    if (options.port && options.transport === 'http') {
        console.error(`   Port: ${options.port}`);
    }
    console.error(`✨ Enhanced features: Mutex protection, 10s timeout, Target filtering`);
}
//# sourceMappingURL=cli.js.map