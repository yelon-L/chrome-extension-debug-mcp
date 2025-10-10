/**
 * Standardized tool definition types
 * Borrowed and adapted from Chrome DevTools MCP architecture
 */
/**
 * Standard tool categories for organization
 */
export const TOOL_CATEGORIES = {
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
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool '${tool.name}' is already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    list() {
        return Array.from(this.tools.values());
    }
    listByCategory(category) {
        return this.list().filter(tool => tool.annotations?.category === category);
    }
    has(name) {
        return this.tools.has(name);
    }
    clear() {
        this.tools.clear();
    }
}
//# sourceMappingURL=ToolDefinition.js.map