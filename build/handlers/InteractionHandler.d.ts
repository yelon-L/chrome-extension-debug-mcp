/**
 * Interaction Handler Module
 * Handles user interactions like clicking, typing, screenshots
 */
import { ClickArgs, TypeArgs, ScreenshotArgs } from '../types/index.js';
import { PageManager } from '../managers/PageManager.js';
export declare class InteractionHandler {
    private pageManager;
    constructor(pageManager: PageManager);
    /**
     * Click on an element
     */
    click(args: ClickArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Type text into an element
     */
    type(args: TypeArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Take a screenshot
     */
    screenshot(args: ScreenshotArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
}
//# sourceMappingURL=InteractionHandler.d.ts.map