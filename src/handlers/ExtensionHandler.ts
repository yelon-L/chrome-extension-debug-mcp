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
import { ExtensionMessageTracker } from './extension/ExtensionMessageTracker.js';
import { ExtensionTestHandler } from './extension/ExtensionTestHandler.js';
import { ExtensionPerformanceAnalyzer } from './extension/ExtensionPerformanceAnalyzer.js';

// 导入类型
import {
  GetExtensionLogsArgs,
  InjectContentScriptArgs,
  ContentScriptStatusArgs,
  ListExtensionContextsArgs,
  SwitchExtensionContextArgs,
  InspectExtensionStorageArgs,
  ListExtensionsArgs
} from '../types/index.js';
import {
  MonitorExtensionMessagesArgs,
  TrackExtensionAPICallsArgs
} from './extension/ExtensionMessageTracker.js';
import {
  TestExtensionOnMultiplePagesArgs,
  ExtensionTestResult
} from '../types/extension-test-types.js';
import {
  PerformanceAnalysisOptions,
  PerformanceAnalysisResult
} from '../types/performance-types.js';

/**
 * 扩展处理器 - 模块化架构的统一协调器
 */
export class ExtensionHandler {
  private detector: ExtensionDetector;
  private logger: ExtensionLogger;
  private contentScript: ExtensionContentScript;
  private contextManager: ExtensionContextManager;
  private storageManager: ExtensionStorageManager;
  private messageTracker: ExtensionMessageTracker; // Week 3 新增
  private testHandler: ExtensionTestHandler; // Week 4 新增
  private performanceAnalyzer: ExtensionPerformanceAnalyzer; // Phase 1 性能分析

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
    this.messageTracker = new ExtensionMessageTracker(chromeManager, pageManager); // Week 3 新增
    this.testHandler = new ExtensionTestHandler(chromeManager, pageManager); // Week 4 新增
    this.performanceAnalyzer = new ExtensionPerformanceAnalyzer(chromeManager, pageManager); // Phase 1 性能分析
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

  // ===== Week 3 高级调试功能 =====

  /**
   * 监控扩展消息传递
   */
  async monitorExtensionMessages(args: MonitorExtensionMessagesArgs) {
    return await this.messageTracker.monitorExtensionMessages(args);
  }

  /**
   * 追踪扩展API调用
   */
  async trackExtensionAPICalls(args: TrackExtensionAPICallsArgs) {
    return await this.messageTracker.trackExtensionAPICalls(args);
  }

  /**
   * 获取消息监控统计
   */
  getMessageTrackingStats() {
    return this.messageTracker.getMonitoringStats();
  }

  /**
   * 停止消息监控
   */
  stopMessageTracking() {
    return this.messageTracker.stopMonitoring();
  }

  // ===== Week 4 批量测试功能 =====

  /**
   * 在多个页面批量测试扩展
   */
  async testExtensionOnMultiplePages(args: TestExtensionOnMultiplePagesArgs): Promise<ExtensionTestResult> {
    return await this.testHandler.testExtensionOnMultiplePages(args);
  }

  // ===== Phase 1 性能分析功能 =====

  /**
   * 分析扩展性能影响
   */
  async analyzeExtensionPerformance(args: PerformanceAnalysisOptions): Promise<PerformanceAnalysisResult> {
    return await this.performanceAnalyzer.analyzePerformance(args);
  }
}
