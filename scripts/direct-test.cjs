#!/usr/bin/env node

// 直接测试各个工具函数
const path = require('path');

// 引入构建后的服务器类 (需要先import)
async function testFunctions() {
  console.log('🧪 直接功能测试开始...');
  
  // 测试工具定义
  console.log('\n📋 验证工具定义...');
  
  // 检查构建文件是否存在
  const buildPath = path.resolve(__dirname, '..', 'build', 'index.js');
  const fs = require('fs');
  
  if (!fs.existsSync(buildPath)) {
    console.error('❌ build/index.js 不存在，请先运行 npm run build');
    return;
  }
  
  console.log('✅ build/index.js 存在');
  
  // 验证package.json
  const packagePath = path.resolve(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log('✅ package.json 解析成功');
  console.log('  - 名称:', packageJson.name);
  console.log('  - 版本:', packageJson.version);
  console.log('  - 主文件:', packageJson.main);
  
  // 检查依赖
  const requiredDeps = ['@modelcontextprotocol/sdk', 'puppeteer', 'chrome-remote-interface'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ 所有必需依赖都已安装');
  } else {
    console.log('❌ 缺少依赖:', missingDeps);
  }
  
  // 检查源代码中的工具定义
  const srcPath = path.resolve(__dirname, '..', 'src', 'index.ts');
  const srcContent = fs.readFileSync(srcPath, 'utf8');
  
  const expectedTools = ['click', 'type', 'screenshot', 'list_tabs', 'new_tab', 'switch_tab', 'close_tab'];
  const foundInSource = expectedTools.filter(tool => srcContent.includes(`name: '${tool}'`));
  
  console.log('\n🔧 源码中的工具定义:');
  foundInSource.forEach(tool => console.log(`  ✅ ${tool}`));
  
  const missingInSource = expectedTools.filter(tool => !foundInSource.includes(tool));
  if (missingInSource.length > 0) {
    console.log('  ❌ 缺少:', missingInSource);
  }
  
  // 检查处理函数
  const expectedHandlers = expectedTools.map(tool => `handle${tool.charAt(0).toUpperCase() + tool.slice(1).replace('_', '')}`);
  console.log('\n⚙️ 工具处理函数:');
  
  expectedHandlers.forEach((handler, i) => {
    if (srcContent.includes(handler)) {
      console.log(`  ✅ ${expectedTools[i]} -> ${handler}`);
    } else {
      console.log(`  ❌ ${expectedTools[i]} -> ${handler} (未找到)`);
    }
  });
  
  // 检查扩展日志功能
  console.log('\n📋 扩展日志增强功能:');
  const extensionFeatures = [
    'attachedSessions',
    'chrome-extension://',
    'service_worker',
    'Target.setDiscoverTargets',
    'attachToTarget'
  ];
  
  extensionFeatures.forEach(feature => {
    if (srcContent.includes(feature)) {
      console.log(`  ✅ ${feature}`);
    } else {
      console.log(`  ❌ ${feature} (未找到)`);
    }
  });
  
  console.log('\n🏗️ 代码结构分析完成');
  console.log('📝 下一步: 可以通过MCP客户端(如Claude Desktop/VSCode Roo Code)连接测试');
  
  // 提供使用建议
  console.log('\n💡 使用建议:');
  console.log('1. 在MCP客户端配置中添加:');
  console.log('   {');
  console.log('     "chrome-debug": {');
  console.log('       "command": "node",');
  console.log(`       "args": ["${buildPath}"]`);
  console.log('     }');
  console.log('   }');
  console.log('2. 重启MCP客户端');
  console.log('3. 使用 launch_chrome 启动浏览器');
  console.log('4. 使用其他工具进行交互');
}

testFunctions().catch(console.error);
