/**
 * Chrome生命周期管理器
 * 正确管理Chrome的启动、连接和清理
 * 核心原则：只关闭自己启动的Chrome实例，不干扰用户Chrome
 */
import puppeteer from 'puppeteer-core';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
const DEBUG = true;
const log = (...args) => DEBUG && console.error('[ChromeLifecycleManager]', ...args);
export class ChromeLifecycleManager {
    connectionInfo = null;
    static instance;
    /**
     * 检查Chrome是否已经在运行
     */
    async isChromeRunning(host = 'localhost', port = 9222) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`http://${host}:${port}/json/version`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 智能Chrome连接：优先attach，只在必要时launch
     */
    async ensureChrome(options = {}) {
        const { host = 'localhost', port = 9222, preferAttach = true } = options;
        // 如果已有连接且有效，直接返回
        if (this.connectionInfo && this.connectionInfo.browser.connected) {
            log('♻️  [Lifecycle] Reusing existing Chrome connection');
            return this.connectionInfo;
        }
        // 策略1: 优先尝试连接现有Chrome
        if (preferAttach && await this.isChromeRunning(host, port)) {
            try {
                log('🔌 [Lifecycle] Attempting to attach to existing Chrome...');
                const browser = await this.attachToExistingChrome(host, port, options.browserURL);
                this.connectionInfo = {
                    browser,
                    isOwnedByMCP: false, // 🔑 不是MCP启动的，不应该关闭
                    connectionType: 'attach',
                    startTime: Date.now(),
                    config: { host, port, browserURL: options.browserURL }
                };
                log(`✅ [Lifecycle] Successfully attached to existing Chrome (PID: ${browser.process()?.pid || 'unknown'})`);
                log(`🔒 [Lifecycle] Chrome is NOT owned by MCP - will not be closed on cleanup`);
                return this.connectionInfo;
            }
            catch (error) {
                log('⚠️  [Lifecycle] Failed to attach to existing Chrome:', error.message);
            }
        }
        // 策略2: 启动新Chrome实例
        log('🚀 [Lifecycle] Launching new Chrome instance...');
        const browser = await this.launchNewChrome(options.launchOptions);
        this.connectionInfo = {
            browser,
            isOwnedByMCP: true, // 🔑 MCP启动的，可以安全关闭
            connectionType: 'launch',
            startTime: Date.now(),
            config: { ...options.launchOptions }
        };
        log(`✅ [Lifecycle] Successfully launched new Chrome (PID: ${browser.process()?.pid || 'unknown'})`);
        log(`🔒 [Lifecycle] Chrome is owned by MCP - will be properly closed on cleanup`);
        return this.connectionInfo;
    }
    /**
     * 连接到现有Chrome实例（用户启动的）
     */
    async attachToExistingChrome(host, port, browserURL) {
        const candidates = [
            browserURL,
            `http://${host}:${port}`,
            `http://127.0.0.1:${port}`,
            `http://localhost:${port}`,
            `http://[::1]:${port}`
        ].filter(Boolean);
        let lastError = null;
        for (const url of candidates) {
            try {
                log(`🔍 [Lifecycle] Trying to connect to ${url}...`);
                const browser = await puppeteer.connect({
                    browserURL: url,
                    defaultViewport: null,
                    targetFilter: (target) => {
                        // 过滤Chrome内部页面
                        const ignoredPrefixes = ['chrome://', 'devtools://', 'chrome-untrusted://'];
                        return !ignoredPrefixes.some(prefix => target.url().startsWith(prefix));
                    },
                    protocolTimeout: 10000
                });
                log(`✅ [Lifecycle] Connected successfully via ${url}`);
                return browser;
            }
            catch (error) {
                lastError = error;
                log(`❌ [Lifecycle] Failed to connect via ${url}: ${error.message}`);
            }
        }
        throw new McpError(ErrorCode.InternalError, `Failed to attach to Chrome on any URL. Last error: ${lastError?.message}`);
    }
    /**
     * 启动新Chrome实例（MCP拥有）
     */
    async launchNewChrome(options = {}) {
        const defaultArgs = [
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--remote-debugging-port=0', // 动态端口，避免冲突
            ...(options.args || [])
        ];
        try {
            const browser = await puppeteer.launch({
                headless: options.headless || false,
                args: defaultArgs,
                executablePath: options.executablePath,
                userDataDir: options.userDataDir,
                defaultViewport: null,
                targetFilter: (target) => {
                    const ignoredPrefixes = ['chrome://', 'devtools://', 'chrome-untrusted://'];
                    return !ignoredPrefixes.some(prefix => target.url().startsWith(prefix));
                },
                protocolTimeout: 10000
            });
            return browser;
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to launch Chrome: ${error.message}`);
        }
    }
    /**
     * 安全清理：只关闭MCP启动的Chrome
     */
    async safeCleanup() {
        if (!this.connectionInfo) {
            log('ℹ️  [Lifecycle] No Chrome connection to clean up');
            return;
        }
        const { browser, isOwnedByMCP, connectionType } = this.connectionInfo;
        if (!isOwnedByMCP) {
            // 🔑 不是MCP启动的Chrome，只断开连接，不关闭
            log('🔌 [Lifecycle] Disconnecting from user\'s Chrome (NOT closing it)');
            log(`   Connection type: ${connectionType}`);
            log(`   Chrome will continue running for user`);
            try {
                await browser.disconnect();
                log('✅ [Lifecycle] Safely disconnected from user\'s Chrome');
            }
            catch (error) {
                log('⚠️  [Lifecycle] Error during disconnect (Chrome may already be closed):', error.message);
            }
        }
        else {
            // 🔑 MCP启动的Chrome，可以安全关闭
            log('🛑 [Lifecycle] Closing MCP-owned Chrome instance');
            log(`   Connection type: ${connectionType}`);
            log(`   PID: ${browser.process()?.pid || 'unknown'}`);
            try {
                await browser.close();
                log('✅ [Lifecycle] Successfully closed MCP-owned Chrome');
            }
            catch (error) {
                log('⚠️  [Lifecycle] Error during Chrome closure, force killing process');
                try {
                    browser.process()?.kill('SIGTERM');
                    setTimeout(() => {
                        if (browser.process() && !browser.process()?.killed) {
                            browser.process()?.kill('SIGKILL');
                        }
                    }, 5000);
                }
                catch (killError) {
                    log('❌ [Lifecycle] Failed to kill Chrome process:', killError.message);
                }
            }
        }
        this.connectionInfo = null;
    }
    /**
     * 获取当前连接信息
     */
    getConnectionInfo() {
        return this.connectionInfo;
    }
    /**
     * 检查Chrome健康状态
     */
    async checkHealth() {
        if (!this.connectionInfo || !this.connectionInfo.browser.connected) {
            return {
                connected: false,
                isOwnedByMCP: false,
                connectionType: 'none',
                uptime: 0,
                targets: 0
            };
        }
        try {
            const targets = await this.connectionInfo.browser.targets();
            const uptime = Date.now() - this.connectionInfo.startTime;
            return {
                connected: true,
                isOwnedByMCP: this.connectionInfo.isOwnedByMCP,
                connectionType: this.connectionInfo.connectionType,
                uptime,
                targets: targets.length
            };
        }
        catch (error) {
            return {
                connected: false,
                isOwnedByMCP: this.connectionInfo.isOwnedByMCP,
                connectionType: this.connectionInfo.connectionType,
                uptime: Date.now() - this.connectionInfo.startTime,
                targets: 0
            };
        }
    }
    /**
     * 单例模式
     */
    static getInstance() {
        if (!ChromeLifecycleManager.instance) {
            ChromeLifecycleManager.instance = new ChromeLifecycleManager();
        }
        return ChromeLifecycleManager.instance;
    }
}
//# sourceMappingURL=ChromeLifecycleManager.js.map