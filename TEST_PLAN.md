# MCP 扩展调试用例与验收标准

目标：系统化验证新增 MCP 工具（attach_to_chrome、list_extensions、get_extension_logs、reload_extension、inject_content_script、content_script_status）以及增强的 evaluate(tabId)。

## 测试前置
- 已编译：`npm run build`
- IDE 已接入 MCP：指向 `build/index.js`
- Chrome 准备：
  - 方式A：已有实例，远程调试端口 9223
  - 方式B：使用 `launch_chrome`（Xvfb/桌面），并 `loadExtension` 为 `test-extension/`

---

## 用例 A：连接既有浏览器
- **工具**：`attach_to_chrome`
- **步骤**：
  1. 调用：`{"host":"localhost","port":9223}`
- **期望**：返回 `attached:localhost:9223`
- **失败判据**：连接失败，或后续工具报 `CDP not initialized`

## 用例 B：列出扩展目标
- **工具**：`list_extensions`
- **期望**：返回包含 `chrome-extension://<id>/...` 与 `service_worker` 目标；能看出 `test-extension` 的扩展 ID

## 用例 C：基础页面与标签管理（回归）
- **工具**：`new_tab` → `evaluate`(tabId) → `click`/`type` → `screenshot` → `list_tabs`/`switch_tab`/`close_tab`
- **步骤**：
  1. `new_tab`: 打开 data URL 测试页
  2. `evaluate`(tabId): `document.title` == "MCP Test"
  3. `click`/`type`: 操作 #i/#b，触发 DOM 更新
  4. `screenshot`: 返回 base64 长度 > 1000
- **期望**：各步骤成功；截图能看到交互结果

## 用例 D：扩展日志（聚合/过滤）
- **工具**：`get_extension_logs`
- **步骤**：
  1. 在匹配页（`http://localhost:8081/*` 或 data URL 注入后）产生扩展日志
  2. 调用：`{"sourceTypes":["content_script","service_worker","extension"],"clear":false}`
- **期望**：返回中包含扩展来源日志：
  - `[content_script]` 或包含 `chrome-extension://...` 堆栈
  - `[service_worker]` 或 `[extension]`

## 用例 E：内容脚本注入
- **工具**：`inject_content_script`
- **步骤**：
  1. 通过 `list_tabs` 获取 `tabId`
  2. 通过 `list_extensions` 获取 `extensionId`
  3. 调用：
     ```json
     {
       "extensionId": "<id>",
       "tabId": "<tab_xxx>",
       "code": "console.log('[CS] MCP injected'); document.body.setAttribute('data-mcp','1');"
     }
     ```
- **期望**：返回 `injected`；随后 `get_extension_logs` 能看到日志；页面 DOM 含 `data-mcp="1"`

## 用例 F：内容脚本状态诊断
- **工具**：`content_script_status`
- **步骤**：
  1. 调用：`{"tabId":"<tab_xxx>"}`
- **期望**：返回 JSON：`hasChromeRuntime`、`injectedEl`（如果 content.js 注入了标记）、`extensionScripts>0`

## 用例 G：扩展热重载
- **工具**：`reload_extension`
- **步骤**：
  1. 调用：`{"extensionId":"<id>"}`
  2. 1-2 秒后再次 `get_extension_logs`
- **期望**：日志中可见 SW 重启/初始化输出

## 用例 H：evaluate(tabId)
- **工具**：`evaluate`
- **步骤**：
  1. 对指定 Tab 执行 `document.body.dataset.mcp`
- **期望**：值为 `1`（若之前注入成功）

---

## 通过/失败判据
- **通过**：所有用例按预期返回且日志/截图/DOM 校验一致；扩展日志可被分类与过滤。
- **失败**：任一能力不可用；或扩展日志分类不准确；或注入/重载失败。

## 复现实用指令（示例）
- 连接现有实例：
  ```json
  {"name":"attach_to_chrome","arguments":{"host":"localhost","port":9223}}
  ```
- 列出扩展：
  ```json
  {"name":"list_extensions","arguments":{}}
  ```
- 注入脚本：
  ```json
  {"name":"inject_content_script","arguments":{"extensionId":"<id>","tabId":"tab_1","code":"console.log('[CS] injected')"}}
  ```
