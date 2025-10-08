# Chrome Debug MCP - 模块化版本快速开始

**版本**: v2.0.1 (Modular + P0 Fix)  
**5分钟上手指南**

---

## 🚀 快速开始

### 1. 编译项目

```bash
cd /home/p/workspace/chrome-debug-mcp
npm run build
```

**输出**:
```
> chrome-debug-mcp@2.0.0 build
> tsc

✓ 编译成功
```

---

### 2. 配置MCP客户端

#### Windsurf/Cursor

编辑 `~/.windsurf/mcp_server_config.json`:

```json
{
  "mcpServers": {
    "chrome-debug-mcp": {
      "command": "node",
      "args": ["/home/p/workspace/chrome-debug-mcp/build/main.js"],
      "disabled": false
    }
  }
}
```

#### 重启IDE

重启Windsurf/Cursor以加载新配置。

---

### 3. 启动Chrome（调试模式）

```bash
# 方法1: 启动新Chrome
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &

# 方法2: 使用现有Chrome（需要先关闭所有Chrome窗口）
google-chrome --remote-debugging-port=9222 &
```

**验证**: 访问 http://localhost:9222/json 应该看到JSON输出

---

### 4. 连接并测试

在Cascade/Claude中执行：

```javascript
// 1. 连接到Chrome
mcp0_attach_to_chrome({ host: "localhost", port: 9222 })
// 输出: attached:localhost:9222

// 2. 列出标签页
mcp0_list_tabs()
// 输出: [{ id: "tab_1", url: "...", title: "...", active: true }, ...]

// 3. 测试Tab切换（P0修复验证）
mcp0_switch_tab("tab_1")
mcp0_evaluate("document.title")
// 输出: { type: "string", value: "正确的标题" } ✅

// 4. 测试点击功能（P0修复验证）
mcp0_new_tab("data:text/html,<button id='btn'>Click</button>")
mcp0_click("#btn", { tabId: "tab_2" })
// 输出: clicked ✅
```

---

## 📊 验证P0修复

### 测试场景1: Tab切换上下文

```javascript
// 创建两个标签页
mcp0_new_tab("data:text/html,<h1>Page A</h1>")
mcp0_new_tab("data:text/html,<h1>Page B</h1>")

// 切换到Page A
mcp0_switch_tab("tab_1")
mcp0_evaluate("document.querySelector('h1').textContent")
// ✅ 应返回: "Page A"

// 切换到Page B
mcp0_switch_tab("tab_2")
mcp0_evaluate("document.querySelector('h1').textContent")
// ✅ 应返回: "Page B"
```

**修复前**: 可能返回错误页面的内容  
**修复后**: 100%返回正确页面的内容

### 测试场景2: 点击功能

```javascript
// 创建测试页面
mcp0_new_tab("data:text/html,<button id='test' onclick='this.textContent=\"Clicked!\"'>Click Me</button>")

// 点击按钮
mcp0_click("#test", { tabId: "tab_3" })

// 验证
mcp0_evaluate("document.querySelector('#test').textContent", { tabId: "tab_3" })
// ✅ 应返回: "Clicked!"
```

**修复前**: 超时错误  
**修复后**: 正常工作

---

## 🔧 常用命令

### 编译和运行

```bash
# 编译
npm run build

# 运行（模块化版本）
npm start

# 运行（旧版本）
npm run start:legacy

# 开发模式（编译+运行）
npm run dev
```

### 测试

```bash
# 运行测试脚本
node test-extension-debug.js

# 查看日志
# MCP服务器的日志会输出到stderr
```

---

## 📁 项目结构（简化版）

```
chrome-debug-mcp/
├── src/
│   ├── main.ts                    # ⭐ 入口点（模块化）
│   ├── ChromeDebugServer.ts       # 协调器
│   ├── managers/
│   │   ├── ChromeManager.ts       # Chrome管理
│   │   └── PageManager.ts         # ⭐ 页面管理（P0修复）
│   ├── handlers/
│   │   ├── EvaluationHandler.ts   # JavaScript执行
│   │   └── InteractionHandler.ts  # 用户交互
│   └── index.ts.legacy            # 旧版本（已存档）
└── build/                         # 编译输出
    └── main.js                    # ⭐ 使用这个文件
```

---

## 🎯 核心API

### 浏览器管理

```javascript
// 连接到现有Chrome
mcp0_attach_to_chrome({ host: "localhost", port: 9222 })

// 启动新Chrome并加载扩展
mcp0_launch_chrome({
  loadExtension: "/path/to/extension",
  url: "https://example.com"
})

// 获取控制台日志
mcp0_get_console_logs({ clear: false })
```

