/**
 * Evaluation Handler Module
 * Handles JavaScript code execution in browser context
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { EvaluateArgs } from '../types/index.js';
import { PageManager } from '../managers/PageManager.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[EvaluationHandler]', ...args);

export class EvaluationHandler {
  private pageManager: PageManager;

  constructor(pageManager: PageManager) {
    this.pageManager = pageManager;
  }

  /**
   * Evaluate JavaScript code in browser context
   */
  async evaluate(args: EvaluateArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const browser = this.pageManager.getBrowser();
    if (!browser) {
      throw new McpError(
        ErrorCode.InternalError,
        'Chrome is not running. Call launch_chrome first.'
      );
    }

    if (!args?.expression) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Expression is required'
      );
    }

    try {
      // If tabId is specified, use Puppeteer page.evaluate for that specific tab
      if (args.tabId) {
        const page = this.pageManager.getTabIdToPageMap().get(args.tabId);
        if (!page) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Unknown tabId: ${args.tabId}`
          );
        }
        
        const result = await page.evaluate((expr) => {
          // Use indirect eval to execute in global scope
          return (0, eval)(expr);
        }, args.expression);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ type: typeof result, value: result }, null, 2),
            },
          ],
        };
      }
      
      // CRITICAL FIX: Always use current page's Puppeteer context
      // This ensures evaluate follows tab switching correctly
      const page = await this.pageManager.getActivePage();
      log(`Evaluating on page: ${page.url()}`);
      
      const result = await page.evaluate((expr) => {
        // Use indirect eval to execute in global scope
        return (0, eval)(expr);
      }, args.expression);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ type: typeof result, value: result }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Evaluation failed: ${error}`
      );
    }
  }
}
