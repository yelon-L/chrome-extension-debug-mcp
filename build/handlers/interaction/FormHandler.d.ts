/**
 * 高级表单处理模块
 * Phase 4: 交互与快照增强 - 4.4 核心功能
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
export interface FormField {
    selector: string;
    type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'time';
    label?: string;
    value?: string | boolean | string[];
    required?: boolean;
    placeholder?: string;
    options?: string[];
}
export interface BulkFillOptions {
    form?: string;
    fields: FormField[];
    strategy?: 'sequential' | 'parallel' | 'smart';
    waitBetweenFields?: number;
    validateAfterFill?: boolean;
    submitAfterFill?: boolean;
    clearBeforeFill?: boolean;
}
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
export declare class FormHandler {
    private chromeManager;
    private pageManager;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 分析页面表单结构
     */
    analyzeForms(): Promise<FormAnalysis>;
    /**
     * 批量填充表单
     */
    fillFormBulk(options: BulkFillOptions): Promise<FormOperationResult>;
    /**
     * 处理文件上传
     */
    handleFileUpload(options: FileUploadOptions): Promise<FormOperationResult>;
    /**
     * 处理复杂控件
     */
    handleComplexControl(options: ComplexControlOptions): Promise<FormOperationResult>;
    /**
     * 顺序填充表单
     */
    private fillSequential;
    /**
     * 并行填充表单
     */
    private fillParallel;
    /**
     * 智能填充表单
     */
    private fillSmart;
    /**
     * 填充单个字段
     */
    private fillSingleField;
    /**
     * 清除字段内容
     */
    private clearField;
    /**
     * 验证表单
     */
    private validateForm;
    /**
     * 提交表单
     */
    private submitForm;
    /**
     * 处理下拉菜单
     */
    private handleDropdown;
    /**
     * 处理多选框
     */
    private handleMultiselect;
    /**
     * 处理自动完成
     */
    private handleAutocomplete;
    /**
     * 处理日期选择器
     */
    private handleDatepicker;
    /**
     * 处理滑块
     */
    private handleSlider;
    /**
     * 处理开关
     */
    private handleToggle;
    /**
     * 处理富文本编辑器
     */
    private handleWysiwyg;
    /**
     * 创建临时文件
     */
    private createTempFile;
    /**
     * 等待上传完成
     */
    private waitForUploadComplete;
    /**
     * 创建错误结果
     */
    private createErrorResult;
}
//# sourceMappingURL=FormHandler.d.ts.map