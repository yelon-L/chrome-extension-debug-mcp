/**
 * Mutex implementation for preventing concurrent tool execution
 * Borrowed from Chrome DevTools MCP design
 */

export class Mutex {
  static Guard = class Guard {
    #mutex: Mutex;
    constructor(mutex: Mutex) {
      this.#mutex = mutex;
    }
    dispose(): void {
      return this.#mutex.release();
    }
  };

  #locked = false;
  #acquirers: Array<() => void> = [];

  // This is FIFO (First In, First Out)
  async acquire(): Promise<InstanceType<typeof Mutex.Guard>> {
    if (!this.#locked) {
      this.#locked = true;
      return new Mutex.Guard(this);
    }
    
    // Use Promise.withResolvers for modern Node.js or fallback
    let resolve: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    
    this.#acquirers.push(resolve!);
    await promise;
    return new Mutex.Guard(this);
  }

  release(): void {
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
  getStatus(): { locked: boolean; queueLength: number } {
    return {
      locked: this.#locked,
      queueLength: this.#acquirers.length
    };
  }
}
