/**
 * Mutex使用示例和最佳实践
 * 展示如何在Chrome Debug MCP中正确使用Mutex机制
 */
export declare class MutexUsageExample {
    private static mutex;
    /**
     * 示例1: 基础Mutex使用模式
     * 这是最标准的使用方式，适用于所有需要串行化的操作
     */
    static basicMutexUsage(operationName: string): Promise<{
        success: boolean;
        duration: number;
    }>;
    /**
     * 示例2: Chrome Debug MCP中的实际使用场景
     * 展示在工具执行中如何使用Mutex
     */
    static executeToolWithMutex(toolName: string, args: any): Promise<{
        success: boolean;
        message: string;
    } | {
        extensions: {
            id: string;
            name: string;
        }[];
    } | {
        result: string;
        value: string;
    }>;
    /**
     * 示例3: 并发测试 - 验证Mutex的FIFO队列机制
     */
    static demonstrateConcurrencyProtection(): Promise<{
        success: boolean;
        duration: number;
    }[]>;
    /**
     * 示例4: 错误处理和超时机制
     */
    static demonstrateErrorHandling(): Promise<void>;
    /**
     * 获取Mutex状态信息
     */
    static getMutexStatus(): {
        locked: boolean;
        queueLength: number;
    };
    private static simulateChromeOperation;
    private static simulateAttachToChrome;
    private static simulateListExtensions;
    private static simulateEvaluate;
}
/**
 * Mutex最佳实践指南
 */
export declare const MutexBestPractices: {
    /**
     * ✅ 正确的使用模式
     */
    correctUsage: string;
    /**
     * ❌ 错误的使用模式
     */
    incorrectUsage: string;
    /**
     * 🎯 使用场景
     */
    useCases: string[];
    /**
     * 📏 性能考虑
     */
    performanceNotes: string[];
};
//# sourceMappingURL=MutexUsageExample.d.ts.map