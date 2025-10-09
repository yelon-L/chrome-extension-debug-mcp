/**
 * 弹窗检测与处理管理器
 * Phase 4: 交互与快照增强 - 核心模块
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
export interface DialogInfo {
    type: 'alert' | 'confirm' | 'prompt' | 'beforeunload' | 'custom';
    message: string;
    defaultText?: string;
    isVisible: boolean;
    timestamp: number;
    source: 'browser' | 'extension' | 'page';
    id?: string;
}
export interface CustomDialogInfo extends DialogInfo {
    type: 'custom';
    selector: string;
    element: {
        id?: string;
        className?: string;
        tagName: string;
        textContent: string;
        bounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    buttons: Array<{
        text: string;
        selector: string;
        action: 'accept' | 'cancel' | 'custom';
    }>;
}
export interface DialogDetectionResult {
    dialogs: DialogInfo[];
    customDialogs: CustomDialogInfo[];
    totalCount: number;
    summary: {
        browserDialogs: number;
        customDialogs: number;
        visibleDialogs: number;
        sources: Record<string, number>;
    };
}
export interface DialogHandleOptions {
    action: 'accept' | 'dismiss' | 'cancel';
    text?: string;
    dialogId?: string;
    selector?: string;
    waitForDialog?: boolean;
    timeout?: number;
}
export declare class DialogManager {
    private chromeManager;
    private pageManager;
    private dialogHandlers;
    private isMonitoring;
    private detectedDialogs;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 检测当前页面的所有弹窗
     */
    detectDialogs(): Promise<DialogDetectionResult>;
    /**
     * 检测浏览器原生弹窗 (alert, confirm, prompt)
     */
    private detectBrowserDialogs;
    /**
     * 检测自定义弹窗
     */
    private detectCustomDialogs;
    /**
     * 处理弹窗
     */
    handleDialog(options: DialogHandleOptions): Promise<boolean>;
    /**
     * 处理浏览器原生弹窗
     */
    private handleBrowserDialog;
    /**
     * 处理自定义弹窗
     */
    private handleCustomDialog;
    /**
     * 等待弹窗出现
     */
    waitForDialog(timeout?: number): Promise<DialogDetectionResult | null>;
    /**
     * 生成检测结果摘要
     */
    private generateSummary;
    /**
     * 清理资源
     */
    cleanup(): void;
}
//# sourceMappingURL=DialogManager.d.ts.map