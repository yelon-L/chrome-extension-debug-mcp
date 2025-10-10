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
    handleListTabs(): Promise<any>;
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
    handleListExtensions(args: any): Promise<any>;
    handleGetExtensionLogs(args: any): Promise<any>;
    handleInjectContentScript(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleContentScriptStatus(args: any): Promise<any>;
    handleListExtensionContexts(args: any): Promise<any>;
    handleSwitchExtensionContext(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleInspectExtensionStorage(args: any): Promise<any>;
    handleMonitorExtensionMessages(args: any): Promise<any>;
    handleTrackExtensionAPICalls(args: any): Promise<any>;
    handleTestExtensionOnMultiplePages(args: any): Promise<any>;
    handleTrackExtensionNetwork(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleListExtensionRequests(args: any): Promise<any>;
    handleGetExtensionRequestDetails(args: any): Promise<any>;
    handleExportExtensionNetworkHAR(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleAnalyzeExtensionNetwork(args: any): Promise<{
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
    }): Promise<any>;
    handlePerformanceListInsights(args: any): Promise<any>;
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
    }): Promise<any>;
    handleTakeSnapshot(args: any): Promise<any>;
    handleClickByUid(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleFillByUid(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleHoverByUid(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleHoverElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleDragElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleFillForm(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleUploadFile(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleDialog(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleWaitForElement(args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    handleWaitForExtensionReady(args: any): Promise<any>;
    handleCheckExtensionPermissions(args: any): Promise<any>;
    handleAuditExtensionSecurity(args: any): Promise<any>;
    handleCheckExtensionUpdates(args: any): Promise<any>;
    handleQuickExtensionDebug(args: any): Promise<any>;
    handleQuickPerformanceCheck(args: any): Promise<any>;
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
    /**
     * Performs cleanup when shutting down the server.
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=ChromeDebugServer.d.ts.map