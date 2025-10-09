/**
 * 扩展上下文管理相关类型定义
 * Week 2: Context Management Implementation
 */

export interface ListExtensionContextsArgs {
  extensionId?: string; // 不传则列出所有扩展的上下文
}

export interface ExtensionBackgroundContext {
  type: 'page' | 'service_worker';
  targetId: string;
  url: string;
  active: boolean;
  lastActivity: number;
}

export interface ExtensionContentScriptContext {
  tabId: string;
  targetId: string;
  url: string;
  frameId: number;
  injected: boolean;
  isolated: boolean;
}

export interface ExtensionPopupContext {
  targetId: string;
  url: string;
  open: boolean;
  windowId?: string;
}

export interface ExtensionOptionsContext {
  targetId: string;
  url: string;
  open: boolean;
  tabId?: string;
}

export interface ExtensionDevToolsContext {
  targetId: string;
  inspectedTabId: string;
  url: string;
}

export interface ExtensionContexts {
  background?: ExtensionBackgroundContext;
  contentScripts: ExtensionContentScriptContext[];
  popup?: ExtensionPopupContext;
  options?: ExtensionOptionsContext;
  devtools?: ExtensionDevToolsContext[];
}

export interface ExtensionContext {
  extensionId: string;
  extensionName: string;
  manifestVersion: number;
  contexts: ExtensionContexts;
}

export interface ListExtensionContextsResponse {
  extensions: ExtensionContext[];
  totalContexts: number;
  summary: {
    activeBackgrounds: number;
    totalContentScripts: number;
    openPopups: number;
    openOptions: number;
    activeDevtools: number;
  };
}

export interface SwitchExtensionContextArgs {
  extensionId: string;
  contextType: 'background' | 'content_script' | 'popup' | 'options' | 'devtools';
  tabId?: string; // content_script时需要
  targetId?: string; // 直接指定targetId
}

export interface SwitchExtensionContextResponse {
  success: boolean;
  currentContext: {
    extensionId: string;
    contextType: string;
    targetId: string;
    url: string;
    tabId?: string;
  };
  capabilities: {
    canEvaluate: boolean;
    canInjectScript: boolean;
    canAccessStorage: boolean;
    chromeAPIs: string[]; // 可用的Chrome API列表
  };
}

export interface InspectExtensionStorageArgs {
  extensionId: string;
  storageTypes?: ('local' | 'sync' | 'session' | 'managed')[];
  keys?: string[]; // 指定key，不传则返回所有
  watch?: boolean; // 是否开启实时监控
}

export interface ExtensionStorageData {
  type: 'local' | 'sync' | 'session' | 'managed';
  data: Record<string, any>;
  quota?: {
    used: number;
    total: number;
  };
  lastModified?: number;
}

export interface InspectExtensionStorageResponse {
  extensionId: string;
  storageData: ExtensionStorageData[];
  watching: boolean;
  capabilities: {
    canRead: boolean;
    canWrite: boolean;
    canClear: boolean;
  };
}
