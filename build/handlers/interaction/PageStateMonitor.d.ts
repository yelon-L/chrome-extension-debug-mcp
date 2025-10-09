/**
 * 页面状态监控模块
 * 解决调试时弹窗卡住扩展的问题
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
import { DialogManager } from './DialogManager.js';
export declare enum PageState {
    NORMAL = "normal",
    BLOCKED_BY_DIALOG = "blocked_by_dialog",
    BLOCKED_BY_ALERT = "blocked_by_alert",
    BLOCKED_BY_CONFIRM = "blocked_by_confirm",
    BLOCKED_BY_PROMPT = "blocked_by_prompt",
    LOADING = "loading",
    ERROR = "error",
    UNRESPONSIVE = "unresponsive"
}
export interface PageStateResult {
    state: PageState;
    isBlocked: boolean;
    blockingElement?: {
        type: 'browser_dialog' | 'custom_modal' | 'loading_overlay';
        selector?: string;
        message?: string;
        canAutoHandle: boolean;
    };
    recommendations: string[];
    autoHandled?: boolean;
    executionTime: number;
}
export interface MonitorOptions {
    intervalMs?: number;
    timeoutMs?: number;
    autoHandle?: boolean;
    retryCount?: number;
    onStateChange?: (state: PageStateResult) => void;
}
export declare class PageStateMonitor {
    private chromeManager;
    private pageManager;
    private dialogManager;
    private isMonitoring;
    private monitorInterval?;
    private lastState;
    private stateChangeCallbacks;
    constructor(chromeManager: ChromeManager, pageManager: PageManager, dialogManager: DialogManager);
    /**
     * 检测当前页面状态
     */
    detectPageState(): Promise<PageStateResult>;
    /**
     * 开始监控页面状态
     */
    startMonitoring(options?: MonitorOptions): Promise<void>;
    /**
     * 停止监控
     */
    stopMonitoring(): void;
    /**
     * 检测浏览器原生弹窗阻塞
     */
    private checkBrowserDialogBlocking;
    /**
     * 检测自定义模态框阻塞
     */
    private checkCustomModalBlocking;
    /**
     * 检测页面加载状态
     */
    private checkLoadingState;
    /**
     * 检测页面响应性
     */
    private checkPageResponsiveness;
    /**
     * 自动处理阻塞状态
     */
    private autoHandleBlockingState;
    /**
     * 自动处理弹窗
     */
    private autoHandleDialog;
    /**
     * 添加状态变化回调
     */
    addStateChangeCallback(callback: (state: PageStateResult) => void): void;
    /**
     * 移除状态变化回调
     */
    removeStateChangeCallback(callback: (state: PageStateResult) => void): void;
    /**
     * 获取当前监控状态
     */
    getMonitoringStatus(): {
        isMonitoring: boolean;
        lastState: PageState;
    };
}
//# sourceMappingURL=PageStateMonitor.d.ts.map