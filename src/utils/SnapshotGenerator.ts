/**
 * SnapshotGenerator - DOM快照生成器
 * 
 * 功能：
 * - 生成页面DOM快照
 * - 构建UID到ElementHandle的映射
 * - 生成AI友好的文本表示
 * - 支持多iframe场景
 */

import type { Page, ElementHandle } from 'puppeteer-core';
import type {
  ElementSnapshot,
  PageSnapshot,
  SnapshotOptions,
  SnapshotResult
} from '../types/snapshot-types.js';

export class SnapshotGenerator {
  private page: Page;
  private uidMap: Map<string, ElementHandle> = new Map();
  private uidCounter: number = 0;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 生成页面快照
   */
  async generateSnapshot(options: SnapshotOptions = {}): Promise<SnapshotResult> {
    try {
      console.log('[SnapshotGenerator] 开始生成页面快照...');
      
      // 重置计数器和映射
      this.uidCounter = 0;
      this.uidMap.clear();

      // 获取页面基本信息
      const url = this.page.url();
      const title = await this.page.title();
      const timestamp = Date.now();

      // 生成元素树
      const elements = await this.buildElementTree(options);

      // 生成文本表示
      const textRepresentation = this.formatAsText(elements);

      const snapshot: PageSnapshot = {
        url,
        title,
        timestamp,
        elements,
        uidMap: this.uidMap,
        textRepresentation
      };

      console.log(`[SnapshotGenerator] 快照生成完成，共${this.uidMap.size}个元素`);

      return {
        success: true,
        snapshot,
        textRepresentation,
        elementCount: this.uidMap.size
      };
    } catch (error) {
      console.error('[SnapshotGenerator] 快照生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 构建元素树
   */
  private async buildElementTree(options: SnapshotOptions): Promise<ElementSnapshot[]> {
    const maxDepth = options.maxDepth || 10;
    const includeHidden = options.includeHidden || false;
    const includeText = options.includeText !== false;
    const includeXPath = options.includeXPath || false;

    // 在页面上下文中执行，获取可访问性树
    const elementsData = await this.page.evaluate((opts) => {
      const elements: any[] = [];
      
      function shouldInclude(el: Element): boolean {
        if (!opts.includeHidden) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
          }
        }
        return true;
      }

      function getAccessibleName(el: Element): string | undefined {
        // 尝试获取ARIA label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // 尝试获取label关联
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) return label.textContent?.trim();
        }

        // 尝试获取placeholder
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) return placeholder;

        return undefined;
      }

      function buildElementData(el: Element, depth: number): any {
        if (depth > opts.maxDepth) return null;
        if (!shouldInclude(el)) return null;

        const tagName = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || undefined;
        const name = getAccessibleName(el);
        
        // 获取文本内容（仅直接文本节点）
        let text: string | undefined;
        if (opts.includeText && el.childNodes.length > 0) {
          const directText = Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .filter(Boolean)
            .join(' ')
            .trim();
          if (directText) text = directText;
        }

        // 获取输入值
        let value: string | undefined;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          value = (el as any).value || undefined;
        }

        // 关键属性
        const attributes: any = {};
        const importantAttrs = ['id', 'class', 'type', 'placeholder', 'aria-label', 'data-test', 'name', 'href'];
        importantAttrs.forEach(attr => {
          const val = el.getAttribute(attr);
          if (val) attributes[attr] = val;
        });

        const elementData: any = {
          tagName,
          role,
          name,
          text,
          value,
          attributes
        };

        // XPath (如果需要)
        if (opts.includeXPath) {
          elementData.xpath = getXPath(el);
        }

        // 递归处理子元素（只处理交互性元素和重要容器）
        const interactiveOrImportant = [
          'button', 'a', 'input', 'select', 'textarea', 'form',
          'div', 'section', 'article', 'nav', 'main', 'header', 'footer'
        ];

        if (interactiveOrImportant.includes(tagName) || role) {
          const children: any[] = [];
          for (const child of Array.from(el.children)) {
            const childData = buildElementData(child, depth + 1);
            if (childData) children.push(childData);
          }
          if (children.length > 0) {
            elementData.children = children;
          }
        }

        return elementData;
      }

