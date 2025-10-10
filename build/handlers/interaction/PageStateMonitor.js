/**
 * 页面状态监控模块
 * 解决调试时弹窗卡住扩展的问题
 */
const log = (...args) => console.error('[PageStateMonitor]', ...args);
// 页面状态枚举
export var PageState;
(function (PageState) {
    PageState["NORMAL"] = "normal";
    PageState["BLOCKED_BY_DIALOG"] = "blocked_by_dialog";
    PageState["BLOCKED_BY_ALERT"] = "blocked_by_alert";
    PageState["BLOCKED_BY_CONFIRM"] = "blocked_by_confirm";
    PageState["BLOCKED_BY_PROMPT"] = "blocked_by_prompt";
    PageState["LOADING"] = "loading";
    PageState["ERROR"] = "error";
    PageState["UNRESPONSIVE"] = "unresponsive";
})(PageState || (PageState = {}));
export class PageStateMonitor {
    chromeManager;
    pageManager;
    dialogManager;
    isMonitoring = false;
    monitorInterval;
    lastState = PageState.NORMAL;
    stateChangeCallbacks = [];
    constructor(chromeManager, pageManager, dialogManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
        this.dialogManager = dialogManager;
    }
    /**
     * 检测当前页面状态
     */
    async detectPageState() {
        const startTime = Date.now();
        try {
            log('Detecting page state...');
            const page = await this.pageManager.getActivePage();
            if (!page) {
                return {
                    state: PageState.ERROR,
                    isBlocked: false,
                    recommendations: ['无法获取活动页面'],
                    executionTime: Date.now() - startTime
                };
            }
            // 1. 检测浏览器原生弹窗阻塞
            const browserDialogState = await this.checkBrowserDialogBlocking(page);
            if (browserDialogState.isBlocked) {
                return {
                    state: browserDialogState.state || PageState.BLOCKED_BY_DIALOG,
                    isBlocked: browserDialogState.isBlocked,
                    blockingElement: browserDialogState.blockingElement,
                    recommendations: browserDialogState.recommendations || [],
                    executionTime: Date.now() - startTime
                };
            }
            // 2. 检测自定义模态框阻塞
            const customModalState = await this.checkCustomModalBlocking(page);
            if (customModalState.isBlocked) {
                return {
                    state: customModalState.state || PageState.BLOCKED_BY_DIALOG,
                    isBlocked: customModalState.isBlocked,
                    blockingElement: customModalState.blockingElement,
                    recommendations: customModalState.recommendations || [],
                    executionTime: Date.now() - startTime
                };
            }
            // 3. 检测页面加载状态
            const loadingState = await this.checkLoadingState(page);
            if (loadingState.isBlocked) {
                return {
                    state: loadingState.state || PageState.LOADING,
                    isBlocked: loadingState.isBlocked,
                    blockingElement: loadingState.blockingElement,
                    recommendations: loadingState.recommendations || [],
                    executionTime: Date.now() - startTime
                };
            }
            // 4. 检测页面响应性
            const responsivenessState = await this.checkPageResponsiveness(page);
            if (responsivenessState.isBlocked) {
                return {
                    state: responsivenessState.state || PageState.UNRESPONSIVE,
                    isBlocked: responsivenessState.isBlocked,
                    blockingElement: responsivenessState.blockingElement,
                    recommendations: responsivenessState.recommendations || [],
                    executionTime: Date.now() - startTime
                };
            }
            // 页面状态正常
            return {
                state: PageState.NORMAL,
                isBlocked: false,
                recommendations: [],
                executionTime: Date.now() - startTime
            };
        }
        catch (error) {
            log('Page state detection failed:', error);
            return {
                state: PageState.ERROR,
                isBlocked: true,
                recommendations: [`状态检测失败: ${error.message}`],
                executionTime: Date.now() - startTime
            };
        }
    }
    /**
     * 开始监控页面状态
     */
    async startMonitoring(options = {}) {
        if (this.isMonitoring) {
            log('Monitoring already started');
            return;
        }
        const { intervalMs = 2000, autoHandle = true, onStateChange } = options;
        log('Starting page state monitoring', { intervalMs, autoHandle });
        this.isMonitoring = true;
        if (onStateChange) {
            this.stateChangeCallbacks.push(onStateChange);
        }
        this.monitorInterval = setInterval(async () => {
            try {
                const stateResult = await this.detectPageState();
                // 状态变化时触发回调
                if (stateResult.state !== this.lastState) {
                    log('Page state changed:', { from: this.lastState, to: stateResult.state });
                    this.lastState = stateResult.state;
                    // 触发回调
                    this.stateChangeCallbacks.forEach(callback => {
                        try {
                            callback(stateResult);
                        }
                        catch (error) {
                            log('State change callback error:', error);
                        }
                    });
                }
                // 自动处理阻塞状态
                if (autoHandle && stateResult.isBlocked && stateResult.blockingElement?.canAutoHandle) {
                    const handled = await this.autoHandleBlockingState(stateResult);
                    if (handled) {
                        stateResult.autoHandled = true;
                        log('Auto-handled blocking state:', stateResult.state);
                    }
                }
            }
            catch (error) {
                log('Monitoring iteration failed:', error);
            }
        }, intervalMs);
    }
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        log('Stopping page state monitoring');
        this.isMonitoring = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = undefined;
        }
        this.stateChangeCallbacks = [];
        this.lastState = PageState.NORMAL;
    }
    /**
     * 检测浏览器原生弹窗阻塞
     */
    async checkBrowserDialogBlocking(page) {
        try {
            // 尝试执行一个简单的JavaScript表达式，如果被弹窗阻塞会超时
            const testResult = await Promise.race([
                page.evaluate(() => {
                    // 检测是否有待处理的对话框
                    return {
                        hasActiveDialog: document.activeElement?.tagName === 'DIALOG' ||
                            document.querySelector('dialog[open]') !== null,
                        documentState: document.readyState,
                        timestamp: Date.now()
                    };
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Script execution timeout')), 1000))
            ]);
            // 如果能正常执行，检查结果
            if (testResult && testResult.hasActiveDialog) {
                return {
                    state: PageState.BLOCKED_BY_DIALOG,
                    isBlocked: true,
                    blockingElement: {
                        type: 'browser_dialog',
                        message: '检测到浏览器原生对话框',
                        canAutoHandle: true
                    },
                    recommendations: ['使用handle_dialog工具处理弹窗', '或调用wait_for_dialog等待弹窗消失']
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
        catch (error) {
            // 脚本执行超时可能意味着被弹窗阻塞
            if (error.message.includes('timeout') || error.name === 'TimeoutError') {
                return {
                    state: PageState.BLOCKED_BY_ALERT,
                    isBlocked: true,
                    blockingElement: {
                        type: 'browser_dialog',
                        message: '疑似被浏览器弹窗阻塞（脚本执行超时）',
                        canAutoHandle: true
                    },
                    recommendations: [
                        '页面可能被alert/confirm/prompt弹窗阻塞',
                        '建议使用handle_dialog自动处理',
                        '或手动关闭弹窗后重试'
                    ]
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
    }
    /**
     * 检测自定义模态框阻塞
     */
    async checkCustomModalBlocking(page) {
        try {
            const modalCheck = await page.evaluate(() => {
                // 检测常见的模态框选择器
                const modalSelectors = [
                    '.modal.show', '.modal:not([style*="display: none"])',
                    '.dialog.open', '[role="dialog"]:not([style*="display: none"])',
                    '.popup.active', '.overlay.show',
                    '.ant-modal:not(.ant-modal-hidden)',
                    '.el-dialog:not([style*="display: none"])',
                    '[data-modal="true"]:not([style*="display: none"])'
                ];
                for (const selector of modalSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        const style = window.getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        // 检查是否真正可见并且覆盖了大部分屏幕
                        if (style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            style.opacity !== '0' &&
                            rect.width > window.innerWidth * 0.3 &&
                            rect.height > window.innerHeight * 0.3) {
                            return {
                                blocked: true,
                                selector: selector,
                                message: element.textContent?.substring(0, 100) || '发现阻塞性模态框',
                                hasCloseButton: !!element.querySelector('button, .close, [aria-label*="close"], [data-dismiss]')
                            };
                        }
                    }
                }
                return { blocked: false };
            });
            if (modalCheck.blocked) {
                return {
                    state: PageState.BLOCKED_BY_DIALOG,
                    isBlocked: true,
                    blockingElement: {
                        type: 'custom_modal',
                        selector: modalCheck.selector,
                        message: modalCheck.message,
                        canAutoHandle: modalCheck.hasCloseButton
                    },
                    recommendations: [
                        '检测到自定义模态框阻塞页面',
                        modalCheck.hasCloseButton ? '可以自动关闭模态框' : '需要手动处理模态框',
                        '使用handle_dialog工具处理'
                    ]
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
        catch (error) {
            log('Custom modal check failed:', error);
            return { state: PageState.NORMAL, isBlocked: false };
        }
    }
    /**
     * 检测页面加载状态
     */
    async checkLoadingState(page) {
        try {
            const loadingCheck = await page.evaluate(() => {
                // 检查文档加载状态
                if (document.readyState !== 'complete') {
                    return { loading: true, state: document.readyState };
                }
                // 检查常见的加载指示器
                const loadingSelectors = [
                    '.loading', '.spinner', '.loader',
                    '[data-loading="true"]', '.loading-overlay',
                    '.ant-spin', '.el-loading-mask'
                ];
                for (const selector of loadingSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        const style = window.getComputedStyle(element);
                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                            return {
                                loading: true,
                                selector: selector,
                                text: element.textContent?.substring(0, 50) || '加载中...'
                            };
                        }
                    }
                }
                return { loading: false };
            });
            if (loadingCheck.loading) {
                return {
                    state: PageState.LOADING,
                    isBlocked: true,
                    blockingElement: {
                        type: 'loading_overlay',
                        selector: loadingCheck.selector,
                        message: loadingCheck.text || `页面正在加载 (${loadingCheck.state})`,
                        canAutoHandle: false
                    },
                    recommendations: [
                        '页面正在加载中',
                        '建议等待加载完成后重试',
                        '可以使用wait机制等待加载完成'
                    ]
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
        catch (error) {
            log('Loading state check failed:', error);
            return { state: PageState.NORMAL, isBlocked: false };
        }
    }
    /**
     * 检测页面响应性
     */
    async checkPageResponsiveness(page) {
        try {
            const startTime = Date.now();
            // 执行一个简单的DOM操作测试响应性
            await Promise.race([
                page.evaluate(() => {
                    const testDiv = document.createElement('div');
                    testDiv.style.display = 'none';
                    document.body.appendChild(testDiv);
                    document.body.removeChild(testDiv);
                    return Date.now();
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Responsiveness test timeout')), 3000))
            ]);
            const responseTime = Date.now() - startTime;
            // 如果响应时间过长，可能页面卡死
            if (responseTime > 2000) {
                return {
                    state: PageState.UNRESPONSIVE,
                    isBlocked: true,
                    blockingElement: {
                        type: 'loading_overlay',
                        message: `页面响应缓慢 (${responseTime}ms)`,
                        canAutoHandle: false
                    },
                    recommendations: [
                        '页面响应缓慢，可能存在性能问题',
                        '建议刷新页面或检查JavaScript错误',
                        '检查是否有长时间运行的脚本'
                    ]
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
        catch (error) {
            if (error.message.includes('timeout')) {
                return {
                    state: PageState.UNRESPONSIVE,
                    isBlocked: true,
                    blockingElement: {
                        type: 'loading_overlay',
                        message: '页面无响应（DOM操作超时）',
                        canAutoHandle: false
                    },
                    recommendations: [
                        '页面完全无响应',
                        '建议重新加载页面',
                        '检查浏览器控制台是否有错误'
                    ]
                };
            }
            return { state: PageState.NORMAL, isBlocked: false };
        }
    }
    /**
     * 自动处理阻塞状态
     */
    async autoHandleBlockingState(stateResult) {
        try {
            log('Attempting to auto-handle blocking state:', stateResult.state);
            switch (stateResult.state) {
                case PageState.BLOCKED_BY_DIALOG:
                case PageState.BLOCKED_BY_ALERT:
                case PageState.BLOCKED_BY_CONFIRM:
                case PageState.BLOCKED_BY_PROMPT:
                    return await this.autoHandleDialog(stateResult);
                default:
                    log('Auto-handle not supported for state:', stateResult.state);
                    return false;
            }
        }
        catch (error) {
            log('Auto-handle failed:', error);
            return false;
        }
    }
    /**
     * 自动处理弹窗
     */
    async autoHandleDialog(stateResult) {
        try {
            if (stateResult.blockingElement?.type === 'browser_dialog') {
                // 尝试接受浏览器弹窗
                const result = await this.dialogManager.handleDialog({
                    action: 'accept',
                    timeout: 2000
                });
                return result;
            }
            if (stateResult.blockingElement?.type === 'custom_modal' && stateResult.blockingElement.selector) {
                // 尝试关闭自定义模态框
                const result = await this.dialogManager.handleDialog({
                    action: 'dismiss',
                    selector: stateResult.blockingElement.selector,
                    timeout: 2000
                });
                return result;
            }
            return false;
        }
        catch (error) {
            log('Dialog auto-handle failed:', error);
            return false;
        }
    }
    /**
     * 添加状态变化回调
     */
    addStateChangeCallback(callback) {
        this.stateChangeCallbacks.push(callback);
    }
    /**
     * 移除状态变化回调
     */
    removeStateChangeCallback(callback) {
        const index = this.stateChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.stateChangeCallbacks.splice(index, 1);
        }
    }
    /**
     * 获取当前监控状态
     */
    getMonitoringStatus() {
        return {
            isMonitoring: this.isMonitoring,
            lastState: this.lastState
        };
    }
}
//# sourceMappingURL=PageStateMonitor.js.map