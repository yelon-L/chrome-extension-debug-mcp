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
    /**
     * Options for establishing a connection to Chrome DevTools Protocol.
     */
    interface Options {
        /**
         * chrome-remote-interface can connect to Chrome in a variety of ways.
         * If you have a long-running application, you may want to manage the connection yourself.
         * In this case, you can pass an existing WebSocket instance.
         */
        webSocket?: any;
        /**
         * Hostname of the Chrome instance to connect to.
         * @default 'localhost'
         */
        host?: string;
        /**
         * Port of the Chrome instance to connect to.
         * @default 9222
         */
        port?: number;
        /**
         * Use secure WebSocket connection (wss).
         * @default false
         */
        secure?: boolean;
        /**
         * Optional function to map the resulting interface.
         * @param chrome The resulting CDP.Client
         */
        alterProtocol?: (chrome: Client) => void;
        /**
         * Chrome tab id to connect to.
         */
        target?: string | ((target: Target) => boolean);
        /**
         * Retrieve a list of available targets.
         */
        list?: () => Promise<Target[]>;
        /**
         * Close the websocket connection on disconnect.
         * @default true
         */
        closeOnDisconnect?: boolean;
    }

    /**
     * Represents a Chrome DevTools Protocol client.
     * Extends EventEmitter for handling events from Chrome.
     */
    interface Client extends EventEmitter {
        /**
         * Close the connection.
         */
        close(): void;
        /**
         * List of available domains.
         */
        api: string[];
        /**
         * Raw browser websocket.
         */
        webSocket: any;

        /**
         * Returns a list of supported Chrome DevTools Protocol domains.
         */
        getDomains(): string[];

        /**
         * Registers a handler for the given event.
         * @param event The event name
         * @param cb The callback function
         */
        on(event: string, cb: (...args: any[]) => void): this;
        /**
         * Registers a handler for the given event.
         * @param event The event name
         * @param cb The callback function
         */
        once(event: string, cb: (...args: any[]) => void): this;
        /**
         * Removes the handler for the given event.
         * @param event The event name
         * @param cb The callback function
         */
        off(event: string, cb: (...args: any[]) => void): this;

        /**
         * Registers a handler for the given event.
         * @param options The command options
         * @param cb The callback function
         */
        send<T extends keyof Protocol.CommandParameters>(method: T, params?: Protocol.CommandParameters[T], sessionId?: string): Promise<Protocol.CommandResponse[T]>;
        /**
         * Registers a handler for the given event.
         * @param method The method name
         * @param cb The callback function
         */
        [method: string]: any;

        /**
         * Registers a handler for the given event.
         */
        Debugger: Debugger;
        /**
         * Registers a handler for the given event.
         */
        HeapProfiler: HeapProfiler;
        /**
         * Registers a handler for the given event.
         */
        Inspector: Inspector;
        /**
         * Registers a handler for the given event.
         */
        Page: Page;
        /**
         * Registers a handler for the given event.
         */
        Profiler: Profiler;
        /**
         * Registers a handler for the given event.
         */
        Runtime: Runtime;
        /**
         * Registers a handler for the given event.
         */
        Target: TargetDomain;
        /**
         * Registers a handler for the given event.
         */
        Console: Console;
        /**
         * Registers a handler for the given event.
         */
        Network: Network;
    }

    /**
     * Represents a Chrome DevTools Protocol target.
     */
    interface Target {
        /**
         * Target id.
         */
        id: string;
        /**
         * Target type.
         */
        type: string;
        /**
         * Whether current target is being inspected.
         */
        attached: boolean;
        [x: string]: any;
    }

    interface Debugger {
        /**
         * Enables debugger for the given page. Clients should not call this multiple times. It is allowed to set configuration after protocol has been enabled.
         */
        enable(params?: Protocol.Debugger.EnableParams): Promise<void>;
        /**
         * Disables debugger for the given page.
         */
        disable(): Promise<void>;
        /**
         * Activates / deactivates all breakpoints on the page.
         */
        setBreakpointsActive(params: Protocol.Debugger.SetBreakpointsActiveParams): Promise<void>;
        /**
         * Sets JavaScript breakpoint at given location.
         */
        setBreakpoint(params: Protocol.Debugger.SetBreakpointParams): Promise<Protocol.Debugger.SetBreakpointResult>;
        /**
         * Removes JavaScript breakpoint.
         */
        removeBreakpoint(params: Protocol.Debugger.RemoveBreakpointParams): Promise<void>;
        /**
         * Continues execution until specific location is reached.
         */
        continueToLocation(params: Protocol.Debugger.ContinueToLocationParams): Promise<void>;
        /**
         * Steps over the statement.
         */
        stepOver(): Promise<void>;
        /**
         * Steps into the function call.
         */
        stepInto(): Promise<void>;
        /**
         * Steps out of the function call.
         */
        stepOut(): Promise<void>;
        /**
         * Stops on the next JavaScript statement.
         */
        pause(): Promise<void>;
        /**
         * Resumes JavaScript execution.
         */
        resume(): Promise<void>;
        /**
         * Searches for given text in script content.
         */
        searchInContent(params: Protocol.Debugger.SearchInContentParams): Promise<Protocol.Debugger.SearchInContentResult>;
        /**
         * Enables console to refer to the results of expressions.
         */
        enableConsole(): Promise<void>;
        /**
         * Disables console to refer to the results of expressions.
         */
        disableConsole(): Promise<void>;
        /**
         * Evaluates expression on a paused JavaScript call frame.
         */
        evaluateOnCallFrame(params: Protocol.Debugger.EvaluateOnCallFrameParams): Promise<Protocol.Debugger.EvaluateOnCallFrameResult>;
        /**
         * Defines overlay message to display when paused in debugger.
         */
        setOverlayMessage(params: Protocol.Debugger.SetOverlayMessageParams): Promise<void>;
        /**
         * Fired when debugger is enabled.
         */
        on(event: 'Debugger.enabled', listener: () => void): this;
        /**
         * Fired when debugger is disabled.
         */
        on(event: 'Debugger.disabled', listener: () => void): this;
        /**
         * Fired when debugger is paused.
         */
        on(event: 'Debugger.paused', listener: (params: Protocol.Debugger.PausedEvent) => void): this;
        /**
         * Fired when debugger is resumed.
         */
        on(event: 'Debugger.resumed', listener: () => void): this;
        /**
         * Fired when breakpoint is resolved.
         */
        on(event: 'Debugger.breakpointResolved', listener: (params: Protocol.Debugger.BreakpointResolvedEvent) => void): this;
        /**
         * Fired when script parsed.
         */
        on(event: 'Debugger.scriptParsed', listener: (params: Protocol.Debugger.ScriptParsedEvent) => void): this;
        /**
         * Fired when script failed to parse.
         */
        on(event: 'Debugger.scriptFailedToParse', listener: (params: Protocol.Debugger.ScriptFailedToParseEvent) => void): this;
    }

    interface HeapProfiler {
        /**
         * Enables console to refer to the results of expressions.
         */
        enable(): Promise<void>;
        /**
         * Disables console to refer to the results of expressions.
         */
        disable(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        startTrackingRuntimeCallStats(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        stopTrackingRuntimeCallStats(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        getRuntimeCallStats(): Promise<{ result: Protocol.HeapProfiler.RuntimeCallStats[] }>;
        /**
         * Registers a handler for the given event.
         */
        collectGarbage(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        startSampling(params: Protocol.HeapProfiler.StartSamplingParams): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        stopSampling(): Promise<Protocol.HeapProfiler.StopSamplingResult>;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'HeapProfiler.heapStatsUpdate', listener: (params: Protocol.HeapProfiler.HeapStatsUpdateEvent) => void): this;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'HeapProfiler.lastSeenObjectId', listener: (params: Protocol.HeapProfiler.LastSeenObjectIdEvent) => void): this;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'HeapProfiler.reportHeapSnapshotProgress', listener: (params: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent) => void): this;
    }

    interface Inspector {
        /**
         * Enables console to refer to the results of expressions.
         */
        enable(): Promise<void>;
        /**
         * Disables console to refer to the results of expressions.
         */
        disable(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'Inspector.detached', listener: (params: Protocol.Inspector.DetachedEvent) => void): this;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'Inspector.targetCrashed', listener: () => void): this;
        /**
         * Registers a handler for the given event.
         */
        on(event: 'Inspector.targetReloadedAfterCrash', listener: () => void): this;
    }

    interface Page {
        /**
         * Enables console to refer to the results of expressions.
         */
        enable(): Promise<void>;
        /**
         * Disables console to refer to the results of expressions.
         */
        disable(): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        addScriptToEvaluateOnLoad(params: Protocol.Page.AddScriptToEvaluateOnLoadParams): Promise<Protocol.Page.AddScriptToEvaluateOnLoadResult>;
        /**
         * Registers a handler for the given event.
         */
        removeScriptToEvaluateOnLoad(params: Protocol.Page.RemoveScriptToEvaluateOnLoadParams): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        navigate(params: Protocol.Page.NavigateParams): Promise<Protocol.Page.NavigateResult>;
        /**
         * Registers a handler for the given event.
         */
        getNavigationHistory(): Promise<Protocol.Page.GetNavigationHistoryResult>;
        /**
         * Registers a handler for the given event.
         */
        navigateToHistoryEntry(params: Protocol.Page.NavigateToHistoryEntryParams): Promise<void>;
        /**
         * Registers a handler for the given event.
         */
        getResourceTree(): Promise<Protocol.Page.GetResourceTreeResult>;
        /**
         * Registers a handler for the given event.
         */
        getResourceContent(params: Protocol.Page.GetResourceContentParams): Promise<Protocol.Page.GetResourceContentResult>;
        /**
         * Registers a handler for the given event.
         */