      function getXPath(element: Element): string {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }
        const parts: string[] = [];
        let current: Element | null = element;
        while (current && current !== document.documentElement) {
          let index = 1;
          let sibling = current.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === current.tagName) index++;
            sibling = sibling.previousElementSibling;
          }
          parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
          current = current.parentElement;
        }
        return '/' + parts.join('/');
      }

      // 从body开始构建
      const bodyData = buildElementData(document.body, 0);
      if (bodyData) elements.push(bodyData);

      return elements;
    }, {
      includeHidden,
      maxDepth,
      includeText,
      includeXPath
    });

    // 处理数据并分配UID
    return this.processElementsData(elementsData);
  }

  /**
   * 处理元素数据并分配UID
   */
  private async processElementsData(elementsData: any[]): Promise<ElementSnapshot[]> {
    const result: ElementSnapshot[] = [];

    for (const data of elementsData) {
      const snapshot = await this.processElement(data);
      if (snapshot) {
        result.push(snapshot);
      }
    }

    return result;
  }

  /**
   * 处理单个元素
   */
  private async processElement(data: any): Promise<ElementSnapshot | null> {
    const uid = this.generateUID();
    
    // 尝试找到对应的ElementHandle
    let elementHandle: ElementHandle | null = null;
    try {
      if (data.attributes?.id) {
        elementHandle = await this.page.$(`#${data.attributes.id}`);
      } else if (data.xpath && typeof (this.page as any).$x === 'function') {
        const handles = await (this.page as any).$x(data.xpath);
        if (handles && handles.length > 0) {
          elementHandle = handles[0] as ElementHandle;
        }
      }
      
      // 如果找到了ElementHandle，保存映射
      if (elementHandle) {
        this.uidMap.set(uid, elementHandle);
      }
    } catch (error) {
      // 忽略错误，继续处理
    }

    const snapshot: ElementSnapshot = {
      uid,
      tagName: data.tagName,
      role: data.role,
      name: data.name,
      text: data.text,
      value: data.value,
      attributes: data.attributes || {},
      xpath: data.xpath
    };

    // 递归处理子元素
    if (data.children && data.children.length > 0) {
      const children: ElementSnapshot[] = [];
      for (const childData of data.children) {
        const childSnapshot = await this.processElement(childData);
        if (childSnapshot) {
          children.push(childSnapshot);
        }
      }
      snapshot.children = children;
    }

    return snapshot;
  }

  /**
   * 生成UID
   */
  private generateUID(): string {
    return `uid-${++this.uidCounter}`;
  }

  /**
   * 根据UID获取ElementHandle
   */
  getElementByUid(uid: string): ElementHandle | undefined {
    return this.uidMap.get(uid);
  }

  /**
   * 格式化为文本表示（AI友好）
   */
  private formatAsText(elements: ElementSnapshot[], indent: string = ''): string {
    const lines: string[] = [];

    for (const el of elements) {
      let line = `${indent}[${el.uid}] <${el.tagName}>`;
      
      // 添加role
      if (el.role) {
        line += ` role="${el.role}"`;
      }

      // 添加name
      if (el.name) {
        line += ` name="${el.name}"`;
      }

      // 添加关键属性
      if (el.attributes.id) {
        line += ` id="${el.attributes.id}"`;
      }
      if (el.attributes['data-test']) {
        line += ` data-test="${el.attributes['data-test']}"`;
      }
      if (el.attributes.type) {
        line += ` type="${el.attributes.type}"`;
      }

      // 添加文本或值
      if (el.text) {
        line += ` "${el.text.substring(0, 50)}${el.text.length > 50 ? '...' : ''}"`;
      } else if (el.value) {
        line += ` value="${el.value}"`;
      }

      lines.push(line);

      // 递归处理子元素
      if (el.children && el.children.length > 0) {
        lines.push(this.formatAsText(el.children, indent + '  '));
      }
    }

    return lines.join('\n');
  }

  /**
   * 清理资源
   */
  clear() {
    this.uidMap.clear();
    this.uidCounter = 0;
  }
}

