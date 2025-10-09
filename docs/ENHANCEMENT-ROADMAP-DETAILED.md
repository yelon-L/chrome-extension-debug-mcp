# Chrome Extension Debug MCP 增强路线图 - 详细开发计划

**基于**: Chrome DevTools MCP深度对比分析  
**目标**: 补齐关键短板，保持核心优势，创造独特价值  
**时间跨度**: 6-12个月

---

## 📊 Phase 1: 性能分析增强 (P0 - 高优先级)

**优先级**: ⭐⭐⭐⭐⭐  
**预计工期**: 4-6周  
**目标**: 为扩展开发者提供完整的性能洞察能力

### 1.1 analyze_extension_performance - 扩展性能分析

**工具描述**: 分析扩展对页面性能的影响，提供详细的性能指标和优化建议

**功能需求**:
- 启动Chrome Tracing录制
- 在有/无扩展情况下对比页面性能
- 提取扩展相关的trace events
- 计算扩展CPU占用率
- 计算扩展内存使用量
- 计算扩展执行时间
- 生成性能优化建议

**技术实现**:
```typescript
// src/handlers/extension/ExtensionPerformanceAnalyzer.ts

export interface PerformanceAnalysisResult {
  extensionId: string;
  extensionName: string;
  metrics: {
    cpuUsage: number;           // CPU占用百分比
    memoryUsage: number;         // 内存使用MB
    executionTime: number;       // 总执行时间ms
    scriptEvaluationTime: number; // 脚本评估时间ms
    layoutTime: number;          // 布局时间ms
    paintTime: number;           // 绘制时间ms
  };
  impact: {
    pageLoadDelay: number;       // 页面加载延迟ms
    interactionDelay: number;    // 交互延迟ms
    cwvImpact: {                 // Core Web Vitals影响
      lcp: number;               // Largest Contentful Paint
      fid: number;               // First Input Delay
      cls: number;               // Cumulative Layout Shift
    };
  };
  recommendations: string[];     // 优化建议
}

export class ExtensionPerformanceAnalyzer {
  private chromeManager: ChromeManager;
  private pageManager: PageManager;

  async analyzePerformance(options: {
    extensionId: string;
    testUrl: string;
    duration?: number;
  }): Promise<PerformanceAnalysisResult> {
    // 1. 禁用扩展，测试基准性能
    const baselineTrace = await this.recordTrace(options.testUrl, false);
    
    // 2. 启用扩展，测试实际性能
    const extensionTrace = await this.recordTrace(options.testUrl, true);
    
    // 3. 对比分析
    const analysis = await this.compareTraces(baselineTrace, extensionTrace);
    
    // 4. 生成报告
    return this.generateReport(analysis, options.extensionId);
  }

  private async recordTrace(url: string, withExtension: boolean): Promise<Buffer> {
    const page = this.pageManager.getCurrentPage();
    
    // 清空页面
    await page.goto('about:blank');
    
    // 启动tracing
    await page.tracing.start({
      categories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'disabled-by-default-v8.cpu_profiler',
        'v8.execute',
        'blink.user_timing',
      ]
    });
    
    // 导航到测试页面
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // 等待一段时间收集数据
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 停止tracing
    return await page.tracing.stop();
  }

  private async compareTraces(
    baseline: Buffer, 
    extension: Buffer
  ): Promise<PerformanceComparison> {
    // 解析trace events
    const baselineEvents = this.parseTraceEvents(baseline);
    const extensionEvents = this.parseTraceEvents(extension);
    
    // 计算性能指标
    return {
      baselineMetrics: this.calculateMetrics(baselineEvents),
      extensionMetrics: this.calculateMetrics(extensionEvents),
      delta: this.calculateDelta(baselineEvents, extensionEvents)
    };
  }

  private parseTraceEvents(traceBuffer: Buffer): TraceEvent[] {
    const traceData = JSON.parse(traceBuffer.toString());
    return traceData.traceEvents || [];
  }

  private calculateMetrics(events: TraceEvent[]): PerformanceMetrics {
    // 计算CPU使用率
    const cpuUsage = this.calculateCPUUsage(events);
    
    // 计算内存使用
    const memoryUsage = this.calculateMemoryUsage(events);
    
    // 计算执行时间
    const executionTime = this.calculateExecutionTime(events);
    
    return { cpuUsage, memoryUsage, executionTime };
  }

  private generateReport(
    comparison: PerformanceComparison,
    extensionId: string
  ): PerformanceAnalysisResult {
    // 生成优化建议
    const recommendations = this.generateRecommendations(comparison);
    
    return {
      extensionId,
      metrics: comparison.extensionMetrics,
      impact: comparison.delta,
      recommendations
    };
  }

  private generateRecommendations(comparison: PerformanceComparison): string[] {
    const recommendations: string[] = [];
    
    if (comparison.delta.cpuUsage > 10) {
      recommendations.push('CPU使用率过高，建议优化JavaScript执行逻辑');
    }
    
    if (comparison.delta.memoryUsage > 50) {
      recommendations.push('内存使用量较大，检查是否有内存泄漏');
    }
    
    if (comparison.delta.pageLoadDelay > 500) {
      recommendations.push('页面加载延迟明显，考虑延迟加载或异步处理');
    }
    
    return recommendations;
  }
}
```

