/**
 * DOM Snapshot & UID Locator Types
 * Phase 2.1: AI-friendly element location system
 */

import type { ElementHandle } from 'puppeteer-core';

/**
 * 元素快照信息
 */
export interface ElementSnapshot {
  uid: string;                    // 唯一标识符
  tagName: string;                // 标签名
  role?: string;                  // ARIA role
  name?: string;                  // ARIA name / accessible name
  text?: string;                  // 文本内容
  value?: string;                 // 输入值
  attributes: {                   // 关键属性
    id?: string;
    class?: string;
    type?: string;
    placeholder?: string;
    'aria-label'?: string;
    'data-test'?: string;
    [key: string]: string | undefined;
  };
  children?: ElementSnapshot[];   // 子元素
  xpath?: string;                 // XPath (optional)
  selector?: string;              // CSS selector (optional)
}

/**
 * 页面快照
 */
export interface PageSnapshot {
  url: string;                    // 页面URL
  title: string;                  // 页面标题
  timestamp: number;              // 快照时间戳
  elements: ElementSnapshot[];    // 所有元素
  uidMap: Map<string, ElementHandle>;  // UID到ElementHandle的映射
  textRepresentation: string;     // 文本表示（AI友好）
}

/**
 * 快照选项
 */
export interface SnapshotOptions {
  includeHidden?: boolean;        // 包含隐藏元素
  maxDepth?: number;              // 最大深度
  includeText?: boolean;          // 包含文本内容
  includeXPath?: boolean;         // 包含XPath
  filterSelectors?: string[];     // 过滤选择器
  contextElement?: ElementHandle; // 上下文元素（仅快照某个区域）
}

/**
 * UID交互选项
 */
export interface UIDInteractionOptions {
  uid: string;                    // 元素UID
  timeout?: number;               // 超时时间
  force?: boolean;                // 强制执行（忽略可见性检查）
  delay?: number;                 // 延迟（ms）
}

/**
 * UID填充选项
 */
export interface UIDFillOptions extends UIDInteractionOptions {
  value: string;                  // 填充值
  clear?: boolean;                // 先清空
}

/**
 * UID点击选项
 */
export interface UIDClickOptions extends UIDInteractionOptions {
  button?: 'left' | 'right' | 'middle';  // 鼠标按钮
  clickCount?: number;            // 点击次数
  position?: { x: number; y: number };   // 点击位置
}

/**
 * UID悬停选项
 */
export interface UIDHoverOptions extends UIDInteractionOptions {
  position?: { x: number; y: number };   // 悬停位置
}

/**
 * 快照生成结果
 */
export interface SnapshotResult {
  success: boolean;
  snapshot?: PageSnapshot;
  textRepresentation?: string;
  elementCount?: number;
  error?: string;
}

