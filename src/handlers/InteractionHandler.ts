/**
 * Interaction Handler Module
 * Handles user interactions like clicking, typing, screenshots
 */

import * as puppeteer from 'puppeteer';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { ClickArgs, TypeArgs, ScreenshotArgs } from '../types/index.js';
import { PageManager } from '../managers/PageManager.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[InteractionHandler]', ...args);

export class InteractionHandler {
  private pageManager: PageManager;

  constructor(pageManager: PageManager) {
    this.pageManager = pageManager;
  }

  /**
   * Click on an element
   */
  async click(args: ClickArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Use specified tabId if provided, otherwise use current page
    let page: puppeteer.Page;
    if (args.tabId) {
      const targetPage = this.pageManager.getTabIdToPageMap().get(args.tabId);
      if (!targetPage) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${args.tabId}`);
      }
      if (targetPage.isClosed()) {
        throw new McpError(ErrorCode.InvalidParams, `Tab ${args.tabId} has been closed`);
      }
      page = targetPage;
    } else {
      page = await this.pageManager.getActivePage();
    }
    
    try {
      await page.waitForSelector(args.selector, { timeout: 5000, visible: true });
      await page.click(args.selector, {
        delay: args.delay,
        button: (args.button as any) || 'left',
        clickCount: args.clickCount || 1,
      } as any);
      return { content: [{ type: 'text', text: 'clicked' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Click failed: ${e}`);
    }
  }

  /**
   * Type text into an element
   */
  async type(args: TypeArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Use specified tabId if provided, otherwise use current page
    let page: puppeteer.Page;
    if ((args as any).tabId) {
      const targetPage = this.pageManager.getTabIdToPageMap().get((args as any).tabId as string);
      if (!targetPage) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${(args as any).tabId}`);
      }
      if (targetPage.isClosed()) {
        throw new McpError(ErrorCode.InvalidParams, `Tab ${(args as any).tabId} has been closed`);
      }
      page = targetPage;
    } else {
      page = await this.pageManager.getActivePage();
    }
    try {
      const el = await page.waitForSelector(args.selector, { timeout: 5000 });
      if (!el) throw new Error('Element not found');
      
      await el.click({ clickCount: 1 });
      
      if (args.clear) {
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
      }
      
      await page.type(args.selector, args.text, { delay: args.delay });
      return { content: [{ type: 'text', text: 'typed' }] };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Type failed: ${e}`);
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(args: ScreenshotArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Use specified tabId if provided, otherwise use current page
    let page: puppeteer.Page;
    if ((args as any).tabId) {
      const targetPage = this.pageManager.getTabIdToPageMap().get((args as any).tabId as string);
      if (!targetPage) {
        throw new McpError(ErrorCode.InvalidParams, `Unknown tabId: ${(args as any).tabId}`);
      }
      if (targetPage.isClosed()) {
        throw new McpError(ErrorCode.InvalidParams, `Tab ${(args as any).tabId} has been closed`);
      }
      page = targetPage;
    } else {
      page = await this.pageManager.getActivePage();
    }
    try {
      // 等待页面基本元素加载完成，提高截图成功率
      await page.waitForSelector('body', { timeout: 3000 }).catch(() => {
        // 如果body都没有，继续尝试截图
      });
      
      let buffer: Buffer | undefined;
      if (args.selector) {
        // 增加超时时间到10秒，确保元素加载完成
        const el = await page.waitForSelector(args.selector, { timeout: 10000, visible: true });
        if (!el) throw new Error('Element not found');
        buffer = await el.screenshot({ encoding: 'binary' }) as Buffer;
      } else {
        // 优化截图参数，提高性能
        buffer = await page.screenshot({ 
          fullPage: !!args.fullPage, 
          clip: args.clip as any, 
          encoding: 'binary',
          optimizeForSpeed: true  // 优化速度
        }) as Buffer;
      }
      
      if (args.path) {
        const fs = await import('fs');
        await fs.promises.writeFile(args.path, buffer);
      }
      
      const base64 = args.returnBase64 ? buffer.toString('base64') : undefined;
      return { 
        content: [{ 
          type: 'text', 
          text: base64 ? base64 : (args.path ? `saved:${args.path}` : 'screenshot taken') 
        }] 
      };
    } catch (e) {
      throw new McpError(ErrorCode.InternalError, `Screenshot failed: ${e}`);
    }
  }
}
