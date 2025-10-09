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
  sourceTypes?: Array<'background'|'content_script'|'popup'|'options'|'service_worker'|'page'|'extension'>; 
  level?: Array<'error'|'warn'|'info'|'log'|'debug'>;
  since?: number; 
  tabId?: string; // 过滤特定tab的content script日志
  clear?: boolean; 
}

export interface ExtensionLogEntry {
  timestamp: number;
  level: string;
  message: string;
  source: string; // 'background' | 'content_script' | 'popup' | etc.
  extensionId?: string;
  tabId?: string; // 如果是content script
  url?: string;   // 页面URL
  contextType?: string; // 上下文类型
}

export interface ExtensionLogsResponse {
  logs: ExtensionLogEntry[];
  totalCount: number;
  filteredCount: number;
  extensionInfo?: {
    id: string;
    name: string;
    version: string;
  };
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
  tabId?: string;
  extensionId?: string;
  checkAllTabs?: boolean;
}

export interface ContentScriptInjectionStatus {
  injected: boolean;
  scriptCount: number;
  cssCount: number;
  errors: string[];
  performance: {
    injectionTime: number;
    domReadyTime: number;
  };
}

export interface ContentScriptDOMModifications {
  elementsAdded: number;
  elementsRemoved: number;
  styleChanges: number;
}

export interface ContentScriptConflict {
  type: 'css' | 'js' | 'dom';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ContentScriptStatusResult {
  tabId: string;
  url: string;
  extensionId: string;
  injectionStatus: ContentScriptInjectionStatus;
  domModifications: ContentScriptDOMModifications;
  conflicts: ContentScriptConflict[];
}

export interface ContentScriptStatusResponse {
  results: ContentScriptStatusResult[];
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

// Week 2: Context Management Types
export * from './context-types.js';

// Phase 1: Performance Analysis Types
export * from './performance-types.js';
export * from './network-types.js';
export * from './impact-types.js';

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
