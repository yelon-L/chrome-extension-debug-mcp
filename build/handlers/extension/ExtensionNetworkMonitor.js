/**
 * ExtensionNetworkMonitor - 扩展网络监控器
 *
 * 功能：
 * - 监听页面所有网络请求
 * - 过滤扩展发起的请求
 * - 记录请求详情和时序信息
 * - 分析请求模式和异常行为
 * - 生成网络影响报告和优化建议
 */
export class ExtensionNetworkMonitor {
    constructor(chromeManager, pageManager) {
        // 存储每个扩展的请求记录
        this.requests = new Map();
        this.isMonitoring = new Map();
        this.monitoringStartTime = new Map();
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
    }
    /**
     * 开始监控扩展网络请求
     */
    async trackExtensionNetwork(args) {
        console.log(`[ExtensionNetworkMonitor] 开始监控扩展网络: ${args.extensionId}`);
        const duration = args.duration || 30000;
        const extensionId = args.extensionId;
        try {
            // 1. 初始化监控
            await this.startMonitoring(extensionId, args.resourceTypes);
            // 2. 如果指定了测试URL，导航到该页面
            if (args.testUrl) {
                const page = this.pageManager.getCurrentPage();
                if (page) {
                    // 使用 domcontentloaded 避免活跃扩展阻塞
                    await page.goto(args.testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
            }
            // 3. 等待指定时间收集网络数据
            await new Promise(resolve => setTimeout(resolve, duration));
            // 4. 停止监控并分析
            const analysis = await this.stopMonitoring(extensionId, args.includeRequests);
            console.log(`[ExtensionNetworkMonitor] 监控完成，收集到${analysis.totalRequests}个请求`);
            return analysis;
        }
        catch (error) {
            console.error('[ExtensionNetworkMonitor] 监控失败:', error);
            // 确保停止监控
            await this.stopMonitoring(extensionId, false);
            throw new Error(`网络监控失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 开始监控
     */
    async startMonitoring(extensionId, resourceTypes) {
        const page = this.pageManager.getCurrentPage();
        if (!page) {
            throw new Error('No active page available for network monitoring');
        }
        // 清空之前的记录
        this.requests.set(extensionId, []);
        this.isMonitoring.set(extensionId, true);
        this.monitoringStartTime.set(extensionId, Date.now());
        // 启用CDP的Network domain
        const cdpClient = await page.target().createCDPSession();
        await cdpClient.send('Network.enable');
        // 监听请求
        page.on('request', (request) => {
            if (this.isMonitoring.get(extensionId)) {
                this.handleRequest(request, extensionId, resourceTypes);
            }
        });
        // 监听响应
        page.on('response', (response) => {
            if (this.isMonitoring.get(extensionId)) {
                this.handleResponse(response, extensionId);
            }
        });
        // 监听请求失败
        page.on('requestfailed', (request) => {
            if (this.isMonitoring.get(extensionId)) {
                this.handleRequestFailed(request, extensionId);
            }
        });
        console.log(`[ExtensionNetworkMonitor] 监控已启动: ${extensionId}`);
    }
    /**
     * 停止监控并生成分析报告
     */
    async stopMonitoring(extensionId, includeRequests = false) {
        this.isMonitoring.set(extensionId, false);
        const requests = this.requests.get(extensionId) || [];
        const startTime = this.monitoringStartTime.get(extensionId) || Date.now();
        const duration = Date.now() - startTime;
        console.log(`[ExtensionNetworkMonitor] 停止监控: ${extensionId}, 收集到${requests.length}个请求`);
        const analysis = this.analyzeRequests(extensionId, requests, duration);
        // 如果不需要详细请求列表，清空大数组以节省内存
        if (!includeRequests) {
            analysis.slowestRequests = analysis.slowestRequests.map(r => this.simplifyRequest(r));
            analysis.largestRequests = analysis.largestRequests.map(r => this.simplifyRequest(r));
            analysis.failedRequests = analysis.failedRequests.map(r => this.simplifyRequest(r));
            analysis.suspiciousRequests = analysis.suspiciousRequests.map(r => this.simplifyRequest(r));
        }
        return analysis;
    }
    /**
     * 处理请求事件
     */
    handleRequest(request, extensionId, resourceTypes) {
        try {
            const resourceType = request.resourceType();
            // 资源类型过滤
            if (resourceTypes && resourceTypes.length > 0) {
                if (!resourceTypes.includes(resourceType)) {
                    return;
                }
            }
            const initiator = request.initiator();
            // 检查 initiator 是否存在
            if (!initiator) {
                return;
            }
            const isExtensionRequest = this.isExtensionRequest(initiator, extensionId);
            // 只记录扩展发起的请求
            if (isExtensionRequest) {
                const networkRequest = {
                    id: request.url() + '_' + Date.now(), // 简单的ID生成
                    url: request.url(),
                    method: request.method(),
                    resourceType: resourceType,
                    initiator: {
                        type: initiator.type || 'other',
                        url: initiator.url,
                        stack: initiator.stack
                    },
                    extensionId: extensionId,
                    requestHeaders: request.headers(),
                    timing: {
                        startTime: Date.now(),
                        endTime: 0,
                        duration: 0
                    },
                    size: {
                        requestBodySize: request.postData()?.length || 0,
                        responseBodySize: 0,
                        responseHeadersSize: 0,
                        transferSize: 0
                    }
                };
                const requests = this.requests.get(extensionId) || [];
                requests.push(networkRequest);
                this.requests.set(extensionId, requests);
            }
        }
        catch (error) {
            console.error('[ExtensionNetworkMonitor] 处理请求失败:', error);
        }
    }
    /**
     * 处理响应事件
     */
    handleResponse(response, extensionId) {
        try {
            const request = response.request();
            const requests = this.requests.get(extensionId) || [];
            const networkRequest = requests.find(r => r.url === request.url() && r.timing.endTime === 0);
            if (networkRequest) {
                networkRequest.responseHeaders = response.headers();
                networkRequest.statusCode = response.status();
                networkRequest.statusText = response.statusText();
                networkRequest.timing.endTime = Date.now();
                networkRequest.timing.duration = networkRequest.timing.endTime - networkRequest.timing.startTime;
                networkRequest.fromCache = response.fromCache();
                // Note: protocol() 可能不在所有 Puppeteer 版本中可用
                networkRequest.protocol = response.protocol?.() || undefined;
                // 尝试获取响应大小
                response.buffer().then((buffer) => {
                    networkRequest.size.responseBodySize = buffer.length;
                    networkRequest.size.transferSize = buffer.length + networkRequest.size.requestBodySize;
                    // 估算响应头大小
                    const headersSize = JSON.stringify(response.headers()).length;
                    networkRequest.size.responseHeadersSize = headersSize;
                }).catch(() => {
                    // 忽略错误，某些请求可能无法获取body
                });
            }
        }
        catch (error) {
            console.error('[ExtensionNetworkMonitor] 处理响应失败:', error);
        }
    }
    /**
     * 处理请求失败事件
     */
    handleRequestFailed(request, extensionId) {
        try {
            const requests = this.requests.get(extensionId) || [];
            const networkRequest = requests.find(r => r.url === request.url() && r.timing.endTime === 0);
            if (networkRequest) {
                networkRequest.failed = true;
                networkRequest.errorText = request.failure()?.errorText || 'Unknown error';
                networkRequest.timing.endTime = Date.now();
                networkRequest.timing.duration = networkRequest.timing.endTime - networkRequest.timing.startTime;
            }
        }
        catch (error) {
            console.error('[ExtensionNetworkMonitor] 处理失败请求失败:', error);
        }
    }
    /**
     * 判断是否是扩展发起的请求
     */
    isExtensionRequest(initiator, extensionId) {
        // 1. 检查URL是否包含扩展ID
        if (initiator.url && initiator.url.includes(`chrome-extension://${extensionId}`)) {
            return true;
        }
        // 2. 检查stack trace
        if (initiator.stack && initiator.stack.callFrames) {
            const hasExtensionFrame = initiator.stack.callFrames.some((frame) => frame.url && frame.url.includes(`chrome-extension://${extensionId}`));
            if (hasExtensionFrame) {
                return true;
            }
        }
        return false;
    }
    /**
     * 分析请求数据
     */
    analyzeRequests(extensionId, requests, duration) {
        // 统计请求类型
        const requestsByType = this.groupByResourceType(requests);
        // 统计请求域名
        const requestsByDomain = this.groupByDomain(requests);
        // 统计请求方法
        const requestsByMethod = this.groupByMethod(requests);
        // 计算总传输数据量
        const totalDataTransferred = requests.reduce((sum, req) => sum + req.size.transferSize, 0);
        const totalDataReceived = requests.reduce((sum, req) => sum + req.size.responseBodySize, 0);
        const totalDataSent = requests.reduce((sum, req) => sum + req.size.requestBodySize, 0);
        // 计算平均请求时间
        const completedRequests = requests.filter(r => r.timing.duration > 0);
        const averageRequestTime = completedRequests.length > 0
            ? completedRequests.reduce((sum, req) => sum + req.timing.duration, 0) / completedRequests.length
            : 0;
        // 找出最慢的请求
        const slowestRequests = [...requests]
            .filter(r => r.timing.duration > 0)
            .sort((a, b) => b.timing.duration - a.timing.duration)
            .slice(0, 5);
        // 找出最大的请求
        const largestRequests = [...requests]
            .sort((a, b) => b.size.transferSize - a.size.transferSize)
            .slice(0, 5);
        // 找出失败的请求
        const failedRequests = requests.filter(r => r.failed);
        // 检测可疑请求
        const suspiciousRequests = this.detectSuspiciousRequests(requests);
        // 提取第三方域名
        const thirdPartyDomains = this.extractThirdPartyDomains(requests);
        // 统计数据
        const statistics = {
            cachedRequests: requests.filter(r => r.fromCache).length,
            failedRequests: failedRequests.length,
            successRequests: requests.filter(r => r.statusCode && r.statusCode >= 200 && r.statusCode < 300).length,
            redirectRequests: requests.filter(r => r.statusCode && r.statusCode >= 300 && r.statusCode < 400).length
        };
        // 生成建议
        const recommendations = this.generateNetworkRecommendations({
            totalRequests: requests.length,
            totalDataTransferred,
            averageRequestTime,
            failedRequests: failedRequests.length,
            suspiciousRequests: suspiciousRequests.length,
            cachedRequests: statistics.cachedRequests,
            thirdPartyDomains: thirdPartyDomains.length
        });
        // 生成摘要
        const summary = this.generateSummary({
            totalRequests: requests.length,
            totalDataTransferred,
            averageRequestTime,
            failedRequests: failedRequests.length,
            duration
        });
        return {
            extensionId,
            monitoringDuration: duration,
            totalRequests: requests.length,
            totalDataTransferred,
            totalDataReceived,
            totalDataSent,
            requestsByType,
            requestsByDomain,
            requestsByMethod,
            averageRequestTime: parseFloat(averageRequestTime.toFixed(2)),
            slowestRequests,
            largestRequests,
            failedRequests,
            suspiciousRequests,
            thirdPartyDomains,
            statistics,
            recommendations,
            summary
        };
    }
    /**
     * 按资源类型分组
     */
    groupByResourceType(requests) {
        const groups = {};
        requests.forEach(req => {
            groups[req.resourceType] = (groups[req.resourceType] || 0) + 1;
        });
        return groups;
    }
    /**
     * 按域名分组
     */
    groupByDomain(requests) {
        const groups = {};
        requests.forEach(req => {
            try {
                const url = new URL(req.url);
                const domain = url.hostname;
                groups[domain] = (groups[domain] || 0) + 1;
            }
            catch {
                groups['invalid-url'] = (groups['invalid-url'] || 0) + 1;
            }
        });
        return groups;
    }
    /**
     * 按请求方法分组
     */
    groupByMethod(requests) {
        const groups = {};
        requests.forEach(req => {
            groups[req.method] = (groups[req.method] || 0) + 1;
        });
        return groups;
    }
    /**
     * 检测可疑请求
     */
    detectSuspiciousRequests(requests) {
        const suspicious = [];
        const seenUrls = new Set();
        requests.forEach(req => {
            // 避免重复
            if (seenUrls.has(req.url)) {
                return;
            }
            let isSuspicious = false;
            // 1. 检测异常大的请求（>5MB）
            if (req.size.transferSize > 5 * 1024 * 1024) {
                isSuspicious = true;
            }
            // 2. 检测异常慢的请求（>10s）
            if (req.timing.duration > 10000) {
                isSuspicious = true;
            }
            // 3. 检测失败的请求
            if (req.failed) {
                isSuspicious = true;
            }
            // 4. 检测可疑的第三方域名（简化检测）
            try {
                const url = new URL(req.url);
                // 检测非HTTPS的外部请求
                if (url.protocol === 'http:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
                    isSuspicious = true;
                }
            }
            catch {
                // 忽略URL解析错误
            }
            if (isSuspicious) {
                suspicious.push(req);
                seenUrls.add(req.url);
            }
        });
        return suspicious.slice(0, 10); // 最多返回10个
    }
    /**
     * 提取第三方域名
     */
    extractThirdPartyDomains(requests) {
        const domains = new Set();
        requests.forEach(req => {
            try {
                const url = new URL(req.url);
                // 排除chrome-extension协议
                if (url.protocol !== 'chrome-extension:') {
                    domains.add(url.hostname);
                }
            }
            catch {
                // 忽略URL解析错误
            }
        });
        return Array.from(domains).sort();
    }
    /**
     * 生成网络优化建议
     */
    generateNetworkRecommendations(stats) {
        const recommendations = [];
        // 请求数量建议
        if (stats.totalRequests > 100) {
            recommendations.push(`⚠️ 请求数量过多（${stats.totalRequests}个），考虑合并请求、使用缓存或延迟加载`);
        }
        else if (stats.totalRequests > 50) {
            recommendations.push(`💡 请求数量较多（${stats.totalRequests}个），可以考虑优化请求策略`);
        }
        // 数据传输量建议
        const dataMB = stats.totalDataTransferred / (1024 * 1024);
        if (dataMB > 10) {
            recommendations.push(`⚠️ 数据传输量较大（${dataMB.toFixed(2)}MB），考虑数据压缩或减少传输内容`);
        }
        else if (dataMB > 5) {
            recommendations.push(`💡 数据传输量（${dataMB.toFixed(2)}MB）可以进一步优化`);
        }
        // 平均请求时间建议
        if (stats.averageRequestTime > 2000) {
            recommendations.push(`⚠️ 平均请求时间过长（${stats.averageRequestTime.toFixed(0)}ms），检查网络连接或服务器性能`);
        }
        else if (stats.averageRequestTime > 1000) {
            recommendations.push(`💡 平均请求时间较长（${stats.averageRequestTime.toFixed(0)}ms），可以考虑优化`);
        }
        // 失败请求建议
        if (stats.failedRequests > 0) {
            recommendations.push(`⚠️ 检测到${stats.failedRequests}个失败请求，建议检查错误原因并添加重试机制`);
        }
        // 可疑请求建议
        if (stats.suspiciousRequests > 0) {
            recommendations.push(`⚠️ 检测到${stats.suspiciousRequests}个可疑请求，建议审查其必要性和安全性`);
        }
        // 缓存使用建议
        const cacheRate = stats.totalRequests > 0 ? (stats.cachedRequests / stats.totalRequests) * 100 : 0;
        if (cacheRate < 20 && stats.totalRequests > 10) {
            recommendations.push(`💡 缓存使用率较低（${cacheRate.toFixed(1)}%），考虑增加缓存策略`);
        }
        // 第三方域名建议
        if (stats.thirdPartyDomains > 10) {
            recommendations.push(`💡 请求了${stats.thirdPartyDomains}个不同的域名，考虑减少第三方依赖`);
        }
        // 如果没有问题，给出正面反馈
        if (recommendations.length === 0) {
            recommendations.push(`✅ 网络请求模式良好，继续保持`);
        }
        return recommendations;
    }
    /**
     * 生成摘要
     */
    generateSummary(stats) {
        const dataMB = stats.totalDataTransferred / (1024 * 1024);
        const durationSec = stats.duration / 1000;
        let summary = `🌐 扩展网络监控摘要\n\n`;
        summary += `📊 关键指标:\n`;
        summary += `• 监控时长: ${durationSec.toFixed(1)}秒\n`;
        summary += `• 总请求数: ${stats.totalRequests}个\n`;
        summary += `• 数据传输: ${dataMB.toFixed(2)}MB\n`;
        summary += `• 平均响应时间: ${stats.averageRequestTime.toFixed(0)}ms\n`;
        summary += `• 失败请求: ${stats.failedRequests}个\n`;
        // 评估网络影响级别
        const impactLevel = this.calculateNetworkImpactLevel(stats);
        summary += `• 网络影响级别: ${impactLevel}\n`;
        return summary;
    }
    /**
     * 计算网络影响级别
     */
    calculateNetworkImpactLevel(stats) {
        let score = 0;
        // 请求数量评分
        if (stats.totalRequests > 100)
            score += 3;
        else if (stats.totalRequests > 50)
            score += 2;
        else if (stats.totalRequests > 20)
            score += 1;
        // 数据量评分
        const dataMB = stats.totalDataTransferred / (1024 * 1024);
        if (dataMB > 10)
            score += 3;
        else if (dataMB > 5)
            score += 2;
        else if (dataMB > 2)
            score += 1;
        // 响应时间评分
        if (stats.averageRequestTime > 2000)
            score += 3;
        else if (stats.averageRequestTime > 1000)
            score += 2;
        else if (stats.averageRequestTime > 500)
            score += 1;
        // 失败请求评分
        if (stats.failedRequests > 10)
            score += 3;
        else if (stats.failedRequests > 5)
            score += 2;
        else if (stats.failedRequests > 0)
            score += 1;
        // 根据总分确定级别
        if (score >= 8)
            return '🔴 严重 (Severe)';
        if (score >= 5)
            return '🟠 较高 (High)';
        if (score >= 3)
            return '🟡 中等 (Medium)';
        if (score >= 1)
            return '🟢 较低 (Low)';
        return '✅ 极小 (Minimal)';
    }
    /**
     * 简化请求对象（去除大数据）
     */
    simplifyRequest(request) {
        return {
            ...request,
            requestHeaders: {},
            responseHeaders: {},
            initiator: {
                type: request.initiator.type,
                url: request.initiator.url
            }
        };
    }
    /**
     * 获取监控状态
     */
    getMonitoringStats(extensionId) {
        const isMonitoring = this.isMonitoring.get(extensionId) || false;
        const requests = this.requests.get(extensionId) || [];
        const startTime = this.monitoringStartTime.get(extensionId);
        const lastRequest = requests.length > 0 ? requests[requests.length - 1] : null;
        return {
            extensionId,
            isMonitoring,
            startTime,
            requestsCollected: requests.length,
            lastRequestTime: lastRequest?.timing.startTime
        };
    }
    /**
     * 清理监控数据
     */
    clearMonitoringData(extensionId) {
        this.requests.delete(extensionId);
        this.isMonitoring.delete(extensionId);
        this.monitoringStartTime.delete(extensionId);
        console.log(`[ExtensionNetworkMonitor] 已清理监控数据: ${extensionId}`);
    }
}
//# sourceMappingURL=ExtensionNetworkMonitor.js.map