**MCP工具定义**:
```typescript
// src/ChromeDebugServer.ts

server.tool(
  'analyze_extension_performance',
  {
    extensionId: z.string().describe('要分析的扩展ID'),
    testUrl: z.string().describe('测试页面URL'),
    duration: z.number().optional().describe('测试持续时间（毫秒），默认3000ms')
  },
  'analyze_extension_performance - 分析扩展性能影响，提供CPU、内存、执行时间等指标和优化建议',
  async (args) => {
    const analyzer = new ExtensionPerformanceAnalyzer(
      this.chromeManager,
      this.pageManager
    );
    
    const result = await analyzer.analyzePerformance({
      extensionId: args.extensionId,
      testUrl: args.testUrl,
      duration: args.duration
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);
```

**开发任务**:
- [ ] 创建ExtensionPerformanceAnalyzer类
- [ ] 实现trace录制逻辑
- [ ] 实现trace解析逻辑
- [ ] 实现性能指标计算
- [ ] 实现对比分析算法
- [ ] 实现优化建议生成
- [ ] 集成到MCP工具
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新文档

**预计工期**: 2周

---

### 1.2 track_extension_network - 扩展网络追踪

**工具描述**: 监控扩展发起的所有网络请求，分析请求模式，检测潜在问题

**功能需求**:
- 监听页面所有网络请求
- 过滤扩展发起的请求
- 记录请求详情（URL、方法、headers、body、时序）
- 分析请求模式（频率、大小、目标域名）
- 检测异常行为（过多请求、敏感数据传输）
- 支持资源类型过滤
- 支持时间范围过滤
- 生成网络影响报告

