#!/usr/bin/env node
// 调试真实的 Chrome tab ID

const CDP = require('chrome-remote-interface');

(async () => {
  try {
    const client = await CDP({ host: 'localhost', port: 9223 });
    const { Target } = client;
    
    console.log('🔍 查询所有 Chrome 目标:');
    const result = await Target.getTargets();
    
    console.log('\n所有目标信息:');
    result.targetInfos.forEach((target, index) => {
      console.log(`${index + 1}. Type: ${target.type}`);
      console.log(`   Target ID: ${target.targetId}`);
      console.log(`   URL: ${target.url}`);
      if (target.title) console.log(`   Title: ${target.title}`);
      console.log('');
    });
    
    // 找出页面类型的目标
    const pageTargets = result.targetInfos.filter(t => t.type === 'page');
    console.log(`📄 页面类型目标数量: ${pageTargets.length}`);
    pageTargets.forEach((target, index) => {
      console.log(`页面 ${index + 1}:`);
      console.log(`  Target ID: ${target.targetId}`);
      console.log(`  URL: ${target.url.substring(0, 80)}...`);
      console.log(`  Title: ${target.title || 'No title'}`);
      console.log('');
    });
    
    client.close();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }
})();
