#!/usr/bin/env node
// 使用 Puppeteer 启动“有头”Chrome，加载 test-extension，并打开一个测试页
// - 在 Xvfb 下运行：  xvfb-run -a node scripts/xvfb-launch-test.cjs
// - 在有显示环境下：  DISPLAY=:0 node scripts/xvfb-launch-test.cjs  （或直接 node ... 如果默认 DISPLAY 正确）

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const extPath = path.resolve(__dirname, '..', 'test-extension');
  const userDataDir = '/tmp/chrome-mcp-xvfb-profile';
  const outDir = '/tmp';
  const shotPath = path.join(outDir, 'xvfb-launch-shot.png');

  console.log('Extension path:', extPath);

  // 使用“有头”模式（headless: false），以便加载扩展
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--load-extension=${extPath}`,
      `--disable-extensions-except=${extPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: null,
    userDataDir
  });

  const page = await browser.newPage();

  // 使用一个自包含的 data URL 测试页，避免依赖本地服务
  const html = `<!DOCTYPE html><html><head><title>MCP Xvfb Test</title></head>
  <body>
    <h1>MCP Xvfb Test</h1>
    <input id="i" placeholder="type here"/>
    <button id="b" onclick="document.getElementById('res').textContent='Clicked'">Click</button>
    <div id="res"></div>
    <script>console.log('[page] ready');</script>
  </body></html>`;
  const url = 'data:text/html,' + encodeURIComponent(html);

  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(url, { waitUntil: ['load', 'domcontentloaded'] });
  await page.click('#i');
  await page.type('#i', 'hello xvfb');
  await page.click('#b');

  // 等待扩展 Content Script（若匹配 data URL 则会注入；否则仅页面日志，不影响启动验证）
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: shotPath, fullPage: true });

  const stats = {
    title: await page.title(),
    url: page.url(),
    logCount: logs.length,
    hasClicked: await page.$eval('#res', el => el.textContent === 'Clicked').catch(() => false)
  };

  console.log('Stats:', stats);
  console.log('Screenshot:', shotPath);

  await browser.close();
  process.exit(0);
})().catch(err => { console.error('Failed:', err); process.exit(1); });
