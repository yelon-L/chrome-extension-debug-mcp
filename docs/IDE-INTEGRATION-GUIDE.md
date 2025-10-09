# 🎯 Chrome扩展调试功能 - IDE集成指南

## 🚀 **支持的IDE和配置方式**

### **1. Cursor IDE集成** 🎯

#### **配置步骤**:

**Step 1: 安装Chrome Debug MCP**
```bash
# 克隆项目
git clone <repository-url> chrome-debug-mcp
cd chrome-debug-mcp

# 安装依赖和构建
npm install
npm run build
```

**Step 2: 配置Cursor MCP设置**
```json
// ~/.cursor/mcp_servers.json 或工作区的 .cursor/mcp_servers.json
{
  "mcpServers": {
    "chrome-extension-debug": {
      "command": "node", 
      "args": ["build/main.js"],
      "cwd": "/path/to/chrome-debug-mcp",
      "description": "Chrome扩展开发调试工具"
    }
  }
}
```

**Step 3: 重启Cursor并验证**
- 重启Cursor IDE
- 在聊天面板中输入: `@chrome-extension-debug`
- 应该能看到可用的工具列表

---

### **2. Windsurf IDE集成** 🌊

#### **配置步骤**:

**Step 1: MCP服务器配置**
```json
// Windsurf设置中的MCP服务器配置
{
  "mcp": {
    "servers": {
      "chrome-debug": {
        "command": "node",
        "args": ["build/main.js"], 
        "cwd": "/absolute/path/to/chrome-debug-mcp",
        "env": {
          "DEBUG": "false"
        }
      }
    }
  }
}
```

**Step 2: 权限配置**
```json
// 可选: 配置工具权限
{
  "mcp": {
    "servers": {
      "chrome-debug": {
        "command": "node",
        "args": ["build/main.js"],
        "cwd": "/absolute/path/to/chrome-debug-mcp",
        "allowedTools": [
          "list_extension_contexts",
          "switch_extension_context",
          "get_extension_logs",
          "content_script_status"
        ]
      }
    }
  }
}
```

---

## 💡 **如何使用新增的扩展调试功能**

### **功能发现方式**

#### **1. 查看可用工具**
在IDE聊天中输入:
```
请列出所有可用的Chrome扩展调试工具
```

**预期响应**:
```
可用的Chrome扩展调试工具:
✅ list_extension_contexts - 列出所有扩展上下文
✅ switch_extension_context - 切换扩展上下文  
✅ get_extension_logs - 获取扩展日志
✅ content_script_status - 检查内容脚本状态
✅ list_extensions - 列出已安装扩展
✅ attach_to_chrome - 连接到Chrome调试端口
```

#### **2. 获取工具详细信息**
```
请详细说明 list_extension_contexts 工具的用法
```

**预期响应**:
```
list_extension_contexts 工具用法:

📋 功能: 分析所有Chrome扩展的上下文状态
🎯 用途: 快速了解扩展的运行状态和架构

参数:
- extensionId (可选): 指定扩展ID，不填则分析所有扩展

返回信息:
- 扩展基本信息 (ID、名称、版本)
- Background上下文状态
- Content Scripts注入情况  
- Popup/Options页面状态
- DevTools扩展状态
```

---

## 🎮 **实际使用场景示例**

### **场景1: 扩展开发调试** 🔧

**问题**: "我的Chrome扩展不工作，不知道哪里出问题了"

**IDE对话示例**:
```
用户: 帮我检查Chrome扩展 "My Extension" 的运行状态

AI: 我来帮您检查扩展状态。首先连接Chrome并分析所有扩展上下文。

[调用 attach_to_chrome]
✅ 已连接到Chrome (localhost:9222)

[调用 list_extension_contexts] 
📊 分析结果:
- 发现扩展: My Extension (abc123...)
- Background: ✅ Service Worker运行中
- Content Scripts: ❌ 在3个页面中有2个注入失败
- Popup: ❌ 未打开
- 可用API: ["storage", "tabs", "runtime"]

🎯 问题定位: Content Scripts注入失败
💡 建议: 检查manifest.json的content_scripts配置和页面权限
```

### **场景2: 上下文切换调试** 🔄

**问题**: "需要在Background和Content Script之间切换调试"

**IDE对话示例**:
```
用户: 切换到扩展Background上下文进行调试

AI: 正在切换到Background上下文...

[调用 switch_extension_context]
参数: 
- extensionId: abc123...
- contextType: background

✅ 成功切换到Background上下文
📋 当前状态:
- 上下文类型: service_worker  
- 目标ID: SW_456789
- 可执行脚本: ✅
- 可访问存储: ✅
- Chrome APIs: ["storage", "tabs", "runtime", "permissions"]

💡 现在可以在Background上下文中执行代码和调试
```

