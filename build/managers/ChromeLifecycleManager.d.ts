/**
 * Chrome生命周期管理器
 * 正确管理Chrome的启动、连接和清理
 * 核心原则：只关闭自己启动的Chrome实例，不干扰用户Chrome
 */
import type { Browser } from 'puppeteer-core';
export interface ChromeConnectionInfo {
    browser: Browser;
    isOwnedByMCP: boolean;
    connectionType: 'attach' | 'launch';
    startTime: number;
    config: {
        host?: string;
        port?: number;
        browserURL?: string;
        userDataDir?: string;
    };
}
export declare class ChromeLifecycleManager {
    private connectionInfo;
    private static instance;
    /**
     * 检查Chrome是否已经在运行
     */
    isChromeRunning(host?: string, port?: number): Promise<boolean>;
    /**
     * 智能Chrome连接：优先attach，只在必要时launch
     */
    ensureChrome(options?: {
        host?: string;
        port?: number;
        browserURL?: string;
        preferAttach?: boolean;
        launchOptions?: any;
    }): Promise<ChromeConnectionInfo>;
    /**
     * 连接到现有Chrome实例（用户启动的）
     */
    private attachToExistingChrome;
    /**
     * 启动新Chrome实例（MCP拥有）
     */
    private launchNewChrome;
    /**
     * 安全清理：只关闭MCP启动的Chrome
     */
    safeCleanup(): Promise<void>;
    /**
     * 获取当前连接信息
     */
    getConnectionInfo(): ChromeConnectionInfo | null;
    /**
     * 检查Chrome健康状态
     */
    checkHealth(): Promise<{
        connected: boolean;
        isOwnedByMCP: boolean;
        connectionType: string;
        uptime: number;
        targets: number;
    }>;
    /**
     * 单例模式
     */
    static getInstance(): ChromeLifecycleManager;
}
//# sourceMappingURL=ChromeLifecycleManager.d.ts.map