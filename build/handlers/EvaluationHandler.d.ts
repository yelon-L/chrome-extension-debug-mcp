/**
 * Evaluation Handler Module
 * Handles JavaScript code execution in browser context
 */
import { EvaluateArgs } from '../types/index.js';
import { PageManager } from '../managers/PageManager.js';
export declare class EvaluationHandler {
    private pageManager;
    constructor(pageManager: PageManager);
    /**
     * Evaluate JavaScript code in browser context
     */
    evaluate(args: EvaluateArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
}
//# sourceMappingURL=EvaluationHandler.d.ts.map