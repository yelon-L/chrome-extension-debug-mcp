// Type definitions for chrome-remote-interface 0.31
// Project: https://github.com/cyrus-and/chrome-remote-interface
// Definitions by: Cyrus Vahid <https://github.com/cyrusv>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import { EventEmitter } from 'events';
import { Readable } from 'stream';

declare function _CDP(options?: CDP.Options): Promise<CDP.Client>;
export = _CDP;

declare namespace CDP {
    interface Options {
        webSocket?: any;
        host?: string;
        port?: number;
        secure?: boolean;
        alterProtocol?: (chrome: Client) => void;
        target?: string | ((target: Target) => boolean);
        list?: () => Promise<Target[]>;
        closeOnDisconnect?: boolean;
    }

    interface Client extends EventEmitter {
        close(): void;
        api: string[];
        webSocket: any;
        getDomains(): string[];
        on(event: string, cb: (...args: any[]) => void): this;
        once(event: string, cb: (...args: any[]) => void): this;
        off(event: string, cb: (...args: any[]) => void): this;
        send<T extends keyof Protocol.CommandParameters>(
            method: T,
            params?: Protocol.CommandParameters[T],
            sessionId?: string
        ): Promise<Protocol.CommandResponse[T]>;
        [method: string]: any;

        Debugger: Debugger;
        HeapProfiler: HeapProfiler;
        Inspector: Inspector;
        Page: Page;
        Profiler: Profiler;
        Runtime: Runtime;
        Target: TargetDomain;
        Console: Console;
        Network: Network;
    }

    interface Target {
        id: string;
        type: string;
        attached: boolean;
        [x: string]: any;
    }

    interface Protocol {
        CommandParameters: {
            [key: string]: any;
        };
        CommandResponse: {
            [key: string]: any;
        };
        Console: any;
        Debugger: any;
        HeapProfiler: any;
        Inspector: any;
        Network: any;
        Page: any;
        Profiler: any;
        Runtime: any;
        Target: any;
    }

    interface Debugger extends EventEmitter {
        enable(params?: any): Promise<void>;
        disable(): Promise<void>;
        setBreakpoint(params: any): Promise<any>;
        removeBreakpoint(params: any): Promise<void>;
        resume(): Promise<void>;
        pause(): Promise<void>;
        [method: string]: any;
    }

    interface HeapProfiler extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        startTracking(): Promise<void>;
        stopTracking(): Promise<void>;
        collectGarbage(): Promise<void>;
        [method: string]: any;
    }

    interface Inspector extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        [method: string]: any;
    }

    interface Page extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        navigate(params: { url: string }): Promise<any>;
        reload(params?: { ignoreCache?: boolean }): Promise<void>;
        [method: string]: any;
    }

    interface Profiler extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        start(): Promise<void>;
        stop(): Promise<any>;
        [method: string]: any;
    }

    interface Runtime extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        evaluate(params: any): Promise<any>;
        [method: string]: any;
    }

    interface TargetDomain extends EventEmitter {
        createTarget(params: any): Promise<any>;
        closeTarget(params: any): Promise<any>;
        attachToTarget(params: any): Promise<any>;
        [method: string]: any;
    }

    interface Console extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        clear(): Promise<void>;
        [method: string]: any;
    }

    interface Network extends EventEmitter {
        enable(): Promise<void>;
        disable(): Promise<void>;
        setUserAgentOverride(params: any): Promise<void>;
        [method: string]: any;
    }
}