**技术实现**:
```typescript
// src/handlers/extension/ExtensionNetworkMonitor.ts

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  initiator: string;              // 请求发起者
  extensionId?: string;           // 扩展ID（如果是扩展发起）
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  statusCode: number;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  size: {
    requestBodySize: number;
    responseBodySize: number;
    transferSize: number;
  };
}

export interface NetworkAnalysis {
  extensionId: string;
  totalRequests: number;
  totalDataTransferred: number;     // 总传输数据量（字节）
  requestsByType: Record<string, number>;
  requestsByDomain: Record<string, number>;
  averageRequestTime: number;
  slowestRequests: NetworkRequest[]; // 最慢的请求
  largestRequests: NetworkRequest[]; // 最大的请求
  suspiciousRequests: NetworkRequest[]; // 可疑请求
  recommendations: string[];
}

export class ExtensionNetworkMonitor {
  private requests: Map<string, NetworkRequest[]> = new Map();
  private isMonitoring: boolean = false;

  async startMonitoring(extensionId: string): Promise<void> {
    const page = this.pageManager.getCurrentPage();
    
    // 清空之前的记录
    this.requests.set(extensionId, []);
    
    // 监听请求
    page.on('request', (request) => {
      this.handleRequest(request, extensionId);
    });
    
    // 监听响应
    page.on('response', (response) => {
      this.handleResponse(response, extensionId);
    });
    
    this.isMonitoring = true;
  }

  async stopMonitoring(extensionId: string): Promise<NetworkAnalysis> {
    this.isMonitoring = false;
    
    const requests = this.requests.get(extensionId) || [];
    return this.analyzeRequests(extensionId, requests);
  }

  private handleRequest(request: any, extensionId: string): void {
    // 检查是否是扩展发起的请求
    const initiator = request.initiator();
    const isExtensionRequest = this.isExtensionRequest(initiator, extensionId);
    
    if (isExtensionRequest) {
      const networkRequest: NetworkRequest = {
        id: request._requestId,
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        initiator: initiator.type,
        extensionId: extensionId,
        requestHeaders: request.headers(),
        timing: {
          startTime: Date.now(),
          endTime: 0,
          duration: 0
        },
        size: {
          requestBodySize: 0,
          responseBodySize: 0,
          transferSize: 0
        }
      };
      
      const requests = this.requests.get(extensionId) || [];
      requests.push(networkRequest);
      this.requests.set(extensionId, requests);
    }
  }

  private handleResponse(response: any, extensionId: string): void {
    const requests = this.requests.get(extensionId) || [];
    const request = requests.find(r => r.id === response.request()._requestId);
    
    if (request) {
      request.responseHeaders = response.headers();
      request.statusCode = response.status();
      request.timing.endTime = Date.now();
      request.timing.duration = request.timing.endTime - request.timing.startTime;
      
      // 获取响应大小
      response.buffer().then((buffer: Buffer) => {
        request.size.responseBodySize = buffer.length;
        request.size.transferSize = buffer.length;
      }).catch(() => {
        // 忽略错误
      });
    }
  }

  private isExtensionRequest(initiator: any, extensionId: string): boolean {
    // 检查URL是否包含扩展ID
    if (initiator.url && initiator.url.includes(`chrome-extension://${extensionId}`)) {
      return true;
    }
    
    // 检查stack trace
    if (initiator.stack) {
      const stackFrames = initiator.stack.callFrames || [];
      return stackFrames.some((frame: any) => 
        frame.url && frame.url.includes(`chrome-extension://${extensionId}`)
      );
    }
    
    return false;
  }

  private analyzeRequests(
    extensionId: string, 
    requests: NetworkRequest[]
  ): NetworkAnalysis {
    // 统计请求类型
    const requestsByType = this.groupByResourceType(requests);
    
    // 统计请求域名
    const requestsByDomain = this.groupByDomain(requests);
    
    // 计算总传输数据量
    const totalDataTransferred = requests.reduce(
      (sum, req) => sum + req.size.transferSize, 0
    );
    
    // 计算平均请求时间
    const averageRequestTime = requests.reduce(
      (sum, req) => sum + req.timing.duration, 0
    ) / requests.length;
    
    // 找出最慢的请求
    const slowestRequests = requests
      .sort((a, b) => b.timing.duration - a.timing.duration)
      .slice(0, 5);
    
    // 找出最大的请求
    const largestRequests = requests
      .sort((a, b) => b.size.transferSize - a.size.transferSize)
      .slice(0, 5);
    
    // 检测可疑请求
    const suspiciousRequests = this.detectSuspiciousRequests(requests);
    
    // 生成建议
    const recommendations = this.generateNetworkRecommendations({
      totalRequests: requests.length,
      totalDataTransferred,
      averageRequestTime,
      suspiciousRequests
    });
    
    return {
      extensionId,
      totalRequests: requests.length,
      totalDataTransferred,
      requestsByType,
      requestsByDomain,
      averageRequestTime,
      slowestRequests,
      largestRequests,
      suspiciousRequests,
      recommendations
    };
  }

  private detectSuspiciousRequests(requests: NetworkRequest[]): NetworkRequest[] {
    const suspicious: NetworkRequest[] = [];
    
    requests.forEach(req => {
      // 检测到第三方域名的大量请求
      if (!this.isKnownDomain(req.url)) {
        suspicious.push(req);
      }
      
      // 检测异常大的请求
      if (req.size.transferSize > 5 * 1024 * 1024) { // >5MB
        suspicious.push(req);
      }
      
      // 检测异常慢的请求
      if (req.timing.duration > 10000) { // >10s
        suspicious.push(req);
      }
    });
    
    return suspicious;
  }

  private generateNetworkRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    if (stats.totalRequests > 100) {
      recommendations.push('请求数量过多，考虑合并请求或使用缓存');
    }
    
    if (stats.totalDataTransferred > 10 * 1024 * 1024) { // >10MB
      recommendations.push('数据传输量较大，考虑压缩或减少数据传输');
    }
    
    if (stats.averageRequestTime > 1000) {
      recommendations.push('平均请求时间较长，检查网络连接或服务器性能');
    }
    
    if (stats.suspiciousRequests.length > 0) {
      recommendations.push(`检测到${stats.suspiciousRequests.length}个可疑请求，建议审查`);
    }
    
    return recommendations;
  }
}
```

**MCP工具定义**:
```typescript
server.tool(
  'track_extension_network',
  {
    extensionId: z.string().describe('要监控的扩展ID'),
    duration: z.number().optional().describe('监控持续时间（毫秒），默认30000ms'),
    resourceTypes: z.array(z.string()).optional().describe('资源类型过滤')
  },
  'track_extension_network - 监控扩展网络请求，分析请求模式和性能影响',
  async (args) => {
    const monitor = new ExtensionNetworkMonitor(
      this.chromeManager,
      this.pageManager
    );
    
    // 开始监控
    await monitor.startMonitoring(args.extensionId);
    
    // 等待指定时间
    await new Promise(resolve => 
      setTimeout(resolve, args.duration || 30000)
    );
    
    // 停止监控并分析
    const analysis = await monitor.stopMonitoring(args.extensionId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
        }
      ]
    };
  }
);
```

**开发任务**:
- [ ] 创建ExtensionNetworkMonitor类
- [ ] 实现请求监听逻辑
- [ ] 实现扩展请求过滤
- [ ] 实现请求分析算法
- [ ] 实现可疑请求检测
- [ ] 实现优化建议生成
- [ ] 集成到MCP工具
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新文档

**预计工期**: 1.5周

---

### 1.3 measure_extension_impact - 扩展影响量化

**工具描述**: 量化扩展对页面性能的整体影响，提供对比报告

**功能需求**:
- 自动化测试流程
- 对比有/无扩展的性能差异
- 计算Core Web Vitals影响
- 生成详细的影响报告
- 支持多页面测试
- 支持多次测试取平均值

**技术实现**:
```typescript
// src/handlers/extension/ExtensionImpactMeasurer.ts

