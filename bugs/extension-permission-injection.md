# Extension Permission and Content Script Injection Issues

## 问题描述

**问题标题**: Cannot access contents of the page. Extension manifest must request permission  
**发现日期**: 2025-10-08  
**严重程度**: Medium  
**影响范围**: inject_content_script工具

## 症状

在某些页面上进行内容脚本注入时收到权限错误：

```
[extension][error] [SW] Injection failed: Cannot access contents of the page. Extension manifest must request permission to access the respective host.
```

## 复现步骤

1. 尝试向特定URL注入内容脚本
2. 特别是data: URLs和某些协议的页面
3. 收到manifest权限错误

## 错误日志示例

```
[extension][log] [SW] Looking for tab with URL: data:text/html,<!DOCTYPE html>...
[extension][log] [SW] Expected title: Final Test
[extension][log] [SW] Found tabs by URL: 0
[extension][log] [SW] Total tabs: 19
[extension][log] [SW] Looking for title: Final Test
[extension][log] [SW] Found tabs by title: 0
[extension][log] [SW] Using most recent tab as fallback
[extension][log] [SW] Target tab ID: 1706476867
[extension][error] [SW] Injection failed: Cannot access contents of the page. Extension manifest must request permission to access the respective host.
```

## 技术分析

### 受影响的URL类型

1. **data: URLs**: `data:text/html,...` 协议
2. **file: URLs**: 本地文件协议  
3. **chrome: URLs**: Chrome内部页面
4. **chrome-extension: URLs**: 扩展页面
5. **某些HTTPS站点**: 需要特殊权限的站点

### 权限模型问题

1. **Manifest V3限制**: 更严格的权限模型
2. **Host权限**: 需要明确声明可访问的host
3. **动态权限**: 某些操作需要运行时权限申请
4. **特殊协议**: data:, file:等协议的特殊处理

## 影响范围

- ❌ `mcp0_inject_content_script` - 直接受影响
- ✅ `mcp0_evaluate` - 通常不受影响  
- ✅ `mcp0_screenshot` - 不受影响
- ❌ 扩展功能测试 - 测试覆盖度降低

## 变通方案

1. **权限检查**: 注入前检查是否有权限

```javascript
// 检查权限的变通方案
async function checkInjectionPermission(tabId) {
  try {
    // 尝试获取tab信息
    const tab = await chrome.tabs.get(tabId);
    
    // 检查协议
    if (tab.url.startsWith('data:') || 
        tab.url.startsWith('chrome:') ||
        tab.url.startsWith('chrome-extension:')) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

2. **降级策略**: 使用其他方式测试扩展功能

```javascript
// 使用evaluate替代content script注入
async function alternativeTest(tabId) {
  try {
    // 直接在页面上下文中执行
    return await mcp0_evaluate(`
      // 扩展测试代码
      window.extensionTest = function() {
        return {
          hasVideo: document.querySelectorAll('video').length > 0,
          pageReady: document.readyState === 'complete'
        };
      };
      window.extensionTest();
    `);
  } catch (error) {
    return { error: error.message };
  }
}
```

3. **测试页面选择**: 优先选择有权限的页面进行测试

## 建议修复方向

1. **权限预检**: 在注入前检查manifest权限
2. **错误处理改进**: 区分权限错误和其他错误
3. **权限提示**: 提供明确的权限要求说明
4. **测试套件**: 包含各种协议的测试用例
5. **文档完善**: 说明不同URL类型的限制

## 测试矩阵

| URL类型 | 注入支持 | 建议用途 |
|---------|----------|----------|
| https:// | ✅ | 主要测试 |
| http:// | ✅ | 本地测试 |
| data: | ❌ | 避免使用 |
| file: | ❌ | 避免使用 |
| chrome: | ❌ | 不支持 |

## 解决优先级

- **High**: 改进错误提示和文档
- **Medium**: 添加权限预检机制  
- **Low**: 支持更多协议类型
