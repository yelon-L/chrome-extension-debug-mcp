/**
 * Advanced Interaction Types
 * Phase 2.2: Complex UI interaction scenarios
 */

import type { ElementHandle } from 'puppeteer-core';

/**
 * 元素定位器（支持UID或Selector）
 */
export interface ElementLocator {
  uid?: string;                   // UID定位
  selector?: string;              // CSS selector定位
  xpath?: string;                 // XPath定位
}

/**
 * 悬停选项
 */
export interface HoverOptions extends ElementLocator {
  timeout?: number;               // 超时时间
  position?: { x: number; y: number };  // 悬停位置
  waitFor?: 'visible' | 'attached';     // 等待条件
}

/**
 * 拖拽选项
 */
export interface DragOptions {
  source: ElementLocator;         // 源元素
  target: ElementLocator;         // 目标元素
  timeout?: number;               // 超时时间
  delay?: number;                 // 延迟
  sourcePosition?: { x: number; y: number };  // 源位置
  targetPosition?: { x: number; y: number };  // 目标位置
}

/**
 * 表单字段
 */
export interface FormField {
  locator: ElementLocator;        // 字段定位器
  value: string;                  // 填充值
  type?: 'text' | 'select' | 'checkbox' | 'radio' | 'file';  // 字段类型
  clear?: boolean;                // 先清空
}

/**
 * 批量表单填充选项
 */
export interface FillFormOptions {
  fields: FormField[];            // 表单字段列表
  submit?: boolean;               // 是否提交
  submitSelector?: string;        // 提交按钮选择器
  timeout?: number;               // 超时时间
}

/**
 * 文件上传选项
 */
export interface UploadFileOptions extends ElementLocator {
  filePath: string | string[];    // 文件路径（单个或多个）
  timeout?: number;               // 超时时间
}

/**
 * 对话框类型
 */
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'beforeunload';

/**
 * 对话框动作
 */
export type DialogAction = 'accept' | 'dismiss';

/**
 * 对话框处理选项
 */
export interface DialogHandleOptions {
  action: DialogAction;           // 动作
  promptText?: string;            // prompt输入文本
  timeout?: number;               // 超时时间
}

/**
 * 对话框结果
 */
export interface DialogResult {
  type: DialogType;               // 对话框类型
  message: string;                // 对话框消息
  action: DialogAction;           // 执行的动作
  promptText?: string;            // 输入的文本
  defaultValue?: string;          // 默认值
}

/**
 * 悬停结果
 */
export interface HoverResult {
  success: boolean;
  element: ElementLocator;
  hovered: boolean;
  error?: string;
}

/**
 * 拖拽结果
 */
export interface DragResult {
  success: boolean;
  source: ElementLocator;
  target: ElementLocator;
  dragged: boolean;
  error?: string;
}

/**
 * 表单填充结果
 */
export interface FillFormResult {
  success: boolean;
  filledCount: number;
  totalCount: number;
  submitted?: boolean;
  failedFields?: Array<{
    field: FormField;
    error: string;
  }>;
  error?: string;
}

/**
 * 文件上传结果
 */
export interface UploadFileResult {
  success: boolean;
  element: ElementLocator;
  filesCount: number;
  uploaded: boolean;
  error?: string;
}

