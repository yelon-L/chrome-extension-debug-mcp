/**
 * Standardized tool definition types
 * Borrowed and adapted from Chrome DevTools MCP architecture
 */
export interface ToolDefinition {
    name: string;
    description: string;
    annotations?: {
        title?: string;
        category?: ToolCategory;
        readOnlyHint?: boolean;
    };
    inputSchema: any;
    handler: ToolHandler;
}
export type ToolCategory = 'chrome' | 'page' | 'extension' | 'interaction' | 'evaluation' | 'debug';
export type ToolHandler = (request: ToolRequest, context: ToolContext) => Promise<ToolResult>;
export interface ToolRequest {
    params: any;
}
export interface ToolContext {
    chromeManager: any;
    pageManager: any;
    extensionHandler: any;
    interactionHandler: any;
    evaluationHandler: any;
}
export interface ToolResult {
    content: Array<{
        type: 'text' | 'image';
        text?: string;
        data?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
/**
 * Standard tool categories for organization
 */
export declare const TOOL_CATEGORIES: Record<ToolCategory, string>;
/**
 * Tool registry for centralized tool management
 */
export declare class ToolRegistry {
    private tools;
    register(tool: ToolDefinition): void;
    get(name: string): ToolDefinition | undefined;
    list(): ToolDefinition[];
    listByCategory(category: ToolCategory): ToolDefinition[];
    has(name: string): boolean;
    clear(): void;
}
//# sourceMappingURL=ToolDefinition.d.ts.map