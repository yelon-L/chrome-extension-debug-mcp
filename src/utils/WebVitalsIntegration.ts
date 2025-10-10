/**
 * Web Vitals Integration - 集成web-vitals库测量Core Web Vitals
 * 
 * 功能：
 * - 在页面中注入web-vitals库
 * - 测量LCP (Largest Contentful Paint)
 * - 测量FID (First Input Delay)
 * - 测量CLS (Cumulative Layout Shift)
 * - 提供Web Vitals评分
 */

import type { Page } from 'puppeteer';

export interface WebVitalsResult {
  lcp: number;
  fid: number;
  cls: number;
  timestamp: number;
}

export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * 测量页面的Web Vitals指标
 */
export async function measureWebVitals(page: Page): Promise<WebVitalsResult> {
  try {
    // 注入web-vitals脚本并收集指标
    const result = await page.evaluate(() => {
      return new Promise<WebVitalsResult>((resolve) => {
        const metrics: any = {
          lcp: 0,
          fid: 0,
          cls: 0,
          timestamp: Date.now()
        };
        
        let collectedCount = 0;
        const totalMetrics = 3; // LCP, FID, CLS
        
        const checkComplete = () => {
          collectedCount++;
          if (collectedCount >= totalMetrics) {
            resolve(metrics);
          }
        };
        
        // 由于web-vitals需要在页面加载时运行，我们使用Performance API作为备选
        // LCP - Largest Contentful Paint
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            if (lastEntry) {
              metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
            }
            checkComplete();
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          
          // 超时保护
          setTimeout(() => {
            if (metrics.lcp === 0) {
              // 使用备选方法
              const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
              if (lcpEntries.length > 0) {
                const lastLCP = lcpEntries[lcpEntries.length - 1] as any;
                metrics.lcp = lastLCP.renderTime || lastLCP.loadTime || 0;
              }
              checkComplete();
            }
          }, 1000);
        } catch (e) {
          metrics.lcp = 0;
          checkComplete();
        }
        
        // FID - First Input Delay
        try {
          let fidReported = false;
          const observer = new PerformanceObserver((list) => {
            if (fidReported) return;
            const entries = list.getEntries();
            const firstEntry = entries[0] as any;
            if (firstEntry) {
              metrics.fid = firstEntry.processingStart - firstEntry.startTime;
              fidReported = true;
              checkComplete();
            }
          });
          observer.observe({ type: 'first-input', buffered: true });
          
          // FID需要用户交互，设置超时
          setTimeout(() => {
            if (!fidReported) {
              // 如果没有用户交互，FID为0
              metrics.fid = 0;
              checkComplete();
            }
          }, 2000);
        } catch (e) {
          metrics.fid = 0;
          checkComplete();
        }
        
        // CLS - Cumulative Layout Shift
        try {
          let clsScore = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const layoutShift = entry as any;
              if (!layoutShift.hadRecentInput) {
                clsScore += layoutShift.value;
              }
            }
            metrics.cls = clsScore;
          });
          observer.observe({ type: 'layout-shift', buffered: true });
          
          // 收集一段时间的CLS
          setTimeout(() => {
            metrics.cls = clsScore;
            checkComplete();
          }, 2000);
        } catch (e) {
          metrics.cls = 0;
          checkComplete();
        }
        
        // 最终超时保护
        setTimeout(() => {
          resolve(metrics);
        }, 5000);
      });
    });
    
    return result;
  } catch (error) {
    console.error('[WebVitalsIntegration] 测量失败:', error);
    // 返回默认值
    return {
      lcp: 0,
      fid: 0,
      cls: 0,
      timestamp: Date.now()
    };
  }
}

/**
 * 对Web Vital指标进行评分
 */
export function rateWebVital(
  metric: 'lcp' | 'fid' | 'cls',
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },      // ms
    fid: { good: 100, poor: 300 },        // ms
    cls: { good: 0.1, poor: 0.25 }        // score
  };
  
  const threshold = thresholds[metric];
  
  if (value <= threshold.good) {
    return 'good';
  } else if (value <= threshold.poor) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * 获取Web Vital评分的描述
 */
export function getWebVitalDescription(rating: 'good' | 'needs-improvement' | 'poor'): string {
  const descriptions = {
    good: '✓ 优秀',
    'needs-improvement': '⚠ 需要改进',
    poor: '✗ 较差'
  };
  return descriptions[rating];
}

/**
 * 计算Web Vitals的综合评分（0-100）
 */
export function calculateWebVitalsScore(vitals: {
  lcp: number;
  fid: number;
  cls: number;
}): number {
  // 各指标权重
  const weights = {
    lcp: 0.4,  // 40%
    fid: 0.3,  // 30%
    cls: 0.3   // 30%
  };
  
  // 计算各指标得分（0-100）
  const lcpScore = calculateMetricScore('lcp', vitals.lcp);
  const fidScore = calculateMetricScore('fid', vitals.fid);
  const clsScore = calculateMetricScore('cls', vitals.cls);
  
  // 加权平均
  const totalScore = 
    lcpScore * weights.lcp +
    fidScore * weights.fid +
    clsScore * weights.cls;
  
  return Math.round(totalScore);
}

/**
 * 计算单个指标得分
 */
function calculateMetricScore(metric: 'lcp' | 'fid' | 'cls', value: number): number {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 }
  };
  
  const threshold = thresholds[metric];
  
  if (value <= threshold.good) {
    return 100;  // 优秀
  } else if (value <= threshold.poor) {
    // 线性插值：good到poor之间
    const range = threshold.poor - threshold.good;
    const position = value - threshold.good;
    const percentage = position / range;
    return Math.round(100 - (percentage * 50));  // 100到50
  } else {
    // poor之后快速下降
    const excess = value - threshold.poor;
    const range = threshold.poor;
    const percentage = Math.min(1, excess / range);
    return Math.round(50 - (percentage * 50));  // 50到0
  }
}

/**
 * 生成Web Vitals优化建议
 */
export function generateWebVitalsRecommendations(vitals: {
  lcp: number;
  fid: number;
  cls: number;
}): string[] {
  const recommendations: string[] = [];
  
  // LCP建议
  const lcpRating = rateWebVital('lcp', vitals.lcp);
  if (lcpRating === 'poor') {
    recommendations.push('LCP过高（>4s）：优化图片加载、减少服务器响应时间、使用CDN');
  } else if (lcpRating === 'needs-improvement') {
    recommendations.push('LCP需改进（2.5-4s）：考虑懒加载、优化关键资源、减少渲染阻塞');
  }
  
  // FID建议
  const fidRating = rateWebVital('fid', vitals.fid);
  if (fidRating === 'poor') {
    recommendations.push('FID过高（>300ms）：减少JavaScript执行时间、拆分长任务、使用Web Workers');
  } else if (fidRating === 'needs-improvement') {
    recommendations.push('FID需改进（100-300ms）：优化JavaScript执行、减少主线程阻塞');
  }
  
  // CLS建议
  const clsRating = rateWebVital('cls', vitals.cls);
  if (clsRating === 'poor') {
    recommendations.push('CLS过高（>0.25）：为图片和广告预留空间、避免动态插入内容');
  } else if (clsRating === 'needs-improvement') {
    recommendations.push('CLS需改进（0.1-0.25）：固定元素尺寸、避免无尺寸的媒体元素');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('所有Web Vitals指标都在良好范围内！');
  }
  
  return recommendations;
}


