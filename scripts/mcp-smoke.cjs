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

async function readOneMessage(stream) {
  // Read headers
  let header = '';
  while (true) {
    const chunk = await new Promise((resolve) => stream.once('data', resolve));
    header += chunk.toString('utf8');
    const sep = header.indexOf('\r\n\r\n');
    if (sep !== -1) {
      const headerPart = header.slice(0, sep);
      const match = /Content-Length:\s*(\d+)/i.exec(headerPart);
      if (!match) throw new Error('No Content-Length');
      const length = parseInt(match[1], 10);
      const leftover = header.slice(sep + 4);
      let bodyBuf = Buffer.from(leftover, 'utf8');
      while (bodyBuf.length < length) {
        const more = await new Promise((resolve) => stream.once('data', resolve));
        bodyBuf = Buffer.concat([bodyBuf, more]);
      }
      const body = bodyBuf.slice(0, length).toString('utf8');
      return JSON.parse(body);
    }
  }
}

async function run() {
  const serverPath = path.resolve(__dirname, '..', 'build', 'index.js');
  if (!fs.existsSync(serverPath)) {
    console.error('build/index.js not found. Run `npm run build` first.');
    process.exit(1);
  }
  const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stderr.on('data', (d) => process.stderr.write(d));

  let id = 1;
  function send(method, params = {}) {
    const msg = { jsonrpc: '2.0', id: id++, method, params };
    const framed = encode(msg);
    child.stdin.write(framed);
    return msg.id;
  }

  function callTool(name, args) {
    return send('tools/call', { name, arguments: args });
  }

  // tools/list
  send('tools/list');
  console.log('>> tools/list');
  console.log('<<', await readOneMessage(child.stdout));

  const testHtml = 'file://' + path.resolve(__dirname, '..', 'test', 'test.html');
  callTool('launch_chrome', { url: testHtml });
  console.log('>> launch_chrome', testHtml);
  console.log('<<', await readOneMessage(child.stdout));

  callTool('list_tabs', {});
  console.log('>> list_tabs');
  console.log('<<', await readOneMessage(child.stdout));

  const dataUrl = 'data:text/html,' + encodeURIComponent('<input id="t"/><button id="b">B</button>');
  callTool('new_tab', { url: dataUrl });
  console.log('>> new_tab');
  console.log('<<', await readOneMessage(child.stdout));

  callTool('click', { selector: '#t' });
  console.log('>> click #t');
  console.log('<<', await readOneMessage(child.stdout));

  callTool('type', { selector: '#t', text: 'hello', clear: true });
  console.log('>> type');
  console.log('<<', await readOneMessage(child.stdout));

  callTool('screenshot', { returnBase64: true });
  console.log('>> screenshot base64');
  console.log('<<', await readOneMessage(child.stdout));

  callTool('get_console_logs', { clear: true });
  console.log('>> get_console_logs');
  console.log('<<', await readOneMessage(child.stdout));

  child.kill('SIGINT');
}

run().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});
