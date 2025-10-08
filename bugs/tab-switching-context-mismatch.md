# Tab Switching Context Mismatch Issue

## 问题描述

**问题标题**: Tab switching and evaluate context mismatch  
**发现日期**: 2025-10-08  
**严重程度**: High  
**影响范围**: evaluate, click, type等DOM操作工具

## 症状

1. **Tab切换异常**:
   - 调用 `mcp0_switch_tab(tabId)` 后返回 `switched:tab_X` 
   - 但随后的 `evaluate` 操作在错误的页面上下文中执行

2. **Context不一致**:
   - 截图显示正确页面 (如 Bilibili视频页)
   - 但 `evaluate` 返回错误页面内容 (如 "Final Test"页面)

## 复现步骤

```javascript
// 1. 列出标签页
await mcp0_list_tabs()  // 发现 tab_23 是 Bilibili页面

// 2. 切换标签页  
await mcp0_switch_tab("tab_23")  // 返回: switched:tab_23

// 3. 截图验证
await mcp0_screenshot()  // 显示正确的Bilibili页面

// 4. 执行JavaScript  
await mcp0_evaluate("document.title")  // ❌ 返回错误页面标题 "Final Test"
```

## 错误表现

- **期望**: `evaluate` 在切换后的 tab_23 (Bilibili) 上执行
- **实际**: `evaluate` 在旧的或错误的页面上下文中执行
- **一致性**: `screenshot` 工作正常，说明Chrome标签页切换成功

## 错误日志

```
Step 109 (CORTEX_STEP_TYPE_MCP_TOOL):
Output: Encountered error in step execution: error executing cascade step: CORTEX_STEP_TYPE_MCP_TOOL: MCP error -32603: Click failed: TargetCloseError: Protocol error (Input.dispatchMouseEvent): Target closed
```

## 技术分析

### 可能原因

1. **CDP Target切换延迟**: Chrome DevTools Protocol的target切换有异步延迟
2. **Context ID缓存**: MCP server缓存了旧的executionContextId
3. **Tab ID映射错误**: tabId到CDP target的映射不正确
4. **并发竞争条件**: 快速切换标签页时的竞争条件

### 影响的工具

- ✅ `mcp0_list_tabs` - 正常工作
- ✅ `mcp0_switch_tab` - 返回成功但上下文错误  
- ✅ `mcp0_screenshot` - 正常工作
- ❌ `mcp0_evaluate` - 在错误上下文执行
- ❌ `mcp0_click` - 目标关闭错误
- ❌ `mcp0_type` - 可能受影响

## 变通方案

1. **添加延迟**: 在 `switch_tab` 后等待2-3秒
2. **验证上下文**: 切换后先验证 `document.title` 
3. **使用截图**: 优先使用截图验证页面状态
4. **重试机制**: 检测到上下文错误时重试操作

## 建议修复方向

1. **强制上下文刷新**: 切换标签页后强制刷新executionContextId
2. **添加上下文验证**: 在DOM操作前验证当前页面URL/title
3. **改进错误处理**: 检测到TargetCloseError时自动重试
4. **同步切换**: 确保标签页切换完全完成后再进行DOM操作

## 测试用例

```javascript
// 测试标签页切换一致性
async function testTabSwitchConsistency() {
  const tabs = await mcp0_list_tabs();
  const targetTab = tabs.find(t => t.url.includes('bilibili.com'));
  
  // 切换标签页
  const switchResult = await mcp0_switch_tab(targetTab.id);
  console.log('Switch result:', switchResult);
  
  // 等待切换完成
  await sleep(2000);
  
  // 验证上下文
  const title = await mcp0_evaluate('document.title');
  const url = await mcp0_evaluate('location.href');
  
  // 截图验证
  const screenshot = await mcp0_screenshot();
  
  console.log('Title from evaluate:', title);
  console.log('URL from evaluate:', url);
  console.log('Expected URL:', targetTab.url);
  
  return title.includes('bilibili') && url.includes('bilibili.com');
}
```
