/**
 * Error Helper - 友好的错误信息辅助工具
 * 
 * 功能：
 * - 提供详细的错误诊断信息
 * - 包含可操作的解决步骤
 * - 帮助用户快速定位和解决问题
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class ErrorHelper {
  /**
   * Chrome未连接错误
   */
  static chromeNotConnected(): McpError {
    return new McpError(
      ErrorCode.InternalError,
      'Chrome未连接\n\n' +
      '可能原因：\n' +
      '1. Chrome未启动\n' +
      '   解决：使用 launch_chrome 工具启动\n' +
      '2. Chrome未开启调试模式\n' +
      '   解决：手动启动 chrome --remote-debugging-port=9222\n' +
      '3. 调试端口错误\n' +
      '   解决：使用 attach_to_chrome 连接正确端口\n\n' +
      '快速诊断：\n' +
      '- 检查Chrome进程是否运行\n' +
      '- 浏览器访问 http://localhost:9222/json 查看可用targets'
    );
  }

  /**
   * 连接被拒绝错误
   */
  static connectionRefused(port: number): McpError {
    return new McpError(
      ErrorCode.InternalError,
      `无法连接到Chrome调试端口 ${port}\n\n` +
      `诊断步骤：\n` +
      `1. 确认Chrome已启动：\n` +
      `   Windows: chrome.exe --remote-debugging-port=${port}\n` +
      `   Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${port}\n` +
      `   Linux: google-chrome --remote-debugging-port=${port}\n` +
      `2. 确认端口未被占用：\n` +
      `   Windows: netstat -ano | findstr ${port}\n` +
      `   Mac/Linux: lsof -i :${port}\n` +
      `3. 检查防火墙设置\n` +
      `4. 尝试其他端口（如9223）\n\n` +
      `提示：使用 launch_chrome 工具可自动处理这些步骤`
    );
  }

  /**
   * 扩展未找到错误
   */
  static extensionNotFound(extensionId: string): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `未找到扩展 ${extensionId}\n\n` +
      `诊断步骤：\n` +
      `1. 使用 list_extensions 查看所有已加载扩展\n` +
      `2. 确认扩展ID正确（32位字符）\n` +
      `3. 确认扩展已加载且启用\n` +
      `4. 重启Chrome并重新加载扩展\n\n` +
      `提示：扩展ID可在 chrome://extensions 页面找到（需开启开发者模式）`
    );
  }

  /**
   * 无可用页面错误
   */
  static noActivePage(): McpError {
    return new McpError(
      ErrorCode.InternalError,
      '没有可用的页面\n\n' +
      '可能原因：\n' +
      '1. Chrome已连接但没有打开任何标签页\n' +
      '   解决：使用 new_tab 工具创建新标签页\n' +
      '2. 所有标签页都已关闭\n' +
      '   解决：在Chrome中打开一个新标签页\n' +
      '3. 页面加载失败或崩溃\n' +
      '   解决：刷新页面或重新打开\n\n' +
      '提示：使用 list_tabs 查看当前所有标签页'
    );
  }

  /**
   * Tab未找到错误
   */
  static tabNotFound(tabId: string): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `未找到标签页 ${tabId}\n\n` +
      `诊断步骤：\n` +
      `1. 使用 list_tabs 查看所有可用标签页\n` +
      `2. 确认标签页ID正确\n` +
      `3. 标签页可能已被关闭\n` +
      `   解决：使用 new_tab 创建新标签页\n\n` +
      `提示：标签页ID是系统自动生成的唯一标识符`
    );
  }

  /**
   * Tab已关闭错误
   */
  static tabClosed(tabId: string): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `标签页 ${tabId} 已关闭\n\n` +
      `可能原因：\n` +
      `1. 标签页被用户手动关闭\n` +
      `2. 标签页加载失败自动关闭\n` +
      `3. 扩展或脚本调用了close方法\n\n` +
      `解决方法：\n` +
      `- 使用 list_tabs 查看当前可用标签页\n` +
      `- 使用 new_tab 创建新标签页\n` +
      `- 使用 switch_tab 切换到其他标签页`
    );
  }

  /**
   * Chrome连接失败通用错误
   */
  static chromeConnectionFailed(error: any): McpError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new McpError(
      ErrorCode.InternalError,
      `Chrome连接失败\n\n` +
      `错误详情：${errorMessage}\n\n` +
      `常见原因和解决方法：\n` +
      `1. Chrome未启动或已崩溃\n` +
      `   解决：重启Chrome并确保使用调试模式启动\n` +
      `2. 调试端口被其他程序占用\n` +
      `   解决：更换端口或关闭占用端口的程序\n` +
      `3. 网络或防火墙阻止连接\n` +
      `   解决：检查网络设置和防火墙规则\n` +
      `4. Chrome版本过旧\n` +
      `   解决：更新Chrome到最新版本\n\n` +
      `诊断命令：\n` +
      `- curl http://localhost:9222/json 检查调试服务是否响应\n` +
      `- ps aux | grep chrome 检查Chrome进程（Mac/Linux）\n` +
      `- tasklist | findstr chrome 检查Chrome进程（Windows）`
    );
  }

  /**
   * 扩展上下文未找到错误
   */
  static extensionContextNotFound(extensionId: string, contextType: string): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `未找到扩展上下文：${extensionId} (${contextType})\n\n` +
      `可能原因：\n` +
      `1. 扩展未加载或已禁用\n` +
      `   解决：在 chrome://extensions 中启用扩展\n` +
      `2. 请求的上下文类型不存在\n` +
      `   解决：使用 list_extension_contexts 查看可用上下文\n` +
      `3. Service Worker已停止（MV3扩展）\n` +
      `   解决：触发扩展事件以激活Service Worker\n` +
      `4. 内容脚本未注入到当前页面\n` +
      `   解决：使用 inject_content_script 手动注入\n\n` +
      `提示：MV3扩展的Service Worker在空闲时会自动停止，需要通过事件唤醒`
    );
  }

  /**
   * 注入内容脚本失败错误
   */
  static injectContentScriptFailed(tabId: string, reason: string): McpError {
    return new McpError(
      ErrorCode.InternalError,
      `注入内容脚本失败 (Tab: ${tabId})\n\n` +
      `失败原因：${reason}\n\n` +
      `常见问题和解决方法：\n` +
      `1. 页面不允许注入脚本（chrome://、chrome-extension://等）\n` +
      `   解决：切换到普通网页（如http://或https://）\n` +
      `2. 扩展没有足够权限\n` +
      `   解决：在manifest.json中添加host_permissions\n` +
      `3. 页面正在加载中\n` +
      `   解决：等待页面加载完成后再注入\n` +
      `4. 内容脚本代码有语法错误\n` +
      `   解决：检查并修复脚本代码\n\n` +
      `提示：使用 content_script_status 检查注入状态`
    );
  }

  /**
   * 存储访问失败错误
   */
  static storageAccessFailed(extensionId: string, storageType: string, reason: string): McpError {
    return new McpError(
      ErrorCode.InternalError,
      `访问扩展存储失败\n\n` +
      `扩展ID：${extensionId}\n` +
      `存储类型：${storageType}\n` +
      `错误原因：${reason}\n\n` +
      `可能原因：\n` +
      `1. 扩展没有storage权限\n` +
      `   解决：在manifest.json的permissions中添加"storage"\n` +
      `2. 尝试访问不存在的存储类型\n` +
      `   解决：使用local、sync、session中的有效类型\n` +
      `3. 存储quota已满\n` +
      `   解决：清理不需要的数据或使用unlimitedStorage权限\n` +
      `4. 扩展上下文未激活\n` +
      `   解决：使用 switch_extension_context 切换到扩展上下文\n\n` +
      `提示：使用 inspect_extension_storage 查看存储使用情况`
    );
  }

  /**
   * 元素未找到错误
   */
  static elementNotFound(selector: string): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `未找到元素：${selector}\n\n` +
      `诊断步骤：\n` +
      `1. 确认选择器语法正确\n` +
      `   提示：使用Chrome DevTools测试选择器\n` +
      `2. 检查元素是否在当前页面中\n` +
      `   解决：使用 evaluate 执行 document.querySelector('${selector}')\n` +
      `3. 元素可能在iframe中\n` +
      `   解决：需要先切换到对应的frame\n` +
      `4. 元素可能动态加载\n` +
      `   解决：等待页面加载完成或使用waitForSelector\n\n` +
      `常用选择器示例：\n` +
      `- ID: #elementId\n` +
      `- Class: .className\n` +
      `- 属性: [data-test="value"]\n` +
      `- 层级: div > p.text`
    );
  }

  /**
   * 超时错误
   */
  static operationTimeout(operation: string, timeout: number): McpError {
    return new McpError(
      ErrorCode.InternalError,
      `操作超时：${operation}\n\n` +
      `超时时间：${timeout}ms\n\n` +
      `可能原因：\n` +
      `1. 页面加载缓慢\n` +
      `   解决：增加超时时间或优化页面性能\n` +
      `2. 网络连接不稳定\n` +
      `   解决：检查网络连接或使用本地测试\n` +
      `3. 扩展阻塞页面加载\n` +
      `   解决：暂时禁用可能冲突的扩展\n` +
      `4. 等待的元素或条件永远不会满足\n` +
      `   解决：检查等待条件是否正确\n\n` +
      `建议：\n` +
      `- 对于慢速网络，使用更长的超时时间\n` +
      `- 对于测试环境，考虑使用本地资源\n` +
      `- 使用waitUntil: 'domcontentloaded'而不是'networkidle'`
    );
  }

  /**
   * 权限不足错误
   */
  static insufficientPermissions(operation: string, requiredPermissions: string[]): McpError {
    return new McpError(
      ErrorCode.InvalidParams,
      `权限不足：${operation}\n\n` +
      `需要的权限：\n${requiredPermissions.map(p => `- ${p}`).join('\n')}\n\n` +
      `解决方法：\n` +
      `1. 在manifest.json中添加所需权限：\n` +
      `   "permissions": [${requiredPermissions.map(p => `"${p}"`).join(', ')}]\n` +
      `2. 对于host_permissions，添加网站匹配模式：\n` +
      `   "host_permissions": ["<all_urls>"] 或 ["https://*.example.com/*"]\n` +
      `3. 重新加载扩展使权限生效\n` +
      `4. 某些权限可能需要用户手动授权\n\n` +
      `提示：使用 chrome://extensions 查看扩展权限`
    );
  }

  /**
   * 脚本评估失败错误
   */
  static evaluationFailed(expression: string, error: string): McpError {
    const truncatedExpression = expression.length > 100 
      ? expression.substring(0, 100) + '...' 
      : expression;
    
    return new McpError(
      ErrorCode.InternalError,
      `JavaScript执行失败\n\n` +
      `表达式：${truncatedExpression}\n` +
      `错误信息：${error}\n\n` +
      `常见问题：\n` +
      `1. 语法错误\n` +
      `   解决：检查JavaScript语法，使用ESLint验证\n` +
      `2. 引用了未定义的变量\n` +
      `   解决：确保所有变量都已声明\n` +
      `3. 跨域限制\n` +
      `   解决：某些API在iframe中可能被限制\n` +
      `4. API不可用\n` +
      `   解决：确认在正确的上下文中执行（页面/扩展）\n\n` +
      `调试建议：\n` +
      `- 在Chrome DevTools Console中先测试代码\n` +
      `- 使用try-catch包装代码以捕获错误\n` +
      `- 分段执行复杂代码以定位问题`
    );
  }
}


