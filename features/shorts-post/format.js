/* 숏츠 대본의 문단과 호흡 단위 줄바꿈을 생성·표시·복사에 동일하게 적용한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShortsPost = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function plain(value) {
    return String(value || '').replace(/\r\n?/g, '\n').replace(/\\n/g, '\n')
      .replace(/&(?:#0*39|#x0*27|apos);/gi, "'")
      .replace(/&(?:#0*34|#x0*22|quot);/gi, '"').trim();
  }

  function wrap(line) {
    const lines = [];
    let current = '';
    for (const word of line.trim().split(/[ \t]+/)) {
      const next = current ? `${current} ${word}` : word;
      // 긴 URL이나 단어 자체는 쪼개지 않는다.
      if (current && Array.from(next).length > 32) { lines.push(current); current = word; }
      else current = next;
    }
    if (current) lines.push(current);
    return lines.join('\n');
  }

  function format(value) {
    const text = plain(value);
    if (!text || text === '생성 실패') return text;
    let paragraphs = text.split(/\n\s*\n/);
    if (paragraphs.length === 1) {
      const sentences = text.replace(/([.!?。！？][”’"')\]]*)\s+(?=\S)/g, '$1\n\n').split('\n\n');
      if (sentences.length > 2) {
        // 첫 후킹 문장과 마지막 마무리 문장은 각각 별도 문단으로 둔다.
        paragraphs = [sentences[0]];
        for (let i = 1; i < sentences.length - 1; i += 2) paragraphs.push(sentences.slice(i, Math.min(i + 2, sentences.length - 1)).join('\n'));
        paragraphs.push(sentences[sentences.length - 1]);
      } else paragraphs = sentences;
    }
    return paragraphs.map(paragraph => paragraph
      .replace(/([.!?。！？][”’"')\]]*)[ \t]+(?=\S)/g, '$1\n')
      .split('\n').map(wrap).filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
  }
  return { format, plain };
});
