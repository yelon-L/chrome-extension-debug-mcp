/**
 * Mutex implementation for preventing concurrent tool execution
 * Borrowed from Chrome DevTools MCP design
 */
export class Mutex {
    static Guard = class Guard {
        #mutex;
        constructor(mutex) {
            this.#mutex = mutex;
        }
        dispose() {
            return this.#mutex.release();
        }
    };
    #locked = false;
    #acquirers = [];
    // This is FIFO (First In, First Out)
    async acquire() {
        if (!this.#locked) {
            this.#locked = true;
            return new Mutex.Guard(this);
        }
        // Use Promise.withResolvers for modern Node.js or fallback
        let resolve;
        const promise = new Promise(r => { resolve = r; });
        this.#acquirers.push(resolve);
        await promise;
        return new Mutex.Guard(this);
    }
    release() {
        const resolve = this.#acquirers.shift();
        if (!resolve) {
            this.#locked = false;
            return;
        }
        resolve();
    }
    /**
     * Get current mutex status (for debugging)
     */
    getStatus() {
        return {
            locked: this.#locked,
            queueLength: this.#acquirers.length
        };
    }
}
//# sourceMappingURL=Mutex.js.map