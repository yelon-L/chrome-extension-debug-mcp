/**
 * Response Builder 功能测试
 * 验证新的上下文自动附加功能
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testResponseBuilder() {
  console.log('🧪 Response Builder 功能测试\n');
  console.log('='.repeat(60));
  
  const server = new ChromeDebugServer();
  
  try {
    // 1. 启动服务器（stdio模式）
    console.log('\n📡 1. 启动服务器...');
    await server.run('stdio');
    await sleep(1000);
    console.log('✅ 服务器已启动');
    
    // 2. 连接到Chrome
    console.log('\n📡 2. 连接到Chrome (端口9222)...');
    const attachResult = await server.handleAttachToChrome({ port: 9222 });
    console.log('✅ 已连接到Chrome');
    console.log('   响应:', attachResult.content[0].text.substring(0, 100) + '...');
    
    // 3. 测试 list_extensions（使用Response Builder）
    console.log('\n📡 3. 测试 list_extensions（Response Builder模式）...');
    const extensionsResult = await server.handleListExtensions({});
    
    console.log('\n📋 Response Builder 响应结构:');
    console.log('-'.repeat(60));
    const responseText = extensionsResult.content[0].text;
    console.log(responseText);
    console.log('-'.repeat(60));
    
    // 4. 验证Response Builder特性
    console.log('\n🔍 验证Response Builder特性:');
    const hasTitle = responseText.includes('# list_extensions response');
    const hasExtensionList = responseText.includes('Found') && responseText.includes('extension');
    const hasPageContext = responseText.includes('## Current Page');
    const hasAvailableActions = responseText.includes('## Available Actions');
    
    console.log(`  ${hasTitle ? '✅' : '❌'} 包含工具名称标题`);
    console.log(`  ${hasExtensionList ? '✅' : '❌'} 包含扩展列表`);
    console.log(`  ${hasPageContext ? '✅' : '❌'} 包含当前页面上下文`);
    console.log(`  ${hasAvailableActions ? '✅' : '❌'} 包含可用操作建议`);
    
    // 5. 对比旧格式
    console.log('\n📊 Response Builder 改进对比:');
    console.log('  旧格式: 纯JSON dump');
    console.log('  新格式: 结构化Markdown + 上下文信息');
    console.log('  优势: AI能"看到"完整环境状态');
    
    const allPassed = hasTitle && hasExtensionList && hasPageContext && hasAvailableActions;
    
    if (allPassed) {
      console.log('\n✅ Response Builder 功能测试通过！');
    } else {
      console.log('\n⚠️  部分特性未完全实现');
    }
    
    // 6. 清理
    console.log('\n🧹 清理资源...');
    await server.cleanup();
    
    console.log('\n' + '='.repeat(60));
    console.log('测试完成！');
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    await server.cleanup();
    process.exit(1);
  }
}

testResponseBuilder().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});

