/**
 * Week 3高级功能: 扩展消息追踪器
 * 实现消息传递监控和API调用追踪，解决evaluate脚本中的chrome API类型问题
 */
/**
 * 扩展消息追踪器类 - Week 3核心功能
 * 解决Chrome API类型问题，使用字符串模板注入方式
 */
export class ExtensionMessageTracker {
    chromeManager;
    pageManager;
    messages = [];
    apiCalls = [];
    isMonitoring = false;
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
    }
    /**
     * 监控扩展消息传递
     * 解决evaluate()脚本中的chrome API类型问题
     */
    async monitorExtensionMessages(args) {
        const { extensionId, duration = 30000, messageTypes = ['runtime', 'tabs'], includeResponses = true } = args;
        try {
            console.log(`[ExtensionMessageTracker] 开始监控扩展 ${extensionId} 的消息传递`);
            // 清空之前的消息记录
            this.messages = [];
            this.isMonitoring = true;
            // 获取扩展的所有上下文 - 使用CDP客户端
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new Error('CDP客户端未连接');
            }
            const { targetInfos } = await cdpClient.send('Target.getTargets');
            const extensionTargets = targetInfos.filter((target) => target.url.includes(`chrome-extension://${extensionId}`) ||
                target.type === 'service_worker');
            console.log(`[ExtensionMessageTracker] 找到 ${extensionTargets.length} 个扩展上下文`);
            // 注入监控脚本到每个扩展上下文
            const monitoringPromises = extensionTargets.map((target) => this.injectMessageMonitor(target.targetId, extensionId, messageTypes, includeResponses));
            await Promise.all(monitoringPromises);
            // 设置监控超时
            if (duration > 0) {
                setTimeout(() => {
                    this.isMonitoring = false;
                    console.log(`[ExtensionMessageTracker] 监控结束，收集到 ${this.messages.length} 条消息`);
                }, duration);
            }
            return {
                success: true,
                message: `开始监控扩展 ${extensionId}，预计运行 ${duration}ms`,
                targets: extensionTargets.length,
                monitoringTypes: messageTypes
            };
        }
        catch (error) {
            console.error('[ExtensionMessageTracker] 监控扩展消息失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }
    /**
     * 注入消息监控脚本 - 使用字符串模板解决Chrome API类型问题
     */
    async injectMessageMonitor(targetId, extensionId, messageTypes, includeResponses) {
        // 使用字符串模板注入，避免TypeScript chrome API类型问题
        const monitorScript = `
      (function() {
        // 检查chrome API可用性
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.log('[MessageMonitor] Chrome API不可用');
          return;
        }

        console.log('[MessageMonitor] 开始监控消息传递');
        
        // 存储原始API方法
        const originalSendMessage = chrome.runtime.sendMessage;
        const originalOnMessage = chrome.runtime.onMessage;
        const originalTabsSendMessage = chrome.tabs ? chrome.tabs.sendMessage : null;
        
        // 消息ID生成器
        let messageIdCounter = 0;
        const generateMessageId = () => 'msg_' + (++messageIdCounter) + '_' + Date.now();
        
        // 包装runtime.sendMessage
        if (${messageTypes.includes('runtime')}) {
          chrome.runtime.sendMessage = function(...args) {
            const messageId = generateMessageId();
            const timestamp = Date.now();
            
            console.log('[MessageMonitor] 拦截runtime.sendMessage:', {
              id: messageId,
              timestamp,
              args
            });
            
            // 调用原始方法
            return originalSendMessage.apply(this, args);
          };
        }
        
        // 包装tabs.sendMessage  
        if (${messageTypes.includes('tabs')} && chrome.tabs) {
          chrome.tabs.sendMessage = function(...args) {
            const messageId = generateMessageId();
            const timestamp = Date.now();
            
            console.log('[MessageMonitor] 拦截tabs.sendMessage:', {
              id: messageId,
              timestamp,
              args
            });
            
            return originalTabsSendMessage.apply(this, args);
          };
        }
        
        // 监听消息接收
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
          const messageId = generateMessageId();
          const timestamp = Date.now();
          
          console.log('[MessageMonitor] 接收到消息:', {
            id: messageId,
            timestamp,
            message,
            sender: sender ? {
              id: sender.id,
              url: sender.url,
              tab: sender.tab ? sender.tab.id : undefined
            } : undefined
          });
          
          // 不阻断原有逻辑
          return false;
        });
        
        console.log('[MessageMonitor] 消息监控注入完成');
      })();
    `;
        try {
            // 使用CDP客户端直接执行脚本，避免chrome API类型问题
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new Error('CDP客户端未连接');
            }
            // 连接到目标
            await cdpClient.send('Target.attachToTarget', { targetId, flatten: true });
            // 执行脚本 - 修复CDP参数结构
            await cdpClient.send('Runtime.evaluate', {
                expression: monitorScript
            });
            console.log(`[ExtensionMessageTracker] 监控脚本已注入到 ${targetId}`);
        }
        catch (error) {
            console.error(`[ExtensionMessageTracker] 注入监控脚本失败 ${targetId}:`, error);
        }
    }
    /**
     * 追踪扩展API调用
     */
    async trackExtensionAPICalls(args) {
        const { extensionId, apiCategories = ['storage', 'tabs', 'runtime'], duration = 30000, includeResults = true } = args;
        try {
            console.log(`[ExtensionMessageTracker] 开始追踪扩展 ${extensionId} 的API调用`);
            this.apiCalls = [];
            // 获取扩展上下文
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new Error('CDP客户端未连接');
            }
            const { targetInfos } = await cdpClient.send('Target.getTargets');
            const extensionTargets = targetInfos.filter((target) => target.url.includes(`chrome-extension://${extensionId}`));
            // 注入API追踪脚本
            const trackingPromises = extensionTargets.map((target) => this.injectAPITracker(target.targetId, extensionId, apiCategories, includeResults));
            await Promise.all(trackingPromises);
            // 设置追踪超时
            if (duration > 0) {
                setTimeout(() => {
                    console.log(`[ExtensionMessageTracker] API追踪结束，收集到 ${this.apiCalls.length} 次调用`);
                }, duration);
            }
            return {
                success: true,
                message: `开始追踪扩展 ${extensionId} 的API调用`,
                targets: extensionTargets.length,
                categories: apiCategories
            };
        }
        catch (error) {
            console.error('[ExtensionMessageTracker] 追踪API调用失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }
    /**
     * 注入API追踪脚本
     */
    async injectAPITracker(targetId, extensionId, apiCategories, includeResults) {
        const trackerScript = `
      (function() {
        if (typeof chrome === 'undefined') {
          console.log('[APITracker] Chrome API不可用');
          return;
        }

        console.log('[APITracker] 开始追踪API调用');
        
        // API调用ID生成器
        let apiCallIdCounter = 0;
        const generateAPICallId = () => 'api_' + (++apiCallIdCounter) + '_' + Date.now();
        
        // 包装Storage API
        if (${apiCategories.includes('storage')} && chrome.storage) {
          const wrapStorageMethod = (storageType, methodName) => {
            const original = chrome.storage[storageType][methodName];
            chrome.storage[storageType][methodName] = function(...args) {
              const callId = generateAPICallId();
              const timestamp = Date.now();
              const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
              
              console.log('[APITracker] Storage API调用:', {
                id: callId,
                api: 'chrome.storage.' + storageType + '.' + methodName,
                timestamp,
                parameters: args,
                memoryBefore
              });
              
              const startTime = performance.now();
              const result = original.apply(this, args);
              const endTime = performance.now();
              const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
              
              console.log('[APITracker] Storage API结果:', {
                id: callId,
                duration: endTime - startTime,
                memoryAfter: memoryAfter,
                memoryDelta: memoryAfter - memoryBefore
              });
              
              return result;
            };
          };
          
          ['local', 'sync', 'session'].forEach(storageType => {
            if (chrome.storage[storageType]) {
              ['get', 'set', 'remove', 'clear'].forEach(method => {
                if (chrome.storage[storageType][method]) {
                  wrapStorageMethod(storageType, method);
                }
              });
            }
          });
        }
        
        // 包装Tabs API
        if (${apiCategories.includes('tabs')} && chrome.tabs) {
          const wrapTabsMethod = (methodName) => {
            const original = chrome.tabs[methodName];
            if (original) {
              chrome.tabs[methodName] = function(...args) {
                const callId = generateAPICallId();
                const timestamp = Date.now();
                
                console.log('[APITracker] Tabs API调用:', {
                  id: callId,
                  api: 'chrome.tabs.' + methodName,
                  timestamp,
                  parameters: args
                });
                
                return original.apply(this, args);
              };
            }
          };
          
          ['query', 'create', 'update', 'remove', 'sendMessage'].forEach(wrapTabsMethod);
        }
        
        // 包装Runtime API
        if (${apiCategories.includes('runtime')} && chrome.runtime) {
          const originalGetManifest = chrome.runtime.getManifest;
          chrome.runtime.getManifest = function() {
            const callId = generateAPICallId();
            console.log('[APITracker] Runtime API调用:', {
              id: callId,
              api: 'chrome.runtime.getManifest',
              timestamp: Date.now()
            });
            return originalGetManifest.apply(this);
          };
        }
        
        console.log('[APITracker] API追踪注入完成');
      })();
    `;
        try {
            // 使用CDP客户端直接执行脚本
            const cdpClient = this.chromeManager.getCdpClient();
            if (!cdpClient) {
                throw new Error('CDP客户端未连接');
            }
            // 连接到目标并执行脚本
            await cdpClient.send('Target.attachToTarget', { targetId, flatten: true });
            await cdpClient.send('Runtime.evaluate', {
                expression: trackerScript
            });
            console.log(`[ExtensionMessageTracker] API追踪脚本已注入到 ${targetId}`);
        }
        catch (error) {
            console.error(`[ExtensionMessageTracker] 注入API追踪脚本失败 ${targetId}:`, error);
        }
    }
    /**
     * 获取收集到的消息
     */
    getMessages() {
        return [...this.messages];
    }
    /**
     * 获取收集到的API调用
     */
    getAPICalls() {
        return [...this.apiCalls];
    }
    /**
     * 清空收集的数据
     */
    clearData() {
        this.messages = [];
        this.apiCalls = [];
    }
    /**
     * 停止监控
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('[ExtensionMessageTracker] 监控已停止');
    }
    /**
     * 获取监控统计信息
     */
    getMonitoringStats() {
        return {
            isMonitoring: this.isMonitoring,
            totalMessages: this.messages.length,
            totalAPICalls: this.apiCalls.length,
            messagesByType: this.getMessagesByType(),
            apiCallsByCategory: this.getAPICallsByCategory()
        };
    }
    getMessagesByType() {
        const stats = {};
        this.messages.forEach(msg => {
            stats[msg.type] = (stats[msg.type] || 0) + 1;
        });
        return stats;
    }
    getAPICallsByCategory() {
        const stats = {};
        this.apiCalls.forEach(call => {
            stats[call.category] = (stats[call.category] || 0) + 1;
        });
        return stats;
    }
}
//# sourceMappingURL=ExtensionMessageTracker.js.map