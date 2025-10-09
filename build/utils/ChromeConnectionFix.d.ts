/**
 * Chrome连接修复工具
 * 解决fetch兼容性问题和连接稳定性
 */
export declare class ChromeConnectionFix {
    /**
     * 使用node-fetch替代原生fetch进行Chrome健康检查
     */
    static checkChromeHealth(host: string, port: number): Promise<boolean>;
    /**
     * 智能发现Chrome调试端口
     */
    static discoverChromePort(startPort?: number): Promise<number | null>;
    /**
     * 测试Chrome连接并返回详细信息
     */
    static testChromeConnection(host?: string, port?: number): Promise<{
        success: boolean;
        version: any;
        webSocketUrl: any;
        targets: number;
        pages: number;
        extensions: number;
    } | {
        success: boolean;
        error: string;
        suggestions: string[];
    }>;
}
//# sourceMappingURL=ChromeConnectionFix.d.ts.map