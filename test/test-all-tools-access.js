/**
 * 检查所有MCP工具的可访问性
 * 带超时保护，防止卡住
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class ToolAccessibilityChecker {
  constructor() {
    this.server = new ChromeDebugServer();
    this.results = {
      accessible: [],
      inaccessible: [],
      errors: []
    };
  }

  // 超时包装器
  async withTimeout(promise, timeoutMs, description) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${description} 超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ]);
  }

  async checkAllTools() {
    console.log('🔍 检查所有MCP工具可访问性...');
    console.log('=====================================');

    // 获取所有工具定义
    const tools = await this.getToolDefinitions();
    console.log(`📊 发现 ${tools.length} 个工具`);

    for (const tool of tools) {
      try {
        console.log(`🧪 检查工具: ${tool.name}`);
        
        // 检查工具是否可访问（不实际执行）
        const accessible = await this.checkToolAccessibility(tool);
        
        if (accessible) {
          this.results.accessible.push(tool.name);
          console.log(`   ✅ ${tool.name}: 可访问`);
        } else {
          this.results.inaccessible.push(tool.name);
          console.log(`   ❌ ${tool.name}: 不可访问`);
        }
        
      } catch (error) {
        this.results.errors.push({ tool: tool.name, error: error.message });
        console.log(`   💥 ${tool.name}: 错误 - ${error.message}`);
      }
    }

    this.printSummary();
  }

  async getToolDefinitions() {
    // 模拟获取工具定义，避免实际网络调用
    return [
      // 基础工具
      { name: 'launch_chrome', category: 'basic' },
      { name: 'attach_to_chrome', category: 'basic' },
      { name: 'list_tabs', category: 'basic' },
      { name: 'new_tab', category: 'basic' },
      { name: 'close_tab', category: 'basic' },
      { name: 'switch_tab', category: 'basic' },
      { name: 'screenshot', category: 'basic' },
      { name: 'click', category: 'basic' },
      { name: 'type', category: 'basic' },
      { name: 'evaluate', category: 'basic' },
      { name: 'get_console_logs', category: 'basic' },
      
      // 扩展工具
      { name: 'list_extensions', category: 'extension' },
      { name: 'get_extension_logs', category: 'extension' },
      { name: 'inject_content_script', category: 'extension' },
      { name: 'content_script_status', category: 'extension' },
      { name: 'list_extension_contexts', category: 'extension' },
      { name: 'switch_extension_context', category: 'extension' },
      { name: 'inspect_extension_storage', category: 'extension' },
      
      // Phase 1 性能分析
      { name: 'analyze_extension_performance', category: 'performance' },
      { name: 'track_extension_network', category: 'performance' },
      { name: 'measure_extension_impact', category: 'performance' },
      
      // Week 3 高级调试
      { name: 'monitor_extension_messages', category: 'debugging' },
      { name: 'track_extension_api_calls', category: 'debugging' },
      { name: 'test_extension_on_multiple_pages', category: 'debugging' },
      
      // Phase 4 交互增强
      { name: 'detect_dialogs', category: 'interaction' },
      { name: 'handle_dialog', category: 'interaction' },
      { name: 'wait_for_dialog', category: 'interaction' },
      { name: 'search_extension_logs', category: 'interaction' },
      { name: 'export_extension_logs', category: 'interaction' },
      { name: 'generate_stable_selector', category: 'interaction' },
      { name: 'find_element_by_content', category: 'interaction' },
      { name: 'analyze_dom_stability', category: 'interaction' },
      { name: 'analyze_forms', category: 'interaction' },
      { name: 'fill_form_bulk', category: 'interaction' },
      { name: 'handle_file_upload', category: 'interaction' },
      { name: 'handle_complex_control', category: 'interaction' },
      
      // 页面状态监控 (新增)
      { name: 'detect_page_state', category: 'monitoring' },
      { name: 'start_page_state_monitoring', category: 'monitoring' },
      { name: 'stop_page_state_monitoring', category: 'monitoring' }
    ];
  }

  async checkToolAccessibility(tool) {
    try {
      // 检查对应的处理方法是否存在
      const handlerMethodName = this.getHandlerMethodName(tool.name);
      
      if (tool.category === 'basic') {
        // 基础工具直接在server上
        return typeof this.server[handlerMethodName] === 'function';
      } else {
        // 其他工具通过extensionHandler
        return typeof this.server.extensionHandler?.[this.getExtensionHandlerMethod(tool.name)] === 'function';
      }
    } catch (error) {
      return false;
    }
  }

  getHandlerMethodName(toolName) {
    // 将tool名称转换为handler方法名
    const parts = toolName.split('_');
    const camelCase = parts[0] + parts.slice(1).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
    return 'handle' + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  getExtensionHandlerMethod(toolName) {
    // 扩展handler中的方法名映射
    const methodMap = {
      'list_extensions': 'listExtensions',
      'get_extension_logs': 'getExtensionLogs',
      'inject_content_script': 'injectContentScript',
      'content_script_status': 'contentScriptStatus',
      'list_extension_contexts': 'listExtensionContexts',
      'switch_extension_context': 'switchExtensionContext',
      'inspect_extension_storage': 'inspectExtensionStorage',
      'analyze_extension_performance': 'analyzeExtensionPerformance',
      'track_extension_network': 'trackExtensionNetwork',
      'measure_extension_impact': 'measureExtensionImpact',
      'monitor_extension_messages': 'monitorExtensionMessages',
      'track_extension_api_calls': 'trackExtensionApiCalls',
      'test_extension_on_multiple_pages': 'testExtensionOnMultiplePages',
      'detect_dialogs': 'detectDialogs',
      'handle_dialog': 'handleDialog',
      'wait_for_dialog': 'waitForDialog',
      'search_extension_logs': 'searchExtensionLogs',
      'export_extension_logs': 'exportExtensionLogs',
      'generate_stable_selector': 'generateStableSelector',
      'find_element_by_content': 'findElementByContent',
      'analyze_dom_stability': 'analyzeDOMStability',
      'analyze_forms': 'analyzeForms',
      'fill_form_bulk': 'fillFormBulk',
      'handle_file_upload': 'handleFileUpload',
      'handle_complex_control': 'handleComplexControl',
      'detect_page_state': 'detectPageState',
      'start_page_state_monitoring': 'startPageStateMonitoring',
      'stop_page_state_monitoring': 'stopPageStateMonitoring'
    };
    
    return methodMap[toolName] || toolName;
  }

  printSummary() {
    console.log('\n📊 工具可访问性检查结果');
    console.log('=====================================');
    console.log(`✅ 可访问工具: ${this.results.accessible.length}`);
    console.log(`❌ 不可访问工具: ${this.results.inaccessible.length}`);
    console.log(`💥 错误工具: ${this.results.errors.length}`);

    if (this.results.inaccessible.length > 0) {
      console.log('\n❌ 不可访问的工具:');
      this.results.inaccessible.forEach(tool => console.log(`   - ${tool}`));
    }

    if (this.results.errors.length > 0) {
      console.log('\n💥 有错误的工具:');
      this.results.errors.forEach(item => console.log(`   - ${item.tool}: ${item.error}`));
    }

    console.log(`\n📈 总体可访问率: ${Math.round(this.results.accessible.length / (this.results.accessible.length + this.results.inaccessible.length + this.results.errors.length) * 100)}%`);
  }
}

// 执行检查，带全局超时保护
const checker = new ToolAccessibilityChecker();

// 全局超时保护 - 10秒后强制退出
setTimeout(() => {
  console.log('🚨 检查超时，强制退出');
  process.exit(1);
}, 10000);

checker.checkAllTools().catch(error => {
  console.log('💥 检查失败:', error.message);
}).finally(() => {
  console.log('🔚 工具可访问性检查完成');
  process.exit(0);
});
