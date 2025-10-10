/**
 * 网络监控相关类型定义
 */

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  initiator: {
    type: string;
    url?: string;
    stack?: {
      callFrames: Array<{
        functionName: string;
        scriptId: string;
        url: string;
        lineNumber: number;
        columnNumber: number;
      }>;
    };
  };
  extensionId?: string;           // 扩展ID（如果是扩展发起）
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
  status?: number;                // 别名，与statusCode相同
  statusText?: string;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
    dns?: number;
    connect?: number;
    ssl?: number;
    send?: number;
    wait?: number;
    receive?: number;
  };
  size: {
    requestBodySize: number;
    responseBodySize: number;
    responseHeadersSize: number;
    transferSize: number;
  };
  failed?: boolean;
  errorText?: string;
  fromCache?: boolean;
  protocol?: string;
}

export interface NetworkAnalysis {
  extensionId: string;
  extensionName?: string;
  monitoringDuration: number;        // 监控时长（ms）
  totalRequests: number;
  totalDataTransferred: number;      // 总传输数据量（字节）
  totalDataReceived: number;         // 总接收数据量（字节）
  totalDataSent: number;             // 总发送数据量（字节）
  requestsByType: Record<string, number>;
  requestsByDomain: Record<string, number>;
  requestsByMethod: Record<string, number>;
  averageRequestTime: number;
  slowestRequests: NetworkRequest[]; // 最慢的请求（top 5）
  largestRequests: NetworkRequest[]; // 最大的请求（top 5）
  failedRequests: NetworkRequest[];  // 失败的请求
  suspiciousRequests: NetworkRequest[]; // 可疑请求
  thirdPartyDomains: string[];       // 第三方域名列表
  requests?: NetworkRequest[];       // 所有请求（可选，用于HAR导出）
  statistics: {
    cachedRequests: number;
    failedRequests: number;
    successRequests: number;
    redirectRequests: number;
  };
  recommendations: string[];
  summary: string;
}

export interface TrackExtensionNetworkArgs {
  extensionId: string;
  duration?: number;                 // 监控持续时间（ms），默认30000
  testUrl?: string;                  // 可选：加载特定测试页面
  resourceTypes?: string[];          // 可选：资源类型过滤
  includeRequests?: boolean;         // 是否在结果中包含详细请求列表
}

export interface NetworkMonitoringStats {
  extensionId: string;
  isMonitoring: boolean;
  startTime?: number;
  requestsCollected: number;
  lastRequestTime?: number;
}
