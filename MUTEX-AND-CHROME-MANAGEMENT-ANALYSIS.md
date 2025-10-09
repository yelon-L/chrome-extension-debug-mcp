/**
 * Enhanced Chrome Manager - 借鉴Chrome DevTools MCP的优秀设计
 * 解决IPv4/IPv6问题，添加完整的Chrome启动管理
 */

import puppeteer from 'puppeteer-core';
import type { Browser, Target, ConnectOptions, LaunchOptions, ChromeReleaseChannel } from 'puppeteer-core';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[EnhancedChromeManager]', ...args);

export interface LaunchChromeOptions {
  acceptInsecureCerts?: boolean;
  executablePath?: string;
  channel?: 'stable' | 'canary' | 'beta' | 'dev';
  userDataDir?: string;
  headless?: boolean;
  isolated?: boolean;
  viewport?: { width: number; height: number };
  args?: string[];
  logFile?: fs.WriteStream;
}

export class EnhancedChromeManager {
  private browser: Browser | null = null;
  private static instance: EnhancedChromeManager;

  // 借鉴Chrome DevTools MCP的目标过滤
  private targetFilter(target: Target): boolean {
    if (target.url() === 'chrome://newtab/') {
      return true;
    }
    const ignoredPrefixes = ['chrome://', 'chrome-untrusted://', 'devtools://'];
    return !ignoredPrefixes.some(prefix => target.url().startsWith(prefix));
  }

  // 借鉴Chrome DevTools MCP的连接配置
  private getConnectOptions(): ConnectOptions {
    return {
      targetFilter: this.targetFilter.bind(this),
      protocolTimeout: 10_000, // 10秒超时
    };
  }

  /**
   * 方法1: 启动新Chrome实例（借鉴Chrome DevTools MCP）
   * 使用pipe避免网络连接问题
   */
  async launchChrome(options: LaunchChromeOptions = {}): Promise<Browser> {
    const { channel = 'stable', executablePath, headless = false, isolated = false } = options;
    
    log('🚀 [Enhanced Launch] Starting Chrome instance...');
    
    // 智能用户数据目录管理
    let userDataDir = options.userDataDir;
    if (!isolated && !userDataDir) {
      const profileDirName = channel !== 'stable' ? `chrome-profile-${channel}` : 'chrome-profile';
      userDataDir = path.join(
        os.homedir(),
        '.cache',
        'chrome-debug-mcp',
        profileDirName,
      );
      
      await fs.promises.mkdir(userDataDir, { recursive: true });
      log(`📁 [Enhanced Launch] Using profile: ${userDataDir}`);
    }

    // 构建启动参数
    const args: LaunchOptions['args'] = [
      ...(options.args ?? []),
      '--hide-crash-restore-bubble',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];

    // 选择Chrome通道
    let puppeteerChannel: ChromeReleaseChannel | undefined;
    if (!executablePath) {
      puppeteerChannel = channel !== 'stable' ? `chrome-${channel}` as ChromeReleaseChannel : 'chrome';
    }

    try {
      this.browser = await puppeteer.launch({
        ...this.getConnectOptions(),
        channel: puppeteerChannel,
        executablePath,
        defaultViewport: null,
        userDataDir,
        pipe: true,                    // 🔑 关键：使用pipe避免网络问题
        headless,
        args,
        acceptInsecureCerts: options.acceptInsecureCerts,
      });

      // 日志重定向
      if (options.logFile) {
        this.browser.process()?.stderr?.pipe(options.logFile);
        this.browser.process()?.stdout?.pipe(options.logFile);
      }

      // 视口设置
      if (options.viewport) {
        const [page] = await this.browser.pages();
        // @ts-expect-error internal API
        await page?.resize({
          contentWidth: options.viewport.width,
          contentHeight: options.viewport.height,
        });
      }

      log('✅ [Enhanced Launch] Chrome launched successfully with pipe connection');
      return this.browser;

    } catch (error) {
      log('❌ [Enhanced Launch] Failed:', error);
      
      // 借鉴Chrome DevTools MCP的错误处理
      if (userDataDir && [
        'The browser is already running',
        'Target closed',
        'Connection closed'
      ].some(msg => (error as Error).message.includes(msg))) {
        
        throw new McpError(
          ErrorCode.InternalError,
          `Chrome is already running for ${userDataDir}. Use isolated: true to run multiple instances.`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `Failed to launch Chrome: ${error}`);
    }
  }

  /**
   * 方法2: 连接现有Chrome（增强的IPv4/IPv6支持）
   */
  async connectToChrome(browserURL?: string, host: string = 'localhost', port: number = 9222): Promise<Browser> {
    log('🔌 [Enhanced Connect] Connecting to existing Chrome...');

    // 如果没有指定browserURL，智能构建
    if (!browserURL) {
      // 支持IPv4和IPv6的多重尝试
      const candidates = [
        `http://127.0.0.1:${port}`,      // IPv4 localhost
        `http://localhost:${port}`,       // 系统解析的localhost  
        `http://[::1]:${port}`,          // IPv6 localhost
        `http://${host}:${port}`,        // 指定的host
      ];

      for (const candidateURL of candidates) {
        try {
          log(`🔍 [Enhanced Connect] Trying ${candidateURL}...`);
          
          this.browser = await puppeteer.connect({
            ...this.getConnectOptions(),
            browserURL: candidateURL,
            defaultViewport: null,
          });

          log(`✅ [Enhanced Connect] Connected successfully via ${candidateURL}`);
          return this.browser;

        } catch (error) {
          log(`❌ [Enhanced Connect] Failed via ${candidateURL}:`, error.message);
          continue;
        }
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to connect to Chrome on any address. Tried: ${candidates.join(', ')}`
      );
    } else {
      // 使用指定的browserURL
      try {
        this.browser = await puppeteer.connect({
          ...this.getConnectOptions(),
          browserURL,
          defaultViewport: null,
        });

        log(`✅ [Enhanced Connect] Connected via specified URL: ${browserURL}`);
        return this.browser;

      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to connect to Chrome at ${browserURL}: ${error}`
        );
      }
    }
  }

