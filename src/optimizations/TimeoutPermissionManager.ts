/**
 * 统一超时和权限管理器
 * 智能超时配置、权限检查、降级策略
 */

const log = (...args: any[]) => console.error('[TimeoutPermissionManager]', ...args);

interface OperationConfig {
  timeout: number;
  retries: number;
  fallbackEnabled: boolean;
}

export class TimeoutPermissionManager {
  private readonly OPERATION_CONFIGS: Map<string, OperationConfig> = new Map([
    // Chrome连接操作
    ['attach_to_chrome', { timeout: 8000, retries: 2, fallbackEnabled: true }],
    ['launch_chrome', { timeout: 12000, retries: 1, fallbackEnabled: false }],
    
    // 扩展检测操作
    ['list_extensions', { timeout: 5000, retries: 3, fallbackEnabled: true }],
    ['get_extension_logs', { timeout: 6000, retries: 2, fallbackEnabled: true }],
    
    // 扩展上下文操作
    ['list_extension_contexts', { timeout: 8000, retries: 2, fallbackEnabled: true }],
    ['switch_extension_context', { timeout: 10000, retries: 1, fallbackEnabled: false }],
    
    // 存储操作 - 增加超时时间
    ['inspect_extension_storage', { timeout: 15000, retries: 2, fallbackEnabled: true }],
    
    // 内容脚本操作 - 并行优化后的超时
    ['content_script_status', { timeout: 20000, retries: 1, fallbackEnabled: true }],
    
    // 监控操作
    ['monitor_extension_messages', { timeout: 25000, retries: 1, fallbackEnabled: true }],
    ['track_extension_api_calls', { timeout: 22000, retries: 1, fallbackEnabled: true }],
    
    // 测试操作
    ['test_extension_on_multiple_pages', { timeout: 60000, retries: 1, fallbackEnabled: true }],
    ['analyze_extension_performance', { timeout: 45000, retries: 1, fallbackEnabled: true }]
  ]);

  private operationStats: Map<string, any> = new Map();

  constructor(private chromeManager: any) {}

  /**
   * 执行带超时和重试的操作
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string,
    customTimeout?: number
  ): Promise<T> {
    const config = this.getOperationConfig(operationName);
    const timeout = customTimeout || config.timeout;
    
    log(`🎯 执行操作: ${operationName}, 超时: ${timeout}ms, 重试: ${config.retries}次`);
    
    return await this.executeWithRetries(operation, operationName, config);
  }

  /**
   * 获取操作配置
   */
  private getOperationConfig(operationName: string): OperationConfig {
    return this.OPERATION_CONFIGS.get(operationName) || {
      timeout: 10000,
      retries: 1,
      fallbackEnabled: true
    };
  }

  /**
   * 带重试的执行操作
   */
  private async executeWithRetries<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: OperationConfig
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
      try {
        log(`🔄 尝试 ${attempt}/${config.retries + 1}: ${operationName}`);
        
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(config.timeout, operationName)
        ]);
        
        // 记录成功统计
        this.recordOperationStats(operationName, true, attempt);
        return result as T;
        
      } catch (error) {
        lastError = error as Error;
        log(`❌ 尝试 ${attempt} 失败: ${lastError.message}`);
        
        if (attempt >= config.retries + 1 || !this.isRetryableError(lastError)) {
          break;
        }
        
        // 重试前的延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 记录失败统计
    this.recordOperationStats(operationName, false, config.retries + 1);
    
    throw lastError || new Error(`Operation ${operationName} failed after ${config.retries + 1} attempts`);
  }

  private createTimeoutPromise<T>(timeout: number, operationName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'WebSocket',
      'ECONNRESET',
      'ETIMEDOUT'
    ];
    
    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private recordOperationStats(operationName: string, success: boolean, attempts: number): void {
    if (!this.operationStats.has(operationName)) {
      this.operationStats.set(operationName, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalAttempts: 0,
        avgAttempts: 0
      });
    }
    
    const stats = this.operationStats.get(operationName);
    stats.totalCalls++;
    stats.totalAttempts += attempts;
    
    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
    
    stats.avgAttempts = stats.totalAttempts / stats.totalCalls;
  }

  /**
   * 获取操作统计
   */
  public getOperationStats(operationName?: string): any {
    if (operationName) {
      return this.operationStats.get(operationName) || null;
    }
    return Object.fromEntries(this.operationStats);
  }

  /**
   * 动态调整超时配置
   */
  public adjustTimeoutConfig(operationName: string, newTimeout: number): void {
    const config = this.OPERATION_CONFIGS.get(operationName);
    if (config) {
      config.timeout = newTimeout;
      log(`⚙️  调整 ${operationName} 超时时间为: ${newTimeout}ms`);
    }
  }
}
