/* 완료된 콘텐츠와 진행·오류 안내 문구를 구분한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ContentContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const fields = ['shorts_script', 'blog_post', 'thread_post'];
  const validText = value => typeof value === 'string' && Boolean(value.trim()) && !/^(?:생성\s*실패|생성\s*중|대기\s*중|undefined|null)[.!…\s]*$/i.test(value.trim());
  function validate(data) {
    if (!data || !fields.every(key => validText(data[key]))) throw new Error('글 응답이 완성되지 않았습니다. 콘텐츠 생성을 다시 시도해주세요.');
    return Object.fromEntries(fields.map(key => [key, data[key].trim()]));
  }
  function parse(text) {
    try {
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      return validate(JSON.parse(cleaned));
    } catch (_) { throw new Error('글 응답이 완성되지 않았습니다. 콘텐츠 생성을 다시 시도해주세요.'); }
  }
  return { validText, validate, parse };
});
