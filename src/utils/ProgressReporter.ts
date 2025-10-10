/**
 * Progress Reporter - 进度反馈工具
 * 
 * 功能：
 * - 报告长时间运行任务的进度
 * - 提供实时进度更新
 * - 支持百分比计算
 * - 支持自定义消息
 */

export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  message: string;
  timestamp: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * 进度报告器类
 */
export class ProgressReporter {
  private onProgress?: ProgressCallback;
  private lastReportTime: number = 0;
  private minReportInterval: number = 1000; // 最小报告间隔（ms）

  constructor(onProgress?: ProgressCallback, minReportInterval: number = 1000) {
    this.onProgress = onProgress;
    this.minReportInterval = minReportInterval;
  }

  /**
   * 报告进度
   */
  report(current: number, total: number, message: string, force: boolean = false): void {
    const now = Date.now();
    
    // 避免过于频繁的进度更新（除非强制报告）
    if (!force && now - this.lastReportTime < this.minReportInterval) {
      return;
    }
    
    if (this.onProgress) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      this.onProgress({
        current,
        total,
        percentage: Math.min(100, Math.max(0, percentage)),
        message,
        timestamp: now
      });
      this.lastReportTime = now;
    }
  }

  /**
   * 使用进度报告执行任务
   */
  async withProgress<T>(
    total: number,
    task: (reporter: (current: number, message: string) => void) => Promise<T>
  ): Promise<T> {
    const reportFunc = (current: number, message: string) => {
      this.report(current, total, message);
    };
    return task(reportFunc);
  }

  /**
   * 创建时间基准的进度报告器
   * 根据已用时间自动计算进度
   */
  static createTimeBased(
    totalDuration: number,
    onProgress?: ProgressCallback,
    updateInterval: number = 2000
  ): { start: () => void; stop: () => void } {
    let startTime: number;
    let intervalId: NodeJS.Timeout | null = null;
    const reporter = new ProgressReporter(onProgress, updateInterval);

    return {
      start: () => {
        startTime = Date.now();
        
        // 立即报告开始
        reporter.report(0, totalDuration, '开始...', true);
        
        // 定期更新进度
        intervalId = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed, totalDuration);
          const message = elapsed >= totalDuration 
            ? '完成...' 
            : `进行中... (${Math.round(elapsed / 1000)}s / ${Math.round(totalDuration / 1000)}s)`;
          reporter.report(progress, totalDuration, message, true);
        }, updateInterval);
      },
      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        // 报告最终完成
        reporter.report(totalDuration, totalDuration, '完成!', true);
      }
    };
  }

  /**
   * 创建分步进度报告器
   * 适用于已知步骤数量的任务
   */
  static createStepBased(
    totalSteps: number,
    onProgress?: ProgressCallback
  ): { reportStep: (step: number, message: string) => void } {
    const reporter = new ProgressReporter(onProgress, 0); // 每步都报告

    return {
      reportStep: (step: number, message: string) => {
        reporter.report(step, totalSteps, `步骤 ${step}/${totalSteps}: ${message}`, true);
      }
    };
  }

  /**
   * 控制台进度报告器（用于调试）
   */
  static createConsoleReporter(): ProgressReporter {
    return new ProgressReporter((update) => {
      const bar = '█'.repeat(Math.floor(update.percentage / 2)) + 
                  '░'.repeat(50 - Math.floor(update.percentage / 2));
      console.log(
        `[进度] ${bar} ${update.percentage}% - ${update.message}`
      );
    });
  }

  /**
   * 格式化进度信息为字符串
   */
  static formatProgress(update: ProgressUpdate): string {
    return `[${update.percentage}%] ${update.message} (${update.current}/${update.total})`;
  }

  /**
   * 估算剩余时间
   */
  static estimateRemainingTime(
    startTime: number,
    current: number,
    total: number
  ): number {
    if (current === 0) return 0;
    const elapsed = Date.now() - startTime;
    const rate = elapsed / current;
    const remaining = total - current;
    return Math.round(rate * remaining);
  }

  /**
   * 格式化时间（毫秒转为人类可读）
   */
  static formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * 进度上下文 - 用于嵌套进度报告
 */
export class ProgressContext {
  private stack: Array<{ name: string; weight: number }> = [];
  private weights: number[] = [];
  private currentProgress: number[] = [];
  private reporter: ProgressReporter;

  constructor(reporter: ProgressReporter) {
    this.reporter = reporter;
  }

  /**
   * 开始一个新的进度阶段
   */
  beginPhase(name: string, weight: number = 1): void {
    this.stack.push({ name, weight });
    this.weights.push(weight);
    this.currentProgress.push(0);
  }

  /**
   * 更新当前阶段的进度
   */
  updatePhase(progress: number, message: string): void {
    if (this.currentProgress.length === 0) return;
    
    const index = this.currentProgress.length - 1;
    this.currentProgress[index] = progress;
    
    // 计算总体进度
    const totalWeight = this.weights.reduce((sum, w) => sum + w, 0);
    const completedWeight = this.weights
      .slice(0, index)
      .reduce((sum, w) => sum + w, 0);
    const currentWeight = this.weights[index];
    const overallProgress = 
      (completedWeight + currentWeight * (progress / 100)) / totalWeight;
    
    const fullMessage = this.stack.map(s => s.name).join(' > ') + ': ' + message;
    this.reporter.report(
      Math.round(overallProgress * 100),
      100,
      fullMessage,
      true
    );
  }

  /**
   * 结束当前阶段
   */
  endPhase(): void {
    this.stack.pop();
    this.weights.pop();
    this.currentProgress.pop();
  }
}


