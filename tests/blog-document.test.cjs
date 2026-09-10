const { test } = require('node:test');
const assert = require('node:assert/strict');
const blog = require('../features/blog-images/document.js');

const article = '# 혼자 일하는 하루\n\n아침에는 오늘 할 일을 정합니다.\n\n가장 중요한 일부터 시작합니다.\n\n점심에는 잠깐 산책합니다.\n\n오후에는 고객과 이야기합니다.\n\n저녁에는 오늘을 돌아봅니다.\n\n작은 성공을 기록합니다.\n\n#일상 #기록';

test('4/5장 모두 본문에 배치하고 제목과 해시태그 뒤는 피한다', () => {
  for (const count of [4, 5]) {
    const doc = blog.plan(article, count);
    assert.equal(doc.scenes.length, count);
    assert.equal(new Set(doc.scenes.map(s => s.after)).size, count);
    assert.ok(doc.scenes.every(s => s.after > 0 && s.after < doc.blocks.length - 1));
    assert.ok(doc.scenes.every(s => s.context.length > 0));
  }
});
test('짧은 글도 원문을 보존하고 요청한 장면 수를 만든다', () => {
  const doc = blog.plan('오늘은 산책했습니다.', 5);
  assert.equal(doc.scenes.length, 5);
  assert.equal(blog.plainText(doc), '오늘은 산책했습니다.');
});
test('원문의 HTML을 실행하지 않고 굵은 글씨와 제목을 표시한다', () => {
  const html = blog.render(blog.plan('# 제목\n\n**강조** <script>alert(1)</script>', 4));
  assert.ok(html.includes('<h1'));
  assert.ok(html.includes('<strong>강조</strong>'));
  assert.ok(!html.includes('<script>'));
});
test('이미지는 완성된 순서와 무관하게 문단 사이 순서로 복사한다', () => {
  const doc = blog.plan(article, 5);
  const images = [...doc.scenes].reverse().map(s => ({ index: s.index, src: 'data:image/png;base64,AAAA', caption: `장면 ${s.index}` }));
  const html = blog.render(doc, images);
  assert.equal((html.match(/<img /g) || []).length, 5);
  assert.ok(html.indexOf('장면 0') < html.indexOf('장면 4'));
  assert.ok(html.indexOf('<img ') < html.indexOf('저녁에는'));
  assert.ok(!html.includes('button'));
});
test('외부 및 스크립트 이미지 URL을 차단한다', () => {
  const doc = blog.plan(article, 4);
  for (const src of ['javascript:alert(1)', 'https://example.org/x.png', 'data:image/svg+xml,x']) {
    assert.ok(!blog.render(doc, [{ index: 0, src }]).includes('<img '));
  }
});
test('잘못된 장수와 비어 있는 본문은 거부한다', () => {
  assert.throws(() => blog.plan('', 5));
  assert.throws(() => blog.plan(article, 8));
});
test('네이버 5MB 제한보다 낮은 4MB에서 복사를 차단한다', () => {
  const doc = blog.plan(article, 5);
  const large = doc.scenes.map(s => ({ index: s.index, src: 'data:image/png;base64,' + 'A'.repeat(1200000) }));
  assert.throws(() => blog.clipboardDocument(doc, large), /붙여넣기 용량/);
  const compact = doc.scenes.map(s => ({ index: s.index, src: 'data:image/jpeg;base64,' + 'A'.repeat(130000) }));
  const result = blog.clipboardDocument(doc, compact);
  assert.ok(result.bytes < 1024 * 1024);
  assert.equal((result.html.match(/<img /g) || []).length, 5);
});
test('오류 문구로 이미지 장면을 만들지 않는다', () => {
  const doc = require('../features/blog-images/document.js');
  assert.throws(() => doc.plan('생성 실패', 5), /완성/);
});

test('네이버 본문은 명시적 왼쪽 정렬과 두 문장 이하의 문단으로 복사한다', () => {
  const text = '첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다. 다섯 번째 문장입니다.';
  const html = blog.clipboardDocument(blog.plan(text, 4), []).html;
  assert.ok(html.includes('text-align:left'));
  assert.ok((html.match(/<p /g) || []).length >= 3);
  assert.ok(html.includes('두 번째 문장입니다.</p>'));
  assert.ok(!html.includes('text-align:center'));
});
