const { test } = require('node:test');
const assert = require('node:assert/strict');
const connection = require('../features/blog-images/naver-connection.js');

test('네이버 편집기에 수신기가 실제 연결된 뒤에만 복사 준비 성공', async () => {
  let injection;
  const result = await connection.prepare({ tabs: { query: async () => [{ id: 7 }] }, scripting: { executeScript: async options => { injection = options; return [{ result: { ready: true } }]; } } });
  assert.equal(result.success, true);
  assert.equal(injection.target.tabId, 7);
  assert.equal(injection.target.allFrames, true);
});

test('네이버 탭이 없거나 수신기가 없으면 성공이라고 표시하지 않는다', async () => {
  await assert.rejects(connection.prepare({ tabs: { query: async () => [] } }), /먼저 열어/);
  await assert.rejects(connection.prepare({ tabs: { query: async () => [{ id: 7 }] }, scripting: { executeScript: async () => [{ result: { ready: false } }] } }), /연결을 확인하지/);
  await assert.rejects(connection.prepare({ tabs: { query: async () => [{ id: 7 }] }, scripting: { executeScript: async () => { throw new Error('권한 없음'); } } }), /접근 권한/);
});
