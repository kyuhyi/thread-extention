const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('Chrome 확장 폴더에 예약된 밑줄 파일·폴더가 없다', () => {
  const reserved = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const target = path.join(directory, entry.name);
      if (entry.name.startsWith('_')) reserved.push(path.relative(root, target));
      if (entry.isDirectory()) walk(target);
    }
  }
  walk(root);
  assert.deepEqual(reserved, []);
});

test('매니페스트와 팝업이 참조하는 로컬 리소스가 모두 존재한다', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const files = [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(script => script.js)];
  for (const html of ['popup.html', 'blog-editor.html']) {
    const content = fs.readFileSync(path.join(root, html), 'utf8');
    files.push(...[...content.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]));
  }
  assert.deepEqual(files.filter(file => !fs.existsSync(path.join(root, file))), []);
});
