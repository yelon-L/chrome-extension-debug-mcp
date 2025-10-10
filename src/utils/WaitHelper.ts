/**
 * WaitHelper - 智能等待助手
 * Phase 2.3: Smart Wait Mechanism
 */

import type { Page, ElementHandle } from 'puppeteer-core';
import type { PageManager } from '../managers/PageManager.js';
import type { McpContext } from '../context/McpContext.js';
import type {
  WaitOptions,
  WaitForElementOptions,
  WaitForExtensionElementOptions,
  WaitForExtensionReadyOptions,
  WaitResult,
  ExtensionReadyResult,
  RaceWaitResult
} from '../types/wait-types.js';
import {
  LocatorStrategy,
  WaitCondition
} from '../types/wait-types.js';

export class WaitHelper {
  private pageManager: PageManager;
  private context: McpContext;

  constructor(pageManager: PageManager, context: McpContext) {
    this.pageManager = pageManager;
    this.context = context;
  }

  /**
   * 多策略元素等待（支持Locator API风格）
   */
  async waitForElement(options: WaitForElementOptions): Promise<WaitResult> {
    console.log('[WaitHelper] 等待元素:', options);

    const startTime = Date.now();
    const timeout = options.timeout || 30000;
    const polling = options.polling || 100;
    const condition = options.condition || WaitCondition.VISIBLE;

    try {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        return {
          success: false,
          duration: Date.now() - startTime,
          timedOut: false,
          error: 'No active page'
        };
      }

      // 收集所有可用的定位策略
      const strategies: Array<{ type: LocatorStrategy; value: string }> = [];

      if (options.uid) {
        strategies.push({ type: LocatorStrategy.SELECTOR, value: `[data-uid="${options.uid}"]` });
      }
      if (options.selector) {
        strategies.push({ type: LocatorStrategy.SELECTOR, value: options.selector });
      }
      if (options.xpath) {
        strategies.push({ type: LocatorStrategy.XPATH, value: options.xpath });
      }
      if (options.text) {
        strategies.push({ type: LocatorStrategy.TEXT, value: options.text });
      }
      if (options.aria) {
        strategies.push({ type: LocatorStrategy.ARIA, value: options.aria });
      }
      if (options.role) {
        strategies.push({ type: LocatorStrategy.ROLE, value: options.role });
      }
      if (options.dataTestId) {
        strategies.push({ type: LocatorStrategy.DATA_TESTID, value: options.dataTestId });
      }

      if (strategies.length === 0) {
        return {
          success: false,
          duration: Date.now() - startTime,
          timedOut: false,
          error: 'No locator strategy provided'
        };
      }

      // Race模式：尝试所有策略，第一个成功的胜出
      let element: ElementHandle | null = null;
      let winningStrategy: LocatorStrategy | undefined;

      const endTime = startTime + timeout;

      while (Date.now() < endTime) {
        // 依次尝试每个策略
        for (const strategy of strategies) {
          try {
            element = await this.findElementByStrategy(page, strategy, condition);
            if (element) {
              winningStrategy = strategy.type;
              console.log(`[WaitHelper] 元素找到 (策略: ${strategy.type})`);
              break;
            }
          } catch (e) {
            // 继续尝试下一个策略
          }
        }

        if (element) break;

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, polling));
      }

      const duration = Date.now() - startTime;
      const timedOut = !element && duration >= timeout;

      if (!element) {
        if (options.throwOnTimeout) {
          throw new Error(`Element not found after ${timeout}ms`);
        }
        return {
          success: false,
          duration,
          timedOut,
          error: 'Element not found'
        };
      }

      return {
        success: true,
        element,
        strategy: winningStrategy,
        duration,
        timedOut: false
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[WaitHelper] 等待元素失败:', error);
      return {
        success: false,
        duration,
        timedOut: duration >= timeout,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 扩展专用元素等待
   */
  async waitForExtensionElement(options: WaitForExtensionElementOptions): Promise<WaitResult> {
    console.log('[WaitHelper] 等待扩展元素:', options);

    // 如果指定了扩展上下文，先切换到对应页面
    if (options.context && options.extensionId) {
      try {
        // 这里可以添加切换到特定扩展上下文的逻辑
        // 例如切换到popup或options页面
        console.log(`[WaitHelper] 切换到扩展上下文: ${options.context}`);
      } catch (error) {
        console.error('[WaitHelper] 切换上下文失败:', error);
      }
    }

    // 使用基础等待逻辑
    return await this.waitForElement(options);
  }

  /**
   * 等待扩展初始化完成
   */
  async waitForExtensionReady(options: WaitForExtensionReadyOptions): Promise<ExtensionReadyResult> {
    console.log('[WaitHelper] 等待扩展就绪:', options);

    const startTime = Date.now();
    const timeout = options.timeout || 30000;
    const checks: ExtensionReadyResult['checks'] = {};

    try {
      const page = this.pageManager.getCurrentPage();
      if (!page) {
        return {
          success: false,
          ready: false,
          extensionId: options.extensionId,
          duration: Date.now() - startTime,
          checks,
          error: 'No active page'
        };
      }

      const endTime = startTime + timeout;

      // 轮询检查扩展是否就绪
      while (Date.now() < endTime) {
        let allChecksPassed = true;

        // 检查Storage API
        if (options.checkStorage !== false) {
          try {
            const storageReady = await page.evaluate(() => {
              return typeof chrome !== 'undefined' && 
                     typeof chrome.storage !== 'undefined' &&
                     typeof chrome.storage.local !== 'undefined';
            });
            checks.storage = storageReady;
            if (!storageReady) allChecksPassed = false;
          } catch (e) {
            checks.storage = false;
            allChecksPassed = false;
          }
        }

        // 检查Runtime API
        if (options.checkRuntime !== false) {
          try {
            const runtimeReady = await page.evaluate(() => {
              return typeof chrome !== 'undefined' && 
                     typeof chrome.runtime !== 'undefined' &&
                     typeof chrome.runtime.id !== 'undefined';
            });
            checks.runtime = runtimeReady;
            if (!runtimeReady) allChecksPassed = false;
          } catch (e) {
            checks.runtime = false;
            allChecksPassed = false;
          }
        }

        // 检查Permissions API
        if (options.checkPermissions) {
          try {
            const permissionsReady = await page.evaluate(() => {
              return typeof chrome !== 'undefined' && 
                     typeof chrome.permissions !== 'undefined';
            });
            checks.permissions = permissionsReady;
            if (!permissionsReady) allChecksPassed = false;
          } catch (e) {
            checks.permissions = false;
            allChecksPassed = false;
          }
        }

        if (allChecksPassed) {
          const duration = Date.now() - startTime;
          console.log(`[WaitHelper] 扩展就绪 (耗时: ${duration}ms)`);
          return {
            success: true,
            ready: true,
            extensionId: options.extensionId,
            duration,
            checks
          };
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 超时
      const duration = Date.now() - startTime;
      return {
        success: false,
        ready: false,
        extensionId: options.extensionId,
        duration,
        checks,
        error: 'Extension not ready after timeout'
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[WaitHelper] 等待扩展就绪失败:', error);
      return {
        success: false,
        ready: false,
        extensionId: options.extensionId,
        duration,
        checks,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 根据策略查找元素
   */
  private async findElementByStrategy(
    page: Page,
    strategy: { type: LocatorStrategy; value: string },
    condition: WaitCondition
  ): Promise<ElementHandle | null> {
    let element: ElementHandle | null = null;

    switch (strategy.type) {
      case LocatorStrategy.SELECTOR:
        element = await page.$(strategy.value);
        break;

      case LocatorStrategy.XPATH:
        if (typeof (page as any).$x === 'function') {
          const elements = await (page as any).$x(strategy.value);
          element = elements[0] || null;
        }
        break;

      case LocatorStrategy.TEXT:
        element = await page.evaluateHandle((text) => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent?.includes(text)) {
              return node.parentElement;
            }
          }
          return null;
        }, strategy.value) as ElementHandle;
        break;

      case LocatorStrategy.ARIA:
        element = await page.$(`[aria-label="${strategy.value}"]`);
        break;

      case LocatorStrategy.ROLE:
        element = await page.$(`[role="${strategy.value}"]`);
        break;

      case LocatorStrategy.DATA_TESTID:
        element = await page.$(`[data-testid="${strategy.value}"]`);
        break;
    }

    // 检查条件
    if (element && condition !== WaitCondition.ATTACHED) {
      const meetsCondition = await this.checkCondition(element, condition);
      if (!meetsCondition) {
        return null;
      }
    }

    return element;
  }

  /**
   * 检查元素是否满足条件
   */
  private async checkCondition(element: ElementHandle, condition: WaitCondition): Promise<boolean> {
    try {
      switch (condition) {
        case WaitCondition.VISIBLE:
          return await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
          });

        case WaitCondition.HIDDEN:
          return await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display === 'none' || 
                   style.visibility === 'hidden' || 
                   style.opacity === '0';
          });

        case WaitCondition.ENABLED:
          return await element.evaluate(el => {
            return !(el as HTMLInputElement).disabled;
          });

        case WaitCondition.DISABLED:
          return await element.evaluate(el => {
            return (el as HTMLInputElement).disabled;
          });

        case WaitCondition.ATTACHED:
          return await element.evaluate(el => {
            return document.contains(el);
          });

        case WaitCondition.DETACHED:
          return await element.evaluate(el => {
            return !document.contains(el);
          });

        default:
          return true;
      }
    } catch (e) {
      return false;
    }
  }
}

