const { test } = require('node:test');
const assert = require('node:assert/strict');
const thread = require('../features/thread-post/format.js');

test('첫 줄 숫자, 최대 18자, 빈 줄 하나를 보장한다', () => {
  for (const input of [
    '하루를 바꾸는 작은 습관 3가지\n오늘 할 일부터 정해보세요.',
    '정말 아주 길고 길어서 제한을 초과하는 제목입니다\n\n짧은 본문입니다.',
    '**집중력을 높이는 3가지**\n\n\n한 가지 일부터 해보세요.',
    '☀️ 오늘 바꿀 3가지 습관\n\n작게 시작해요.'
  ]) {
    const result = thread.format(input);
    const [headline, body] = result.split('\n\n');
    assert.match(headline, /[0-9]/);
    assert.ok(Array.from(headline).length <= 18);
    assert.ok(body.length > 0);
    assert.ok(!result.includes('\n\n\n'));
  }
});
test('조건에 맞는 제목을 보존하고 본문은 180자 이내로 정리한다', () => {
  const output = thread.format('오늘 바꿀 3가지 습관\n\n' + '작게 시작해 보세요. '.repeat(30));
  assert.ok(output.startsWith('오늘 바꿀 3가지 습관\n\n'));
  assert.ok(Array.from(output.split('\n\n')[1]).length <= 180);
});
test('본문이 없는 응답을 억지 게시글로 만들지 않는다', () => {
  assert.equal(thread.format(''), '');
  assert.equal(thread.format('생성 실패'), '생성 실패');
});
