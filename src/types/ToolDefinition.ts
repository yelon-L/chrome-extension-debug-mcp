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
  inputSchema: any; // JSON Schema for tool parameters
  handler: ToolHandler;
}

export type ToolCategory = 'chrome' | 'page' | 'extension' | 'interaction' | 'evaluation' | 'debug';

export type ToolHandler = (
  request: ToolRequest,
  context: ToolContext
) => Promise<ToolResult>;

export interface ToolRequest {
  params: any; // Tool-specific parameters
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
export const TOOL_CATEGORIES: Record<ToolCategory, string> = {
  chrome: 'Chrome Management',
  page: 'Page Operations', 
  extension: 'Extension Debug',
  interaction: 'User Interaction',
  evaluation: 'Code Execution',
  debug: 'Debug & Diagnostics'
};

/**
 * Tool registry for centralized tool management
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  listByCategory(category: ToolCategory): ToolDefinition[] {
    return this.list().filter(tool => 
      tool.annotations?.category === category
    );
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  clear(): void {
    this.tools.clear();
  }
}
