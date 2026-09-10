const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('실제 생성 응답 경로에도 스레드 형식 보정이 적용된다', async () => {
  const root = path.resolve(__dirname, '..');
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    chrome: { runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } } },
    fetch: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ shorts_script: '숏츠 본문', blog_post: '블로그 본문', thread_post: '숫자도 없고 아주 긴 제목을 잘못 생성했습니다\n짧은 본문입니다.' }) }] } }] }) })
  };
  const context = vm.createContext(sandbox);
  sandbox.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context));
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const data = await vm.runInContext('generateContentWithGemini("test-only", "테스트 원문")', context);
  const [title, body] = data.thread_post.split('\n\n');
  assert.match(title, /[0-9]/);
  assert.ok(Array.from(title).length <= 18);
  assert.ok(body.includes('짧은 본문'));
  assert.equal(data.blog_post, '블로그 본문');
  assert.equal(data.shorts_script, '숏츠 본문');
  const prompt = vm.runInContext('createPrompt("테스트")', context);
  assert.ok(prompt.includes('18자를 넘기지'));
  assert.ok(prompt.includes('\\n\\n'));
});

test('불완전 응답을 한번 재시도하고 분리된 텍스트 응답을 합친다', async () => {
  const root = path.resolve(__dirname, '..');
  let calls = 0;
  const context = vm.createContext({ console: { log() {}, error() {} }, chrome: { runtime: {
    onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }
  } }, fetch: async (_url, options) => {
    calls++;
    const config = JSON.parse(options.body).generationConfig;
    assert.equal(config.responseSchema.required.length, 3);
    const result = calls === 1 ? '{"shorts_script":"대본"}' : JSON.stringify({ shorts_script: '대본', blog_post: '완성된 블로그 본문', thread_post: '1분 안에 읽는 핵심 이야기\n\n본문입니다.' });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: '내부 추론' }, { text: result.slice(0, 10) }, { text: result.slice(10) }] } }] }) };
  } });
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context));
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const data = await vm.runInContext('generateContentWithGemini("test-only", "원문")', context);
  assert.equal(calls, 2);
  assert.equal(data.blog_post, '완성된 블로그 본문');
});

test('팝업을 닫아도 진행 상태와 완료 본문을 저장한다', async () => {
  const root = path.resolve(__dirname, '..');
  let listener, release;
  const stored = {}, statuses = [];
  const gate = new Promise(resolve => { release = resolve; });
  const context = vm.createContext({ console: { log() {}, error() {} }, crypto: { randomUUID: () => 'test-job' }, chrome: {
    storage: { local: { get: async () => stored, set: async data => { Object.assign(stored, data); if (data.contentGenerationState) statuses.push(data.contentGenerationState.status); } } },
    runtime: { onMessage: { addListener(fn) { listener = fn; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } }
  }, fetch: async () => {
    await gate;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ shorts_script: '대본', blog_post: '블로그 본문', thread_post: '1분 안에 읽는 핵심 이야기\n\n본문입니다.' }) }] } }] }) };
  } });
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context));
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const response = new Promise(resolve => listener({ action: 'generateContent', apiKey: 'test-only', selectedText: '원문' }, {}, resolve));
  await Promise.resolve();
  assert.equal(stored.contentGenerationState.status, 'generating');
  assert.equal(stored.lastGeneratedContent, undefined);
  release();
  assert.equal((await response).success, true);
  assert.deepEqual(statuses, ['generating', 'completed']);
  assert.equal(stored.lastGeneratedContent.blog_post, '블로그 본문');
});

test('누락되거나 실패 문구인 응답을 성공한 콘텐츠로 받지 않는다', () => {
  const root = path.resolve(__dirname, '..');
  const context = vm.createContext({ console, chrome: { runtime: {
    onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }
  } } });
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context));
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  for (const value of [{ shorts_script: '대본' }, { shorts_script: '대본', blog_post: '생성 실패', thread_post: '생성 실패' }]) {
    context.input = JSON.stringify(value);
    assert.throws(() => vm.runInContext('parseGeneratedContent(input)', context), /완성/);
  }
});
