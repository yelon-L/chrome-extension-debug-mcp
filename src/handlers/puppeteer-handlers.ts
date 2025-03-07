import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Type guards for arguments validation
export function isClickArgs(args: any): args is ClickArgs {
  return typeof args === 'object' && typeof args.selector === 'string';
}

export function isTypeArgs(args: any): args is TypeArgs {
  return typeof args === 'object' && typeof args.selector === 'string' && typeof args.text === 'string';
}

export function isSelectArgs(args: any): args is SelectArgs {
  return typeof args === 'object' && typeof args.selector === 'string' && typeof args.value === 'string';
}

export function isHoverArgs(args: any): args is HoverArgs {
  return typeof args === 'object' && typeof args.selector === 'string';
}

export function isWaitForSelectorArgs(args: any): args is WaitForSelectorArgs {
  return typeof args === 'object' && typeof args.selector === 'string';
}

export function isScreenshotArgs(args: any): args is ScreenshotArgs {
  return typeof args === 'object' && typeof args.path === 'string';
}

export function isNavigateArgs(args: any): args is NavigateArgs {
  return typeof args === 'object' && typeof args.url === 'string';
}

export function isGetTextArgs(args: any): args is GetTextArgs {
  return typeof args === 'object' && typeof args.selector === 'string';
}

export function isGetAttributeArgs(args: any): args is GetAttributeArgs {
  return typeof args === 'object' && typeof args.selector === 'string' && typeof args.attribute === 'string';
}

export function isSetViewportArgs(args: any): args is SetViewportArgs {
  return typeof args === 'object' &&
    typeof args.width === 'number' &&
    typeof args.height === 'number';
}
import { Page } from 'puppeteer';
import {
  ClickArgs,
  TypeArgs,
  SelectArgs,
  HoverArgs,
  WaitForSelectorArgs,
  ScreenshotArgs,
  NavigateArgs,
  GetTextArgs,
  GetAttributeArgs,
  SetViewportArgs
} from '../types/puppeteer-tools.js';

/**
 * Handles click operations on elements
 */
export async function handleClick(page: Page, args: ClickArgs) {
  try {
    await page.waitForSelector(args.selector);
    if (args.delay) {
      await new Promise(resolve => setTimeout(resolve, args.delay));
    }
    await page.click(args.selector, { button: args.button as any || 'left' });
    return { content: [{ type: 'text', text: `Clicked element: ${args.selector}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Click failed: ${error}`);
  }
}

/**
 * Handles typing text into input fields
 */
export async function handleType(page: Page, args: TypeArgs) {
  try {
    await page.waitForSelector(args.selector);
    await page.type(args.selector, args.text, { delay: args.delay });
    return { content: [{ type: 'text', text: `Typed text into: ${args.selector}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Type failed: ${error}`);
  }
}

/**
 * Handles selecting options in dropdowns
 */
export async function handleSelect(page: Page, args: SelectArgs) {
  try {
    await page.waitForSelector(args.selector);
    await page.select(args.selector, args.value);
    return { content: [{ type: 'text', text: `Selected value in: ${args.selector}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Select failed: ${error}`);
  }
}

/**
 * Handles hovering over elements
 */
export async function handleHover(page: Page, args: HoverArgs) {
  try {
    await page.waitForSelector(args.selector);
    await page.hover(args.selector);
    return { content: [{ type: 'text', text: `Hovered over: ${args.selector}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Hover failed: ${error}`);
  }
}

/**
 * Handles waiting for elements to appear
 */
export async function handleWaitForSelector(page: Page, args: WaitForSelectorArgs) {
  try {
    await page.waitForSelector(args.selector, {
      visible: args.visible,
      timeout: args.timeout,
    });
    return { content: [{ type: 'text', text: `Found element: ${args.selector}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Wait for selector failed: ${error}`);
  }
}

/**
 * Handles taking screenshots
 */
export async function handleScreenshot(page: Page, args: ScreenshotArgs) {
  try {
    if (args.selector) {
      const element = await page.$(args.selector);
      if (!element) {
        throw new Error(`Element not found: ${args.selector}`);
      }
      await element.screenshot({
        path: args.path,
        type: args.path.endsWith('.jpg') ? 'jpeg' : 'png',
        quality: args.quality,
      });
    } else {
      await page.screenshot({
        path: args.path,
        fullPage: args.fullPage,
        type: args.path.endsWith('.jpg') ? 'jpeg' : 'png',
        quality: args.quality,
      });
    }
    return { content: [{ type: 'text', text: `Screenshot saved to: ${args.path}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Screenshot failed: ${error}`);
  }
}

/**
 * Handles navigation to URLs
 */
export async function handleNavigate(page: Page, args: NavigateArgs) {
  try {
    await page.goto(args.url, {
      waitUntil: args.waitUntil || 'networkidle0',
      timeout: args.timeout,
    });
    return { content: [{ type: 'text', text: `Navigated to: ${args.url}` }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Navigation failed: ${error}`);
  }
}

/**
 * Handles getting text content from elements
 */
export async function handleGetText(page: Page, args: GetTextArgs) {
  try {
    await page.waitForSelector(args.selector);
    const text = await page.$eval(args.selector, (el) => el.textContent);
    return { content: [{ type: 'text', text: text || '' }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Get text failed: ${error}`);
  }
}

/**
 * Handles getting attribute values from elements
 */
export async function handleGetAttribute(page: Page, args: GetAttributeArgs) {
  try {
    await page.waitForSelector(args.selector);
    const value = await page.$eval(
      args.selector,
      (el, attr) => el.getAttribute(attr),
      args.attribute
    );
    return { content: [{ type: 'text', text: value || '' }] };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Get attribute failed: ${error}`);
  }
}

/**
 * Handles setting viewport size and properties
 */
export async function handleSetViewport(page: Page, args: SetViewportArgs) {
  try {
    await page.setViewport({
      width: args.width,
      height: args.height,
      deviceScaleFactor: args.deviceScaleFactor || 1,
      isMobile: args.isMobile || false,
    });
    return {
      content: [{
        type: 'text',
        text: `Viewport set to ${args.width}x${args.height}`
      }]
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Set viewport failed: ${error}`);
  }
}