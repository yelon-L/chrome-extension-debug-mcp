#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function encode(message) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([
    Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, 'utf8'),
    payload,
  ]);
}

function decode(buffer) {
  const text = buffer.toString('utf8');
  const parts = text.split('\r\n\r\n');
  const header = parts[0];
  const body = parts.slice(1).join('\r\n\r\n');
  return JSON.parse(body);
}

async function run() {
  const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
  if (!fs.existsSync(serverPath)) {
    console.error('build/index.js not found. Run `npm run build` first.');
    process.exit(1);
  }
  const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  let buffer = Buffer.alloc(0);
  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    // Try to parse if we have a full message
    const text = buffer.toString('utf8');
    const sepIndex = text.indexOf('\r\n\r\n');
    if (sepIndex !== -1) {
      const header = text.slice(0, sepIndex);
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (match) {
        const length = parseInt(match[1], 10);
        const start = sepIndex + 4;
        if (buffer.length >= start + length) {
          const body = buffer.slice(start, start + length);
          buffer = buffer.slice(start + length);
          try {
            const msg = JSON.parse(body.toString('utf8'));
            console.log('<<', JSON.stringify(msg));
          } catch (e) {
            console.error('Failed to parse response', e);
          }
        }
      }
    }
  });

  child.stderr.on('data', (d) => process.stderr.write(d));

  let id = 1;
  function send(method, params = {}) {
    const msg = { jsonrpc: '2.0', id: id++, method, params };
    const framed = encode(msg);
    child.stdin.write(framed);
    console.log('>>', JSON.stringify(msg));
  }

  // 1) tools/list
  send('tools/list');

  // Small helper to wait
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 2) launch_chrome
  const testHtml = 'file://' + path.resolve(__dirname, '..', 'test', 'test.html');
  await wait(500);
  send('tools/call', { name: 'launch_chrome', arguments: { url: testHtml } });

  // 3) list_tabs
  await wait(1500);
  send('tools/call', { name: 'list_tabs', arguments: {} });

  // 4) new_tab to a simple data URL with an input
  await wait(500);
  const dataUrl = 'data:text/html,' + encodeURIComponent('<input id="t"/><button id="b">B</button>');
  send('tools/call', { name: 'new_tab', arguments: { url: dataUrl } });

  // 5) click and type on the new tab
  await wait(1500);
  send('tools/call', { name: 'click', arguments: { selector: '#t' } });
  await wait(300);
  send('tools/call', { name: 'type', arguments: { selector: '#t', text: 'hello', clear: true } });

  // 6) screenshot base64
  await wait(500);
  send('tools/call', { name: 'screenshot', arguments: { returnBase64: true, fullPage: false } });

  // 7) get console logs
  await wait(500);
  send('tools/call', { name: 'get_console_logs', arguments: { clear: true } });

  // Exit after a short while
  setTimeout(() => {
    child.kill('SIGINT');
    process.exit(0);
  }, 5000);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
