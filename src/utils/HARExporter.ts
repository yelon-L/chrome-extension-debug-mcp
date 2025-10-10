/**
 * HAR Exporter - HAR 1.2格式导出工具
 * 
 * 功能：
 * - 将网络请求转换为标准HAR格式
 * - 支持HAR 1.2规范
 * - 兼容Chrome DevTools和WebPageTest
 */

import type { NetworkRequest } from '../types/network-types.js';

/**
 * HAR格式的请求条目
 */
export interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    queryString: Array<{ name: string; value: string }>;
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    content: {
      size: number;
      mimeType: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
}

/**
 * HAR文档格式
 */
export interface HARDocument {
  log: {
    version: '1.2';
    creator: {
      name: string;
      version: string;
    };
    pages?: Array<{
      startedDateTime: string;
      id: string;
      title: string;
      pageTimings: {
        onContentLoad?: number;
        onLoad?: number;
      };
    }>;
    entries: HAREntry[];
  };
}

/**
 * HAR导出器
 */
export class HARExporter {
  /**
   * 将网络请求转换为HAR格式
   */
  static convertNetworkRequestsToHAR(
    requests: NetworkRequest[],
    metadata?: {
      pageTitle?: string;
      pageUrl?: string;
    }
  ): HARDocument {
    const entries: HAREntry[] = requests.map(req => this.convertRequestToHAREntry(req));

    const harDocument: HARDocument = {
      log: {
        version: '1.2',
        creator: {
          name: 'Chrome Extension Debug MCP',
          version: '4.0.0'
        },
        entries
      }
    };

    // 添加页面信息（如果提供）
    if (metadata?.pageUrl) {
      harDocument.log.pages = [{
        startedDateTime: new Date(requests[0]?.timing?.startTime || Date.now()).toISOString(),
        id: 'page_1',
        title: metadata.pageTitle || metadata.pageUrl,
        pageTimings: {
          onContentLoad: -1,
          onLoad: -1
        }
      }];
    }

    return harDocument;
  }

  /**
   * 将单个请求转换为HAR条目
   */
  private static convertRequestToHAREntry(request: NetworkRequest): HAREntry {
    return {
      startedDateTime: new Date(request.timing.startTime).toISOString(),
      time: request.timing.duration,
      request: {
        method: request.method,
        url: request.url,
        httpVersion: 'HTTP/1.1',
        headers: this.convertHeaders(request.requestHeaders),
        queryString: this.parseQueryString(request.url),
        headersSize: this.calculateHeadersSize(request.requestHeaders),
        bodySize: request.size.requestBodySize
      },
      response: {
        status: request.statusCode || 0,
        statusText: this.getStatusText(request.statusCode || 0),
        httpVersion: 'HTTP/1.1',
        headers: this.convertHeaders(request.responseHeaders),
        content: {
          size: request.size.responseBodySize,
          mimeType: request.responseHeaders?.['content-type'] || 
                    request.responseHeaders?.['Content-Type'] || 
                    'application/octet-stream'
        },
        redirectURL: request.responseHeaders?.['location'] || 
                     request.responseHeaders?.['Location'] || '',
        headersSize: this.calculateHeadersSize(request.responseHeaders),
        bodySize: request.size.responseBodySize
      },
      cache: {},
      timings: this.convertTimings(request.timing)
    };
  }

  /**
   * 转换headers格式
   */
  private static convertHeaders(headers: Record<string, string> = {}): Array<{ name: string; value: string }> {
    return Object.entries(headers).map(([name, value]) => ({ 
      name, 
      value: String(value) 
    }));
  }

  /**
   * 解析URL查询参数
   */
  private static parseQueryString(url: string): Array<{ name: string; value: string }> {
    try {
      const urlObj = new URL(url);
      return Array.from(urlObj.searchParams.entries()).map(([name, value]) => ({ 
        name, 
        value 
      }));
    } catch (error) {
      // URL解析失败，返回空数组
      return [];
    }
  }

  /**
   * 计算headers大小（估算）
   */
  private static calculateHeadersSize(headers: Record<string, string> = {}): number {
    let size = 0;
    for (const [name, value] of Object.entries(headers)) {
      // 格式: "Name: Value\r\n"
      size += name.length + 2 + String(value).length + 2;
    }
    return size;
  }

  /**
   * 转换时序信息
   */
  private static convertTimings(timing: any): { send: number; wait: number; receive: number } {
    // 简化实现：将所有时间分配给wait阶段
    // 更精确的实现需要从Chrome DevTools Protocol获取详细时序
    return {
      send: 0,
      wait: timing.duration || 0,
      receive: 0
    };
  }

