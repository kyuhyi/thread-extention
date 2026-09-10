/* 스레드 첫 줄과 본문 사이의 간격을 생성·표시·복사 단계에서 보장한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThreadPost = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const length = text => Array.from(text).length;
  function shorten(text, max) {
    if (length(text) <= max) return text;
    const clipped = Array.from(text).slice(0, max - 1).join('');
    const sentence = clipped.match(/^[\s\S]*[.!?。](?=\s|$)/);
    if (sentence && sentence[0].length > max / 2) return sentence[0].trim();
    const lastSpace = clipped.lastIndexOf(' ');
    return (lastSpace > max / 2 ? clipped.slice(0, lastSpace) : clipped).trimEnd() + '…';
  }
  function format(value) {
    if (!value || value === '생성 실패') return value || '';
    const cleaned = String(value).replace(/\r\n?/g, '\n').replace(/\\n/g, '\n').replace(/\*\*/g, '').trim();
    const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
    const first = (lines.shift() || '').replace(/^#{1,6}\s+/, '');
    let headline = first;
    let body = lines.join('\n');
    if (!/[0-9]/.test(headline) || length(headline) > 18 || !body) {
      // 원문에 없는 통계나 항목 수를 만들지 않는 읽기 시간형 제목을 쓴다.
      headline = '1분 안에 읽는 핵심 이야기';
      body = [first, ...lines].join('\n');
    }
    body = shorten(body, 180);
    return `${headline}\n\n${body}`;
  }
  return { format };
});
