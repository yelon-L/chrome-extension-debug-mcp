# Chrome Debug MCP 安装与配置指南

## 🚀 快速开始

### 前置要求
- Node.js 16+ 
- Chrome浏览器
- 支持MCP的客户端（VSCode + Roo Code / Cursor / Windsurf / Claude Desktop）

### 构建项目
```bash
cd /home/p/workspace/chrome-debug-mcp
npm install
npm run build
```

## 📝 各IDE配置方法

### 1. VSCode + Roo Code 扩展

#### 安装Roo Code扩展
1. 打开VSCode
2. 进入扩展市场 (Ctrl+Shift+X)
3. 搜索 "Roo Code" 或 "Cline"
4. 安装扩展

#### 配置MCP服务器
创建或编辑 `~/.cline/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"],
      "disabled": false,
      "alwaysAllow": ["launch_chrome", "get_console_logs", "evaluate"]
    }
  }
}
```

#### 使用方法
1. 重启VSCode
2. 打开Roo Code面板
3. 在对话中使用MCP工具：

```
请使用chrome-debug工具启动Chrome浏览器，并打开https://example.com
```

### 2. Cursor IDE

#### 配置路径
创建或编辑 `~/.cursor/mcp_settings.json`:

```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 启用MCP
1. 打开Cursor设置 (Cmd/Ctrl + ,)
2. 搜索 "MCP" 
3. 启用 "Enable Model Context Protocol"
4. 重启Cursor

#### 使用示例
```
@chrome-debug 启动浏览器并测试我的扩展
```

### 3. Windsurf IDE

#### 配置文件位置
创建 `~/.windsurf/mcp_config.json`:

```json
{
  "servers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"],
      "description": "Chrome Debug MCP Server for browser automation and extension debugging"
    }
  }
}
```

#### 激活服务器
1. 打开Windsurf命令面板 (Ctrl+Shift+P)
2. 运行 "MCP: Reload Servers"
3. 确认chrome-debug服务器已加载

#### 使用方法
在Windsurf AI助手中：
```
使用chrome-debug工具来测试我的Chrome扩展功能
```

### 4. Claude Desktop

#### 配置文件
编辑 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
或 `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"]
    }
  }
}
```

#### 使用方法
重启Claude Desktop后，直接在对话中使用：
```
请帮我启动Chrome并测试页面的JavaScript功能
```

## 🛠️ 高级配置选项

### 环境变量配置
```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"],
      "env": {
        "CHROME_DEBUG_PORT": "9222",
        "CHROME_USER_DATA": "/tmp/chrome-mcp",
        "DEBUG": "true"
      }
    }
  }
}
```

### 自定义启动参数
```json
{
  "mcpServers": {
    "chrome-debug": {
      "command": "node",
      "args": [
        "/home/p/workspace/chrome-debug-mcp/build/index.js",
        "--chrome-port=9222",
        "--user-data-dir=/tmp/chrome-debug"
      ]
    }
  }
}
```

## 📋 可用工具列表

配置完成后，可以使用以下10个MCP工具：

### 浏览器管理
- `launch_chrome` - 启动Chrome浏览器
- `get_console_logs` - 获取控制台日志
- `evaluate` - 执行JavaScript代码

### 页面交互  
- `click` - 点击页面元素
- `type` - 输入文本
- `screenshot` - 截取屏幕截图

### 标签页管理
- `list_tabs` - 列出所有标签页
- `new_tab` - 创建新标签页
- `switch_tab` - 切换标签页
- `close_tab` - 关闭标签页

## 🎯 使用示例

### 基础浏览器操作
```
# 启动Chrome并打开页面
请使用chrome-debug启动Chrome，打开https://github.com

# 页面交互
帮我点击页面上的登录按钮，然后输入用户名"test"

# 截图记录
请截取当前页面的屏幕截图
```

### 扩展调试
```
# 加载扩展进行调试
请启动Chrome并加载我的扩展，路径是/path/to/my-extension

# 获取扩展日志
获取所有console日志，包括扩展的Content Script和Background Script

# 测试扩展功能
帮我测试扩展在页面上是否正确注入了内容
```

### 多标签页管理
```
# 管理多个标签页
列出当前所有打开的标签页

# 创建新标签页
在新标签页中打开https://example.com

# 标签页切换
切换到第一个标签页并截图
```

## 🔧 故障排除

### 常见问题

#### 1. MCP服务器启动失败
```bash
# 检查构建是否成功
npm run build

# 手动测试服务器
node build/index.js
# 应该看到: "Chrome Debug MCP server running on stdio"
```

#### 2. Chrome启动失败
```bash
# 检查Chrome是否已安装
google-chrome --version
# 或
chromium --version
```

#### 3. 权限问题
```bash
# 确保脚本有执行权限
chmod +x build/index.js

# 检查临时目录权限
ls -la /tmp/
```

#### 4. 配置文件路径错误
确保使用绝对路径：
```json
{
  "command": "node",
  "args": ["/home/p/workspace/chrome-debug-mcp/build/index.js"]
}
```

### 调试技巧

#### 启用详细日志
```json
{
  "env": {
    "DEBUG": "true",
    "CHROME_DEBUG": "verbose"
  }
}
```

#### 检查MCP连接
在IDE中运行：
```
@chrome-debug 测试连接是否正常
```

#### 手动测试工具
```
使用chrome-debug的launch_chrome工具打开about:blank页面
```

## 📚 更多资源

### 文档链接
- [MCP协议规范](https://modelcontextprotocol.ai)
- [Puppeteer文档](https://pptr.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

### 项目文件
- `README.md` - 项目概览
- `TESTING.md` - 功能测试报告  
- `CONTENT_SCRIPT_LOG_ANALYSIS.md` - Content Script日志分析

### 支持与反馈
如果遇到问题，请检查：
1. Node.js版本是否兼容
2. Chrome浏览器是否正确安装
3. 配置文件路径是否正确
4. MCP客户端是否正确加载服务器

---

配置完成后，你就可以在IDE中通过AI助手使用Chrome Debug MCP的所有功能了！🎉
