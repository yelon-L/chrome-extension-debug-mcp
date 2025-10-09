/**
 * 高级表单处理模块
 * Phase 4: 交互与快照增强 - 4.4 核心功能
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';

const log = (...args: any[]) => console.error('[FormHandler]', ...args);

// 表单字段接口
export interface FormField {
  selector: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'time';
  label?: string;
  value?: string | boolean | string[];
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select, radio, checkbox
}

// 批量填充选项
export interface BulkFillOptions {
  form?: string; // form selector
  fields: FormField[];
  strategy?: 'sequential' | 'parallel' | 'smart';
  waitBetweenFields?: number;
  validateAfterFill?: boolean;
  submitAfterFill?: boolean;
  clearBeforeFill?: boolean;
}

// 表单分析结果
export interface FormAnalysis {
  forms: Array<{
    selector: string;
    id?: string;
    name?: string;
    action?: string;
    method?: string;
    fields: FormField[];
    submitButtons: Array<{
      selector: string;
      text: string;
      type: string;
    }>;
  }>;
  totalFields: number;
  fieldTypes: Record<string, number>;
  complexity: 'simple' | 'medium' | 'complex';
  recommendations: string[];
}

// 文件上传选项
export interface FileUploadOptions {
  selector: string;
  files: Array<{
    name: string;
    path?: string;
    content?: string;
    mimeType?: string;
    size?: number;
  }>;
  multiple?: boolean;
  waitForUpload?: boolean;
  uploadTimeout?: number;
}

// 复杂控件选项
export interface ComplexControlOptions {
  selector: string;
  type: 'dropdown' | 'multiselect' | 'autocomplete' | 'datepicker' | 'slider' | 'toggle' | 'wysiwyg';
  value: any;
  options?: {
    searchText?: string;
    waitForOptions?: number;
    clickToOpen?: boolean;
    customActions?: string[];
  };
}

// 表单操作结果
export interface FormOperationResult {
  success: boolean;
  processedFields: number;
  errors: Array<{
    field: string;
    error: string;
  }>;
  warnings: string[];
  performance: {
    totalTime: number;
    averageFieldTime: number;
  };
}

export class FormHandler {
  constructor(
    private chromeManager: ChromeManager,
    private pageManager: PageManager
  ) {}

  /**
   * 分析页面表单结构
   */
  async analyzeForms(): Promise<FormAnalysis> {
    try {
      log('Starting form analysis...');

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available');
      }

      const analysisScript = `
        (() => {
          const forms = [];
          const formElements = document.querySelectorAll('form');
          
          formElements.forEach((form, index) => {
            const formData = {
              selector: form.id ? '#' + form.id : \`form:nth-child(\${index + 1})\`,
              id: form.id || null,
              name: form.name || null,
              action: form.action || null,
              method: form.method || 'GET',
              fields: [],
              submitButtons: []
            };

            // 分析表单字段
            const fieldSelectors = [
              'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
              'input[type="number"]', 'input[type="tel"]', 'input[type="url"]',
              'input[type="date"]', 'input[type="time"]', 'input[type="file"]',
              'input[type="checkbox"]', 'input[type="radio"]',
              'textarea', 'select'
            ];

            fieldSelectors.forEach(selector => {
              const elements = form.querySelectorAll(selector);
              elements.forEach(element => {
                const field = {
                  selector: this.generateFieldSelector(element),
                  type: this.getFieldType(element),
                  label: this.getFieldLabel(element),
                  required: element.hasAttribute('required'),
                  placeholder: element.placeholder || null,
                  options: this.getFieldOptions(element)
                };
                formData.fields.push(field);
              });
            });

            // 分析提交按钮
            const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
            buttons.forEach(button => {
              formData.submitButtons.push({
                selector: this.generateFieldSelector(button),
                text: button.textContent?.trim() || button.value || 'Submit',
                type: button.type || 'submit'
              });
            });

            forms.push(formData);
          });

          // 计算统计信息
          const totalFields = forms.reduce((sum, form) => sum + form.fields.length, 0);
          const fieldTypes = {};
          forms.forEach(form => {
            form.fields.forEach(field => {
              fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
            });
          });

          // 评估复杂度
          let complexity = 'simple';
          if (totalFields > 20 || forms.some(f => f.fields.some(field => field.type === 'file'))) {
            complexity = 'complex';
          } else if (totalFields > 10 || forms.some(f => f.fields.length > 8)) {
            complexity = 'medium';
          }

          // 生成建议
          const recommendations = [];
          if (forms.length === 0) {
            recommendations.push('页面未发现表单元素');
          } else {
            if (forms.some(f => f.fields.some(field => !field.label))) {
              recommendations.push('部分字段缺少标签，建议使用智能标签识别');
            }
            if (forms.some(f => f.fields.some(field => field.type === 'file'))) {
              recommendations.push('检测到文件上传字段，建议使用专用文件处理功能');
            }
            if (totalFields > 15) {
              recommendations.push('表单较复杂，建议使用批量填充功能');
            }
          }

          return {
            forms,
            totalFields,
            fieldTypes,
            complexity,
            recommendations
          };

          // 辅助函数
          function generateFieldSelector(element) {
            if (element.id) return '#' + element.id;
            if (element.name) return \`[name="\${element.name}"]\`;
            if (element.className) {
              const classes = element.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) return '.' + classes.join('.');
            }
            
            // 生成基于位置的选择器
            const tagName = element.tagName.toLowerCase();
            const parent = element.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
              const index = siblings.indexOf(element);
              return \`\${tagName}:nth-of-type(\${index + 1})\`;
            }
            
            return tagName;
          }

          function getFieldType(element) {
            if (element.tagName.toLowerCase() === 'textarea') return 'textarea';
            if (element.tagName.toLowerCase() === 'select') return 'select';
            return element.type || 'text';
          }

          function getFieldLabel(element) {
            // 查找关联的label
            if (element.id) {
              const label = document.querySelector(\`label[for="\${element.id}"]\`);
              if (label) return label.textContent?.trim();
            }

            // 查找父级label
            const parentLabel = element.closest('label');
            if (parentLabel) return parentLabel.textContent?.trim();

            // 查找前面的文本节点或元素
            const prev = element.previousElementSibling;
            if (prev && ['label', 'span', 'div'].includes(prev.tagName.toLowerCase())) {
              return prev.textContent?.trim();
            }

            return element.placeholder || element.name || null;
          }

          function getFieldOptions(element) {
            if (element.tagName.toLowerCase() === 'select') {
              return Array.from(element.options).map(option => option.text);
            }
            
            if (element.type === 'radio' || element.type === 'checkbox') {
              const name = element.name;
              if (name) {
                const siblings = document.querySelectorAll(\`[name="\${name}"]\`);
                return Array.from(siblings).map(el => {
                  const label = this.getFieldLabel(el);
                  return label || el.value;
                });
              }
            }

            return null;
          }
        })();
      `;

      const result = await page.evaluate(analysisScript);
      log('Form analysis completed', { totalForms: (result as any).forms.length, totalFields: (result as any).totalFields });

      return result as FormAnalysis;

    } catch (error: any) {
      log('Form analysis failed:', error);
      throw new McpError(ErrorCode.InternalError, `Form analysis failed: ${error.message}`);
    }
  }

  /**
   * 批量填充表单
   */
  async fillFormBulk(options: BulkFillOptions): Promise<FormOperationResult> {
    try {
      log('Starting bulk form fill', options);

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available');
      }

      const startTime = Date.now();
      const errors: Array<{ field: string; error: string }> = [];
      const warnings: string[] = [];
      let processedFields = 0;

      // 根据策略选择填充方式
      switch (options.strategy || 'sequential') {
        case 'sequential':
          await this.fillSequential(page, options, errors, warnings);
          break;
        case 'parallel':
          await this.fillParallel(page, options, errors, warnings);
          break;
        case 'smart':
          await this.fillSmart(page, options, errors, warnings);
          break;
      }

      processedFields = options.fields.length - errors.length;

      // 验证填充结果
      if (options.validateAfterFill) {
        const validationErrors = await this.validateForm(page, options.form);
        warnings.push(...validationErrors);
      }

      // 提交表单
      if (options.submitAfterFill && errors.length === 0) {
        await this.submitForm(page, options.form);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      return {
        success: errors.length === 0,
        processedFields,
        errors,
        warnings,
        performance: {
          totalTime,
          averageFieldTime: processedFields > 0 ? totalTime / processedFields : 0
        }
      };

    } catch (error: any) {
      log('Bulk form fill failed:', error);
      throw new McpError(ErrorCode.InternalError, `Bulk form fill failed: ${error.message}`);
    }
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(options: FileUploadOptions): Promise<FormOperationResult> {
    try {
      log('Handling file upload', options);

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available');
      }

      const startTime = Date.now();
      const errors: Array<{ field: string; error: string }> = [];

      // 查找文件输入元素
      const fileInput = await page.$(options.selector);
      if (!fileInput) {
        errors.push({ field: options.selector, error: 'File input element not found' });
        return this.createErrorResult(errors, startTime);
      }

      // 准备文件数据
      const filePaths: string[] = [];
      for (const file of options.files) {
        if (file.path) {
          filePaths.push(file.path);
        } else if (file.content) {
          // 创建临时文件
          const tempPath = await this.createTempFile(file.name, file.content, file.mimeType);
          filePaths.push(tempPath);
        }
      }

      if (filePaths.length === 0) {
        errors.push({ field: options.selector, error: 'No valid file paths provided' });
        return this.createErrorResult(errors, startTime);
      }

      // 上传文件
      if (options.multiple) {
        await (fileInput as any).uploadFile(...filePaths);
      } else {
        await (fileInput as any).uploadFile(filePaths[0]);
      }

      // 等待上传完成
      if (options.waitForUpload) {
        await this.waitForUploadComplete(page, options.uploadTimeout || 30000);
      }

      const endTime = Date.now();
      return {
        success: true,
        processedFields: 1,
        errors: [],
        warnings: [],
        performance: {
          totalTime: endTime - startTime,
          averageFieldTime: endTime - startTime
        }
      };

    } catch (error: any) {
      log('File upload failed:', error);
      return this.createErrorResult([{ field: options.selector, error: error.message }], Date.now());
    }
  }

  /**
   * 处理复杂控件
   */
  async handleComplexControl(options: ComplexControlOptions): Promise<FormOperationResult> {
    try {
      log('Handling complex control', options);

      const page = await this.pageManager.getActivePage();
      if (!page) {
        throw new McpError(ErrorCode.InternalError, 'No active page available');
      }

      const startTime = Date.now();

      switch (options.type) {
        case 'dropdown':
          await this.handleDropdown(page, options);
          break;
        case 'multiselect':
          await this.handleMultiselect(page, options);
          break;
        case 'autocomplete':
          await this.handleAutocomplete(page, options);
          break;
        case 'datepicker':
          await this.handleDatepicker(page, options);
          break;
        case 'slider':
          await this.handleSlider(page, options);
          break;
        case 'toggle':
          await this.handleToggle(page, options);
          break;
        case 'wysiwyg':
          await this.handleWysiwyg(page, options);
          break;
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported control type: ${options.type}`);
      }

      const endTime = Date.now();
      return {
        success: true,
        processedFields: 1,
        errors: [],
        warnings: [],
        performance: {
          totalTime: endTime - startTime,
          averageFieldTime: endTime - startTime
        }
      };

    } catch (error: any) {
      log('Complex control handling failed:', error);
      return this.createErrorResult([{ field: options.selector, error: error.message }], Date.now());
    }
  }

  /**
   * 顺序填充表单
   */
  private async fillSequential(page: any, options: BulkFillOptions, errors: Array<{ field: string; error: string }>, warnings: string[]): Promise<void> {
    for (const field of options.fields) {
      try {
        if (options.clearBeforeFill) {
          await this.clearField(page, field.selector);
        }

        await this.fillSingleField(page, field);

        if (options.waitBetweenFields) {
          await new Promise(resolve => setTimeout(resolve, options.waitBetweenFields));
        }
      } catch (error: any) {
        errors.push({ field: field.selector, error: error.message });
      }
    }
  }

  /**
   * 并行填充表单
   */
  private async fillParallel(page: any, options: BulkFillOptions, errors: Array<{ field: string; error: string }>, warnings: string[]): Promise<void> {
    const promises = options.fields.map(async (field) => {
      try {
        if (options.clearBeforeFill) {
          await this.clearField(page, field.selector);
        }
        await this.fillSingleField(page, field);
      } catch (error: any) {
        errors.push({ field: field.selector, error: error.message });
      }
    });

    await Promise.all(promises);
  }

  /**
   * 智能填充表单
   */
  private async fillSmart(page: any, options: BulkFillOptions, errors: Array<{ field: string; error: string }>, warnings: string[]): Promise<void> {
    // 先填充必填字段
    const requiredFields = options.fields.filter(f => f.required);
    const optionalFields = options.fields.filter(f => !f.required);

    // 顺序填充必填字段
    for (const field of requiredFields) {
      try {
        if (options.clearBeforeFill) {
          await this.clearField(page, field.selector);
        }
        await this.fillSingleField(page, field);
      } catch (error: any) {
        errors.push({ field: field.selector, error: error.message });
      }
    }

    // 并行填充可选字段
    if (optionalFields.length > 0) {
      const promises = optionalFields.map(async (field) => {
        try {
          if (options.clearBeforeFill) {
            await this.clearField(page, field.selector);
          }
          await this.fillSingleField(page, field);
        } catch (error: any) {
          errors.push({ field: field.selector, error: error.message });
        }
      });

      await Promise.all(promises);
    }
  }

  /**
   * 填充单个字段
   */
  private async fillSingleField(page: any, field: FormField): Promise<void> {
    const element = await page.$(field.selector);
    if (!element) {
      throw new Error(`Element not found: ${field.selector}`);
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
        await element.type(String(field.value || ''));
        break;
      case 'textarea':
        await element.type(String(field.value || ''));
        break;
      case 'select':
        if (typeof field.value === 'string') {
          await element.select(field.value);
        }
        break;
      case 'checkbox':
        if (field.value === true) {
          await element.click();
        }
        break;
      case 'radio':
        if (field.value === true) {
          await element.click();
        }
        break;
      case 'date':
      case 'time':
        await element.type(String(field.value || ''));
        break;
      default:
        log(`Unsupported field type: ${field.type}`);
    }
  }

  /**
   * 清除字段内容
   */
  private async clearField(page: any, selector: string): Promise<void> {
    await page.evaluate((sel: string) => {
      const element = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        element.value = '';
      }
    }, selector);
  }

  /**
   * 验证表单
   */
  private async validateForm(page: any, formSelector?: string): Promise<string[]> {
    const validationScript = `
      (() => {
        const form = ${formSelector ? `document.querySelector('${formSelector}')` : 'document.forms[0]'};
        if (!form) return ['Form not found'];

        const errors = [];
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
          if (input.validity && !input.validity.valid) {
            errors.push(\`\${input.name || input.id || 'Unknown field'}: \${input.validationMessage}\`);
          }
        });

        return errors;
      })();
    `;

    return await page.evaluate(validationScript);
  }

  /**
   * 提交表单
   */
  private async submitForm(page: any, formSelector?: string): Promise<void> {
    if (formSelector) {
      const submitButton = await page.$(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`);
      if (submitButton) {
        await submitButton.click();
      } else {
        await page.evaluate((sel: string) => {
          const form = document.querySelector(sel) as HTMLFormElement;
          if (form) form.submit();
        }, formSelector);
      }
    } else {
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }
    }
  }

  /**
   * 处理下拉菜单
   */
  private async handleDropdown(page: any, options: ComplexControlOptions): Promise<void> {
    // 点击下拉菜单
    await page.click(options.selector);
    
    if (options.options?.waitForOptions) {
      await new Promise(resolve => setTimeout(resolve, options.options!.waitForOptions));
    }

    // 选择选项
    if (typeof options.value === 'string') {
      const optionSelector = `[data-value="${options.value}"], [value="${options.value}"]`;
      await page.click(optionSelector);
    }
  }

  /**
   * 处理多选框
   */
  private async handleMultiselect(page: any, options: ComplexControlOptions): Promise<void> {
    if (Array.isArray(options.value)) {
      for (const value of options.value) {
        const optionSelector = `${options.selector} [value="${value}"]`;
        await page.click(optionSelector);
      }
    }
  }

  /**
   * 处理自动完成
   */
  private async handleAutocomplete(page: any, options: ComplexControlOptions): Promise<void> {
    await page.type(options.selector, options.options?.searchText || String(options.value));
    
    if (options.options?.waitForOptions) {
      await new Promise(resolve => setTimeout(resolve, options.options!.waitForOptions));
    }

    // 选择第一个建议项
    const suggestionSelector = '.autocomplete-item:first-child, .suggestion:first-child';
    await page.click(suggestionSelector);
  }

  /**
   * 处理日期选择器
   */
  private async handleDatepicker(page: any, options: ComplexControlOptions): Promise<void> {
    if (options.options?.clickToOpen) {
      await page.click(options.selector);
    }
    
    // 尝试直接输入日期
    await page.type(options.selector, String(options.value));
  }

  /**
   * 处理滑块
   */
  private async handleSlider(page: any, options: ComplexControlOptions): Promise<void> {
    const slider = await page.$(options.selector);
    if (slider) {
      const value = Number(options.value);
      await page.evaluate((element: any, val: any) => {
        (element as HTMLInputElement).value = String(val);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, slider, value);
    }
  }

  /**
   * 处理开关
   */
  private async handleToggle(page: any, options: ComplexControlOptions): Promise<void> {
    const currentState = await page.evaluate((selector: string) => {
      const element = document.querySelector(selector) as HTMLInputElement;
      return element ? element.checked : false;
    }, options.selector);

    if (currentState !== Boolean(options.value)) {
      await page.click(options.selector);
    }
  }

  /**
   * 处理富文本编辑器
   */
  private async handleWysiwyg(page: any, options: ComplexControlOptions): Promise<void> {
    // 尝试不同的富文本编辑器框架
    const editors = [
      `${options.selector} iframe`, // TinyMCE, CKEditor
      `${options.selector} .ql-editor`, // Quill
      `${options.selector} [contenteditable="true"]` // 通用可编辑区域
    ];

    for (const editorSelector of editors) {
      try {
        const editor = await page.$(editorSelector);
        if (editor) {
          if (editorSelector.includes('iframe')) {
            // 处理iframe中的编辑器
            const frame = await editor.contentFrame();
            if (frame) {
              await frame.type('body', String(options.value));
            }
          } else {
            // 直接在元素中输入
            await editor.type(String(options.value));
          }
          return;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('WYSIWYG editor not found or not supported');
  }

  /**
   * 创建临时文件
   */
  private async createTempFile(name: string, content: string, mimeType?: string): Promise<string> {
    // 这里应该实现临时文件创建逻辑
    // 为了简化，返回一个模拟路径
    return `/tmp/${name}`;
  }

  /**
   * 等待上传完成
   */
  private async waitForUploadComplete(page: any, timeout: number): Promise<void> {
    await page.waitForFunction(
      () => {
        // 检查常见的上传完成指示器
        return !document.querySelector('.uploading, .upload-progress, [data-uploading="true"]');
      },
      { timeout }
    );
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(errors: Array<{ field: string; error: string }>, startTime: number): FormOperationResult {
    return {
      success: false,
      processedFields: 0,
      errors,
      warnings: [],
      performance: {
        totalTime: Date.now() - startTime,
        averageFieldTime: 0
      }
    };
  }
}
