#!/usr/bin/env node
// 在已存在的 9223 Chrome 上，打开 hls.html 并执行交互：点击/键盘/滚动，收集控制台日志
const puppeteer = require('puppeteer');

(async () => {
  const browserURL = 'http://localhost:9223';
  const targetUrl = 'http://localhost:8081/hls.html';
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });

  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(targetUrl, { waitUntil: ['load', 'domcontentloaded'] });

  // 1) 点击 video 或播放按钮
  const hasVideo = await page.$('video');
  if (hasVideo) {
    await page.click('video');
  } else if (await page.$('button')) {
    await page.click('button');
  }

  // 2) 键盘交互（空格/方向键）
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');

  // 3) 滚动
  await page.evaluate(() => window.scrollBy(0, 400));

  // 4) 等待扩展日志出现
  await new Promise(r => setTimeout(r, 3000));

  // 5) 汇总
  const info = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    hasVideo: !!document.querySelector('video'),
    readyState: document.querySelector('video')?.readyState || 0
  }));

  const extLogs = logs.filter(l => /chrome-extension|content_script|Content Script|Service Worker/i.test(l));
  const pageLogs = logs.filter(l => !extLogs.includes(l));

  console.log('页面信息:', info);
  console.log('日志统计: total=', logs.length, ' ext=', extLogs.length, ' page=', pageLogs.length);
  if (extLogs.length) {
    console.log('扩展相关日志示例:\n' + extLogs.slice(0, 5).map(s => '  ' + s).join('\n'));
  }

  await page.screenshot({ path: '/tmp/hls-after-actions.png', fullPage: true });
  console.log('📸 截图保存 /tmp/hls-after-actions.png');

  await page.close();
  process.exit(0);
})().catch(err => { console.error('失败:', err); process.exit(1); });