### 标签页管理

```javascript
// 列出所有标签页
mcp0_list_tabs()

// 创建新标签页
mcp0_new_tab("https://example.com")

// 切换标签页
mcp0_switch_tab("tab_2")

// 关闭标签页
mcp0_close_tab("tab_2")
```

### JavaScript执行

```javascript
// 全局执行（使用当前活动标签页）
mcp0_evaluate("document.title")

// 指定标签页执行
mcp0_evaluate("document.title", { tabId: "tab_2" })

// 执行复杂脚本
mcp0_evaluate(`
  const title = document.title;
  const url = location.href;
  return { title, url };
`)
```

### 用户交互

```javascript
// 点击元素
mcp0_click("#button", { tabId: "tab_2" })

// 输入文本
mcp0_type("#input", "Hello World", { 
  tabId: "tab_2",
  clear: true,
  delay: 50
})

// 截图
mcp0_screenshot({
  path: "/tmp/screenshot.png",
  fullPage: true,
  tabId: "tab_2"
})
```

### 扩展调试

```javascript
// 列出扩展
mcp0_list_extensions()

// 获取扩展日志
mcp0_get_extension_logs({
  sourceTypes: ["extension", "service_worker", "content_script"]
})

// 注入内容脚本
mcp0_inject_content_script({
  extensionId: "your-extension-id",
  tabId: "tab_1",
  code: "console.log('Injected!');"
})

// 检查内容脚本状态
mcp0_content_script_status({ tabId: "tab_1" })

// 重载扩展
mcp0_reload_extension({ extensionId: "your-extension-id" })
```

---

## 🐛 故障排查

### 问题1: MCP工具不可用

**症状**: 在IDE中看不到`mcp0_*`工具

**解决**:
```bash
# 1. 检查编译
cd /home/p/workspace/chrome-debug-mcp
npm run build

# 2. 检查配置文件
cat ~/.windsurf/mcp_server_config.json

# 3. 重启IDE
```

### 问题2: Chrome连接失败

**症状**: `attach_to_chrome`返回错误

**解决**:
```bash
# 1. 检查Chrome是否运行
curl http://localhost:9222/json

# 2. 检查端口是否被占用
lsof -i :9222

# 3. 重启Chrome
pkill chrome
google-chrome --remote-debugging-port=9222 &
```

### 问题3: evaluate返回错误结果

**症状**: evaluate在错误页面执行

**解决**:
```javascript
// 方法1: 明确指定tabId（推荐）
mcp0_evaluate("document.title", { tabId: "tab_2" })

// 方法2: 切换后等待
mcp0_switch_tab("tab_2")
// 等待200ms（P0修复已自动处理）
mcp0_evaluate("document.title")
```

### 问题4: 点击功能失败

**症状**: 点击超时或失败

**解决**:
```javascript
// 方法1: 指定tabId
mcp0_click("#button", { tabId: "tab_2" })

// 方法2: 检查元素是否存在
mcp0_evaluate("!!document.querySelector('#button')", { tabId: "tab_2" })
// 如果返回false，说明元素不存在
```

---

## 📚 更多资源

- **详细架构**: 查看 `MODULAR-ARCHITECTURE.md`
- **P0修复报告**: 查看 `BUGFIX-TEST-REPORT.md`
- **完整文档**: 查看 `README.md`
- **测试脚本**: 运行 `node test-extension-debug.js`

---

## ✅ 检查清单

使用前确认：

- [ ] 项目已编译 (`npm run build`)
- [ ] MCP配置已更新（使用`build/main.js`）
- [ ] IDE已重启
- [ ] Chrome以调试模式运行（9222端口）
- [ ] 可以访问 http://localhost:9222/json

测试P0修复：

- [ ] Tab切换后evaluate返回正确结果
- [ ] 点击功能正常工作
- [ ] 多次切换标签页稳定

---

## 🎉 成功标志

如果看到以下输出，说明一切正常：

```javascript
mcp0_attach_to_chrome({ host: "localhost", port: 9222 })
// ✅ attached:localhost:9222

mcp0_list_tabs()
// ✅ [{ id: "tab_1", ... }]

mcp0_switch_tab("tab_1")
// ✅ switched:tab_1

mcp0_evaluate("document.title")
// ✅ { type: "string", value: "正确的标题" }

mcp0_click("#button", { tabId: "tab_1" })
// ✅ clicked
```

---

**版本**: v2.0.1  
**状态**: ✅ 生产就绪  
**支持**: 查看GitHub Issues
