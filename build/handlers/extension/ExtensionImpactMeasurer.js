/**
 * Phase 1.3: 扩展综合影响量化器
 *
 * 这个类负责综合评估扩展对页面性能、网络和用户体验的整体影响。
 * 它通过运行多次测试并聚合结果，提供准确的影响量化报告。
 */
import { ExtensionPerformanceAnalyzer } from './ExtensionPerformanceAnalyzer.js';
import { ExtensionNetworkMonitor } from './ExtensionNetworkMonitor.js';
export class ExtensionImpactMeasurer {
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
        // 默认影响级别阈值
        this.DEFAULT_THRESHOLDS = {
            cpu: { minimal: 2, low: 5, medium: 10, high: 20 },
            memory: { minimal: 5, low: 10, medium: 25, high: 50 },
            lcp: { minimal: 100, low: 250, medium: 500, high: 1000 },
            cls: { minimal: 0.01, low: 0.05, medium: 0.1, high: 0.25 },
            requests: { minimal: 5, low: 10, medium: 25, high: 50 },
            dataSize: { minimal: 100, low: 500, medium: 2000, high: 10000 } // KB
        };
        this.performanceAnalyzer = new ExtensionPerformanceAnalyzer(chromeManager, pageManager);
        this.networkMonitor = new ExtensionNetworkMonitor(chromeManager, pageManager);
    }
    /**
     * 主方法：测量扩展的综合影响
     */
    async measureImpact(args) {
        console.log(`[ExtensionImpactMeasurer] 开始综合影响测量: ${args.extensionId}`);
        const extensionId = args.extensionId;
        const iterations = args.iterations || 3;
        const performanceDuration = args.performanceDuration || 2000;
        const networkDuration = args.networkDuration || 5000;
        // 标准化测试页面列表
        const testPages = this.normalizeTestPages(args.testPages);
        console.log(`[ExtensionImpactMeasurer] 配置: ${testPages.length}个页面, ${iterations}次迭代`);
        try {
            // 1. 执行所有测试
            const allResults = [];
            for (const page of testPages) {
                console.log(`[ExtensionImpactMeasurer] 测试页面: ${page.name || page.url}`);
                for (let i = 1; i <= iterations; i++) {
                    console.log(`[ExtensionImpactMeasurer] 迭代 ${i}/${iterations}`);
                    const result = await this.runSingleTest(extensionId, page, i, performanceDuration, networkDuration, args.includeNetworkDetails || false);
                    allResults.push(result);
                    // 迭代之间等待一下，让浏览器状态稳定
                    if (i < iterations) {
                        await new Promise(resolve => setTimeout(resolve, 300)); // 减少迭代间等待
                    }
                }
            }
            // 2. 聚合结果
            const pageResults = this.aggregateByPage(testPages, allResults, iterations);
            // 3. 计算整体统计
            const overall = this.calculateOverallStats(pageResults);
            // 4. 生成关键发现
            const keyFindings = this.generateKeyFindings(pageResults, overall);
            // 5. 生成建议
            const recommendations = this.generateRecommendations(overall, pageResults);
            // 6. 生成摘要
            const summary = this.generateSummary(overall, testPages.length, iterations);
            // 7. 获取扩展名称
            const extensionName = await this.getExtensionName(extensionId);
            const report = {
                extensionId,
                extensionName,
                testDate: Date.now(),
                configuration: {
                    totalPages: testPages.length,
                    iterationsPerPage: iterations,
                    totalTests: testPages.length * iterations
                },
                pageResults,
                overall,
                keyFindings,
                recommendations,
                summary,
                detailedResults: allResults
            };
            console.log(`[ExtensionImpactMeasurer] 综合影响测量完成`);
            return report;
        }
        catch (error) {
            console.error(`[ExtensionImpactMeasurer] 测量失败:`, error);
            throw new Error(`综合影响测量失败: ${error}`);
        }
    }
    /**
     * 执行单次测试
     */
    async runSingleTest(extensionId, page, iteration, performanceDuration, networkDuration, includeNetworkDetails) {
        // 1. 性能分析
        const performance = await this.performanceAnalyzer.analyzePerformance({
            extensionId,
            testUrl: page.url,
            duration: performanceDuration
        });
        // 等待页面稳定
        if (page.waitTime) {
            await new Promise(resolve => setTimeout(resolve, page.waitTime));
        }
        // 2. 网络监控
        const network = await this.networkMonitor.trackExtensionNetwork({
            extensionId,
            duration: networkDuration,
            testUrl: page.url,
            includeRequests: includeNetworkDetails
        });
        return {
            page: page.url,
            iteration,
            performance,
            network,
            timestamp: Date.now()
        };
    }
    /**
     * 按页面聚合结果
     */
    aggregateByPage(testPages, allResults, iterations) {
        return testPages.map(page => {
            // 筛选该页面的所有测试结果
            const pageResults = allResults.filter(r => r.page === page.url);
            if (pageResults.length === 0) {
                throw new Error(`No results found for page: ${page.url}`);
            }
            // 计算平均性能指标
            const avgPerformance = {
                cpuIncrease: this.average(pageResults.map(r => r.performance.metrics.delta.cpuUsage)),
                memoryIncrease: this.average(pageResults.map(r => r.performance.metrics.delta.memoryUsage)),
                executionTimeIncrease: this.average(pageResults.map(r => r.performance.metrics.delta.executionTime)),
                lcpIncrease: this.average(pageResults.map(r => r.performance.impact.cwvImpact.lcp)),
                fidIncrease: this.average(pageResults.map(r => r.performance.impact.cwvImpact.fid)),
                clsIncrease: this.average(pageResults.map(r => r.performance.impact.cwvImpact.cls))
            };
            // 计算平均网络指标
            const avgNetwork = {
                totalRequests: Math.round(this.average(pageResults.map(r => r.network.totalRequests))),
                totalDataTransferred: Math.round(this.average(pageResults.map(r => r.network.totalDataTransferred))),
                averageRequestTime: this.average(pageResults.map(r => r.network.averageRequestTime)),
                failedRequests: Math.round(this.average(pageResults.map(r => r.network.statistics.failedRequests)))
            };
            // 计算综合影响分数
            const impactScore = this.calculateImpactScore(avgPerformance, avgNetwork);
            const impactLevel = this.calculateImpactLevel(impactScore);
            return {
                pageUrl: page.url,
                pageName: page.name || this.extractPageName(page.url),
                iterations,
                avgPerformance,
                avgNetwork,
                impactScore,
                impactLevel
            };
        });
    }
    /**
     * 计算整体统计
     */
    calculateOverallStats(pageResults) {
        const overallImpactScore = this.average(pageResults.map(p => p.impactScore));
        const overallImpactLevel = this.calculateImpactLevel(overallImpactScore);
        const overall = {
            avgCpuIncrease: this.average(pageResults.map(p => p.avgPerformance.cpuIncrease)),
            avgMemoryIncrease: this.average(pageResults.map(p => p.avgPerformance.memoryIncrease)),
            avgExecutionTimeIncrease: this.average(pageResults.map(p => p.avgPerformance.executionTimeIncrease)),
            avgLcpIncrease: this.average(pageResults.map(p => p.avgPerformance.lcpIncrease)),
            avgFidIncrease: this.average(pageResults.map(p => p.avgPerformance.fidIncrease)),
            avgClsIncrease: this.average(pageResults.map(p => p.avgPerformance.clsIncrease)),
            avgRequestsPerPage: this.average(pageResults.map(p => p.avgNetwork.totalRequests)),
            avgDataPerPage: this.average(pageResults.map(p => p.avgNetwork.totalDataTransferred)),
            avgRequestTimePerPage: this.average(pageResults.map(p => p.avgNetwork.averageRequestTime)),
            overallImpactScore,
            overallImpactLevel
        };
        return overall;
    }
    /**
     * 计算影响分数（0-100，越高影响越大）
     */
    calculateImpactScore(performance, network) {
        let score = 0;
        // CPU影响（权重：20%）
        score += Math.min((performance.cpuIncrease / this.DEFAULT_THRESHOLDS.cpu.high) * 20, 20);
        // 内存影响（权重：15%）
        score += Math.min((performance.memoryIncrease / this.DEFAULT_THRESHOLDS.memory.high) * 15, 15);
        // LCP影响（权重：25%）
        score += Math.min((performance.lcpIncrease / this.DEFAULT_THRESHOLDS.lcp.high) * 25, 25);
        // CLS影响（权重：20%）
        score += Math.min((performance.clsIncrease / this.DEFAULT_THRESHOLDS.cls.high) * 20, 20);
        // 网络请求影响（权重：10%）
        score += Math.min((network.totalRequests / this.DEFAULT_THRESHOLDS.requests.high) * 10, 10);
        // 数据传输影响（权重：10%）
        const dataSizeKB = network.totalDataTransferred / 1024;
        score += Math.min((dataSizeKB / this.DEFAULT_THRESHOLDS.dataSize.high) * 10, 10);
        return Math.min(Math.round(score), 100);
    }
    /**
     * 根据分数计算影响级别
     */
    calculateImpactLevel(score) {
        if (score >= 70)
            return 'Critical';
        if (score >= 50)
            return 'High';
        if (score >= 30)
            return 'Medium';
        if (score >= 15)
            return 'Low';
        return 'Minimal';
    }
    /**
     * 生成关键发现
     */
    generateKeyFindings(pageResults, overall) {
        const findings = [];
        // 整体影响
        const levelEmoji = this.getImpactLevelEmoji(overall.overallImpactLevel);
        findings.push(`${levelEmoji} 扩展整体影响级别: ${overall.overallImpactLevel} (评分: ${overall.overallImpactScore.toFixed(1)}/100)`);
        // 性能影响
        if (overall.avgCpuIncrease > this.DEFAULT_THRESHOLDS.cpu.medium) {
            findings.push(`⚠️ CPU使用率平均增加${overall.avgCpuIncrease.toFixed(1)}%，属于中等或更高影响`);
        }
        if (overall.avgMemoryIncrease > this.DEFAULT_THRESHOLDS.memory.medium) {
            findings.push(`⚠️ 内存使用平均增加${overall.avgMemoryIncrease.toFixed(1)}MB，需要关注`);
        }
        if (overall.avgLcpIncrease > this.DEFAULT_THRESHOLDS.lcp.medium) {
            findings.push(`⚠️ LCP平均增加${overall.avgLcpIncrease.toFixed(0)}ms，影响用户体验`);
        }
        if (overall.avgClsIncrease > this.DEFAULT_THRESHOLDS.cls.medium) {
            findings.push(`⚠️ CLS平均增加${overall.avgClsIncrease.toFixed(3)}，可能导致布局抖动`);
        }
        // 网络影响
        if (overall.avgRequestsPerPage > this.DEFAULT_THRESHOLDS.requests.medium) {
            findings.push(`📡 扩展平均每页发起${overall.avgRequestsPerPage.toFixed(0)}个网络请求`);
        }
        if (overall.avgDataPerPage > this.DEFAULT_THRESHOLDS.dataSize.medium * 1024) {
            findings.push(`📦 扩展平均每页传输${(overall.avgDataPerPage / 1024).toFixed(1)}KB数据`);
        }
        // 页面差异
        const impactScores = pageResults.map(p => p.impactScore);
        const maxScore = Math.max(...impactScores);
        const minScore = Math.min(...impactScores);
        if (maxScore - minScore > 20) {
            findings.push(`📊 不同页面影响差异较大（${minScore.toFixed(0)}-${maxScore.toFixed(0)}分），建议针对性优化`);
        }
        // 如果影响很小
        if (overall.overallImpactLevel === 'Minimal' || overall.overallImpactLevel === 'Low') {
            findings.push(`✅ 扩展对页面性能影响较小，用户体验良好`);
        }
        return findings;
    }
    /**
     * 生成优化建议
     */
    generateRecommendations(overall, pageResults) {
        const recommendations = [];
        // CPU优化
        if (overall.avgCpuIncrease > this.DEFAULT_THRESHOLDS.cpu.high) {
            recommendations.push('🔴 CPU使用率过高，强烈建议：1) 使用Web Workers处理计算；2) 优化算法复杂度；3) 减少同步操作');
        }
        else if (overall.avgCpuIncrease > this.DEFAULT_THRESHOLDS.cpu.medium) {
            recommendations.push('🟡 CPU使用率偏高，建议优化计算密集型操作，考虑使用异步处理');
        }
        // 内存优化
        if (overall.avgMemoryIncrease > this.DEFAULT_THRESHOLDS.memory.high) {
            recommendations.push('🔴 内存占用过高，强烈建议：1) 检查内存泄漏；2) 优化数据结构；3) 及时释放不用的对象');
        }
        else if (overall.avgMemoryIncrease > this.DEFAULT_THRESHOLDS.memory.medium) {
            recommendations.push('🟡 内存占用偏高，建议优化数据缓存策略，减少冗余数据存储');
        }
        // LCP优化
        if (overall.avgLcpIncrease > this.DEFAULT_THRESHOLDS.lcp.high) {
            recommendations.push('🔴 LCP影响严重，强烈建议：1) 延迟非关键资源加载；2) 优化首屏渲染；3) 避免阻塞主线程');
        }
        else if (overall.avgLcpIncrease > this.DEFAULT_THRESHOLDS.lcp.medium) {
            recommendations.push('🟡 LCP受到影响，建议优化资源加载时机，避免阻塞关键渲染路径');
        }
        // CLS优化
        if (overall.avgClsIncrease > this.DEFAULT_THRESHOLDS.cls.high) {
            recommendations.push('🔴 CLS影响严重，强烈建议：1) 预留DOM空间；2) 避免动态插入内容；3) 使用transform代替top/left');
        }
        else if (overall.avgClsIncrease > this.DEFAULT_THRESHOLDS.cls.medium) {
            recommendations.push('🟡 CLS有所增加，建议优化DOM操作，减少布局抖动');
        }
        // 网络优化
        if (overall.avgRequestsPerPage > this.DEFAULT_THRESHOLDS.requests.high) {
            recommendations.push('🔴 网络请求过多，强烈建议：1) 合并请求；2) 使用缓存；3) 按需加载');
        }
        else if (overall.avgRequestsPerPage > this.DEFAULT_THRESHOLDS.requests.medium) {
            recommendations.push('🟡 网络请求较多，建议优化请求策略，考虑批量处理');
        }
        // 数据传输优化
        const avgDataKB = overall.avgDataPerPage / 1024;
        if (avgDataKB > this.DEFAULT_THRESHOLDS.dataSize.high) {
            recommendations.push('🔴 数据传输量过大，强烈建议：1) 启用数据压缩；2) 优化数据格式；3) 使用增量更新');
        }
        else if (avgDataKB > this.DEFAULT_THRESHOLDS.dataSize.medium) {
            recommendations.push('🟡 数据传输量较大，建议优化数据结构，减少不必要的数据传输');
        }
        // 如果整体表现好
        if (overall.overallImpactLevel === 'Minimal') {
            recommendations.push('✅ 扩展性能表现优秀，继续保持良好的开发实践');
        }
        else if (overall.overallImpactLevel === 'Low') {
            recommendations.push('✅ 扩展性能表现良好，可以进行细节优化提升用户体验');
        }
        return recommendations;
    }
    /**
     * 生成摘要
     */
    generateSummary(overall, pageCount, iterations) {
        const emoji = this.getImpactLevelEmoji(overall.overallImpactLevel);
        let summary = `${emoji} 扩展综合影响评估报告\n\n`;
        summary += `📊 测试配置:\n`;
        summary += `   • 测试页面数: ${pageCount}个\n`;
        summary += `   • 每页迭代次数: ${iterations}次\n`;
        summary += `   • 总测试次数: ${pageCount * iterations}次\n\n`;
        summary += `🎯 整体影响级别: ${overall.overallImpactLevel}\n`;
        summary += `📈 综合评分: ${overall.overallImpactScore.toFixed(1)}/100\n\n`;
        summary += `⚡ 性能影响 (平均):\n`;
        summary += `   • CPU增加: ${overall.avgCpuIncrease > 0 ? '+' : ''}${overall.avgCpuIncrease.toFixed(1)}%\n`;
        summary += `   • 内存增加: ${overall.avgMemoryIncrease > 0 ? '+' : ''}${overall.avgMemoryIncrease.toFixed(1)}MB\n`;
        summary += `   • 执行时间增加: ${overall.avgExecutionTimeIncrease > 0 ? '+' : ''}${overall.avgExecutionTimeIncrease.toFixed(0)}ms\n`;
        summary += `   • LCP增加: ${overall.avgLcpIncrease > 0 ? '+' : ''}${overall.avgLcpIncrease.toFixed(0)}ms\n`;
        summary += `   • FID增加: ${overall.avgFidIncrease > 0 ? '+' : ''}${overall.avgFidIncrease.toFixed(0)}ms\n`;
        summary += `   • CLS增加: ${overall.avgClsIncrease > 0 ? '+' : ''}${overall.avgClsIncrease.toFixed(3)}\n\n`;
        summary += `🌐 网络影响 (平均):\n`;
        summary += `   • 每页请求数: ${overall.avgRequestsPerPage.toFixed(0)}个\n`;
        summary += `   • 每页数据传输: ${(overall.avgDataPerPage / 1024).toFixed(1)}KB\n`;
        summary += `   • 平均请求时间: ${overall.avgRequestTimePerPage.toFixed(0)}ms\n`;
        return summary;
    }
    /**
     * 工具方法：标准化测试页面列表
     */
    normalizeTestPages(pages) {
        return pages.map(page => {
            if (typeof page === 'string') {
                return { url: page };
            }
            return page;
        });
    }
    /**
     * 工具方法：计算平均值
     */
    average(numbers) {
        if (numbers.length === 0)
            return 0;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }
    /**
     * 工具方法：从URL提取页面名称
     */
    extractPageName(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        }
        catch {
            return url;
        }
    }
    /**
     * 工具方法：获取扩展名称
     */
    async getExtensionName(extensionId) {
        // 这里可以从 ExtensionDetector 获取扩展信息
        // 暂时简单返回ID
        return `Extension ${extensionId.substring(0, 8)}...`;
    }
    /**
     * 工具方法：获取影响级别emoji
     */
    getImpactLevelEmoji(level) {
        switch (level) {
            case 'Critical': return '🔴';
            case 'High': return '🟠';
            case 'Medium': return '🟡';
            case 'Low': return '🟢';
            case 'Minimal': return '✅';
            default: return '⚪';
        }
    }
}
//# sourceMappingURL=ExtensionImpactMeasurer.js.map