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
import { ExtensionNetworkMonitor } from './extension/ExtensionNetworkMonitor.js';
import { ExtensionImpactMeasurer } from './extension/ExtensionImpactMeasurer.js';

// Phase 4: 交互与快照增强
import { DialogManager } from './interaction/DialogManager.js';
import { ExtensionLogSearcher } from './interaction/ExtensionLogSearcher.js';
import { ElementLocator } from './interaction/ElementLocator.js';
import { FormHandler } from './interaction/FormHandler.js';
import { PageStateMonitor } from './interaction/PageStateMonitor.js';

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
import {
  TrackExtensionNetworkArgs,
  NetworkAnalysis,
  NetworkMonitoringStats
} from '../types/network-types.js';
import {
  MeasureExtensionImpactArgs,
  ExtensionImpactReport
} from '../types/impact-types.js';

/**
 * 扩展处理器 - 模块化架构的统一协调器
 */
export class ExtensionHandler {
  private logger: ExtensionLogger;
  private contentScript: ExtensionContentScript;
  private contextManager: ExtensionContextManager;
  private storageManager: ExtensionStorageManager;
  private messageTracker: ExtensionMessageTracker; // Week 3 新增
  private testHandler: ExtensionTestHandler;           // Week 3 测试辅助
  private performanceAnalyzer: ExtensionPerformanceAnalyzer; // Phase 1.1 性能分析
  private networkMonitor: ExtensionNetworkMonitor; // Phase 1.2 网络监控
  private impactMeasurer: ExtensionImpactMeasurer; // Phase 1.3 综合影响
  
  // Phase 4: 交互与快照增强
  private dialogManager: DialogManager;
  private logSearcher: ExtensionLogSearcher;
  private elementLocator: ElementLocator;
  private formHandler: FormHandler;
  private pageStateMonitor: PageStateMonitor;

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
    this.testHandler = new ExtensionTestHandler(chromeManager, pageManager); // Week 3 测试辅助
    this.performanceAnalyzer = new ExtensionPerformanceAnalyzer(chromeManager, pageManager); // Phase 1.1 性能分析
    this.networkMonitor = new ExtensionNetworkMonitor(chromeManager, pageManager); // Phase 1.2 网络监控
    this.impactMeasurer = new ExtensionImpactMeasurer(chromeManager, pageManager); // Phase 1.3 综合影响
    
    // Phase 4: 交互与快照增强
    this.dialogManager = new DialogManager(chromeManager, pageManager);
    this.logSearcher = new ExtensionLogSearcher(chromeManager);
    this.elementLocator = new ElementLocator(chromeManager, pageManager);
    this.formHandler = new FormHandler(chromeManager, pageManager);
    this.pageStateMonitor = new PageStateMonitor(chromeManager, pageManager, this.dialogManager);
  }

  // 添加缺失的 detector 属性
  private detector: ExtensionDetector;

  /**
   * 列出Chrome扩展
   */
  async listExtensions(args: ListExtensionsArgs) {
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

  /**
   * 追踪扩展网络请求
   */
  async trackExtensionNetwork(args: TrackExtensionNetworkArgs): Promise<NetworkAnalysis> {
    return await this.networkMonitor.trackExtensionNetwork(args);
  }

  /**
   * 获取网络监控状态
   */
  getNetworkMonitoringStats(extensionId: string): NetworkMonitoringStats {
    return this.networkMonitor.getMonitoringStats(extensionId);
  }

  /**
   * 清理网络监控数据
   */
  clearNetworkMonitoringData(extensionId: string): void {
    return this.networkMonitor.clearMonitoringData(extensionId);
  }

  /**
   * 测量扩展综合影响
   */
  async measureExtensionImpact(args: MeasureExtensionImpactArgs): Promise<ExtensionImpactReport> {
    return await this.impactMeasurer.measureImpact(args);
  }

  // ===== Phase 4: 交互与快照增强 =====

  /**
   * 检测页面弹窗
   */
  async detectDialogs() {
    return await this.dialogManager.detectDialogs();
  }

  /**
   * 处理弹窗
   */
  async handleDialog(options: any) {
    return await this.dialogManager.handleDialog(options);
  }

  /**
   * 等待弹窗出现
   */
  async waitForDialog(timeout: number = 10000) {
    return await this.dialogManager.waitForDialog(timeout);
  }

  /**
   * 搜索扩展日志
   */
  async searchExtensionLogs(options: any) {
    return await this.logSearcher.searchLogs(options);
  }

  /**
   * 导出扩展日志
   */
  async exportExtensionLogs(options: any) {
    return await this.logSearcher.exportLogs(options);
  }

  /**
   * 分析日志模式
   */
  async analyzeLogPatterns(options: any) {
    return await this.logSearcher.analyzeLogPatterns(options);
  }

  /**
   * 生成稳定的元素选择器
   */
  async generateStableSelector(options: any) {
    return await this.elementLocator.generateStableSelector(options);
  }

  /**
   * 按内容查找元素
   */
  async findElementByContent(options: any) {
    return await this.elementLocator.findElementByContent(options);
  }

  /**
   * 分析DOM稳定性
   */
  async analyzeDOMStability(options: any) {
    return await this.elementLocator.analyzeDOMStability(options);
  }

  /**
   * 分析表单结构
   */
  async analyzeForms() {
    return await this.formHandler.analyzeForms();
  }

  /**
   * 批量填充表单
   */
  async fillFormBulk(options: any) {
    return await this.formHandler.fillFormBulk(options);
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(options: any) {
    return await this.formHandler.handleFileUpload(options);
  }

  /**
   * 处理复杂控件
   */
  async handleComplexControl(options: any) {
    return await this.formHandler.handleComplexControl(options);
  }

  /**
   * 检测页面状态
   */
  async detectPageState() {
    return await this.pageStateMonitor.detectPageState();
  }

  /**
   * 开始监控页面状态
   */
  async startPageStateMonitoring(options: any) {
    return await this.pageStateMonitor.startMonitoring(options);
  }

  /**
   * 停止监控页面状态
   */
  stopPageStateMonitoring() {
    this.pageStateMonitor.stopMonitoring();
    return { success: true, message: 'Page state monitoring stopped' };
  }

  /**
   * 追踪扩展API调用
   */
  async trackExtensionApiCalls(options: any) {
    return await this.messageTracker.trackExtensionAPICalls(options);
  }
}
