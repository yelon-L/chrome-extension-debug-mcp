/**
 * 检查Chrome 9222端口上的扩展
 */

const CDP = require('chrome-remote-interface');

async function checkChrome() {
  let client;
  
  try {
    console.log('连接到Chrome (端口9222)...\n');
    
    client = await CDP({ port: 9222 });
    const { Target } = client;
    
    // 获取所有targets
    const { targetInfos } = await Target.getTargets();
    
    console.log('=== 所有Targets ===');
    targetInfos.forEach((target, i) => {
      console.log(`\n[${i}] ${target.type}`);
      console.log(`  Title: ${target.title}`);
      console.log(`  URL: ${target.url}`);
      if (target.type === 'service_worker' || target.type === 'background_page') {
        const extensionId = target.url.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
        if (extensionId) {
          console.log(`  Extension ID: ${extensionId}`);
        }
      }
    });
    
    // 查找所有扩展
    console.log('\n\n=== 扩展列表 ===');
    const extensions = targetInfos.filter(t => 
      t.type === 'service_worker' || 
      t.type === 'background_page' ||
      (t.url && t.url.startsWith('chrome-extension://'))
    );
    
    if (extensions.length === 0) {
      console.log('❌ 未找到任何扩展');
      console.log('\n请在Chrome中加载扩展:');
      console.log('1. 打开 chrome://extensions');
      console.log('2. 启用"开发者模式"');
      console.log('3. 点击"加载已解压的扩展程序"');
      console.log('4. 选择: E:\\developer\\workspace\\me\\chrome-extension-debug-mcp\\enhanced-test-extension');
    } else {
      console.log(`找到 ${extensions.length} 个扩展:\n`);
      extensions.forEach((ext, i) => {
        const extensionId = ext.url.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
        console.log(`${i + 1}. ${ext.title || '(无标题)'}`);
        console.log(`   ID: ${extensionId}`);
        console.log(`   Type: ${ext.type}`);
        console.log(`   URL: ${ext.url}\n`);
      });
    }
    
  } catch (error) {
    console.error('连接失败:', error.message);
    console.log('\n请确保:');
    console.log('1. Chrome正在运行');
    console.log('2. Chrome启动时带参数: --remote-debugging-port=9222');
    console.log('3. 命令示例: chrome.exe --remote-debugging-port=9222');
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkChrome();