export interface ImpactMeasurement {
  extensionId: string;
  extensionName: string;
  testConfig: {
    urls: string[];
    iterations: number;
  };
  results: {
    baseline: PerformanceMetrics;
    withExtension: PerformanceMetrics;
    impact: {
      loadTimeIncrease: number;    // 加载时间增加（ms）
      loadTimeIncreasePercent: number; // 加载时间增加百分比
      memoryIncrease: number;       // 内存增加（MB）
      cpuIncrease: number;          // CPU使用率增加
      cwvImpact: {
        lcpImpact: number;          // LCP影响（ms）
        fidImpact: number;          // FID影响（ms）
        clsImpact: number;          // CLS影响
      };
    };
  };
  summary: string;
  recommendations: string[];
}

export class ExtensionImpactMeasurer {
  async measureImpact(options: {
    extensionId: string;
    testUrls: string[];
    iterations?: number;
  }): Promise<ImpactMeasurement> {
    const iterations = options.iterations || 3;
    
    // 1. 测试基准性能（无扩展）
    const baselineMetrics = await this.measureBaseline(
      options.testUrls, 
      iterations
    );
    
    // 2. 测试实际性能（有扩展）
    const extensionMetrics = await this.measureWithExtension(
      options.extensionId,
      options.testUrls,
      iterations
    );
    
    // 3. 计算影响
    const impact = this.calculateImpact(baselineMetrics, extensionMetrics);
    
    // 4. 生成报告
    return this.generateImpactReport(
      options.extensionId,
      baselineMetrics,
      extensionMetrics,
      impact
    );
  }

