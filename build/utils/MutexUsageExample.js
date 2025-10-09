/**
 * Mutex使用示例和最佳实践
 * 展示如何在Chrome Debug MCP中正确使用Mutex机制
 */
import { Mutex } from './Mutex.js';
export class MutexUsageExample {
    /**
     * 示例1: 基础Mutex使用模式
     * 这是最标准的使用方式，适用于所有需要串行化的操作
     */
    static async basicMutexUsage(operationName) {
        console.log(`🔄 [${operationName}] Waiting for mutex...`);
        const guard = await this.mutex.acquire();
        const startTime = Date.now();
        try {
            console.log(`🔒 [${operationName}] Mutex acquired, starting operation`);
            // 模拟需要串行化的操作（比如Chrome API调用）
            await this.simulateChromeOperation(operationName);
            const duration = Date.now() - startTime;
            console.log(`✅ [${operationName}] Operation completed successfully (${duration}ms)`);
            return { success: true, duration };
        }
        catch (error) {
            console.error(`❌ [${operationName}] Operation failed:`, error);
            throw error;
        }
        finally {
            const totalDuration = Date.now() - startTime;
            console.log(`🔓 [${operationName}] Mutex released (${totalDuration}ms total)`);
            guard.dispose(); // 确保释放锁
        }
    }
    /**
     * 示例2: Chrome Debug MCP中的实际使用场景
     * 展示在工具执行中如何使用Mutex
     */
    static async executeToolWithMutex(toolName, args) {
        const guard = await this.mutex.acquire();
        const startTime = Date.now();
        try {
            console.log(`🔒 [Mutex] Tool '${toolName}' acquired lock`);
            // 实际工具执行逻辑
            switch (toolName) {
                case 'attach_to_chrome':
                    return await this.simulateAttachToChrome(args);
                case 'list_extensions':
                    return await this.simulateListExtensions(args);
                case 'evaluate':
                    return await this.simulateEvaluate(args);
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        }
        catch (error) {
            console.error(`❌ [Mutex] Tool '${toolName}' failed:`, error);
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            console.log(`🔓 [Mutex] Tool '${toolName}' released lock (${duration}ms)`);
            guard.dispose();
        }
    }
    /**
     * 示例3: 并发测试 - 验证Mutex的FIFO队列机制
     */
    static async demonstrateConcurrencyProtection() {
        console.log('\n🧪 并发保护演示 - 启动3个并发操作');
        const operations = [
            this.basicMutexUsage('Operation-A'),
            this.basicMutexUsage('Operation-B'),
            this.basicMutexUsage('Operation-C')
        ];
        const results = await Promise.all(operations);
        console.log('\n📊 并发测试结果:');
        results.forEach((result, index) => {
            const opName = `Operation-${String.fromCharCode(65 + index)}`;
            console.log(`  ${result.success ? '✅' : '❌'} ${opName}: ${result.duration}ms`);
        });
        return results;
    }
    /**
     * 示例4: 错误处理和超时机制
     */
    static async demonstrateErrorHandling() {
        const guard = await this.mutex.acquire();
        const startTime = Date.now();
        try {
            console.log(`🔒 [ErrorDemo] Mutex acquired`);
            // 模拟可能失败的操作
            const shouldFail = Math.random() > 0.5;
            if (shouldFail) {
                throw new Error('Simulated operation failure');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`✅ [ErrorDemo] Operation succeeded`);
        }
        catch (error) {
            console.error(`❌ [ErrorDemo] Caught error:`, error.message);
            // 即使出错，也要确保释放锁
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            console.log(`🔓 [ErrorDemo] Mutex released (${duration}ms)`);
            guard.dispose();
        }
    }
    /**
     * 获取Mutex状态信息
     */
    static getMutexStatus() {
        const status = this.mutex.getStatus();
        console.log('🔍 Mutex Status:', {
            locked: status.locked ? '🔒 Locked' : '🔓 Unlocked',
            queueLength: status.queueLength,
            waitingOperations: status.queueLength > 0 ? '⏳ Waiting' : '✅ None'
        });
        return status;
    }
    // 辅助方法 - 模拟Chrome操作
    static async simulateChromeOperation(name) {
        const duration = 500 + Math.random() * 1000; // 0.5-1.5秒
        console.log(`  ⚙️  [${name}] Executing Chrome operation...`);
        await new Promise(resolve => setTimeout(resolve, duration));
    }
    static async simulateAttachToChrome(args) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            success: true,
            message: `Connected to Chrome at ${args.host || 'localhost'}:${args.port || 9222}`
        };
    }
    static async simulateListExtensions(args) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            extensions: [
                { id: 'ext1', name: 'Test Extension 1' },
                { id: 'ext2', name: 'Test Extension 2' }
            ]
        };
    }
    static async simulateEvaluate(args) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            result: `Evaluated: ${args.expression}`,
            value: 'success'
        };
    }
}
MutexUsageExample.mutex = new Mutex();
/**
 * Mutex最佳实践指南
 */
export const MutexBestPractices = {
    /**
     * ✅ 正确的使用模式
     */
    correctUsage: `
  const guard = await mutex.acquire();
  try {
    // 执行需要保护的操作
    return await protectedOperation();
  } catch (error) {
    // 处理错误
    throw error;
  } finally {
    // 确保释放锁
    guard.dispose();
  }
  `,
    /**
     * ❌ 错误的使用模式
     */
    incorrectUsage: `
  // 错误1: 忘记释放锁
  const guard = await mutex.acquire();
  return await operation(); // 没有finally块
  
  // 错误2: 在acquire之前就可能出错
  const result = await riskyPreparation();
  const guard = await mutex.acquire(); // 如果上面出错，永远不会acquire
  
  // 错误3: 嵌套锁
  const guard1 = await mutex1.acquire();
  const guard2 = await mutex2.acquire(); // 可能死锁
  `,
    /**
     * 🎯 使用场景
     */
    useCases: [
        '🔧 Chrome API调用 - 防止并发调用导致状态混乱',
        '📊 扩展数据收集 - 确保数据一致性',
        '🎯 页面操作 - 防止多个操作同时修改DOM',
        '💾 状态更新 - 保护共享状态的修改',
        '🔄 资源清理 - 确保清理操作的原子性'
    ],
    /**
     * 📏 性能考虑
     */
    performanceNotes: [
        '⚡ 锁操作本身非常快速（通常<1ms）',
        '🎯 只对真正需要串行化的操作使用Mutex',
        '📊 监控锁持有时间，避免长时间占用',
        '🔄 考虑操作的粒度，不要锁太大的代码块',
        '⚠️  避免在锁内执行I/O密集型操作'
    ]
};
//# sourceMappingURL=MutexUsageExample.js.map