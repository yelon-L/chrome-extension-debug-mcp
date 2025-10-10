/**
 * Modularized Chrome Debug MCP Server
 *
 * This is the main server class that orchestrates all modules
 */
import { UIDInteractionHandler } from './handlers/UIDInteractionHandler.js';
import { AdvancedInteractionHandler } from './handlers/AdvancedInteractionHandler.js';
import { WaitHelper } from './utils/WaitHelper.js';
import { DeveloperToolsHandler } from './handlers/DeveloperToolsHandler.js';
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
    private mcpContext;
    uidHandler: UIDInteractionHandler;
    advancedInteractionHandler: AdvancedInteractionHandler;
    waitHelper: WaitHelper;
    developerToolsHandler: DeveloperToolsHandler;
    private suggestionEngine;
    private metricsCollector;
    private metricsPersistence;
    private snapshotHandler;
    private waitForHelper?;
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
    handleGetConsoleLogs(args: GetConsoleLogsArgs): Promise<any>;
    handleEvaluate(args: EvaluateArgs): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    handleClick(args: ClickArgs): Promise<any>;
    handleType(args: TypeArgs): Promise<any>;
    handleScreenshot(args: ScreenshotArgs): Promise<any>;
    handleListTabs(): Promise<any>;
    handleNewTab(args: NewTabArgs): Promise<any>;
    handleSwitchTab(args: SwitchTabArgs): Promise<any>;
    handleCloseTab(args: CloseTabArgs): Promise<any>;
    handleListExtensions(args: any): Promise<any>;
    handleGetExtensionLogs(args: any): Promise<any>;
    handleInjectContentScript(args: any): Promise<any>;
    handleContentScriptStatus(args: any): Promise<any>;
    handleListExtensionContexts(args: any): Promise<any>;
    handleSwitchExtensionContext(args: any): Promise<any>;
    handleInspectExtensionStorage(args: any): Promise<any>;
    handleMonitorExtensionMessages(args: any): Promise<any>;
    handleTrackExtensionAPICalls(args: any): Promise<any>;
    handleTestExtensionOnMultiplePages(args: any): Promise<any>;
    handleTrackExtensionNetwork(args: any): Promise<any>;
    handleListExtensionRequests(args: any): Promise<any>;
    handleGetExtensionRequestDetails(args: any): Promise<any>;
    handleExportExtensionNetworkHAR(args: any): Promise<any>;
    handleAnalyzeExtensionNetwork(args: any): Promise<any>;
    handleAnalyzeExtensionPerformance(args: any): Promise<any>;
    handlePerformanceGetInsights(args: {
        insightName: string;
    }): Promise<any>;
    handlePerformanceListInsights(args: any): Promise<any>;
    handleEmulateCPU(args: {
        rate: number;
        extensionId?: string;
    }): Promise<any>;
    handleEmulateNetwork(args: {
        condition: any;
        extensionId?: string;
    }): Promise<any>;
    handleTestExtensionConditions(args: {
        extensionId: string;
        testUrl: string;
        timeout?: number;
    }): Promise<any>;
    handleTakeSnapshot(args: any): Promise<any>;
    handleClickByUid(args: any): Promise<any>;
    handleFillByUid(args: any): Promise<any>;
    handleHoverByUid(args: any): Promise<any>;
    handleHoverElement(args: any): Promise<any>;
    handleDragElement(args: any): Promise<any>;
    handleFillForm(args: any): Promise<any>;
    handleUploadFile(args: any): Promise<any>;
    handleDialog(args: any): Promise<any>;
    handleWaitForElement(args: any): Promise<any>;
    handleWaitForExtensionReady(args: any): Promise<any>;
    handleCheckExtensionPermissions(args: any): Promise<any>;
    handleAuditExtensionSecurity(args: any): Promise<any>;
    handleCheckExtensionUpdates(args: any): Promise<any>;
    handleQuickExtensionDebug(args: any): Promise<any>;
    handleQuickPerformanceCheck(args: any): Promise<any>;
    /**
     * Architecture Upgrade: Unified tool execution with Response Builder
     * This is the chrome-devtools-mcp pattern
     */
    private executeToolWithResponse;
    /**
     * Build tool response with configuration-driven context and suggestions
     */
    private buildToolResponse;
    /**
     * Format tool data into response
     */
    private formatToolData;
    /**
     * Save metrics on cleanup
     */
    private saveMetricsOnCleanup;
    /**
     * Starts the MCP server with specified transport mode.
     */
    run(transportType?: TransportType, config?: RemoteMCPConfig): Promise<void>;
    handleWaitFor(args: {
        text: string;
        timeout?: number;
    }): Promise<any>;
    handleNavigatePageHistory(args: {
        direction: 'back' | 'forward';
        steps?: number;
        waitUntil?: 'domcontentloaded' | 'load' | 'networkidle2';
        timeout?: number;
    }): Promise<any>;
    handleResizePage(args: {
        width?: number;
        height?: number;
        preset?: string;
    }): Promise<any>;
    handleRunScript(args: {
        script: string;
        uid?: string;
        returnValue?: boolean;
    }): Promise<any>;
    /**
     * Performs cleanup when shutting down the server.
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=ChromeDebugServer.d.ts.map