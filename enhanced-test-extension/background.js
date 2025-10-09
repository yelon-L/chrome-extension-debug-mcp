/**
 * Enhanced Background Script for Week 1-4 全功能测试
 * Week 1: 日志增强、内容脚本状态
 * Week 2: 上下文管理、存储操作
 * Week 3: 消息传递、API调用监控
 * Week 4: 批量测试场景覆盖
 */

console.log('[Enhanced Background] 🚀 Enhanced MCP Debug Test Extension v4.0 Starting...');
console.log('[Enhanced Background] 📋 测试覆盖: Week 1-4 全部增强功能');

// Week 3功能测试：消息监控目标 - runtime.sendMessage测试
class MessageTester {
  constructor() {
    this.messageCount = 0;
    this.setupMessageHandlers();
    this.startPeriodicMessageTests();
  }

  setupMessageHandlers() {
    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[Enhanced Background] 📨 收到消息:', { 
        message, 
        sender: sender?.tab?.id, 
        timestamp: Date.now() 
      });

      // Week 3测试：响应处理和性能监控
      const startTime = performance.now();
      
      switch (message.type) {
        case 'test_ping':
          console.log('[Enhanced Background] 🏓 处理ping消息');
          sendResponse({ 
            success: true, 
            pong: true, 
            timestamp: Date.now(),
            processingTime: performance.now() - startTime 
          });
          break;
          
        case 'get_extension_info':
          console.log('[Enhanced Background] 📋 获取扩展信息');
          sendResponse({
            success: true,
            manifest: chrome.runtime.getManifest(),
            id: chrome.runtime.id,
            processingTime: performance.now() - startTime
          });
          break;
          
        case 'trigger_storage_test':
          console.log('[Enhanced Background] 💾 触发存储测试');
          this.testStorageAPIs().then(result => {
            sendResponse({ 
              success: true, 
              storageResult: result,
              processingTime: performance.now() - startTime
            });
          });
          return true; // 异步响应
          
        default:
          console.log('[Enhanced Background] ❓ 未知消息类型:', message.type);
          sendResponse({ 
            success: false, 
            error: '未知消息类型',
            processingTime: performance.now() - startTime 
          });
      }
    });
  }

  startPeriodicMessageTests() {
    // Week 3测试：定期发送消息到content script
    setInterval(() => {
      this.sendTestMessageToTabs();
    }, 10000); // 每10秒发送一次

    // Week 3测试：定期API调用用于追踪测试
    setInterval(() => {
      this.performAPITests();
    }, 15000); // 每15秒执行一次API测试
  }

  async sendTestMessageToTabs() {
    try {
      console.log('[Enhanced Background] 📡 开始发送测试消息到标签页');
      
      // Week 3测试目标：tabs.sendMessage监控
      const tabs = await chrome.tabs.query({ active: true });
      
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          this.messageCount++;
          
          const testMessage = {
            type: 'background_test_message',
            id: `msg_${this.messageCount}`,
            timestamp: Date.now(),
            data: {
              counter: this.messageCount,
              tabId: tab.id,
              url: tab.url
            }
          };

          console.log('[Enhanced Background] 📤 发送消息到标签页:', tab.id);
          
          try {
            const response = await chrome.tabs.sendMessage(tab.id, testMessage);
            console.log('[Enhanced Background] ✅ 收到标签页响应:', response);
          } catch (error) {
            console.warn('[Enhanced Background] ⚠️ 标签页消息发送失败:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('[Enhanced Background] ❌ 发送测试消息失败:', error);
    }
  }

  async performAPITests() {
    console.log('[Enhanced Background] 🧪 开始API测试');
    
    try {
      // Week 3测试目标：Storage API追踪
      await this.testStorageAPIs();
      
      // Week 3测试目标：Tabs API追踪
      await this.testTabsAPIs();
      
      // Week 3测试目标：Runtime API追踪
      await this.testRuntimeAPIs();
      
      console.log('[Enhanced Background] ✅ API测试完成');
    } catch (error) {
      console.error('[Enhanced Background] ❌ API测试失败:', error);
    }
  }

  async testStorageAPIs() {
    console.log('[Enhanced Background] 💾 Storage API测试');
    
    const testData = {
      testKey: `test_value_${Date.now()}`,
      counter: this.messageCount,
      timestamp: new Date().toISOString()
    };

    // Local Storage测试
    await chrome.storage.local.set({ 'test_local': testData });
    const localData = await chrome.storage.local.get(['test_local']);
    console.log('[Enhanced Background] 📦 Local Storage操作:', localData);

    // Sync Storage测试
    try {
      await chrome.storage.sync.set({ 'test_sync': { ...testData, type: 'sync' } });
      const syncData = await chrome.storage.sync.get(['test_sync']);
      console.log('[Enhanced Background] ☁️ Sync Storage操作:', syncData);
    } catch (error) {
      console.warn('[Enhanced Background] ⚠️ Sync Storage不可用:', error.message);
    }

    return { local: localData, sync: 'attempted' };
  }

  async testTabsAPIs() {
    console.log('[Enhanced Background] 🔖 Tabs API测试');
    
    // 查询标签页
    const allTabs = await chrome.tabs.query({});
    const activeTabs = await chrome.tabs.query({ active: true });
    
    console.log('[Enhanced Background] 📊 标签页统计:', {
      total: allTabs.length,
      active: activeTabs.length
    });

    // 创建一个新标签页用于测试 (谨慎使用)
    if (allTabs.length < 5) { // 限制标签页数量
      console.log('[Enhanced Background] ➕ 创建测试标签页');
      const newTab = await chrome.tabs.create({ 
        url: 'https://httpbin.org/delay/1',
        active: false 
      });
      
      // 等待2秒后关闭
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(newTab.id);
          console.log('[Enhanced Background] ❌ 测试标签页已关闭');
        } catch (error) {
          console.warn('[Enhanced Background] ⚠️ 关闭标签页失败:', error.message);
        }
      }, 3000);
    }
  }

  async testRuntimeAPIs() {
    console.log('[Enhanced Background] ⚙️ Runtime API测试');
    
    // 获取manifest信息
    const manifest = chrome.runtime.getManifest();
    console.log('[Enhanced Background] 📋 扩展信息:', {
      name: manifest.name,
      version: manifest.version,
      id: chrome.runtime.id
    });

    // 设置Alarm用于追踪测试
    try {
      chrome.alarms.create('test_alarm', { delayInMinutes: 0.1 });
      console.log('[Enhanced Background] ⏰ 测试闹钟已设置');
    } catch (error) {
      console.warn('[Enhanced Background] ⚠️ Alarm设置失败:', error.message);
    }
  }
}

