/**
 * Modularized Chrome Debug MCP Server
 *
 * This is the main server class that orchestrates all modules
 */
import { LaunchChromeArgs, AttachArgs, GetConsoleLogsArgs, EvaluateArgs, ClickArgs, TypeArgs, ScreenshotArgs, NewTabArgs, SwitchTabArgs, CloseTabArgs, TransportType, RemoteMCPConfig } from './types/index.js';
/**
 * Main Chrome Debug MCP Server class
 *
 * This class follows the orchestrator pattern - it coordinates between
 * different modules but doesn't implement business logic itself.
 */
export declare class ChromeDebugServer {
    private server;
    private remoteTransport?;
    private toolMutex;
    private chromeManager;
    private pageManager;
    private interactionHandler;
    private evaluationHandler;
    private extensionHandler;
    constructor();
    /**
     * Sets up handlers for all supported MCP tools.
     * This method only handles routing - business logic is in modules.
     */
    private setupToolHandlers;
    handleLaunchChrome(args: LaunchChromeArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleAttachToChrome(args: AttachArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleGetConsoleLogs(args: GetConsoleLogsArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleEvaluate(args: EvaluateArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    handleClick(args: ClickArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    handleType(args: TypeArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    handleScreenshot(args: ScreenshotArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    handleListTabs(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleNewTab(args: NewTabArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleSwitchTab(args: SwitchTabArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleCloseTab(args: CloseTabArgs): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleListExtensions(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleGetExtensionLogs(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleInjectContentScript(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleContentScriptStatus(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleListExtensionContexts(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleSwitchExtensionContext(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleInspectExtensionStorage(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleMonitorExtensionMessages(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleTrackExtensionAPICalls(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleTestExtensionOnMultiplePages(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleTrackExtensionNetwork(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleAnalyzeExtensionPerformance(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handlePerformanceGetInsights(args: {
        insightName: string;
    }): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handlePerformanceListInsights(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleEmulateCPU(args: {
        rate: number;
        extensionId?: string;
    }): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleEmulateNetwork(args: {
        condition: any;
        extensionId?: string;
    }): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleTestExtensionConditions(args: {
        extensionId: string;
        testUrl: string;
        timeout?: number;
    }): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleQuickExtensionDebug(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleQuickPerformanceCheck(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleExportExtensionNetworkHAR(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    /**
     * Starts the MCP server with specified transport mode.
     */
    run(transportType?: TransportType, config?: RemoteMCPConfig): Promise<void>;
    /**
     * Performs cleanup when shutting down the server.
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=ChromeDebugServer.d.ts.map