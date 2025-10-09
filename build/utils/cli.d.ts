/**
 * CLI argument parsing for Chrome Debug MCP
 * Borrowed from Chrome DevTools MCP design
 */
export type Channel = 'stable' | 'canary' | 'beta' | 'dev';
export interface CLIOptions {
    browserUrl?: string;
    headless: boolean;
    executablePath?: string;
    isolated: boolean;
    channel?: Channel;
    logFile?: string;
    viewport?: {
        width: number;
        height: number;
    };
    proxyServer?: string;
    acceptInsecureCerts?: boolean;
    port?: number;
    transport?: 'stdio' | 'http';
}
export declare const cliOptions: {
    readonly browserUrl: {
        readonly type: "string";
        readonly description: "Connect to a running Chrome instance using port forwarding (e.g., http://localhost:9222)";
        readonly alias: "u";
        readonly coerce: (url: string) => string;
    };
    readonly headless: {
        readonly type: "boolean";
        readonly description: "Whether to run Chrome in headless (no UI) mode";
        readonly default: false;
    };
    readonly executablePath: {
        readonly type: "string";
        readonly description: "Path to custom Chrome executable";
        readonly conflicts: "browserUrl";
        readonly alias: "e";
    };
    readonly isolated: {
        readonly type: "boolean";
        readonly description: "Create a temporary user-data-dir that is automatically cleaned up after browser closes";
        readonly default: false;
    };
    readonly channel: {
        readonly type: "string";
        readonly description: "Specify Chrome channel to use (default: stable)";
        readonly choices: readonly ["stable", "canary", "beta", "dev"];
        readonly conflicts: readonly ["browserUrl", "executablePath"];
    };
    readonly logFile: {
        readonly type: "string";
        readonly description: "Path to a file to write debug logs to (useful for bug reports)";
        readonly alias: "l";
    };
    readonly viewport: {
        readonly type: "string";
        readonly description: "Initial viewport size for Chrome instances (e.g., 1280x720)";
        readonly coerce: (arg: string | undefined) => {
            width: number;
            height: number;
        };
    };
    readonly proxyServer: {
        readonly type: "string";
        readonly description: "Proxy server configuration for Chrome (passed as --proxy-server)";
    };
    readonly acceptInsecureCerts: {
        readonly type: "boolean";
        readonly description: "Ignore errors related to self-signed and expired certificates";
        readonly default: false;
    };
    readonly port: {
        readonly type: "number";
        readonly description: "Port number for HTTP transport mode (default: 31232)";
        readonly default: 31232;
    };
    readonly transport: {
        readonly type: "string";
        readonly description: "Transport mode for MCP server";
        readonly choices: readonly ["stdio", "http"];
        readonly default: "stdio";
    };
};
export declare function parseArguments(version: string, argv?: string[]): CLIOptions;
export declare function logStartupMessage(options: CLIOptions, version: string): void;
//# sourceMappingURL=cli.d.ts.map