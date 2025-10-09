#!/usr/bin/env node

/**
 * 调试扩展检测问题
 */

import CDP from 'chrome-remote-interface';

async function debugExtensionDetection() {
  console.log('🔍 调试扩展检测\n');
  
  try {
    const client = await CDP({ host: 'localhost', port: 9222 });
    
    // 1. 获取所有 targets
    console.log('📌 步骤 1: 获取所有 targets...');
    const { targetInfos } = await client.Target.getTargets();
    
    console.log(`✅ 找到 ${targetInfos.length} 个 targets\n`);
    
    // 2. 详细分析每个 target
    console.log('📊 Target 详细信息:\n');
    targetInfos.forEach((target, index) => {
      console.log(`Target ${index + 1}:`);
      console.log(`  ID: ${target.targetId}`);
      console.log(`  Type: ${target.type}`);
      console.log(`  URL: ${target.url}`);
      console.log(`  Title: ${target.title}`);
      console.log(`  Attached: ${target.attached}`);
      
      // 检查是否是扩展相关
      const isExtension = target.url.startsWith('chrome-extension://');
      const isServiceWorker = target.type === 'service_worker';
      const isBackgroundPage = target.type === 'background_page';
      
      console.log(`  是扩展URL: ${isExtension}`);
      console.log(`  是Service Worker: ${isServiceWorker}`);
      console.log(`  是Background Page: ${isBackgroundPage}`);
      console.log('');
    });
    
    // 3. 过滤扩展相关的 targets
    const extensionTargets = targetInfos.filter(target => 
      target.url.startsWith('chrome-extension://') ||
      target.type === 'service_worker' ||
      target.type === 'background_page'
    );
    
    console.log('='.repeat(80));
    console.log(`📊 扩展相关 targets: ${extensionTargets.length} 个\n`);
    
    if (extensionTargets.length > 0) {
      extensionTargets.forEach((target, index) => {
        console.log(`扩展 Target ${index + 1}:`);
        console.log(`  Type: ${target.type}`);
        console.log(`  URL: ${target.url}`);
        console.log(`  Title: ${target.title}`);
        console.log('');
      });
    } else {
      console.log('⚠️ 没有检测到扩展相关的 targets');
      console.log('\n可能原因:');
      console.log('1. Chrome 没有加载任何扩展');
      console.log('2. 扩展没有 background script 或 service worker');
      console.log('3. 需要使用 --load-extension 参数启动 Chrome');
    }
    
    // 4. 检查 chrome://extensions 页面
    console.log('\n='.repeat(80));
    console.log('📌 检查是否有 chrome://extensions 页面...\n');
    
    const extensionsPages = targetInfos.filter(target => 
      target.url.startsWith('chrome://extensions')
    );
    
    if (extensionsPages.length > 0) {
      console.log(`✅ 找到 ${extensionsPages.length} 个扩展管理页面`);
    } else {
      console.log('❌ 没有找到扩展管理页面');
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

debugExtensionDetection().catch(console.error);