### **场景3: 日志分析** 📊

**问题**: "扩展产生了很多错误日志，需要分析"

**IDE对话示例**:
```
用户: 分析我的扩展最近的错误日志

AI: 我来获取和分析扩展的错误日志。

[调用 get_extension_logs]
参数:
- level: ["error", "warn"]
- since: 最近1小时

📊 日志分析结果:
总计: 47条日志
错误: 12条 
警告: 8条

🔴 主要错误:
1. "Cannot read property 'tabs' of undefined" (5次)
   - 来源: background.js:23
   - 原因: chrome.tabs API权限问题

2. "Content script injection failed" (3次)  
   - 来源: content.js:init
   - 原因: 页面CSP策略阻止

💡 修复建议:
1. 在manifest.json中添加 "tabs" 权限
2. 检查Content Security Policy设置
```

---

## 🛠️ **高级配置和自定义**

### **1. 环境变量配置**
```json
{
  "mcp": {
    "servers": {
      "chrome-debug": {
        "command": "node",
        "args": ["build/main.js"],
        "cwd": "/path/to/chrome-debug-mcp",
        "env": {
          "CHROME_DEBUG_HOST": "localhost",
          "CHROME_DEBUG_PORT": "9222",
          "DEBUG_LEVEL": "info"
        }
      }
    }
  }
}
```

### **2. 自定义快捷命令**
```json
// 在IDE中定义快捷命令
{
  "commands": {
    "debug-chrome-ext": {
      "title": "调试Chrome扩展",
      "mcp_tool": "list_extension_contexts",
      "auto_params": {}
    },
    "switch-to-background": {
      "title": "切换到Background", 
      "mcp_tool": "switch_extension_context",
      "params_template": {
        "contextType": "background"
      }
    }
  }
}
```

### **3. 工作区特定配置**
```json
// .vscode/settings.json 或项目根目录配置
{
  "chrome-debug-mcp": {
    "defaultExtensionId": "your-extension-id-here",
    "autoConnect": true,
    "chromePort": 9222
  }
}
```

---

## 🚨 **常见问题和解决方案**

### **1. "MCP服务器启动失败"**

**可能原因**:
- Node.js版本不兼容
- 依赖包未安装
- 路径配置错误

**解决方案**:
```bash
# 检查Node.js版本 (需要 ≥ 16)
node --version

# 重新安装依赖
cd /path/to/chrome-debug-mcp
npm install
npm run build

# 验证可执行性
node build/main.js --version
```

### **2. "无法连接到Chrome"**

**检查清单**:
```bash
# 1. Chrome是否以调试模式启动
chrome --remote-debugging-port=9222

# 2. 端口是否可访问
curl http://localhost:9222/json

# 3. 防火墙设置检查
# Windows: 检查Windows防火墙
# macOS: 检查系统偏好设置 > 安全性与隐私
# Linux: 检查iptables设置
```

### **3. "工具调用返回错误"**

**调试步骤**:
```bash
# 1. 手动测试MCP服务器
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/main.js

# 2. 检查Chrome连接
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"attach_to_chrome","arguments":{"host":"localhost","port":9222}}}' | node build/main.js

# 3. 查看详细日志
DEBUG=true node build/main.js
```

---

## 📚 **学习资源和文档**

### **快速上手**:
1. 阅读 `README.md` - 基础安装和使用
2. 查看 `CONTEXT-FEATURES-VALUE-ANALYSIS.md` - 功能价值分析
3. 参考 `TRANSPORT-COMPARISON-GUIDE.md` - 传输方式选择

### **进阶使用**:
1. Chrome DevTools Protocol文档
2. MCP (Model Context Protocol) 规范
3. Chrome扩展开发最佳实践

### **社区支持**:
```bash
# 提交Issue
# 功能请求或Bug报告

# 贡献代码
# Fork -> 开发 -> Pull Request

# 讨论交流  
# GitHub Discussions
```

---

## 🎊 **成功配置验证**

完成配置后，在IDE中测试以下对话:

```
用户: 帮我检查Chrome扩展开发环境

AI: 我来检查您的Chrome扩展开发环境。

[自动调用相关工具]
✅ Chrome连接: localhost:9222 正常
✅ 扩展检测: 发现 2 个已安装扩展  
✅ 调试工具: 17 个功能可用
✅ 上下文管理: Background、Content、UI全支持

🎉 恭喜！您的Chrome扩展调试环境已完全就绪！

现在您可以:
- 实时分析扩展运行状态
- 快速切换调试上下文  
- 智能检测API可用性
- 高效定位和解决问题

有什么扩展开发问题随时告诉我！
```

**看到类似响应说明配置成功！** 🚀
