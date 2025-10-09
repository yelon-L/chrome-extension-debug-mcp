/**
 * ExtensionNetworkMonitor - 扩展网络监控器
 *
 * 功能：
 * - 监听页面所有网络请求
 * - 过滤扩展发起的请求
 * - 记录请求详情和时序信息
 * - 分析请求模式和异常行为
 * - 生成网络影响报告和优化建议
 */
import type { ChromeManager } from '../../managers/ChromeManager.js';
import type { PageManager } from '../../managers/PageManager.js';
import type { NetworkAnalysis, TrackExtensionNetworkArgs, NetworkMonitoringStats } from '../../types/network-types.js';
export declare class ExtensionNetworkMonitor {
    private chromeManager;
    private pageManager;
    private requests;
    private isMonitoring;
    private monitoringStartTime;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 开始监控扩展网络请求
     */
    trackExtensionNetwork(args: TrackExtensionNetworkArgs): Promise<NetworkAnalysis>;
    /**
     * 开始监控
     */
    private startMonitoring;
    /**
     * 停止监控并生成分析报告
     */
    private stopMonitoring;
    /**
     * 处理请求事件
     */
    private handleRequest;
    /**
     * 处理响应事件
     */
    private handleResponse;
    /**
     * 处理请求失败事件
     */
    private handleRequestFailed;
    /**
     * 判断是否是扩展发起的请求
     */
    private isExtensionRequest;
    /**
     * 分析请求数据
     */
    private analyzeRequests;
    /**
     * 按资源类型分组
     */
    private groupByResourceType;
    /**
     * 按域名分组
     */
    private groupByDomain;
    /**
     * 按请求方法分组
     */
    private groupByMethod;
    /**
     * 检测可疑请求
     */
    private detectSuspiciousRequests;
    /**
     * 提取第三方域名
     */
    private extractThirdPartyDomains;
    /**
     * 生成网络优化建议
     */
    private generateNetworkRecommendations;
    /**
     * 生成摘要
     */
    private generateSummary;
    /**
     * 计算网络影响级别
     */
    private calculateNetworkImpactLevel;
    /**
     * 简化请求对象（去除大数据）
     */
    private simplifyRequest;
    /**
     * 获取监控状态
     */
    getMonitoringStats(extensionId: string): NetworkMonitoringStats;
    /**
     * 清理监控数据
     */
    clearMonitoringData(extensionId: string): void;
}
//# sourceMappingURL=ExtensionNetworkMonitor.d.ts.map