const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ContentContract = require('../features/content-generation/contract.js');

function harness() {
  const source = fs.readFileSync(require.resolve('../popup.js'), 'utf8');
  const element = () => ({ textContent: '', dataset: {}, disabled: false, classList: { add() {}, remove() {} } });
  const elements = Object.fromEntries(['shortsText', 'blogText', 'threadText', 'resultSection', 'loadingSection', 'generateBtn'].map(key => [key, element()]));
  const copies = [element(), element()];
  const calls = [];
  let article;
  const context = vm.createContext({ elements, ContentContract,
    document: { querySelectorAll: () => copies },
    BlogImages: { suspend() { article = undefined; }, getArticleText: () => article, async setArticle(text) { calls.push(text); article = text; } },
    displayResults(data) { ContentContract.validate(data); elements.blogText.textContent = data.blog_post; },
    showStatus() {}
  });
  vm.runInContext(source.slice(source.indexOf('let appliedGenerationId'), source.indexOf('// API 키 확인')), context);
  vm.runInContext(source.slice(source.indexOf('function showLoading()'), source.indexOf('function showStatus(')), context);
  const apply = state => { context.state = state; return vm.runInContext('applyGenerationState(state)', context); };
  return { apply, elements, copies, calls };
}

test('글 생성 중에는 블로그·스레드 모두 생성 중으로 표시하고 복사를 잠근다', async () => {
  const h = harness();
  await h.apply({ id: 'job', status: 'generating' });
  assert.equal(h.elements.blogText.textContent, '블로그 글 생성 중…');
  assert.equal(h.elements.threadText.textContent, '스레드 글 생성 중…');
  assert.ok(h.copies.every(button => button.disabled));
  assert.deepEqual(h.calls, []);
});

test('완성 응답의 중복 알림으로 이미지 생성을 반복하지 않는다', async () => {
  const h = harness();
  const state = { id: 'job', status: 'completed', data: { shorts_script: '대본', blog_post: '블로그 본문', thread_post: '스레드 본문' } };
  await h.apply(state);
  await h.apply(state);
  assert.deepEqual(h.calls, ['블로그 본문']);
});

test('실제 오류를 표시하고 오류 문구를 이미지 생성에 넘기지 않는다', async () => {
  const h = harness();
  await h.apply({ id: 'job', status: 'error', error: '응답이 중단되었습니다.' });
  assert.equal(h.elements.threadText.textContent, '응답이 중단되었습니다.');
  await assert.rejects(h.apply({ id: 'invalid', status: 'completed', data: { blog_post: '생성 실패' } }), /완성/);
  assert.deepEqual(h.calls, []);
});
