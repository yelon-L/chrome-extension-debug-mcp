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
    extensionId?: string;
    requestHeaders: Record<string, string>;
    responseHeaders?: Record<string, string>;
    statusCode?: number;
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
    monitoringDuration: number;
    totalRequests: number;
    totalDataTransferred: number;
    totalDataReceived: number;
    totalDataSent: number;
    requestsByType: Record<string, number>;
    requestsByDomain: Record<string, number>;
    requestsByMethod: Record<string, number>;
    averageRequestTime: number;
    slowestRequests: NetworkRequest[];
    largestRequests: NetworkRequest[];
    failedRequests: NetworkRequest[];
    suspiciousRequests: NetworkRequest[];
    thirdPartyDomains: string[];
    requests?: NetworkRequest[];
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
    duration?: number;
    testUrl?: string;
    resourceTypes?: string[];
    includeRequests?: boolean;
}
export interface NetworkMonitoringStats {
    extensionId: string;
    isMonitoring: boolean;
    startTime?: number;
    requestsCollected: number;
    lastRequestTime?: number;
}
//# sourceMappingURL=network-types.d.ts.map