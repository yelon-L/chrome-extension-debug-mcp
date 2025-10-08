#!/usr/bin/env node
// 列出 9223 调试实例中的扩展与相关 targets
const CDP = require('chrome-remote-interface');

(async () => {
  const client = await CDP({ host: 'localhost', port: 9223 });
  const { Target } = client;
  const { targetInfos } = await Target.getTargets();

  const rows = targetInfos.map(t => ({ id: t.targetId, type: t.type, url: t.url }));
  const ext = rows.filter(r => (r.url || '').startsWith('chrome-extension://'));
  const sw = rows.filter(r => r.type === 'service_worker');

  console.log('总目标数:', rows.length);
  console.log('扩展页面 targets:', ext.length);
  ext.slice(0, 20).forEach(r => console.log('  -', r.type, r.url));
  console.log('Service Worker targets:', sw.length);
  sw.slice(0, 20).forEach(r => console.log('  -', r.type, r.url));

  process.exit(0);
})().catch(err => {
  console.error('失败:', err.message);
  process.exit(1);
});
