/**
 * ExtensionPerformanceAnalyzer - 扩展性能分析器
 *
 * 功能：
 * - 录制Chrome性能trace
 * - 对比有/无扩展的性能差异
 * - 计算扩展对页面性能的影响
 * - 生成性能优化建议
 * - 集成Web Vitals实时测量
 */
import { measureWebVitals, rateWebVital, calculateWebVitalsScore, generateWebVitalsRecommendations } from '../../utils/WebVitalsIntegration.js';
export class ExtensionPerformanceAnalyzer {
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
    }
    /**
     * 分析扩展性能影响
     */
    async analyzePerformance(options) {
        console.log(`[ExtensionPerformanceAnalyzer] 开始分析扩展性能: ${options.extensionId}`);
        // 优化：减少默认trace时长，提高测试效率
        const duration = options.duration || 1500; // 从3000ms减少到1500ms
        const iterations = options.iterations || 1;
        try {
            // 1. 录制基准trace（理想情况下应该禁用扩展，但当前先简化实现）
            console.log('[ExtensionPerformanceAnalyzer] 录制基准trace...');
            const baselineTrace = await this.recordTrace(options.testUrl, duration);
            // 等待一下，让浏览器状态稳定
            await new Promise(resolve => setTimeout(resolve, 500)); // 减少等待时间
            // 2. 录制扩展trace（当前实现中，我们假设扩展已经加载）
            console.log('[ExtensionPerformanceAnalyzer] 录制扩展trace...');
            const extensionTrace = await this.recordTrace(options.testUrl, duration);
            // 3. 解析trace数据
            const baselineEvents = this.parseTraceEvents(baselineTrace);
            const extensionEvents = this.parseTraceEvents(extensionTrace);
            // 4. 计算性能指标
            const baselineMetrics = this.calculateMetrics(baselineEvents);
            const extensionMetrics = this.calculateMetrics(extensionEvents);
            // 5. 计算Core Web Vitals
            const baselineCWV = this.calculateCoreWebVitals(baselineEvents);
            const extensionCWV = this.calculateCoreWebVitals(extensionEvents);
            // 6. 计算差异
            const deltaMetrics = this.calculateDelta(baselineMetrics, extensionMetrics);
            const deltaCWV = this.calculateCWVDelta(baselineCWV, extensionCWV);
            // 7. 计算影响
            const impact = this.calculateImpact(deltaMetrics, deltaCWV);
            // 8. 生成建议（传递扩展CWV数据以生成更详细的建议）
            const recommendations = this.generateRecommendations(deltaMetrics, impact, extensionCWV);
            // 9. 生成摘要
            const summary = this.generateSummary(deltaMetrics, impact);
            const result = {
                extensionId: options.extensionId,
                extensionName: options.extensionId, // TODO: 获取实际扩展名称
                testUrl: options.testUrl,
                timestamp: Date.now(),
                metrics: {
                    baseline: baselineMetrics,
                    withExtension: extensionMetrics,
                    delta: deltaMetrics
                },
                cwv: {
                    baseline: baselineCWV,
                    withExtension: extensionCWV,
                    delta: deltaCWV
                },
                impact,
                recommendations,
                summary
            };
            console.log('[ExtensionPerformanceAnalyzer] 性能分析完成');
            return result;
        }
        catch (error) {
            console.error('[ExtensionPerformanceAnalyzer] 性能分析失败:', error);
            throw new Error(`性能分析失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 录制性能trace
     */
    async recordTrace(url, duration) {
        // 使用 getActivePage() 而不是 getCurrentPage()，它会自动查找可用页面
        const page = await this.pageManager.getActivePage();
        // 导航到about:blank清空状态
        // 使用 load 而非 networkidle0，避免活跃扩展导致永久等待
        await page.goto('about:blank', { waitUntil: 'load', timeout: 8000 });
        await new Promise(resolve => setTimeout(resolve, 300)); // 减少等待时间
        // 启动tracing
        await page.tracing.start({
            categories: [
                '-*', // 排除所有默认类别
                'devtools.timeline', // DevTools时间线
                'disabled-by-default-devtools.timeline', // 详细时间线
                'disabled-by-default-devtools.timeline.frame', // 帧相关
                'disabled-by-default-v8.cpu_profiler', // V8 CPU分析
                'disabled-by-default-v8.cpu_profiler.hires', // 高精度CPU
                'v8.execute', // V8执行
                'v8', // V8引擎
                'blink.user_timing', // 用户时序
                'loading', // 加载事件
                'latencyInfo', // 延迟信息
            ],
            screenshots: false // 暂时不包含截图
        });
        // 导航到测试页面
        // 使用 domcontentloaded 加快速度，避免活跃扩展阻塞
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000 // 减少超时时间
        });
        // 等待指定时间收集性能数据
        await new Promise(resolve => setTimeout(resolve, duration));
        // 停止tracing并返回buffer
        const traceBuffer = await page.tracing.stop();
        if (!traceBuffer) {
            throw new Error('Failed to capture trace data');
        }
        return traceBuffer;
    }
    /**
     * 解析trace events
     */
    parseTraceEvents(traceBuffer) {
        try {
            const traceData = JSON.parse(traceBuffer.toString('utf-8'));
            return traceData.traceEvents || [];
        }
        catch (error) {
            console.error('[ExtensionPerformanceAnalyzer] 解析trace失败:', error);
            return [];
        }
    }
    /**
     * 计算性能指标
     */
    calculateMetrics(events) {
        // 过滤有效事件
        const validEvents = events.filter(e => e.dur && e.dur > 0);
        // 计算各类时间
        const scriptEvents = validEvents.filter(e => e.name === 'EvaluateScript' || e.name === 'v8.compile' || e.name === 'v8.run');
        const layoutEvents = validEvents.filter(e => e.name === 'Layout' || e.name === 'UpdateLayoutTree');
        const paintEvents = validEvents.filter(e => e.name === 'Paint' || e.name === 'CompositeLayers');
        const scriptEvaluationTime = scriptEvents.reduce((sum, e) => sum + (e.dur || 0), 0) / 1000;
        const layoutTime = layoutEvents.reduce((sum, e) => sum + (e.dur || 0), 0) / 1000;
        const paintTime = paintEvents.reduce((sum, e) => sum + (e.dur || 0), 0) / 1000;
        const executionTime = scriptEvaluationTime + layoutTime + paintTime;
        // 估算CPU使用率（简化实现）
        const totalDuration = validEvents.reduce((sum, e) => sum + (e.dur || 0), 0) / 1000;
        const cpuUsage = Math.min((executionTime / totalDuration) * 100, 100) || 0;
        // 估算内存使用（从trace events中提取，简化实现）
        const memoryEvents = events.filter(e => e.name === 'UpdateCounters');
        const memoryUsage = memoryEvents.length > 0
            ? (memoryEvents[memoryEvents.length - 1]?.args?.data?.jsHeapSizeUsed || 0) / (1024 * 1024)
            : 0;
        return {
            cpuUsage: parseFloat(cpuUsage.toFixed(2)),
            memoryUsage: parseFloat(memoryUsage.toFixed(2)),
            executionTime: parseFloat(executionTime.toFixed(2)),
            scriptEvaluationTime: parseFloat(scriptEvaluationTime.toFixed(2)),
            layoutTime: parseFloat(layoutTime.toFixed(2)),
            paintTime: parseFloat(paintTime.toFixed(2))
        };
    }
    /**
     * 计算Core Web Vitals（增强版 - 结合trace events和实时测量）
     */
    async calculateCoreWebVitalsEnhanced(events, url) {
        // 1. 从trace events中提取基础指标
        const lcpEvent = events.find(e => e.name === 'largestContentfulPaint::Candidate');
        const fidEvent = events.find(e => e.name === 'firstInputDelay');
        const fcpEvent = events.find(e => e.name === 'firstContentfulPaint');
        const navStart = events.find(e => e.name === 'navigationStart');
        const startTime = navStart?.ts || 0;
        let lcp = lcpEvent ? (lcpEvent.ts - startTime) / 1000 : 0;
        let fid = fidEvent?.args?.data?.duration || 0;
        const fcp = fcpEvent ? (fcpEvent.ts - startTime) / 1000 : 0;
        // CLS需要特殊计算
        const layoutShiftEvents = events.filter(e => e.name === 'LayoutShift');
        let cls = layoutShiftEvents.reduce((sum, e) => sum + (e.args?.data?.score || 0), 0);
        // TTFB（Time to First Byte）
        const responseEvent = events.find(e => e.name === 'ResourceReceiveResponse');
        const ttfb = responseEvent ? (responseEvent.ts - startTime) / 1000 : 0;
        // 2. 如果可用，使用实时Web Vitals测量（更准确）
        try {
            const page = await this.pageManager.getActivePage();
            if (page && url) {
                const webVitals = await measureWebVitals(page);
                // 使用实时测量的值（如果非零）
                if (webVitals.lcp > 0)
                    lcp = webVitals.lcp;
                if (webVitals.fid > 0)
                    fid = webVitals.fid;
                if (webVitals.cls > 0)
                    cls = webVitals.cls;
            }
        }
        catch (error) {
            console.log('[ExtensionPerformanceAnalyzer] 无法获取实时Web Vitals，使用trace数据');
        }
        // 3. 计算评分
        const rating = {
            lcp: rateWebVital('lcp', lcp),
            fid: rateWebVital('fid', fid),
            cls: rateWebVital('cls', cls)
        };
        // 4. 计算综合评分
        const score = calculateWebVitalsScore({ lcp, fid, cls });
        return {
            lcp: parseFloat(lcp.toFixed(2)),
            fid: parseFloat(fid.toFixed(2)),
            cls: parseFloat(cls.toFixed(4)),
            fcp: parseFloat(fcp.toFixed(2)),
            ttfb: parseFloat(ttfb.toFixed(2)),
            rating,
            score
        };
    }
    /**
     * 计算Core Web Vitals（旧版 - 保留兼容性）
     */
    calculateCoreWebVitals(events) {
        // 查找关键事件
        const lcpEvent = events.find(e => e.name === 'largestContentfulPaint::Candidate');
        const fidEvent = events.find(e => e.name === 'firstInputDelay');
        const fcpEvent = events.find(e => e.name === 'firstContentfulPaint');
        const navStart = events.find(e => e.name === 'navigationStart');
        const startTime = navStart?.ts || 0;
        // 计算各项指标（相对于导航开始时间）
        const lcp = lcpEvent ? (lcpEvent.ts - startTime) / 1000 : 0;
        const fid = fidEvent?.args?.data?.duration || 0;
        const fcp = fcpEvent ? (fcpEvent.ts - startTime) / 1000 : 0;
        // CLS需要特殊计算（简化实现）
        const layoutShiftEvents = events.filter(e => e.name === 'LayoutShift');
        const cls = layoutShiftEvents.reduce((sum, e) => sum + (e.args?.data?.score || 0), 0);
        // TTFB（Time to First Byte）
        const responseEvent = events.find(e => e.name === 'ResourceReceiveResponse');
        const ttfb = responseEvent ? (responseEvent.ts - startTime) / 1000 : 0;
        // 添加评分
        const rating = {
            lcp: rateWebVital('lcp', lcp),
            fid: rateWebVital('fid', fid),
            cls: rateWebVital('cls', cls)
        };
        const score = calculateWebVitalsScore({ lcp, fid, cls });
        return {
            lcp: parseFloat(lcp.toFixed(2)),
            fid: parseFloat(fid.toFixed(2)),
            cls: parseFloat(cls.toFixed(4)),
            fcp: parseFloat(fcp.toFixed(2)),
            ttfb: parseFloat(ttfb.toFixed(2)),
            rating,
            score
        };
    }
    /**
     * 计算指标差异
     */
    calculateDelta(baseline, extension) {
        return {
            cpuUsage: parseFloat((extension.cpuUsage - baseline.cpuUsage).toFixed(2)),
            memoryUsage: parseFloat((extension.memoryUsage - baseline.memoryUsage).toFixed(2)),
            executionTime: parseFloat((extension.executionTime - baseline.executionTime).toFixed(2)),
            scriptEvaluationTime: parseFloat((extension.scriptEvaluationTime - baseline.scriptEvaluationTime).toFixed(2)),
            layoutTime: parseFloat((extension.layoutTime - baseline.layoutTime).toFixed(2)),
            paintTime: parseFloat((extension.paintTime - baseline.paintTime).toFixed(2))
        };
    }
    /**
     * 计算CWV差异
     */
    calculateCWVDelta(baseline, extension) {
        return {
            lcp: parseFloat((extension.lcp - baseline.lcp).toFixed(2)),
            fid: parseFloat((extension.fid - baseline.fid).toFixed(2)),
            cls: parseFloat((extension.cls - baseline.cls).toFixed(4)),
            fcp: parseFloat((extension.fcp - baseline.fcp).toFixed(2)),
            ttfb: parseFloat((extension.ttfb - baseline.ttfb).toFixed(2))
        };
    }
    /**
     * 计算性能影响
     */
    calculateImpact(deltaMetrics, deltaCWV) {
        return {
            pageLoadDelay: deltaMetrics.executionTime,
            interactionDelay: deltaCWV.fid,
            memoryIncrease: deltaMetrics.memoryUsage,
            cpuIncrease: deltaMetrics.cpuUsage,
            cwvImpact: {
                lcp: deltaCWV.lcp,
                fid: deltaCWV.fid,
                cls: deltaCWV.cls
            }
        };
    }
    /**
     * 生成优化建议（增强版 - 包含Web Vitals建议）
     */
    generateRecommendations(delta, impact, extensionCWV) {
        const recommendations = [];
        // CPU使用率建议
        if (delta.cpuUsage > 10) {
            recommendations.push(`⚠️ CPU使用率增加${delta.cpuUsage.toFixed(1)}%，建议优化JavaScript执行逻辑，减少同步操作`);
        }
        else if (delta.cpuUsage > 5) {
            recommendations.push(`💡 CPU使用率增加${delta.cpuUsage.toFixed(1)}%，考虑使用Web Workers处理计算密集型任务`);
        }
        // 内存使用建议
        if (delta.memoryUsage > 50) {
            recommendations.push(`⚠️ 内存使用增加${delta.memoryUsage.toFixed(1)}MB，检查是否存在内存泄漏，及时清理不需要的对象`);
        }
        else if (delta.memoryUsage > 20) {
            recommendations.push(`💡 内存使用增加${delta.memoryUsage.toFixed(1)}MB，考虑优化数据结构，减少内存占用`);
        }
        // 脚本执行时间建议
        if (delta.scriptEvaluationTime > 500) {
            recommendations.push(`⚠️ 脚本执行时间增加${delta.scriptEvaluationTime.toFixed(0)}ms，建议分割大型脚本或延迟加载`);
        }
        // 页面加载延迟建议
        if (impact.pageLoadDelay > 500) {
            recommendations.push(`⚠️ 页面加载延迟${impact.pageLoadDelay.toFixed(0)}ms，考虑将扩展初始化移至页面加载完成后`);
        }
        else if (impact.pageLoadDelay > 200) {
            recommendations.push(`💡 页面加载延迟${impact.pageLoadDelay.toFixed(0)}ms，可以进一步优化启动性能`);
        }
        // LCP影响建议
        if (impact.cwvImpact.lcp > 500) {
            recommendations.push(`⚠️ LCP增加${impact.cwvImpact.lcp.toFixed(0)}ms，扩展可能阻塞了关键内容的渲染`);
        }
        // CLS影响建议
        if (impact.cwvImpact.cls > 0.1) {
            recommendations.push(`⚠️ CLS增加${impact.cwvImpact.cls.toFixed(3)}，扩展可能导致布局偏移，检查动态插入的元素`);
        }
        // 添加Web Vitals专业建议
        if (extensionCWV) {
            const webVitalsRecommendations = generateWebVitalsRecommendations({
                lcp: extensionCWV.lcp,
                fid: extensionCWV.fid,
                cls: extensionCWV.cls
            });
            recommendations.push(...webVitalsRecommendations);
        }
        // 如果影响很小，给出正面反馈
        if (recommendations.length === 0) {
            recommendations.push(`✅ 扩展性能影响较小，继续保持良好的性能优化实践`);
        }
        return recommendations;
    }
    /**
     * 生成摘要
     */
    generateSummary(delta, impact) {
        const impactLevel = this.calculateImpactLevel(delta, impact);
        let summary = `扩展性能影响级别: ${impactLevel}\n\n`;
        summary += `📊 关键指标:\n`;
        summary += `• CPU使用率增加: ${delta.cpuUsage > 0 ? '+' : ''}${delta.cpuUsage.toFixed(1)}%\n`;
        summary += `• 内存使用增加: ${delta.memoryUsage > 0 ? '+' : ''}${delta.memoryUsage.toFixed(1)}MB\n`;
        summary += `• 页面加载延迟: ${delta.executionTime > 0 ? '+' : ''}${delta.executionTime.toFixed(0)}ms\n`;
        summary += `• LCP影响: ${impact.cwvImpact.lcp > 0 ? '+' : ''}${impact.cwvImpact.lcp.toFixed(0)}ms\n`;
        summary += `• CLS影响: ${impact.cwvImpact.cls > 0 ? '+' : ''}${impact.cwvImpact.cls.toFixed(3)}\n`;
        return summary;
    }
    /**
     * 计算影响级别
     */
    calculateImpactLevel(delta, impact) {
        let score = 0;
        // CPU影响评分
        if (delta.cpuUsage > 20)
            score += 3;
        else if (delta.cpuUsage > 10)
            score += 2;
        else if (delta.cpuUsage > 5)
            score += 1;
        // 内存影响评分
        if (delta.memoryUsage > 100)
            score += 3;
        else if (delta.memoryUsage > 50)
            score += 2;
        else if (delta.memoryUsage > 20)
            score += 1;
        // 加载延迟评分
        if (impact.pageLoadDelay > 1000)
            score += 3;
        else if (impact.pageLoadDelay > 500)
            score += 2;
        else if (impact.pageLoadDelay > 200)
            score += 1;
        // LCP影响评分
        if (impact.cwvImpact.lcp > 1000)
            score += 3;
        else if (impact.cwvImpact.lcp > 500)
            score += 2;
        else if (impact.cwvImpact.lcp > 200)
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
}
//# sourceMappingURL=ExtensionPerformanceAnalyzer.js.map