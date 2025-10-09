/**
 * Week 3高级功能: 扩展消息追踪器
 * 实现消息传递监控和API调用追踪，解决evaluate脚本中的chrome API类型问题
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
export interface ExtensionMessage {
    timestamp: number;
    id: string;
    type: 'runtime' | 'tabs' | 'external';
    direction: 'send' | 'receive';
    source: {
        contextType: 'background' | 'content_script' | 'popup' | 'options';
        tabId?: string;
        frameId?: number;
    };
    target: {
        contextType: 'background' | 'content_script' | 'popup' | 'options';
        tabId?: string;
        extensionId?: string;
    };
    message: any;
    response?: {
        timestamp: number;
        success: boolean;
        data?: any;
        error?: string;
    };
}
export interface ExtensionAPICall {
    timestamp: number;
    id: string;
    api: string;
    category: string;
    context: {
        type: 'background' | 'content_script' | 'popup' | 'options';
        tabId?: string;
        frameId?: number;
    };
    parameters: any[];
    result?: {
        timestamp: number;
        success: boolean;
        data?: any;
        error?: {
            name: string;
            message: string;
            stack?: string;
        };
    };
    performance: {
        duration: number;
        memoryBefore: number;
        memoryAfter: number;
    };
}
export interface MonitorExtensionMessagesArgs {
    extensionId: string;
    duration?: number;
    messageTypes?: ('runtime' | 'tabs' | 'external')[];
    includeResponses?: boolean;
}
export interface TrackExtensionAPICallsArgs {
    extensionId: string;
    apiCategories?: ('storage' | 'tabs' | 'runtime' | 'permissions' | 'webRequest' | 'alarms')[];
    duration?: number;
    includeResults?: boolean;
}
/**
 * 扩展消息追踪器类 - Week 3核心功能
 * 解决Chrome API类型问题，使用字符串模板注入方式
 */
export declare class ExtensionMessageTracker {
    private chromeManager;
    private pageManager;
    private messages;
    private apiCalls;
    private isMonitoring;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 监控扩展消息传递
     * 解决evaluate()脚本中的chrome API类型问题
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
     * 注入消息监控脚本 - 使用字符串模板解决Chrome API类型问题
     */
    private injectMessageMonitor;
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
     * 注入API追踪脚本
     */
    private injectAPITracker;
    /**
     * 获取收集到的消息
     */
    getMessages(): ExtensionMessage[];
    /**
     * 获取收集到的API调用
     */
    getAPICalls(): ExtensionAPICall[];
    /**
     * 清空收集的数据
     */
    clearData(): void;
    /**
     * 停止监控
     */
    stopMonitoring(): void;
    /**
     * 获取监控统计信息
     */
    getMonitoringStats(): {
        isMonitoring: boolean;
        totalMessages: number;
        totalAPICalls: number;
        messagesByType: Record<string, number>;
        apiCallsByCategory: Record<string, number>;
    };
    private getMessagesByType;
    private getAPICallsByCategory;
}
//# sourceMappingURL=ExtensionMessageTracker.d.ts.map