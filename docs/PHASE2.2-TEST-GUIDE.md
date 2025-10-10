# Phase 2.2: Advanced Interaction Tools - 测试指南

## 📋 前置条件

### 1. 启动Chrome（调试模式）

```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\chrome-debug-profile"

# 或使用已有的Chrome实例（确保9222端口开启）
```

### 2. 加载测试扩展

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `test-extension-enhanced` 文件夹
5. 记下扩展ID（形如 `pmjpdpfoncealbpcofhfmlleajnfhpoc`）

### 3. 打开扩展Popup页面

**方法1: 点击扩展图标**
- 在Chrome工具栏点击扩展图标
- 或在扩展管理页面点击"详情" → "扩展程序选项"

**方法2: 手动导航（推荐用于测试）**
1. 新建标签页
2. 访问: `chrome-extension://<扩展ID>/popup.html`
3. 例如: `chrome-extension://pmjpdpfoncealbpcofhfmlleajnfhpoc/popup.html`

### 4. 验证页面加载

确保popup页面显示以下内容：
- ✅ Phase 2测试元素（按钮、输入框、表单）
- ✅ 拖拽测试区域（源和目标）
- ✅ 文件上传输入框
- ✅ 对话框触发按钮（确认、提示）

## 🧪 运行测试

### 自动测试（推荐）

```bash
# 确保Chrome在9222端口运行，popup页面已打开
node test/test-phase2-advanced-interaction.js
```

### 手动测试（逐步验证）

#### 1. hover_element - 悬停元素

```javascript
// 使用Selector
await server.handleHoverElement({
  selector: '#hoverTarget'
});

// 使用UID（需要先生成快照）
await server.handleTakeSnapshot({});
await server.handleHoverElement({
  uid: 'uid-5'  // 根据快照结果调整
});

// 预期结果: 悬停元素背景变化，显示"已悬停! ✓"
```

#### 2. drag_element - 拖拽元素

```javascript
await server.handleDragElement({
  source: { selector: '#dragSource' },
  target: { selector: '#dropTarget' },
  delay: 500
});

// 预期结果: 拖拽源被拖到目标区域，目标显示"已放置 ✓"
```

#### 3. fill_form - 批量表单填充

```javascript
await server.handleFillForm({
  fields: [
    {
      locator: { selector: 'input[name="username"]' },
      value: 'test_user',
      clear: true
    },
    {
      locator: { selector: 'input[name="email"]' },
      value: 'test@example.com'
    },
    {
      locator: { selector: 'select[name="role"]' },
      value: 'admin',
      type: 'select'
    }
  ],
  submit: false
});

// 预期结果: 表单字段被自动填充
```

#### 4. upload_file - 文件上传

```javascript
// ⚠️ 需要实际文件路径
await server.handleUploadFile({
  selector: '#fileInput',
  filePath: 'C:/Users/YourName/Pictures/test.png'  // 修改为实际路径
});

// 预期结果: 文件状态显示文件名和大小
```

#### 5. handle_dialog - 对话框处理

```javascript
// 处理confirm对话框
const dialogPromise = server.handleDialog({
  action: 'accept',
  timeout: 5000
});

// 触发对话框
await server.handleClick({ selector: '#confirmBtn' });

// 等待处理完成
const result = await dialogPromise;
// result: { type: 'confirm', message: '...', action: 'accept' }

// 处理prompt对话框（带输入）
const promptPromise = server.handleDialog({
  action: 'accept',
  promptText: '我的输入文本',
  timeout: 5000
});

await server.handleClick({ selector: '#promptBtn' });
const promptResult = await promptPromise;
// promptResult: { type: 'prompt', message: '...', action: 'accept', promptText: '我的输入文本' }

// 预期结果: 对话框自动处理，返回完整信息
```

## 📊 预期测试结果

### 成功状态

```
============================================================
✅ Phase 2.2测试完成！
============================================================

📊 测试总结:
  - hover_element: ✅ 支持UID和Selector
  - drag_element: ✅ 拖拽功能正常
  - fill_form: ✅ 批量填充成功
  - upload_file: ✅ 文件上传成功（如果提供文件）
  - handle_dialog: ✅ 对话框处理正常

🎉 5个高级交互工具测试通过！
```

### 失败排查

#### Element not found
- **原因**: popup页面未正确加载
- **解决**: 手动打开popup页面，刷新页面

#### No active page
- **原因**: PageManager中没有活动页面
- **解决**: 
  1. 打开一个标签页
  2. 导航到popup页面
  3. 使用 `switch_tab` 切换到该页面

#### Dialog handling timeout
- **原因**: 对话框未在超时时间内触发
- **解决**:
  1. 确保 `handle_dialog` 在触发前调用
  2. 增加timeout时间
  3. 检查对话框按钮是否正确

## 🔧 调试技巧

### 1. 查看当前页面

```javascript
const tabsResult = await server.handleListTabs({});
console.log(tabsResult.content[0].text);
```

### 2. 切换到popup页面

```javascript
// 查找popup标签页ID
const tabs = JSON.parse(tabsResult.content[0].text).tabs;
const popupTab = tabs.find(t => t.url.includes('popup.html'));

// 切换
await server.handleSwitchTab({ tabId: popupTab.id });
```

### 3. 生成快照查看元素

```javascript
const snapshot = await server.handleTakeSnapshot({});
console.log(snapshot.content[0].text);
// 查看所有可用UID和元素信息
```

### 4. 手动验证元素

```javascript
// 检查元素是否存在
await server.handleEvaluate({
  expression: 'document.querySelector("#hoverTarget") !== null'
});
```

## 📝 注意事项

1. **对话框处理顺序**:
   - 必须先调用 `handle_dialog` 注册处理器
   - 然后触发对话框操作
   - 最后等待Promise完成

2. **文件上传路径**:
   - 使用绝对路径
   - 确保文件存在且有读取权限
   - Windows路径使用正斜杠 `/` 或双反斜杠 `\\\\`

3. **拖拽测试**:
   - 确保元素可见且可拖拽
   - 调整delay参数观察效果
   - 检查drop事件是否正确绑定

4. **批量填充**:
   - 检查failedFields了解失败原因
   - 确保字段类型设置正确
   - 使用clear选项避免值叠加

## 🚀 下一步

Phase 2.2测试完成后，继续进入：

### Phase 2.3: Smart Wait Mechanism
- 智能等待机制
- Locator API集成
- 多策略等待
- 扩展专用等待

---

**测试指南版本**: v1.0  
**更新日期**: 2025-01-10

