/**
 * 扩展处理器集成模块
 * 整合所有扩展相关功能的统一入口
 */
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
// Quick Debug Handler
import { QuickDebugHandler } from './QuickDebugHandler.js';
/**
 * 扩展处理器 - 模块化架构的统一协调器
 */
export class ExtensionHandler {
    chromeManager;
    pageManager;
    logger;
    contentScript;
    contextManager;
    storageManager;
    messageTracker; // Week 3 新增
    testHandler; // Week 3 测试辅助
    performanceAnalyzer; // Phase 1.1 性能分析
    networkMonitor; // Phase 1.2 网络监控
    impactMeasurer; // Phase 1.3 综合影响
    emulator; // Phase 1.2 设备模拟 (ExtensionEmulator)
    // Phase 4: 交互与快照增强
    dialogManager;
    logSearcher;
    elementLocator;
    formHandler;
    pageStateMonitor;
    // Quick Debug Handler
    quickDebugHandler;
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
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
        // Lazy load emulator to avoid circular dependencies
        this.emulator = null; // Will be initialized on first use
        // Phase 4: 交互与快照增强
        this.dialogManager = new DialogManager(chromeManager, pageManager);
        this.logSearcher = new ExtensionLogSearcher(chromeManager);
        this.elementLocator = new ElementLocator(chromeManager, pageManager);
        this.formHandler = new FormHandler(chromeManager, pageManager);
        this.pageStateMonitor = new PageStateMonitor(chromeManager, pageManager, this.dialogManager);
        // 初始化Quick Debug Handler
        this.quickDebugHandler = new QuickDebugHandler(this);
    }
    // 添加缺失的 detector 属性
    detector;
    /**
     * 列出Chrome扩展
     */
    async listExtensions(args) {
        return await this.detector.listExtensions(args);
    }
    /**
     * 获取扩展日志
     */
    async getExtensionLogs(args) {
        return await this.logger.getExtensionLogs(args);
    }
    /**
     * 注入内容脚本
     */
    async injectContentScript(args) {
        return await this.contentScript.injectContentScript(args);
    }
    /**
     * 检查内容脚本状态
     */
    async contentScriptStatus(args) {
        return await this.contentScript.contentScriptStatus(args);
    }
    /**
     * 列出扩展上下文
     */
    async listExtensionContexts(args = {}) {
        return await this.contextManager.listExtensionContexts(args);
    }
    /**
     * 切换扩展上下文
     */
    async switchExtensionContext(args) {
        return await this.contextManager.switchExtensionContext(args);
    }
    /**
     * 检查扩展存储
     */
    async inspectExtensionStorage(args) {
        return await this.storageManager.inspectExtensionStorage(args);
    }
    // ===== Week 3 高级调试功能 =====
    /**
     * 监控扩展消息传递
     */
    async monitorExtensionMessages(args) {
        return await this.messageTracker.monitorExtensionMessages(args);
    }
    /**
     * 追踪扩展API调用
     */
    async trackExtensionAPICalls(args) {
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
    async testExtensionOnMultiplePages(args) {
        return await this.testHandler.testExtensionOnMultiplePages(args);
    }
    // ===== Phase 1 性能分析功能 =====
    /**
     * 分析扩展性能影响
     */
    async analyzeExtensionPerformance(args) {
        return await this.performanceAnalyzer.analyzePerformance(args);
    }
    async getPerformanceInsight(insightName) {
        return await this.performanceAnalyzer.getPerformanceInsight(insightName);
    }
    async listPerformanceInsights() {
        return await this.performanceAnalyzer.listPerformanceInsights();
    }
    /**
     * 初始化emulator（懒加载）
     */
    async getEmulator() {
        if (!this.emulator) {
            const { ExtensionEmulator } = await import('./extension/ExtensionEmulator.js');
            this.emulator = new ExtensionEmulator(this.chromeManager, this.pageManager);
        }
        return this.emulator;
    }
    /**
     * CPU节流模拟
     */
    async emulateCPU(args) {
        const emulator = await this.getEmulator();
        return await emulator.emulateCPU(args);
    }
    /**
     * 网络条件模拟
     */
    async emulateNetwork(args) {
        const emulator = await this.getEmulator();
        return await emulator.emulateNetwork(args);
    }
    /**
     * 批量条件测试
     */
    async testUnderConditions(args) {
        const emulator = await this.getEmulator();
        return await emulator.batchTest(args);
    }
    /**
     * 重置模拟条件
     */
    async resetEmulation() {
        const emulator = await this.getEmulator();
        return await emulator.resetEmulation();
    }
    /**
     * 追踪扩展网络请求
     */
    async trackExtensionNetwork(args) {
        return await this.networkMonitor.trackExtensionNetwork(args);
    }
    /**
     * 获取网络监控状态
     */
    getNetworkMonitoringStats(extensionId) {
        return this.networkMonitor.getMonitoringStats(extensionId);
    }
    /**
     * 清理网络监控数据
     */
    clearNetworkMonitoringData(extensionId) {
        return this.networkMonitor.clearMonitoringData(extensionId);
    }
    /**
     * 测量扩展综合影响
     */
    async measureExtensionImpact(args) {
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
    async handleDialog(options) {
        return await this.dialogManager.handleDialog(options);
    }
    /**
     * 等待弹窗出现
     */
    async waitForDialog(timeout = 10000) {
        return await this.dialogManager.waitForDialog(timeout);
    }
    /**
     * 搜索扩展日志
     */
    async searchExtensionLogs(options) {
        return await this.logSearcher.searchLogs(options);
    }
    /**
     * 导出扩展日志
     */
    async exportExtensionLogs(options) {
        return await this.logSearcher.exportLogs(options);
    }
    /**
     * 分析日志模式
     */
    async analyzeLogPatterns(options) {
        return await this.logSearcher.analyzeLogPatterns(options);
    }
    /**
     * 生成稳定的元素选择器
     */
    async generateStableSelector(options) {
        return await this.elementLocator.generateStableSelector(options);
    }
    /**
     * 按内容查找元素
     */
    async findElementByContent(options) {
        return await this.elementLocator.findElementByContent(options);
    }
    /**
     * 分析DOM稳定性
     */
    async analyzeDOMStability(options) {
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
    async fillFormBulk(options) {
        return await this.formHandler.fillFormBulk(options);
    }
    /**
     * 处理文件上传
     */
    async handleFileUpload(options) {
        return await this.formHandler.handleFileUpload(options);
    }
    /**
     * 处理复杂控件
     */
    async handleComplexControl(options) {
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
    async startPageStateMonitoring(options) {
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
    async trackExtensionApiCalls(options) {
        return await this.messageTracker.trackExtensionAPICalls(options);
    }
    // ===== 快捷调试工具 =====
    /**
     * 快速扩展调试（组合工具）
     */
    async quickExtensionDebug(args) {
        return await this.quickDebugHandler.quickExtensionDebug(args);
    }
    /**
     * 快速性能检测（组合工具）
     */
    async quickPerformanceCheck(args) {
        return await this.quickDebugHandler.quickPerformanceCheck(args);
    }
    /**
     * 导出网络活动为HAR格式
     */
    async exportExtensionNetworkHAR(args) {
        return await this.networkMonitor.exportHAR(args);
    }
}
//# sourceMappingURL=ExtensionHandler.js.map