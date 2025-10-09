/**
 * Chrome Connection Management Module
 * Handles Chrome launching, CDP connection, and console monitoring
 */
type Browser = any;
import { LaunchChromeArgs, AttachArgs, ExtensionLogEntry } from '../types/index.js';
interface Client {
    close(): Promise<void>;
    send(method: string, params?: any): Promise<any>;
    on(event: string, handler: (params: any) => void): void;
    Target: any;
    Runtime: any;
    Page: any;
    Console: any;
}
export declare class ChromeManager {
    private browser;
    private cdpClient;
    private connectionRetryCount;
    private maxRetries;
    /**
     * 安全的CDP操作执行，包含重试机制
     */
    executeCdpOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<T>;
    private consoleLogs;
    private structuredLogs;
    private attachedSessions;
    private targetInfo;
    private isOwnedByMCP;
    private connectionType;
    private chromeProcessPid;
    private connectionHealth;
    private healthCheckInterval;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private lastHealthCheck;
    private connectionConfig;
    private extensionCache;
    constructor();
    getBrowser(): Browser | null;
    getCdpClient(): Client | null;
    getConsoleLogs(): string[];
    getStructuredLogs(): ExtensionLogEntry[];
    clearConsoleLogs(): void;
    getConnectionHealth(): {
        status: string;
        lastCheck: number;
        reconnectAttempts: number;
        uptime: number;
    };
    discoverChromePort(startPort?: number): Promise<number>;
    private performHealthCheck;
    private attemptReconnect;
    private startHealthMonitoring;
    /**
     * Launch Chrome with specified configurations
     */
    launchChrome(args: LaunchChromeArgs): Promise<string>;
    /**
     * Attach to an existing Chrome instance
     */
    attachToChrome(args: AttachArgs): Promise<string>;
    /**
     * 增强版Chrome连接 - 包含自动重试、健康检查、端口发现
     */
    attachToChromeEnhanced(args: AttachArgs): Promise<string>;
    private preConnectionCheck;
    /**
     * Set up CDP client and console monitoring
     */
    private setupCdpClient;
    /**
     * Set up console monitoring
     */
    private setupConsoleMonitoring;
    /**
     * Set up target discovery for extensions
     */
    private setupTargetDiscovery;
    /**
     * Hook Puppeteer page console events to aggregate logs (page/content_script)
     * This complements CDP-based session logging and ensures we capture page logs reliably.
     */
    private hookPuppeteerConsole;
    /**
     * Inject userscript into a page
     */
    private injectUserscript;
    /**
     * 🔑 安全清理：只关闭MCP启动的Chrome，不干扰用户Chrome
     */
    cleanup(): Promise<void>;
    private setupTargetDiscoveryEnhanced;
    private warmupExtensionCache;
    getCachedExtensions(): Array<{
        id: string;
        targetId: string;
        url: string;
        title: string;
        type: string;
        lastUpdated: number;
    }>;
    private extractExtensionId;
}
export {};
//# sourceMappingURL=ChromeManager.d.ts.map