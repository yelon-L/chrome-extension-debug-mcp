/**
 * 弹窗检测与处理管理器
 * Phase 4: 交互与快照增强 - 核心模块
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';

const log = (...args: any[]) => console.error('[DialogManager]', ...args);

// 弹窗信息接口
export interface DialogInfo {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload' | 'custom';
  message: string;
  defaultText?: string;
  isVisible: boolean;
  timestamp: number;
  source: 'browser' | 'extension' | 'page';
  id?: string;
}

// 自定义弹窗信息
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

// 弹窗检测结果
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

// 弹窗处理选项
export interface DialogHandleOptions {
  action: 'accept' | 'dismiss' | 'cancel';
  text?: string;
  dialogId?: string;
  selector?: string;
  waitForDialog?: boolean;
  timeout?: number;
}

export class DialogManager {
  private dialogHandlers: Map<string, Function> = new Map();
  private isMonitoring: boolean = false;
  private detectedDialogs: DialogInfo[] = [];

  constructor(
    private chromeManager: ChromeManager,
    private pageManager: PageManager
  ) {}

  /**
   * 检测当前页面的所有弹窗
   */
  async detectDialogs(): Promise<DialogDetectionResult> {
    try {
      log('Starting dialog detection...');

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available for dialog detection');
      }

      // 1. 检测浏览器原生弹窗
      const browserDialogs = await this.detectBrowserDialogs();

      // 2. 检测自定义弹窗
      const customDialogs = await this.detectCustomDialogs();

      // 3. 汇总结果
      const allDialogs = [...browserDialogs, ...customDialogs];
      const summary = this.generateSummary(allDialogs);

      const result: DialogDetectionResult = {
        dialogs: browserDialogs,
        customDialogs: customDialogs,
        totalCount: allDialogs.length,
        summary
      };

      log('Dialog detection completed', {
        total: result.totalCount,
        browser: browserDialogs.length,
        custom: customDialogs.length
      });

      return result;
    } catch (error: any) {
      log('Dialog detection failed:', error);
      throw new McpError(ErrorCode.InternalError, `Dialog detection failed: ${error.message}`);
    }
  }

  /**
   * 检测浏览器原生弹窗 (alert, confirm, prompt)
   */
  private async detectBrowserDialogs(): Promise<DialogInfo[]> {
    const dialogs: DialogInfo[] = [];

    try {
      const page = await this.pageManager.getActivePage();
      if (!page) return dialogs;

      // 注入检测脚本
      const detectionScript = `
        (() => {
          const dialogs = [];
          const timestamp = Date.now();

          // 检查是否有待处理的对话框
          // 注意：浏览器原生对话框在显示时会阻塞JavaScript执行
          // 所以我们需要通过其他方式检测
          
          // 检测是否重写了原生方法（某些库会这样做）
          const originalAlert = window.alert.toString();
          const originalConfirm = window.confirm.toString();
          const originalPrompt = window.prompt.toString();
          
          const isNativeAlert = originalAlert.includes('[native code]');
          const isNativeConfirm = originalConfirm.includes('[native code]');
          const isNativePrompt = originalPrompt.includes('[native code]');

          // 如果方法被重写，可能有自定义对话框逻辑
          if (!isNativeAlert || !isNativeConfirm || !isNativePrompt) {
            // 尝试检测重写的对话框
            if (!isNativeAlert) {
              dialogs.push({
                type: 'alert',
                message: 'Custom alert implementation detected',
                isVisible: false,
                timestamp: timestamp,
                source: 'page',
                id: 'custom_alert_impl'
              });
            }
            
            if (!isNativeConfirm) {
              dialogs.push({
                type: 'confirm',
                message: 'Custom confirm implementation detected',
                isVisible: false,
                timestamp: timestamp,
                source: 'page',
                id: 'custom_confirm_impl'
              });
            }
            
            if (!isNativePrompt) {
              dialogs.push({
                type: 'prompt',
                message: 'Custom prompt implementation detected',
                isVisible: false,
                timestamp: timestamp,
                source: 'page',
                id: 'custom_prompt_impl'
              });
            }
          }

          return dialogs;
        })();
      `;

      const result = await page.evaluate(detectionScript);
      dialogs.push(...(result as DialogInfo[]));

      log('Browser dialogs detected:', dialogs.length);
      return dialogs;
    } catch (error: any) {
      log('Browser dialog detection failed:', error);
      return dialogs;
    }
  }

  /**
   * 检测自定义弹窗
   */
  private async detectCustomDialogs(): Promise<CustomDialogInfo[]> {
    const customDialogs: CustomDialogInfo[] = [];

    try {
      const page = await this.pageManager.getActivePage();
      if (!page) return customDialogs;

      // 注入自定义弹窗检测脚本
      const customDetectionScript = `
        (() => {
          const dialogs = [];
          const timestamp = Date.now();

          // 常见弹窗特征选择器
          const modalSelectors = [
            // 通用模态框
            '.modal:not([style*="display: none"])',
            '.modal.show',
            '.modal.in',
            '.modal[aria-hidden="false"]',
            
            // 对话框
            '.dialog:not([style*="display: none"])',
            '.dialog.open',
            '[role="dialog"]',
            '[role="alertdialog"]',
            
            // 弹出层
            '.popup:not([style*="display: none"])',
            '.popup.active',
            '.overlay:not([style*="display: none"])',
            '.overlay.show',
            
            // 常见UI库
            '.ant-modal:not(.ant-modal-hidden)',
            '.el-dialog:not([style*="display: none"])',
            '.ui-dialog:not([style*="display: none"])',
            '.bootstrap-modal.in',
            
            // 通知和警告
            '.alert:not([style*="display: none"])',
            '.notification:not([style*="display: none"])',
            '.toast:not([style*="display: none"])',
            
            // 自定义属性
            '[data-modal="true"]',
            '[data-dialog="true"]',
            '[data-popup="true"]'
          ];

          // 查找可见的弹窗元素
          modalSelectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach((element, index) => {
                // 检查元素是否真正可见
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 style.opacity !== '0' &&
                                 rect.width > 0 && 
                                 rect.height > 0;

                if (isVisible) {
                  // 查找按钮
                  const buttons = [];
                  const buttonSelectors = [
                    'button', 
                    '[role="button"]', 
                    '.btn', 
                    '.button',
                    'input[type="button"]',
                    'input[type="submit"]'
                  ];
                  
                  buttonSelectors.forEach(btnSelector => {
                    const btnElements = element.querySelectorAll(btnSelector);
                    btnElements.forEach(btn => {
                      const btnText = btn.textContent?.trim() || btn.getAttribute('value') || '';
                      if (btnText) {
                        let action = 'custom';
                        const lowerText = btnText.toLowerCase();
                        if (lowerText.includes('ok') || lowerText.includes('确定') || lowerText.includes('yes')) {
                          action = 'accept';
                        } else if (lowerText.includes('cancel') || lowerText.includes('取消') || lowerText.includes('no')) {
                          action = 'cancel';
                        }
                        
                        buttons.push({
                          text: btnText,
                          selector: btn.tagName.toLowerCase() + 
                                   (btn.id ? '#' + btn.id : '') +
                                   (btn.className ? '.' + Array.from(btn.classList).join('.') : ''),
                          action: action
                        });
                      }
                    });
                  });

                  dialogs.push({
                    type: 'custom',
                    message: element.textContent?.substring(0, 200) || 'Custom dialog detected',
                    isVisible: true,
                    timestamp: timestamp,
                    source: 'page',
                    id: 'custom_dialog_' + index,
                    selector: selector,
                    element: {
                      id: element.id,
                      className: element.className,
                      tagName: element.tagName,
                      textContent: element.textContent?.substring(0, 100) || '',
                      bounds: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                      }
                    },
                    buttons: buttons
                  });
                }
              });
            } catch (e) {
              // 忽略选择器错误
            }
          });

          return dialogs;
        })();
      `;

      const result = await page.evaluate(customDetectionScript);
      customDialogs.push(...(result as CustomDialogInfo[]));

      log('Custom dialogs detected:', customDialogs.length);
      return customDialogs;
    } catch (error: any) {
      log('Custom dialog detection failed:', error);
      return customDialogs;
    }
  }

  /**
   * 处理弹窗
   */
  async handleDialog(options: DialogHandleOptions): Promise<boolean> {
    try {
      log('Handling dialog with options:', options);

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available for dialog handling');
      }

      const { action, text, dialogId, selector, timeout = 5000 } = options;

      // 如果指定了选择器，处理自定义弹窗
      if (selector) {
        return await this.handleCustomDialog(selector, action, text);
      }

      // 如果指定了dialogId，查找对应的弹窗
      if (dialogId) {
        const detectionResult = await this.detectDialogs();
        const dialog = [...detectionResult.dialogs, ...detectionResult.customDialogs]
          .find(d => d.id === dialogId);
        
        if (!dialog) {
          throw new McpError(ErrorCode.InvalidParams, `Dialog with ID ${dialogId} not found`);
        }

        if (dialog.type === 'custom') {
          return await this.handleCustomDialog((dialog as CustomDialogInfo).selector, action, text);
        }
      }

      // 处理浏览器原生弹窗
      return await this.handleBrowserDialog(action, text, timeout);
    } catch (error: any) {
      log('Dialog handling failed:', error);
      throw new McpError(ErrorCode.InternalError, `Dialog handling failed: ${error.message}`);
    }
  }

  /**
   * 处理浏览器原生弹窗
   */
  private async handleBrowserDialog(action: string, text?: string, timeout: number = 5000): Promise<boolean> {
    const page = await this.pageManager.getActivePage();
    if (!page) return false;

    return new Promise((resolve) => {
      let handled = false;
      const timeoutId = setTimeout(() => {
        if (!handled) {
          handled = true;
          resolve(false);
        }
      }, timeout);

      // 监听对话框事件
      const dialogHandler = async (dialog: any) => {
        if (handled) return;
        handled = true;
        clearTimeout(timeoutId);

        try {
          log('Browser dialog detected:', { type: dialog.type(), message: dialog.message() });

          switch (action) {
            case 'accept':
              if (dialog.type() === 'prompt' && text) {
                await dialog.accept(text);
              } else {
                await dialog.accept();
              }
              break;
            case 'dismiss':
            case 'cancel':
              await dialog.dismiss();
              break;
            default:
              await dialog.dismiss();
          }

          resolve(true);
        } catch (error) {
          log('Failed to handle browser dialog:', error);
          resolve(false);
        }
      };

      page.on('dialog', dialogHandler);

      // 清理监听器
      setTimeout(() => {
        page.off('dialog', dialogHandler);
      }, timeout + 1000);
    });
  }

  /**
   * 处理自定义弹窗
   */
  private async handleCustomDialog(selector: string, action: string, text?: string): Promise<boolean> {
    try {
      const page = await this.pageManager.getActivePage();
      if (!page) return false;

      // 注入处理脚本
      const handleScript = `
        (() => {
          const dialogElement = document.querySelector('${selector}');
          if (!dialogElement) {
            return { success: false, reason: 'Dialog element not found' };
          }

          // 查找合适的按钮
          let targetButton = null;
          const buttons = dialogElement.querySelectorAll('button, [role="button"], .btn, .button, input[type="button"], input[type="submit"]');
          
          buttons.forEach(btn => {
            const btnText = (btn.textContent || btn.getAttribute('value') || '').toLowerCase();
            if ('${action}' === 'accept') {
              if (btnText.includes('ok') || btnText.includes('确定') || btnText.includes('yes') || 
                  btnText.includes('submit') || btnText.includes('提交')) {
                targetButton = btn;
              }
            } else if ('${action}' === 'cancel' || '${action}' === 'dismiss') {
              if (btnText.includes('cancel') || btnText.includes('取消') || btnText.includes('no') || 
                  btnText.includes('close') || btnText.includes('关闭')) {
                targetButton = btn;
              }
            }
          });

          // 如果需要输入文本
          if ('${text}' && '${action}' === 'accept') {
            const inputs = dialogElement.querySelectorAll('input[type="text"], input[type="password"], textarea');
            if (inputs.length > 0) {
              inputs[0].value = '${text}';
              inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // 点击按钮
          if (targetButton) {
            targetButton.click();
            return { success: true, reason: 'Button clicked successfully' };
          } else {
            // 如果没有找到合适的按钮，尝试关闭对话框
            const closeButtons = dialogElement.querySelectorAll('.close, [aria-label="close"], [data-dismiss], .modal-close');
            if (closeButtons.length > 0) {
              closeButtons[0].click();
              return { success: true, reason: 'Close button clicked' };
            }
          }

          return { success: false, reason: 'No suitable button found' };
        })();
      `;

      const result = await page.evaluate(handleScript);
      log('Custom dialog handling result:', result);

      return (result as any).success;
    } catch (error: any) {
      log('Custom dialog handling failed:', error);
      return false;
    }
  }

  /**
   * 等待弹窗出现
   */
  async waitForDialog(timeout: number = 10000): Promise<DialogDetectionResult | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkForDialogs = async () => {
        try {
          const result = await this.detectDialogs();
          if (result.totalCount > 0) {
            resolve(result);
            return;
          }

          if (Date.now() - startTime >= timeout) {
            resolve(null);
            return;
          }

          setTimeout(checkForDialogs, 500);
        } catch (error) {
          log('Error waiting for dialog:', error);
          resolve(null);
        }
      };

      checkForDialogs();
    });
  }

  /**
   * 生成检测结果摘要
   */
  private generateSummary(dialogs: DialogInfo[]): DialogDetectionResult['summary'] {
    const summary = {
      browserDialogs: 0,
      customDialogs: 0,
      visibleDialogs: 0,
      sources: {} as Record<string, number>
    };

    dialogs.forEach(dialog => {
      if (dialog.type === 'custom') {
        summary.customDialogs++;
      } else {
        summary.browserDialogs++;
      }

      if (dialog.isVisible) {
        summary.visibleDialogs++;
      }

      summary.sources[dialog.source] = (summary.sources[dialog.source] || 0) + 1;
    });

    return summary;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.dialogHandlers.clear();
    this.detectedDialogs = [];
    this.isMonitoring = false;
    log('DialogManager cleaned up');
  }
}
