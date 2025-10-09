/**
 * 扩展处理器集成模块
 * 整合所有扩展相关功能的统一入口
 */

import { ChromeManager } from '../managers/ChromeManager.js';
import { PageManager } from '../managers/PageManager.js';

// 导入所有扩展模块
import { ExtensionDetector } from './extension/ExtensionDetector.js';
import { ExtensionLogger } from './extension/ExtensionLogger.js';
import { ExtensionContentScript } from './extension/ExtensionContentScript.js';
import { ExtensionContextManager } from './extension/ExtensionContextManager.js';
import { ExtensionStorageManager } from './extension/ExtensionStorageManager.js';

// 导入类型
import {
  ListExtensionsArgs,
  GetExtensionLogsArgs,
  InjectContentScriptArgs,
  ContentScriptStatusArgs,
  ListExtensionContextsArgs,
  SwitchExtensionContextArgs,
  InspectExtensionStorageArgs
} from '../types/index.js';

/**
 * 扩展处理器 - 模块化架构的统一协调器
 */
export class ExtensionHandler {
  private detector: ExtensionDetector;
  private logger: ExtensionLogger;
  private contentScript: ExtensionContentScript;
  private contextManager: ExtensionContextManager;
  private storageManager: ExtensionStorageManager;

  constructor(
    private chromeManager: ChromeManager,
    private pageManager: PageManager
  ) {
    // 初始化所有扩展模块
    this.detector = new ExtensionDetector(chromeManager);
    this.logger = new ExtensionLogger(chromeManager);
    this.contentScript = new ExtensionContentScript(chromeManager, pageManager);
    this.contextManager = new ExtensionContextManager(chromeManager, pageManager, this.contentScript);
    this.storageManager = new ExtensionStorageManager(chromeManager, pageManager, this.contextManager);
  }

  /**
   * 列出Chrome扩展
   */
  async listExtensions(args: ListExtensionsArgs = {}) {
    return await this.detector.listExtensions(args);
  }

  /**
   * 获取扩展日志
   */
  async getExtensionLogs(args: GetExtensionLogsArgs) {
    return await this.logger.getExtensionLogs(args);
  }

  /**
   * 注入内容脚本
   */
  async injectContentScript(args: InjectContentScriptArgs) {
    return await this.contentScript.injectContentScript(args);
  }

  /**
   * 检查内容脚本状态
   */
  async contentScriptStatus(args: ContentScriptStatusArgs) {
    return await this.contentScript.contentScriptStatus(args);
  }

  /**
   * 列出扩展上下文
   */
  async listExtensionContexts(args: ListExtensionContextsArgs = {}) {
    return await this.contextManager.listExtensionContexts(args);
  }

  /**
   * 切换扩展上下文
   */
  async switchExtensionContext(args: SwitchExtensionContextArgs) {
    return await this.contextManager.switchExtensionContext(args);
  }

  /**
   * 检查扩展存储
   */
  async inspectExtensionStorage(args: InspectExtensionStorageArgs) {
    return await this.storageManager.inspectExtensionStorage(args);
  }
}
