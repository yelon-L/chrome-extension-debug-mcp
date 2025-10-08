#!/usr/bin/env node
// 连接到 9223 调试端口，收集所有 target 的 Console 日志（包含扩展/Service Worker/内容脚本）

const CDP = require('chrome-remote-interface');

(async () => {
  const client = await CDP({ host: 'localhost', port: 9223 });
  const { Target } = client;

  // 记录已附着的 session，避免重复
  const attached = new Set();

  // 统一的日志输出
  function logEntry(label, type, text) {
    const line = `[${label}][${type}] ${text}`;
    console.log(line);
  }

  async function attach(sessionId, label) {
    if (attached.has(sessionId)) return;
    attached.add(sessionId);
    try {
      await client.send('Runtime.enable', {}, sessionId);
      await client.send('Console.enable', {}, sessionId);

      client.on('event', (msg) => {
        if (msg.sessionId !== sessionId) return;
        if (msg.method === 'Runtime.consoleAPICalled') {
          const p = msg.params;
          const text = (p.args || []).map(a => a.value ?? a.description ?? '').join(' ');
          const type = p.type || 'log';
          logEntry(label, type, text);
        }
      });
    } catch (e) {
      console.error('附着失败:', label, e.message);
    }
  }

  // 发现并附着所有目标
  await Target.setDiscoverTargets({ discover: true });

  // 处理已存在目标
  const { targetInfos } = await Target.getTargets();
  for (const info of targetInfos) {
    try {
      const { targetId, type, url } = info;
      const { sessionId } = await Target.attachToTarget({ targetId, flatten: true });
      const label = url?.startsWith('chrome-extension://') ? 'extension' : (type || 'page');
      await attach(sessionId, label);
    } catch {}
  }

  // 监听新目标
  Target.targetCreated(async ({ targetInfo }) => {
    try {
      const { targetId, type, url } = targetInfo;
      const { sessionId } = await Target.attachToTarget({ targetId, flatten: true });
      const label = url?.startsWith('chrome-extension://') ? 'extension' : (type || 'page');
      await attach(sessionId, label);
    } catch {}
  });

  console.log('✅ 已连接到9223，开始汇总所有Console日志（按 Ctrl+C 结束）');

  // 保持进程常驻
})();
