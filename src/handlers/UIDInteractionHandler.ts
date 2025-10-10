/**
 * UIDInteractionHandler - UID交互处理器
 * Phase 2.1: AI-friendly element interaction via UID
 */

import type { Page, ElementHandle } from 'puppeteer-core';
import type { PageManager } from '../managers/PageManager.js';
import type { McpContext } from '../context/McpContext.js';
import type {
  SnapshotOptions,
  SnapshotResult,
  UIDClickOptions,
  UIDFillOptions,
  UIDHoverOptions
} from '../types/snapshot-types.js';

export class UIDInteractionHandler {
  private pageManager: PageManager;
  private context: McpContext;

  constructor(pageManager: PageManager, context: McpContext) {
    this.pageManager = pageManager;
    this.context = context;
  }

  /**
   * 生成DOM快照
   */
  async takeSnapshot(options: SnapshotOptions = {}): Promise<SnapshotResult> {
    console.log('[UIDInteractionHandler] 生成DOM快照...');
    
    const page = this.pageManager.getCurrentPage();
    if (!page) {
      return {
        success: false,
        error: 'No active page available'
      };
    }

    try {
      const generator = this.context.getOrCreateSnapshotGenerator(page);
      const result = await generator.generateSnapshot(options);

      if (result.success && result.snapshot) {
        // 保存到context
        this.context.setCurrentSnapshot(result.snapshot);
        console.log(`[UIDInteractionHandler] 快照已保存，共${result.elementCount}个元素`);
      }

      return result;
    } catch (error) {
      console.error('[UIDInteractionHandler] 快照生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过UID点击元素
   */
  async clickByUid(options: UIDClickOptions): Promise<{
    success: boolean;
    uid: string;
    clicked: boolean;
    error?: string;
  }> {
    console.log(`[UIDInteractionHandler] 点击元素: ${options.uid}`);

    try {
      const element = await this.getElementByUid(options.uid);
      if (!element) {
        return {
          success: false,
          uid: options.uid,
          clicked: false,
          error: `Element with UID ${options.uid} not found`
        };
      }

      // 执行点击
      const clickOptions: any = {
        button: options.button || 'left',
        clickCount: options.clickCount || 1
      };

      if (options.delay) {
        clickOptions.delay = options.delay;
      }

      await element.click(clickOptions);

      console.log(`[UIDInteractionHandler] 元素 ${options.uid} 已点击`);

      return {
        success: true,
        uid: options.uid,
        clicked: true
      };
    } catch (error) {
      console.error(`[UIDInteractionHandler] 点击失败:`, error);
      return {
        success: false,
        uid: options.uid,
        clicked: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过UID填充元素
   */
  async fillByUid(options: UIDFillOptions): Promise<{
    success: boolean;
    uid: string;
    filled: boolean;
    value: string;
    error?: string;
  }> {
    console.log(`[UIDInteractionHandler] 填充元素: ${options.uid} = "${options.value}"`);

    try {
      const element = await this.getElementByUid(options.uid);
      if (!element) {
        return {
          success: false,
          uid: options.uid,
          filled: false,
          value: options.value,
          error: `Element with UID ${options.uid} not found`
        };
      }

      // 如果需要先清空
      if (options.clear) {
        await element.click({ clickCount: 3 }); // 选中所有文本
        await this.pageManager.getCurrentPage()?.keyboard.press('Backspace');
      }

      // 填充值
      await element.type(options.value, { delay: options.delay || 0 });

      console.log(`[UIDInteractionHandler] 元素 ${options.uid} 已填充`);

      return {
        success: true,
        uid: options.uid,
        filled: true,
        value: options.value
      };
    } catch (error) {
      console.error(`[UIDInteractionHandler] 填充失败:`, error);
      return {
        success: false,
        uid: options.uid,
        filled: false,
        value: options.value,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过UID悬停元素
   */
  async hoverByUid(options: UIDHoverOptions): Promise<{
    success: boolean;
    uid: string;
    hovered: boolean;
    error?: string;
  }> {
    console.log(`[UIDInteractionHandler] 悬停元素: ${options.uid}`);

    try {
      const element = await this.getElementByUid(options.uid);
      if (!element) {
        return {
          success: false,
          uid: options.uid,
          hovered: false,
          error: `Element with UID ${options.uid} not found`
        };
      }

      // 执行悬停
      await element.hover();

      console.log(`[UIDInteractionHandler] 元素 ${options.uid} 已悬停`);

      return {
        success: true,
        uid: options.uid,
        hovered: true
      };
    } catch (error) {
      console.error(`[UIDInteractionHandler] 悬停失败:`, error);
      return {
        success: false,
        uid: options.uid,
        hovered: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 根据UID获取元素
   */
  private async getElementByUid(uid: string): Promise<ElementHandle | null> {
    const generator = this.context.getSnapshotGenerator();
    if (!generator) {
      console.warn('[UIDInteractionHandler] No snapshot generator available, please take snapshot first');
      return null;
    }

    const element = generator.getElementByUid(uid);
    return element || null;
  }

  /**
   * 获取快照文本表示
   */
  getSnapshotText(): string | null {
    const snapshot = this.context.getCurrentSnapshot();
    return snapshot?.textRepresentation || null;
  }
}

