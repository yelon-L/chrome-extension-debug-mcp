# Chrome Debug MCP Server

一个基于 Puppeteer 和 Chrome DevTools Protocol (CDP) 的 Model Context Protocol (MCP) 服务器，用于浏览器自动化、扩展调试和网页交互。

## 核心功能

### 🌐 浏览器管理
- 启动带有自定义配置的 Chrome 浏览器
- 支持自定义用户配置目录和可执行文件路径
- Chrome 扩展加载和管理
- 禁用"自动化控制"横幅

### 🖱️ 页面交互
- **click** - 点击页面元素（支持CSS选择器）
- **type** - 向输入框输入文本（支持清空和延迟）
- **screenshot** - 截取页面或元素截图（支持全页/区域/base64）

### 📑 标签页管理
- **list_tabs** - 列出所有打开的标签页
- **new_tab** - 创建新标签页并可选导航
- **switch_tab** - 切换到指定标签页
- **close_tab** - 关闭指定标签页

### 🛠️ 开发工具
- **evaluate** - 在页面上下文执行JavaScript代码
- **get_console_logs** - 获取浏览器控制台日志
- **扩展日志收集** - 自动收集Chrome扩展和Service Worker的控制台输出

### 📜 用户脚本支持
- 注入Greasemonkey风格的API (GM_setValue, GM_getValue, GM_addStyle等)
- 支持自定义用户脚本加载

## 安装

### 前置要求
- Node.js 16 或更高版本
- Chrome 浏览器已安装
- 支持 MCP 的客户端（如 Claude Desktop、VSCode Roo Code）

### 构建步骤
```bash
git clone <此仓库>
cd chrome-debug-mcp
npm install
npm run build
```

## 配置

### Claude Desktop
在 `claude_desktop_config.json` 中添加：
```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/path/to/chrome-debug-mcp/build/index.js"]
    }
  }
}
```

### VSCode Roo Code
在 `cline_mcp_settings.json` 中添加：
```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node", 
      "args": ["/path/to/chrome-debug-mcp/build/index.js"],
      "disabled": false
    }
  }
}
```

## 使用示例

### 基本浏览器操作
```javascript
// 启动Chrome并打开页面
use_mcp_tool("chrome-debug", "launch_chrome", {
  url: "https://example.com"
})

// 列出所有标签页
use_mcp_tool("chrome-debug", "list_tabs", {})

// 创建新标签页
use_mcp_tool("chrome-debug", "new_tab", {
  url: "https://github.com"
})
```

### 页面交互
```javascript
// 点击按钮
use_mcp_tool("chrome-debug", "click", {
  selector: "#submit-button"
})

// 输入文本
use_mcp_tool("chrome-debug", "type", {
  selector: "#username",
  text: "my-username",
  clear: true
})

// 截图
use_mcp_tool("chrome-debug", "screenshot", {
  returnBase64: true,
  fullPage: false
})
```

### 扩展调试
```javascript
// 加载扩展进行调试
use_mcp_tool("chrome-debug", "launch_chrome", {
  loadExtension: "/path/to/your/extension",
  disableExtensionsExcept: "/path/to/your/extension",
  userDataDir: "/tmp/chrome-debug-profile"
})

// 获取所有控制台日志（包括扩展和Service Worker）
use_mcp_tool("chrome-debug", "get_console_logs", {})

// 在页面执行调试代码
use_mcp_tool("chrome-debug", "evaluate", {
  expression: "console.log('Extension debug'); window.myExtensionAPI"
})
```

## 工具参考

### launch_chrome
启动Chrome浏览器
- `url` (optional) - 导航到的URL
- `executablePath` (optional) - Chrome可执行文件路径
- `userDataDir` (optional) - 用户数据目录
- `loadExtension` (optional) - 要加载的扩展路径
- `disableExtensionsExcept` (optional) - 除此之外禁用所有扩展
- `disableAutomationControlled` (optional) - 禁用自动化横幅
- `userscriptPath` (optional) - 要注入的用户脚本路径

### click
点击页面元素
- `selector` (required) - CSS选择器
- `delay` (optional) - 点击延迟(毫秒)
- `button` (optional) - 鼠标按钮 (left/middle/right)
- `clickCount` (optional) - 点击次数

### type
输入文本
- `selector` (required) - CSS选择器
- `text` (required) - 要输入的文本
- `delay` (optional) - 输入延迟(毫秒)
- `clear` (optional) - 是否先清空现有内容

### screenshot
截取屏幕截图
- `path` (optional) - 保存文件路径
- `fullPage` (optional) - 是否全页截图
- `selector` (optional) - 截取特定元素
- `returnBase64` (optional) - 返回base64编码

### list_tabs
列出所有标签页
- 返回包含 id、url、title、active 的数组

### new_tab
创建新标签页
- `url` (optional) - 新标签页的URL

### switch_tab
切换标签页
- `tabId` (required) - 要切换到的标签页ID

### close_tab
关闭标签页
- `tabId` (required) - 要关闭的标签页ID

## 依赖

- [Puppeteer](https://pptr.dev/) - Chrome自动化库
- [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) - Chrome DevTools Protocol客户端
- [@modelcontextprotocol/sdk](https://github.com/ModelContextProtocol/sdk) - MCP SDK

## 许可证

MIT License - 详见 LICENSE 文件

## 致谢

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Greasemonkey API](https://wiki.greasespot.net/Greasemonkey_Manual:API)
- [Model Context Protocol](https://modelcontextprotocol.ai)
