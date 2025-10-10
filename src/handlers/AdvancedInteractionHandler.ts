/**
 * AdvancedInteractionHandler - 高级交互处理器
 * Phase 2.2: Complex UI interaction scenarios
 */

import type { Page, ElementHandle } from 'puppeteer-core';
import type { PageManager } from '../managers/PageManager.js';
import type { McpContext } from '../context/McpContext.js';
import type {
  HoverOptions,
  HoverResult,
  DragOptions,
  DragResult,
  FillFormOptions,
  FillFormResult,
  UploadFileOptions,
  UploadFileResult,
  DialogHandleOptions,
  DialogResult,
  ElementLocator,
  FormField
} from '../types/interaction-types.js';

export class AdvancedInteractionHandler {
  private pageManager: PageManager;
  private context: McpContext;

  constructor(pageManager: PageManager, context: McpContext) {
    this.pageManager = pageManager;
    this.context = context;
  }

  /**
   * 悬停元素（支持UID和Selector）
   */
  async hoverElement(options: HoverOptions): Promise<HoverResult> {
    console.log('[AdvancedInteractionHandler] 悬停元素:', options);

    try {
      const element = await this.locateElement(options);
      if (!element) {
        return {
          success: false,
          element: options,
          hovered: false,
          error: 'Element not found'
        };
      }

      // 执行悬停
      await element.hover();

      console.log('[AdvancedInteractionHandler] 悬停成功');

      return {
        success: true,
        element: options,
        hovered: true
      };
    } catch (error) {
      console.error('[AdvancedInteractionHandler] 悬停失败:', error);
      return {
        success: false,
        element: options,
        hovered: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 拖拽元素
   */
  async dragElement(options: DragOptions): Promise<DragResult> {
    console.log('[AdvancedInteractionHandler] 拖拽元素:', options);

    try {
      // 定位源元素和目标元素
      const sourceElement = await this.locateElement(options.source);
      const targetElement = await this.locateElement(options.target);

      if (!sourceElement || !targetElement) {
        return {
          success: false,
          source: options.source,
          target: options.target,
          dragged: false,
          error: !sourceElement ? 'Source element not found' : 'Target element not found'
        };
      }

      // 获取元素位置
      const sourceBound = await sourceElement.boundingBox();
      const targetBound = await targetElement.boundingBox();

      if (!sourceBound || !targetBound) {
        return {
          success: false,
          source: options.source,
          target: options.target,
          dragged: false,
          error: 'Cannot get element bounding box'
        };
      }

      const page = this.pageManager.getCurrentPage();
      if (!page) {
        return {
          success: false,
          source: options.source,
          target: options.target,
          dragged: false,
          error: 'No active page'
        };
      }

      // 计算拖拽起点和终点
      const startX = sourceBound.x + (options.sourcePosition?.x || sourceBound.width / 2);
      const startY = sourceBound.y + (options.sourcePosition?.y || sourceBound.height / 2);
      const endX = targetBound.x + (options.targetPosition?.x || targetBound.width / 2);
      const endY = targetBound.y + (options.targetPosition?.y || targetBound.height / 2);

      // 执行拖拽
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      
      await page.mouse.move(endX, endY, { steps: 10 }); // 10步平滑移动
      await page.mouse.up();

      console.log('[AdvancedInteractionHandler] 拖拽成功');

      return {
        success: true,
        source: options.source,
        target: options.target,
        dragged: true
      };
    } catch (error) {
      console.error('[AdvancedInteractionHandler] 拖拽失败:', error);
      return {
        success: false,
        source: options.source,
        target: options.target,
        dragged: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量填充表单
   */
  async fillForm(options: FillFormOptions): Promise<FillFormResult> {
    console.log('[AdvancedInteractionHandler] 批量填充表单:', options);

    const failedFields: Array<{ field: FormField; error: string }> = [];
    let filledCount = 0;

    try {
      // 逐个填充字段
      for (const field of options.fields) {
        try {
          const element = await this.locateElement(field.locator);
          if (!element) {
            failedFields.push({
              field,
              error: 'Element not found'
            });
            continue;
          }

          // 根据类型填充
          const fieldType = field.type || 'text';

          switch (fieldType) {
            case 'text':
              if (field.clear) {
                await element.click({ clickCount: 3 }); // 选中所有
                const page = this.pageManager.getCurrentPage();
                await page?.keyboard.press('Backspace');
              }
              await element.type(field.value);
              break;

            case 'select':
              await element.select(field.value);
              break;

            case 'checkbox':
            case 'radio':
              const isChecked = await element.evaluate(el => (el as HTMLInputElement).checked);
              const shouldCheck = field.value === 'true' || field.value === '1';
              if (isChecked !== shouldCheck) {
                await element.click();
              }
              break;

            default:
              await element.type(field.value);
          }

          filledCount++;
          console.log(`[AdvancedInteractionHandler] 填充字段成功: ${field.value}`);

        } catch (error) {
          failedFields.push({
            field,
            error: error instanceof Error ? error.message : String(error)
          });
          console.error(`[AdvancedInteractionHandler] 填充字段失败:`, error);
        }
      }

      // 提交表单（如果需要）
      let submitted = false;
      if (options.submit && options.submitSelector) {
        try {
          const submitButton = await this.locateElement({ selector: options.submitSelector });
          if (submitButton) {
            await submitButton.click();
            submitted = true;
            console.log('[AdvancedInteractionHandler] 表单已提交');
          }
        } catch (error) {
          console.error('[AdvancedInteractionHandler] 提交表单失败:', error);
        }
      }

      const success = failedFields.length === 0;

      console.log(`[AdvancedInteractionHandler] 表单填充完成: ${filledCount}/${options.fields.length}`);

      return {
        success,
        filledCount,
        totalCount: options.fields.length,
        submitted,
        failedFields: failedFields.length > 0 ? failedFields : undefined
      };
    } catch (error) {
      console.error('[AdvancedInteractionHandler] 表单填充失败:', error);
      return {
        success: false,
        filledCount,
        totalCount: options.fields.length,
        error: error instanceof Error ? error.message : String(error),
        failedFields: failedFields.length > 0 ? failedFields : undefined
      };
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    console.log('[AdvancedInteractionHandler] 上传文件:', options);

    try {
      const element = await this.locateElement(options);
      if (!element) {
        return {
          success: false,
          element: options,
          filesCount: 0,
          uploaded: false,
          error: 'File input element not found'
        };
      }

      // 转换为数组
      const filePaths = Array.isArray(options.filePath) ? options.filePath : [options.filePath];

      // 上传文件（使用类型断言）
      await (element as any).uploadFile(...filePaths);

      console.log(`[AdvancedInteractionHandler] 文件上传成功: ${filePaths.length}个文件`);

      return {
        success: true,
        element: options,
        filesCount: filePaths.length,
        uploaded: true
      };
    } catch (error) {
      console.error('[AdvancedInteractionHandler] 文件上传失败:', error);
      return {
        success: false,
        element: options,
        filesCount: 0,
        uploaded: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理对话框
   */
  async handleDialog(options: DialogHandleOptions): Promise<DialogResult> {
    console.log('[AdvancedInteractionHandler] 处理对话框:', options);

    return new Promise(async (resolve, reject) => {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        reject(new Error('No active page'));
        return;
      }

      const timeout = options.timeout || 10000;
      let dialogHandled = false;

      // 设置超时
      const timer = setTimeout(() => {
        if (!dialogHandled) {
          reject(new Error('Dialog handling timeout'));
        }
      }, timeout);

      // 监听对话框
      const dialogHandler = async (dialog: any) => {
        dialogHandled = true;
        clearTimeout(timer);

        const result: DialogResult = {
          type: dialog.type() as any,
          message: dialog.message(),
          action: options.action
        };

        // 获取默认值（仅prompt）
        if (dialog.type() === 'prompt') {
          result.defaultValue = dialog.defaultValue();
        }

        try {
          if (options.action === 'accept') {
            // 如果是prompt且提供了文本
            if (dialog.type() === 'prompt' && options.promptText !== undefined) {
              await dialog.accept(options.promptText);
              result.promptText = options.promptText;
            } else {
              await dialog.accept();
            }
          } else {
            await dialog.dismiss();
          }

          console.log('[AdvancedInteractionHandler] 对话框已处理:', result);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // 注册对话框处理器
      page.once('dialog', dialogHandler);

      // 如果在超时时间内没有对话框，移除监听器
      setTimeout(() => {
        if (!dialogHandled) {
          page.off('dialog', dialogHandler);
        }
      }, timeout);
    });
  }

  /**
   * 根据定位器查找元素
   */
  private async locateElement(locator: ElementLocator): Promise<ElementHandle | null> {
    // 优先使用UID
    if (locator.uid) {
      const generator = this.context.getSnapshotGenerator();
      if (generator) {
        const element = generator.getElementByUid(locator.uid);
        if (element) return element;
      }
    }

    // 使用selector
    if (locator.selector) {
      const page = this.pageManager.getCurrentPage();
      if (page) {
        return await page.$(locator.selector);
      }
    }

    // 使用xpath
    if (locator.xpath) {
      const page = this.pageManager.getCurrentPage();
      if (page && typeof (page as any).$x === 'function') {
        const elements = await (page as any).$x(locator.xpath);
        if (elements && elements.length > 0) {
          return elements[0];
        }
      }
    }

    return null;
  }
}

