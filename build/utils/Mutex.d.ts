/**
 * Mutex implementation for preventing concurrent tool execution
 * Borrowed from Chrome DevTools MCP design
 */
export declare class Mutex {
    #private;
    static Guard: {
        new (mutex: Mutex): {
            "__#private@#mutex": Mutex;
            dispose(): void;
        };
    };
    acquire(): Promise<InstanceType<typeof Mutex.Guard>>;
    release(): void;
    /**
     * Get current mutex status (for debugging)
     */
    getStatus(): {
        locked: boolean;
        queueLength: number;
    };
}
//# sourceMappingURL=Mutex.d.ts.map