  /**
   * 智能Chrome管理：优先连接，失败时启动
   */
  async ensureChrome(options: LaunchChromeOptions & { 
    preferConnect?: boolean;
    browserURL?: string;
    host?: string;
    port?: number;
  } = {}): Promise<Browser> {
    
    const { preferConnect = true, browserURL, host = 'localhost', port = 9222 } = options;

    // 检查现有连接
    if (this.browser?.connected) {
      log('♻️  [Ensure Chrome] Reusing existing connection');
      return this.browser;
    }

    if (preferConnect) {
      try {
        log('🔌 [Ensure Chrome] Attempting to connect first...');
        return await this.connectToChrome(browserURL, host, port);
      } catch (error) {
        log('⚠️  [Ensure Chrome] Connection failed, falling back to launch...');
      }
    }

    log('🚀 [Ensure Chrome] Launching new Chrome instance...');
    return await this.launchChrome(options);
  }

  /**
   * 优雅关闭Chrome
   */
  async closeChrome(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        log('✅ [Enhanced Close] Chrome closed gracefully');
      } catch (error) {
        log('⚠️  [Enhanced Close] Force closing Chrome process');
        this.browser.process()?.kill('SIGTERM');
      } finally {
        this.browser = null;
      }
    }
  }

  /**
   * 获取当前浏览器实例
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * 检查Chrome健康状态
   */
  async checkHealth(): Promise<{ connected: boolean; targets: number; version?: string }> {
    if (!this.browser?.connected) {
      return { connected: false, targets: 0 };
    }

    try {
      const targets = await this.browser.targets();
      const version = await this.browser.version();
      
      return {
        connected: true,
        targets: targets.length,
        version
      };
    } catch (error) {
      return { connected: false, targets: 0 };
    }
  }

  /**
   * 单例模式
   */
  static getInstance(): EnhancedChromeManager {
    if (!EnhancedChromeManager.instance) {
      EnhancedChromeManager.instance = new EnhancedChromeManager();
    }
    return EnhancedChromeManager.instance;
  }
}