  /**
   * 获取HTTP状态文本
   */
  private static getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      100: 'Continue',
      101: 'Switching Protocols',
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      206: 'Partial Content',
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      307: 'Temporary Redirect',
      308: 'Permanent Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      410: 'Gone',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    
    return statusTexts[statusCode] || 'Unknown';
  }

  /**
   * 验证HAR文档格式
   */
  static validateHAR(har: HARDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查基本结构
    if (!har.log) {
      errors.push('Missing log object');
      return { valid: false, errors };
    }

    if (har.log.version !== '1.2') {
      errors.push(`Invalid HAR version: ${har.log.version}, expected 1.2`);
    }

    if (!har.log.creator || !har.log.creator.name) {
      errors.push('Missing creator information');
    }

    if (!Array.isArray(har.log.entries)) {
      errors.push('Entries must be an array');
    }

    // 检查每个条目
    har.log.entries.forEach((entry, index) => {
      if (!entry.startedDateTime) {
        errors.push(`Entry ${index}: Missing startedDateTime`);
      }
      if (!entry.request || !entry.response) {
        errors.push(`Entry ${index}: Missing request or response`);
      }
      if (typeof entry.time !== 'number') {
        errors.push(`Entry ${index}: Invalid time value`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 过滤HAR条目
   */
  static filterHAREntries(
    har: HARDocument,
    filters: {
      method?: string[];
      statusCode?: number[];
      resourceType?: string[];
      minSize?: number;
      maxSize?: number;
    }
  ): HARDocument {
    const filteredEntries = har.log.entries.filter(entry => {
      // 方法过滤
      if (filters.method && !filters.method.includes(entry.request.method)) {
        return false;
      }

      // 状态码过滤
      if (filters.statusCode && !filters.statusCode.includes(entry.response.status)) {
        return false;
      }

      // 大小过滤
      const size = entry.response.content.size;
      if (filters.minSize !== undefined && size < filters.minSize) {
        return false;
      }
      if (filters.maxSize !== undefined && size > filters.maxSize) {
        return false;
      }

      // 资源类型过滤（基于MIME类型）
      if (filters.resourceType) {
        const mimeType = entry.response.content.mimeType;
        const matches = filters.resourceType.some(type => {
          if (type === 'script') return mimeType.includes('javascript');
          if (type === 'stylesheet') return mimeType.includes('css');
          if (type === 'image') return mimeType.startsWith('image/');
          if (type === 'font') return mimeType.includes('font');
          if (type === 'document') return mimeType.includes('html');
          if (type === 'xhr' || type === 'fetch') return mimeType.includes('json');
          return false;
        });
        if (!matches) return false;
      }

      return true;
    });

    return {
      ...har,
      log: {
        ...har.log,
        entries: filteredEntries
      }
    };
  }

  /**
   * 生成HAR摘要统计
   */
  static generateHARSummary(har: HARDocument): {
    totalRequests: number;
    totalSize: number;
    totalTime: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
    byType: Record<string, number>;
    slowestRequests: Array<{ url: string; time: number }>;
    largestRequests: Array<{ url: string; size: number }>;
  } {
    const summary = {
      totalRequests: har.log.entries.length,
      totalSize: 0,
      totalTime: 0,
      byMethod: {} as Record<string, number>,
      byStatus: {} as Record<number, number>,
      byType: {} as Record<string, number>,
      slowestRequests: [] as Array<{ url: string; time: number }>,
      largestRequests: [] as Array<{ url: string; size: number }>
    };

    har.log.entries.forEach(entry => {
      // 累计大小和时间
      summary.totalSize += entry.response.content.size;
      summary.totalTime += entry.time;

      // 按方法统计
      summary.byMethod[entry.request.method] = 
        (summary.byMethod[entry.request.method] || 0) + 1;

      // 按状态码统计
      summary.byStatus[entry.response.status] = 
        (summary.byStatus[entry.response.status] || 0) + 1;

      // 按类型统计（基于MIME类型）
      const mimeType = entry.response.content.mimeType;
      let type = 'other';
      if (mimeType.includes('javascript')) type = 'script';
      else if (mimeType.includes('css')) type = 'stylesheet';
      else if (mimeType.startsWith('image/')) type = 'image';
      else if (mimeType.includes('html')) type = 'document';
      else if (mimeType.includes('json')) type = 'xhr';
      else if (mimeType.includes('font')) type = 'font';

      summary.byType[type] = (summary.byType[type] || 0) + 1;
    });

    // 找出最慢的5个请求
    summary.slowestRequests = har.log.entries
      .map(entry => ({ url: entry.request.url, time: entry.time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    // 找出最大的5个请求
    summary.largestRequests = har.log.entries
      .map(entry => ({ url: entry.request.url, size: entry.response.content.size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    return summary;
  }
}


