/**
 * Chrome连接修复工具
 * 解决fetch兼容性问题和连接稳定性
 */
import fetch from 'node-fetch';
export class ChromeConnectionFix {
    /**
     * 使用node-fetch替代原生fetch进行Chrome健康检查
     */
    static async checkChromeHealth(host, port) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`http://${host}:${port}/json/version`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                console.error(`[ChromeConnectionFix] Chrome health check failed: HTTP ${response.status}`);
                return false;
            }
            const data = await response.json();
            console.log(`[ChromeConnectionFix] ✅ Chrome ${data.Browser} is healthy`);
            return true;
        }
        catch (error) {
            console.error(`[ChromeConnectionFix] ❌ Chrome health check failed:`, error.message);
            return false;
        }
    }
    /**
     * 智能发现Chrome调试端口
     */
    static async discoverChromePort(startPort = 9222) {
        console.log(`[ChromeConnectionFix] 🔍 Scanning ports ${startPort}-${startPort + 10}...`);
        for (let port = startPort; port <= startPort + 10; port++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch(`http://localhost:${port}/json/version`, {
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`[ChromeConnectionFix] ✅ Found Chrome on port ${port}: ${data.Browser}`);
                    return port;
                }
            }
            catch (error) {
                // 继续尝试下一个端口
                continue;
            }
        }
        console.log(`[ChromeConnectionFix] ❌ No Chrome debug interface found`);
        return null;
    }
    /**
     * 测试Chrome连接并返回详细信息
     */
    static async testChromeConnection(host = 'localhost', port = 9222) {
        console.log(`[ChromeConnectionFix] 🧪 Testing Chrome connection to ${host}:${port}...`);
        try {
            // 1. 检查版本端点
            const versionController = new AbortController();
            const versionTimeoutId = setTimeout(() => versionController.abort(), 3000);
            const versionResponse = await fetch(`http://localhost:${port}/json/version`, {
                signal: versionController.signal
            });
            clearTimeout(versionTimeoutId);
            if (!versionResponse.ok) {
                throw new Error(`Version endpoint failed: ${versionResponse.status}`);
            }
            const versionData = await versionResponse.json();
            // 2. 检查targets端点
            const targetsController = new AbortController();
            const targetsTimeoutId = setTimeout(() => targetsController.abort(), 3000);
            const targetsResponse = await fetch(`http://${host}:${port}/json/list`, {
                signal: targetsController.signal
            });
            clearTimeout(targetsTimeoutId);
            if (!targetsResponse.ok) {
                throw new Error(`Targets endpoint failed: ${targetsResponse.status}`);
            }
            const targetsData = await targetsResponse.json();
            const result = {
                success: true,
                version: versionData.Browser,
                webSocketUrl: versionData.webSocketDebuggerUrl,
                targets: targetsData.length,
                pages: targetsData.filter(t => t.type === 'page').length,
                extensions: targetsData.filter(t => t.url?.startsWith('chrome-extension://')).length
            };
            console.log(`[ChromeConnectionFix] ✅ Connection test successful:`);
            console.log(`  Browser: ${result.version}`);
            console.log(`  Targets: ${result.targets} (${result.pages} pages, ${result.extensions} extensions)`);
            return result;
        }
        catch (error) {
            console.error(`[ChromeConnectionFix] ❌ Connection test failed:`, error.message);
            return {
                success: false,
                error: error.message,
                suggestions: [
                    'Check if Chrome is running with --remote-debugging-port=9222',
                    'Verify the port number is correct',
                    'Make sure no firewall is blocking the connection',
                    'Try restarting Chrome with debug options'
                ]
            };
        }
    }
}
//# sourceMappingURL=ChromeConnectionFix.js.map