  private async measureBaseline(
    urls: string[], 
    iterations: number
  ): Promise<PerformanceMetrics> {
    // 禁用所有扩展，测试纯净环境
    // 多次测试取平均值
    // 返回性能指标
  }

  private async measureWithExtension(
    extensionId: string,
    urls: string[],
    iterations: number
  ): Promise<PerformanceMetrics> {
    // 启用指定扩展
    // 多次测试取平均值
    // 返回性能指标
  }

  private calculateImpact(
    baseline: PerformanceMetrics,
    extension: PerformanceMetrics
  ): ImpactMetrics {
    // 计算各项指标的差异
    // 计算百分比变化
    // 返回影响数据
  }
}
```

**开发任务**:
- [ ] 创建ExtensionImpactMeasurer类
- [ ] 实现基准测试逻辑
- [ ] 实现扩展测试逻辑
- [ ] 实现影响计算算法
- [ ] 实现报告生成
- [ ] 集成到MCP工具
- [ ] 编写测试
- [ ] 更新文档

**预计工期**: 1.5周

---

## Phase 1 总结

**总工期**: 5-6周  
**新增工具**: 3个  
**新增模块**: 2个（ExtensionPerformanceAnalyzer, ExtensionNetworkMonitor）  
**新增类型**: 多个性能相关类型定义

**完成标准**:
- ✅ 3个工具全部实现并测试通过
- ✅ 性能分析报告准确可靠
- ✅ 网络监控功能完善
- ✅ 文档完整更新
- ✅ 代码review通过
- ✅ 集成测试100%通过

---

## 🚀 Phase 2-4 概要

### Phase 2: 网络监控专业化 (P1)
- 预计工期: 3-4周
- 新增工具: 2-3个
- 重点: HAR格式支持，资源类型过滤

### Phase 3: 设备模拟能力 (P1)
- 预计工期: 2-3周
- 新增工具: 2个
- 重点: CPU/网络节流，离线测试

### Phase 4: 交互与快照增强 (P2)
- 预计工期: 3-4周
- 新增工具: 3-4个
- 重点: UID定位，高级交互，表单处理

---

## 📊 总体规划

| Phase | 工期 | 新增工具 | 累计工具 | 状态 |
|-------|------|---------|---------|------|
| Phase 1 | 5-6周 | 3 | 24 | ⏳ 准备开始 |
| Phase 2 | 3-4周 | 2-3 | 26-27 | ⏸️ 待开始 |
| Phase 3 | 2-3周 | 2 | 28-29 | ⏸️ 待开始 |
| Phase 4 | 3-4周 | 3-4 | 31-33 | ⏸️ 待开始 |
| **总计** | **13-17周** | **10-12** | **31-33** | - |

---

## 🎯 立即开始 - Phase 1 第一步

**当前任务**: 实现`analyze_extension_performance`工具

**今日目标**:
1. 创建ExtensionPerformanceAnalyzer类框架
2. 实现trace录制基础逻辑
3. 实现基本的trace解析
4. 编写MCP工具定义
5. 进行初步测试

**预计完成**: 今日可完成基础框架和核心逻辑