// Alarm处理 - Week 3测试目标
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'test_alarm') {
    console.log('[Enhanced Background] ⏰ 测试闹钟触发:', alarm);
    
    // 发送通知给content script
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'alarm_notification',
            alarm: alarm.name,
            timestamp: Date.now()
          }).catch(err => {
            console.log('[Enhanced Background] 💭 Content script可能未就绪:', err.message);
          });
        }
      });
    });
  }
});

// 扩展启动时初始化测试器
const messageTester = new MessageTester();

// Week 3测试：错误处理和日志级别测试
console.log('[Enhanced Background] ℹ️ Info级别日志');
console.warn('[Enhanced Background] ⚠️ Warning级别日志');
console.error('[Enhanced Background] ❌ Error级别日志测试(非真实错误)');

// Week 3测试：性能监控基准
console.log('[Enhanced Background] 📊 内存使用情况:', {
  used: performance.memory?.usedJSHeapSize || 'N/A',
  total: performance.memory?.totalJSHeapSize || 'N/A',
  limit: performance.memory?.jsHeapSizeLimit || 'N/A'
});

// Week 1测试：多级日志测试
console.log('[Enhanced Background] 📝 Week 1: 日志级别测试');
console.debug('[Enhanced Background] 🐛 DEBUG级别测试日志');
console.info('[Enhanced Background] ℹ️ INFO级别测试日志');
console.warn('[Enhanced Background] ⚠️ WARN级别测试日志');
console.error('[Enhanced Background] ❌ ERROR级别测试日志(测试用)');

// Week 2测试：存储变更监听
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('[Enhanced Background] 💾 Week 2: Storage变更检测', {
    area: areaName,
    changes: Object.keys(changes),
    timestamp: Date.now()
  });
});

// Week 4测试：标签页生命周期监听
chrome.tabs.onCreated.addListener((tab) => {
  console.log('[Enhanced Background] 🆕 Week 4: 标签页创建', {
    id: tab.id,
    url: tab.url || tab.pendingUrl,
    timestamp: Date.now()
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    console.log('[Enhanced Background] 🔄 Week 4: 标签页加载完成', {
      id: tabId,
      url: tab.url,
      timestamp: Date.now()
    });
    
    // 发送加载完成消息到content script
    chrome.tabs.sendMessage(tabId, {
      type: 'tab-loaded',
      url: tab.url,
      timestamp: Date.now()
    }).catch(() => {
      // Content script可能还未就绪，这是正常的
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('[Enhanced Background] ❌ Week 4: 标签页关闭', {
    id: tabId,
    windowClosing: removeInfo.windowClosing,
    timestamp: Date.now()
  });
});

// Week 1-4综合测试：定期生成各种级别的日志
setInterval(() => {
  const logType = ['log', 'info', 'warn', 'error'][Math.floor(Math.random() * 4)];
  const message = `📊 定期${logType}消息`;
  const data = {
    timestamp: Date.now(),
    messageCount: messageTester.messageCount,
    type: 'periodic',
    level: logType
  };
  
  console[logType](`[Enhanced Background] ${message}`, data);
}, 30000); // 每30秒

console.log('[Enhanced Background] ✅ v4.0初始化完成 - Week 1-4全功能测试就绪');
