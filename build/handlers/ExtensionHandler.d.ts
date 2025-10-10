/**
 * 扩展处理器集成模块
 * 整合所有扩展相关功能的统一入口
 */
import { ChromeManager } from '../managers/ChromeManager.js';
import { PageManager } from '../managers/PageManager.js';
import { GetExtensionLogsArgs, InjectContentScriptArgs, ContentScriptStatusArgs, ListExtensionContextsArgs, SwitchExtensionContextArgs, InspectExtensionStorageArgs, ListExtensionsArgs } from '../types/index.js';
import { MonitorExtensionMessagesArgs, TrackExtensionAPICallsArgs } from './extension/ExtensionMessageTracker.js';
import { TestExtensionOnMultiplePagesArgs, ExtensionTestResult } from '../types/extension-test-types.js';
import { PerformanceAnalysisOptions, PerformanceAnalysisResult } from '../types/performance-types.js';
import { TrackExtensionNetworkArgs, NetworkAnalysis, NetworkMonitoringStats } from '../types/network-types.js';
import { MeasureExtensionImpactArgs, ExtensionImpactReport } from '../types/impact-types.js';
/**
 * 扩展处理器 - 模块化架构的统一协调器
 */
export declare class ExtensionHandler {
    private chromeManager;
    private pageManager;
    private logger;
    private contentScript;
    private contextManager;
    private storageManager;
    private messageTracker;
    private testHandler;
    private performanceAnalyzer;
    private networkMonitor;
    private impactMeasurer;
    private emulator;
    private dialogManager;
    private logSearcher;
    private elementLocator;
    private formHandler;
    private pageStateMonitor;
    private quickDebugHandler;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    private detector;
    /**
     * 列出Chrome扩展
     */
    listExtensions(args: ListExtensionsArgs): Promise<any[]>;
    /**
     * 获取扩展日志
     */
    getExtensionLogs(args: GetExtensionLogsArgs): Promise<import("../types/index.js").ExtensionLogsResponse>;
    /**
     * 注入内容脚本
     */
    injectContentScript(args: InjectContentScriptArgs): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    /**
     * 检查内容脚本状态
     */
    contentScriptStatus(args: ContentScriptStatusArgs): Promise<{
        results: import("./extension/ExtensionContentScript.js").ContentScriptStatusResult[];
    }>;
    /**
     * 列出扩展上下文
     */
    listExtensionContexts(args?: ListExtensionContextsArgs): Promise<import("../types/context-types.js").ListExtensionContextsResponse>;
    /**
     * 切换扩展上下文
     */
    switchExtensionContext(args: SwitchExtensionContextArgs): Promise<import("../types/context-types.js").SwitchExtensionContextResponse>;
    /**
     * 检查扩展存储
     */
    inspectExtensionStorage(args: InspectExtensionStorageArgs): Promise<import("../types/context-types.js").InspectExtensionStorageResponse>;
    /**
     * 监控扩展消息传递
     */
    monitorExtensionMessages(args: MonitorExtensionMessagesArgs): Promise<{
        success: boolean;
        message: string;
        targets: number;
        monitoringTypes: ("runtime" | "tabs" | "external")[];
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        message?: undefined;
        targets?: undefined;
        monitoringTypes?: undefined;
    }>;
    /**
     * 追踪扩展API调用
     */
    trackExtensionAPICalls(args: TrackExtensionAPICallsArgs): Promise<{
        success: boolean;
        message: string;
        targets: number;
        categories: ("storage" | "runtime" | "tabs" | "permissions" | "webRequest" | "alarms")[];
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        message?: undefined;
        targets?: undefined;
        categories?: undefined;
    }>;
    /**
     * 获取消息监控统计
     */
    getMessageTrackingStats(): {
        isMonitoring: boolean;
        totalMessages: number;
        totalAPICalls: number;
        messagesByType: Record<string, number>;
        apiCallsByCategory: Record<string, number>;
    };
    /**
     * 停止消息监控
     */
    stopMessageTracking(): void;
    /**
     * 在多个页面批量测试扩展
     */
    testExtensionOnMultiplePages(args: TestExtensionOnMultiplePagesArgs): Promise<ExtensionTestResult>;
    /**
     * 分析扩展性能影响
     */
    analyzeExtensionPerformance(args: PerformanceAnalysisOptions): Promise<PerformanceAnalysisResult>;
    getPerformanceInsight(insightName: string): Promise<string>;
    listPerformanceInsights(): Promise<string[]>;
    /**
     * 初始化emulator（懒加载）
     */
    private getEmulator;
    /**
     * CPU节流模拟
     */
    emulateCPU(args: {
        rate: number;
        extensionId?: string;
    }): Promise<any>;
    /**
     * 网络条件模拟
     */
    emulateNetwork(args: {
        condition: any;
        extensionId?: string;
    }): Promise<any>;
    /**
     * 批量条件测试
     */
    testUnderConditions(args: {
        extensionId: string;
        testUrl: string;
        conditions?: any[];
        timeout?: number;
    }): Promise<any>;
    /**
     * 重置模拟条件
     */
    resetEmulation(): Promise<any>;
    /**
     * 追踪扩展网络请求
     */
    trackExtensionNetwork(args: TrackExtensionNetworkArgs): Promise<NetworkAnalysis>;
    /**
     * 获取网络监控状态
     */
    getNetworkMonitoringStats(extensionId: string): NetworkMonitoringStats;
    /**
     * 清理网络监控数据
     */
    clearNetworkMonitoringData(extensionId: string): void;
    /**
     * 测量扩展综合影响
     */
    measureExtensionImpact(args: MeasureExtensionImpactArgs): Promise<ExtensionImpactReport>;
    /**
     * 检测页面弹窗
     */
    detectDialogs(): Promise<import("./interaction/DialogManager.js").DialogDetectionResult>;
    /**
     * 处理弹窗
     */
    handleDialog(options: any): Promise<boolean>;
    /**
     * 等待弹窗出现
     */
    waitForDialog(timeout?: number): Promise<import("./interaction/DialogManager.js").DialogDetectionResult>;
    /**
     * 搜索扩展日志
     */
    searchExtensionLogs(options: any): Promise<import("./interaction/ExtensionLogSearcher.js").LogSearchResult>;
    /**
     * 导出扩展日志
     */
    exportExtensionLogs(options: any): Promise<import("./interaction/ExtensionLogSearcher.js").LogExportResult>;
    /**
     * 分析日志模式
     */
    analyzeLogPatterns(options: any): Promise<import("./interaction/ExtensionLogSearcher.js").LogPatternAnalysis>;
    /**
     * 生成稳定的元素选择器
     */
    generateStableSelector(options: any): Promise<import("./interaction/ElementLocator.js").SelectorGenerationResult>;
    /**
     * 按内容查找元素
     */
    findElementByContent(options: any): Promise<import("./interaction/ElementLocator.js").LocatorResult[]>;
    /**
     * 分析DOM稳定性
     */
    analyzeDOMStability(options: any): Promise<import("./interaction/ElementLocator.js").DOMStabilityAnalysis>;
    /**
     * 分析表单结构
     */
    analyzeForms(): Promise<import("./interaction/FormHandler.js").FormAnalysis>;
    /**
     * 批量填充表单
     */
    fillFormBulk(options: any): Promise<import("./interaction/FormHandler.js").FormOperationResult>;
    /**
     * 处理文件上传
     */
    handleFileUpload(options: any): Promise<import("./interaction/FormHandler.js").FormOperationResult>;
    /**
     * 处理复杂控件
     */
    handleComplexControl(options: any): Promise<import("./interaction/FormHandler.js").FormOperationResult>;
    /**
     * 检测页面状态
     */
    detectPageState(): Promise<import("./interaction/PageStateMonitor.js").PageStateResult>;
    /**
     * 开始监控页面状态
     */
    startPageStateMonitoring(options: any): Promise<void>;
    /**
     * 停止监控页面状态
     */
    stopPageStateMonitoring(): {
        success: boolean;
        message: string;
    };
    /**
     * 追踪扩展API调用
     */
    trackExtensionApiCalls(options: any): Promise<{
        success: boolean;
        message: string;
        targets: number;
        categories: ("storage" | "runtime" | "tabs" | "permissions" | "webRequest" | "alarms")[];
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        message?: undefined;
        targets?: undefined;
        categories?: undefined;
    }>;
    /**
     * 快速扩展调试（组合工具）
     */
    quickExtensionDebug(args: any): Promise<import("./QuickDebugHandler.js").QuickDebugResult>;
    /**
     * 快速性能检测（组合工具）
     */
    quickPerformanceCheck(args: any): Promise<import("./QuickDebugHandler.js").QuickPerformanceResult>;
    /**
     * Phase 1.3: 列出扩展网络请求（带过滤和分页）
     */
    listExtensionRequests(args: any): {
        requests: import("../types/network-types.js").NetworkRequest[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
    /**
     * Phase 1.3: 获取请求详情
     */
    getExtensionRequestDetails(args: any): import("../types/network-types.js").NetworkRequest;
    /**
     * 导出网络活动为HAR格式
     */
    exportExtensionNetworkHAR(args: any): Promise<{
        harData: any;
        savedPath?: string;
        summary: any;
    }>;
    /**
     * Phase 1.3: 网络模式分析和建议
     */
    analyzeExtensionNetwork(args: any): {
        patterns: {
            frequentDomains: Array<{
                domain: string;
                count: number;
                percentage: number;
            }>;
            resourceTypeDistribution: Array<{
                type: string;
                count: number;
                size: number;
                percentage: number;
            }>;
            methodDistribution: Array<{
                method: string;
                count: number;
            }>;
            statusDistribution: Array<{
                status: number;
                count: number;
            }>;
            timelineAnalysis: {
                peakTime: string;
                avgRequestsPerMinute: number;
                busiestPeriod: {
                    start: number;
                    end: number;
                    count: number;
                };
            };
        };
        issues: Array<{
            type: "performance" | "reliability" | "security" | "best-practice";
            severity: "high" | "medium" | "low";
            description: string;
            affected: number;
            recommendation: string;
        }>;
        recommendations: string[];
        score: {
            performance: number;
            reliability: number;
            efficiency: number;
            overall: number;
        };
    };
}
//# sourceMappingURL=ExtensionHandler.d.ts.map