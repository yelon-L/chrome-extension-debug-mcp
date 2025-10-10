/**
 * Wait Types - 智能等待机制类型定义
 * Phase 2.3: Smart Wait Mechanism
 */

import type { ElementHandle } from 'puppeteer-core';

/**
 * 定位器策略
 */
export enum LocatorStrategy {
  SELECTOR = 'selector',      // CSS选择器
  XPATH = 'xpath',            // XPath
  TEXT = 'text',              // 文本内容
  ARIA = 'aria',              // ARIA标签
  ROLE = 'role',              // ARIA角色
  DATA_TESTID = 'data-testid' // data-testid属性
}

/**
 * 等待条件
 */
export enum WaitCondition {
  VISIBLE = 'visible',        // 元素可见
  HIDDEN = 'hidden',          // 元素隐藏
  ATTACHED = 'attached',      // 元素附加到DOM
  DETACHED = 'detached',      // 元素从DOM移除
  ENABLED = 'enabled',        // 元素启用
  DISABLED = 'disabled'       // 元素禁用
}

/**
 * 等待选项
 */
export interface WaitOptions {
  timeout?: number;           // 超时时间(ms)，默认30000
  polling?: number;           // 轮询间隔(ms)，默认100
  condition?: WaitCondition;  // 等待条件，默认visible
  throwOnTimeout?: boolean;   // 超时是否抛出异常，默认false
}

/**
 * 多策略定位器
 */
export interface MultiStrategyLocator {
  strategies: Array<{
    type: LocatorStrategy;
    value: string;
  }>;
  race?: boolean;             // 是否竞速（第一个匹配即返回）
}

/**
 * 元素等待选项
 */
export interface WaitForElementOptions extends WaitOptions {
  selector?: string;          // CSS选择器
  xpath?: string;             // XPath
  text?: string;              // 文本内容
  aria?: string;              // ARIA标签
  role?: string;              // ARIA角色
  dataTestId?: string;        // data-testid
  uid?: string;               // UID（从快照获取）
}

/**
 * 扩展元素等待选项
 */
export interface WaitForExtensionElementOptions extends WaitForElementOptions {
  extensionId?: string;       // 扩展ID
  context?: 'popup' | 'options' | 'background' | 'content';  // 扩展上下文
}

/**
 * 扩展就绪选项
 */
export interface WaitForExtensionReadyOptions {
  extensionId: string;        // 扩展ID
  timeout?: number;           // 超时时间
  checkStorage?: boolean;     // 检查storage是否可用
  checkRuntime?: boolean;     // 检查runtime是否可用
  checkPermissions?: boolean; // 检查permissions是否可用
}

/**
 * 等待结果
 */
export interface WaitResult<T = ElementHandle | null> {
  success: boolean;
  element?: T;
  strategy?: LocatorStrategy;
  duration: number;           // 实际等待时间(ms)
  timedOut: boolean;
  error?: string;
}

/**
 * 扩展就绪结果
 */
export interface ExtensionReadyResult {
  success: boolean;
  ready: boolean;
  extensionId: string;
  duration: number;
  checks: {
    storage?: boolean;
    runtime?: boolean;
    permissions?: boolean;
  };
  error?: string;
}

/**
 * Race等待结果
 */
export interface RaceWaitResult extends WaitResult {
  winningStrategy: LocatorStrategy;
  attemptedStrategies: LocatorStrategy[];
}

