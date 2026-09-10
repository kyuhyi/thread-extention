const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const BlogDocument = require('../features/blog-images/document.js');

test('작은따옴표의 HTML 문자 코드를 해시태그로 감싸지 않는다', () => {
  const source = fs.readFileSync(require.resolve('../popup.js'), 'utf8');
  const context = vm.createContext({ BlogDocument });
  vm.runInContext(source.slice(source.indexOf('function formatTextToHTML('), source.indexOf('// 탭 전환', source.indexOf('function formatTextToHTML('))), context);
  const html = vm.runInContext(`formatTextToHTML("비법은 바로 '위탁판매'입니다. #스마트스토어")`, context);
  assert.ok(html.includes('&#39;위탁판매&#39;'));
  assert.equal((html.match(/class="hashtag"/g) || []).length, 1);
  assert.ok(!html.includes('>#39;'));
});

test('한 덩어리 대본을 문장과 호흡 단위로 나누고 원문은 보존한다', () => {
  const ShortsPost = require('../features/shorts-post/format.js');
  const text = "여러분, 스마트스토어 1년 만에 매출 달성, 어떻게 가능했을까요? 비법은 바로 '위탁판매'입니다. 제가 직접 경험한 시행착오를 통해 얻은 노하우를 지금부터 공개할게요. 위탁판매는 재고 부담 없이 상품을 판매할 수 있는 최고의 방법이에요. 지금 바로 제 채널을 구독하고 더 많은 정보를 얻어가세요!";
  const result = ShortsPost.format(text);
  assert.ok(result.split('\n\n').length >= 3);
  assert.ok(result.split('\n').filter(Boolean).every(line => Array.from(line).length <= 32));
  assert.equal(result.replace(/\s+/g, ' '), text);
  assert.equal(ShortsPost.format(result), result);
});

test('소수점과 URL을 자르지 않고 기존 문단과 따옴표를 보존한다', () => {
  const ShortsPost = require('../features/shorts-post/format.js');
  const text = '수수료는 3.5%입니다.\n\n주소는 https://example.com 입니다.\n"함께 시작해요!"';
  const result = ShortsPost.format(text);
  assert.ok(result.includes('3.5%'));
  assert.ok(result.includes('https://example.com'));
  assert.ok(result.includes('\n\n'));
  assert.ok(result.endsWith('"함께 시작해요!"'));
});

test('대본 표시와 복사는 같은 문단을 사용하고 HTML은 실행하지 않는다', async () => {
  const source = fs.readFileSync(require.resolve('../popup.js'), 'utf8');
  const ShortsPost = require('../features/shorts-post/format.js');
  const elements = Object.fromEntries(['shortsText', 'blogText', 'threadText', 'resultSection'].map(key => [key, { dataset: {}, classList: { remove() {} } }]));
  let copied;
  const context = vm.createContext({ elements, BlogDocument, ShortsPost,
    ThreadPost: require('../features/thread-post/format.js'),
    ContentContract: require('../features/content-generation/contract.js'),
    BlogImages: { getArticleText() {} }, document: { querySelectorAll: () => [] }, switchTab() {}, showStatus() {},
    navigator: { clipboard: { async writeText(text) { copied = text; } } }
  });
  vm.runInContext(source.slice(source.indexOf('function displayResults('), source.indexOf('// 탭 전환', source.indexOf('function displayResults('))), context);
  vm.runInContext(source.slice(source.indexOf('async function copyContent('), source.indexOf('// UI 헬퍼 함수')), context);
  context.data = { shorts_script: '비법은 &#39;위탁판매&#39;입니다. 직접 배운 내용을 알려드려요. 함께 시작해요! <img src=x onerror=alert(1)>', blog_post: '블로그 본문', thread_post: '1분 안에 읽는 핵심 이야기\n\n본문' };
  vm.runInContext('displayResults(data)', context);
  await vm.runInContext('copyContent("shorts")', context);
  assert.equal(copied, elements.shortsText.dataset.plainText);
  assert.ok(copied.includes("'위탁판매'"));
  assert.ok(copied.includes('\n\n'));
  assert.ok(!copied.includes('&#39;'));
  assert.ok(!elements.shortsText.innerHTML.includes('<img'));
  assert.ok(elements.shortsText.innerHTML.includes('&lt;img'));
});
