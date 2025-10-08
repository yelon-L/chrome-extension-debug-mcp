#!/usr/bin/env node
// 连接到已启动的 Chrome (remote debugging port 9223) 并测试 hls 页面与扩展日志

const puppeteer = require('puppeteer');

(async () => {
  const browserURL = 'http://localhost:9223';
  const targetUrl = 'http://localhost:8081/hls.html';

  console.log('👉 Connecting to existing Chrome at', browserURL);
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });

  // 打印现有目标
  const targets = await browser.targets();
  console.log('当前目标数量:', targets.length);

  // 新建页面并收集日志
  const page = await browser.newPage();
  const pageLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    pageLogs.push(text);
    // 简短打印
    if (/Content Script|chrome-extension|content|extension/i.test(text)) {
      console.log('[console]', text);
    }
  });

  // 导航
  console.log('🌐 Navigating to', targetUrl);
  await page.goto(targetUrl, { waitUntil: ['load', 'domcontentloaded'] });

  // 基本检查
  const info = await page.evaluate(() => {
    const video = document.querySelector('video');
    const hasHlsLib = !!(window.Hls);
    const hasMediaSource = !!(window.MediaSource);
    const title = document.title;
    return { title, hasVideo: !!video, hasHlsLib, hasMediaSource, url: location.href };
  });
  console.log('页面信息:', info);

  // 截图
  const path = '/tmp/hls-test.png';
  await page.screenshot({ path, fullPage: true });
  console.log('📸 已保存截图:', path);

  // 等待几秒收集扩展日志
  console.log('⏳ 等待扩展/Content Script日志...');
  await new Promise(r => setTimeout(r, 3000));

  // 汇总日志统计
  const extLogs = pageLogs.filter(l => /chrome-extension|Content Script|content_script/i.test(l));
  console.log('日志统计: 总数=', pageLogs.length, ' 扩展相关=', extLogs.length);
  if (extLogs.length) {
    console.log('扩展相关日志示例:');
    console.log(extLogs.slice(0, 5).map(s => '  ' + s).join('\n'));
  } else {
    console.log('未捕获到明显的 Content Script 日志（可能扩展未匹配该页面或日志输出较少）');
  }

  // 关闭测试页但保留浏览器（因是外部启动）
  await page.close();

  console.log('✅ 测试完成');
  process.exit(0);
})().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
