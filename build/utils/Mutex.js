/**
 * Mutex implementation for preventing concurrent tool execution
 * Borrowed from Chrome DevTools MCP design
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Mutex_locked, _Mutex_acquirers, _Guard_mutex, _a;
export class Mutex {
    constructor() {
        _Mutex_locked.set(this, false);
        _Mutex_acquirers.set(this, []);
    }
    // This is FIFO (First In, First Out)
    async acquire() {
        if (!__classPrivateFieldGet(this, _Mutex_locked, "f")) {
            __classPrivateFieldSet(this, _Mutex_locked, true, "f");
            return new Mutex.Guard(this);
        }
        // Use Promise.withResolvers for modern Node.js or fallback
        let resolve;
        const promise = new Promise(r => { resolve = r; });
        __classPrivateFieldGet(this, _Mutex_acquirers, "f").push(resolve);
        await promise;
        return new Mutex.Guard(this);
    }
    release() {
        const resolve = __classPrivateFieldGet(this, _Mutex_acquirers, "f").shift();
        if (!resolve) {
            __classPrivateFieldSet(this, _Mutex_locked, false, "f");
            return;
        }
        resolve();
    }
    /**
     * Get current mutex status (for debugging)
     */
    getStatus() {
        return {
            locked: __classPrivateFieldGet(this, _Mutex_locked, "f"),
            queueLength: __classPrivateFieldGet(this, _Mutex_acquirers, "f").length
        };
    }
}
_Mutex_locked = new WeakMap(), _Mutex_acquirers = new WeakMap();
Mutex.Guard = (_a = class Guard {
        constructor(mutex) {
            _Guard_mutex.set(this, void 0);
            __classPrivateFieldSet(this, _Guard_mutex, mutex, "f");
        }
        dispose() {
            return __classPrivateFieldGet(this, _Guard_mutex, "f").release();
        }
    },
    _Guard_mutex = new WeakMap(),
    _a);
//# sourceMappingURL=Mutex.js.map