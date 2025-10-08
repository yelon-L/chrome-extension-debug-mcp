/**
 * Type definitions for Chrome Debug MCP
 */

export interface ConsoleAPICalledEvent {
  type: string;
  args: { value?: any; description?: string }[];
  timestamp: number;
  executionContextId: number;
  stackTrace?: {
    callFrames: Array<{
      functionName: string;
      scriptId: string;
      url: string;
      lineNumber: number;
      columnNumber: number;
    }>;
  };
}

export interface ConsoleMessage {
  /** The type of console message (log, warn, error, etc.) */
  type: string;
  /** The actual message content */
  text: string;
}

export interface LaunchChromeArgs {
  /** URL to navigate to after launch */
  url?: string;
  /** Path to a specific Chrome executable (uses bundled Chrome if not provided) */
  executablePath?: string;
  /** Path to a specific user data directory (optional, uses default Chrome profile if not provided) */
  userDataDir?: string;
  /** Path to an unpacked Chrome extension to load */
  loadExtension?: string;
  /** Path to extension that should remain enabled while others are disabled */
  disableExtensionsExcept?: string;
  /** Whether to disable Chrome's "Automation Controlled" banner */
  disableAutomationControlled?: boolean;
  /** Path to a userscript file to inject into the page */
  userscriptPath?: string;
}

export interface GetConsoleLogsArgs {
  /** Whether to clear the logs after retrieving them */
  clear?: boolean;
}

export interface EvaluateArgs {
  /** JavaScript code to evaluate in the browser context */
  expression?: string;
  /** Optional tab to evaluate in */
  tabId?: string;
}

export interface AttachArgs { 
  host?: string; 
  port?: number; 
}

export interface ListExtensionsArgs {}

export interface GetExtensionLogsArgs { 
  extensionId?: string; 
  sourceTypes?: Array<'page'|'extension'|'service_worker'|'content_script'>; 
  since?: number; 
  clear?: boolean; 
}

export interface ReloadExtensionArgs { 
  extensionId: string; 
}

export interface InjectContentScriptArgs { 
  extensionId?: string; 
  tabId: string; 
  code?: string; 
  files?: string[]; 
}

export interface ContentScriptStatusArgs { 
  tabId: string; 
}

export interface ClickArgs {
  selector: string;
  delay?: number;
  button?: 'left'|'middle'|'right';
  clickCount?: number;
  tabId?: string;
}

export interface TypeArgs {
  selector: string;
  text: string;
  delay?: number;
  clear?: boolean;
  /** Optional specific tab ID to type into */
  tabId?: string;
}

export interface ScreenshotArgs {
  path?: string;
  fullPage?: boolean;
  selector?: string;
  clip?: {x:number;y:number;width:number;height:number};
  returnBase64?: boolean;
  /** Optional specific tab ID to take screenshot from */
  tabId?: string;
}

export interface NewTabArgs {
  url?: string;
}

export interface SwitchTabArgs {
  tabId: string;
}

export interface CloseTabArgs {
  tabId: string;
}

// Remote MCP Transport Types
export type TransportType = 'stdio' | 'sse' | 'http';

export interface RemoteMCPConfig {
  port?: number;
  host?: string;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
}
