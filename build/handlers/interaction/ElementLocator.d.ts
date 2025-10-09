/**
 * UID-based智能元素定位模块
 * Phase 4: 交互与快照增强 - 4.3 核心功能
 */
import { ChromeManager } from '../../managers/ChromeManager.js';
import { PageManager } from '../../managers/PageManager.js';
export interface ElementUID {
    id: string;
    selectors: string[];
    attributes: Record<string, string>;
    textContent?: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    hierarchy: string[];
    stability: {
        score: number;
        factors: string[];
        lastSeen: number;
    };
}
export interface LocatorOptions {
    preferredStrategy?: 'id' | 'class' | 'text' | 'xpath' | 'css' | 'auto';
    includeInvisible?: boolean;
    generateBackups?: boolean;
    stabilityThreshold?: number;
    timeout?: number;
}
export interface LocatorResult {
    found: boolean;
    element?: {
        selector: string;
        uid: string;
        confidence: number;
        strategy: string;
        bounds: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    alternatives?: Array<{
        selector: string;
        confidence: number;
        strategy: string;
    }>;
    performance: {
        searchTimeMs: number;
        strategiesTried: number;
        elementsScanned: number;
    };
}
export interface SelectorGenerationResult {
    selectors: Array<{
        selector: string;
        strategy: string;
        confidence: number;
        stability: number;
        specificity: number;
    }>;
    recommended: string;
    backup: string[];
    analysis: {
        domComplexity: number;
        elementUniqueness: number;
        hierarchyDepth: number;
    };
}
export interface DOMStabilityAnalysis {
    overallStability: number;
    analysis: {
        structuralChanges: number;
        attributeChanges: number;
        contentChanges: number;
        positionChanges: number;
    };
    recommendations: string[];
    monitoringDuration: number;
    snapshots: Array<{
        timestamp: number;
        elementCount: number;
        majorChanges: string[];
    }>;
}
export declare class ElementLocator {
    private chromeManager;
    private pageManager;
    private uidCache;
    private stabilityMonitor;
    constructor(chromeManager: ChromeManager, pageManager: PageManager);
    /**
     * 生成稳定的元素选择器
     */
    generateStableSelector(options: {
        targetElement?: string;
        coordinates?: {
            x: number;
            y: number;
        };
        textContent?: string;
        analysisDepth?: number;
    }): Promise<SelectorGenerationResult>;
    /**
     * 按内容查找元素
     */
    findElementByContent(options: {
        textContent: string;
        tag?: string;
        exactMatch?: boolean;
        includeHidden?: boolean;
        maxResults?: number;
    }): Promise<LocatorResult[]>;
    /**
     * 分析DOM稳定性
     */
    analyzeDOMStability(options: {
        monitorDuration?: number;
        samplingInterval?: number;
        focusSelector?: string;
    }): Promise<DOMStabilityAnalysis>;
    /**
     * 根据坐标获取元素
     */
    private getElementAtCoordinates;
    /**
     * 根据文本查找元素
     */
    private findElementByText;
    /**
     * 生成多种选择器策略
     */
    private generateMultipleSelectors;
    /**
     * 分析选择器质量
     */
    private analyzeSelectors;
    /**
     * 选择最佳选择器
     */
    private selectBestSelector;
    /**
     * 选择备用选择器
     */
    private selectBackupSelectors;
    /**
     * 生成稳定性建议
     */
    private generateStabilityRecommendations;
}
//# sourceMappingURL=ElementLocator.d.ts.map