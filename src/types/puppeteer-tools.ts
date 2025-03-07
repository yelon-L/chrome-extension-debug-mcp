/**
 * Type definitions for Puppeteer-based MCP tools
 */

export interface ClickArgs {
  /** CSS selector for element to click */
  selector: string;
  /** Optional delay before clicking (in milliseconds) */
  delay?: number;
  /** Optional button to use (left, right, middle) */
  button?: 'left' | 'right' | 'middle';
}

export interface TypeArgs {
  /** CSS selector for input field */
  selector: string;
  /** Text to type */
  text: string;
  /** Optional delay between keystrokes (in milliseconds) */
  delay?: number;
}

export interface SelectArgs {
  /** CSS selector for select element */
  selector: string;
  /** Option value or label to select */
  value: string;
}

export interface HoverArgs {
  /** CSS selector for element to hover */
  selector: string;
}

export interface WaitForSelectorArgs {
  /** CSS selector to wait for */
  selector: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Whether element should be visible */
  visible?: boolean;
}

export interface ScreenshotArgs {
  /** Optional CSS selector to screenshot specific element */
  selector?: string;
  /** Output path for screenshot */
  path: string;
  /** Optional screenshot options */
  fullPage?: boolean;
  /** Image quality (0-100) for JPEG */
  quality?: number;
}

export interface NavigateArgs {
  /** URL to navigate to */
  url: string;
  /** Optional wait condition */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** Optional timeout in milliseconds */
  timeout?: number;
}

export interface GetTextArgs {
  /** CSS selector for element */
  selector: string;
}

export interface GetAttributeArgs {
  /** CSS selector for element */
  selector: string;
  /** Attribute name to get */
  attribute: string;
}

export interface SetViewportArgs {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Device scale factor */
  deviceScaleFactor?: number;
  /** Whether to emulate mobile device */
  isMobile?: boolean;
}