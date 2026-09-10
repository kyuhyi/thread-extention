/* 문단 계획과 복사 문서를 브라우저·Node에서 함께 사용한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlogDocument = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = value => escape(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  function plan(text, count = 5) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('블로그 글을 먼저 생성해주세요.');
    if (/^(?:생성\s*실패|생성\s*중|대기\s*중|undefined|null)[.!…\s]*$/i.test(text.trim())) throw new Error('완성된 블로그 본문이 필요합니다. 글을 다시 생성해주세요.');
    if (![4, 5].includes(count)) throw new Error('이미지는 4장 또는 5장을 선택해주세요.');
    if (text.length > 30000) throw new Error('이미지 생성은 30,000자 이하의 글을 지원합니다.');
    const blocks = text.trim().replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(Boolean).map(value => {
      const heading = value.match(/^(#{1,3})\s+([^\n]+)$/);
      return { text: heading ? heading[2] : value, type: heading ? `h${heading[1].length}` : 'p', tags: /^(?:#[^\s#]+\s*)+$/.test(value.trim()) };
    });
    let candidates = blocks.map((block, index) => ({ ...block, index })).filter(b => b.type === 'p' && !b.tags);
    if (!candidates.length) candidates = blocks.map((block, index) => ({ ...block, index }));
    const scenes = [];
    let previous = 0;
    for (let index = 0; index < count; index++) {
      const end = Math.max(0, Math.ceil((index + 1) * candidates.length / count) - 1);
      const group = candidates.slice(Math.min(previous, end), end + 1);
      scenes.push({ index, after: candidates[end].index, context: group.map(b => b.text).join('\n\n').slice(0, 5000) });
      previous = end + 1;
    }
    return { text, blocks, scenes };
  }

  function safeImage(src) {
    return typeof src === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src);
  }

  function render(doc, images = []) {
    const byIndex = new Map(images.map(image => [image.index, image]));
    return doc.blocks.map((block, index) => {
      const tag = /^h[123]$/.test(block.type) ? block.type : 'p';
      const paragraphs = tag === 'p' && !block.tags ? readableParagraphs(block.text) : [block.text];
      let html = paragraphs.map(text => `<${tag} style="text-align:left;margin:0 0 24px;line-height:1.9;word-break:keep-all;font-size:${tag === 'p' ? 16 : 20}px">${inline(text)}</${tag}>`).join('');
      for (const scene of doc.scenes.filter(s => s.after === index)) {
        const img = byIndex.get(scene.index);
        if (img && safeImage(img.src)) {
          html += `<p style="margin:24px 0"><img src="${img.src}" alt="${escape(img.caption || `본문 웹툰 ${scene.index + 1}`)}" style="display:block;max-width:100%;height:auto" width="800"></p>`;
        }
      }
      return html;
    }).join('');
  }

  function readableParagraphs(text) {
    const result = [];
    for (const line of text.split('\n').filter(Boolean)) {
      const sentences = line.replace(/([.!?。！？][”’"')\]]*)\s+(?=\S)/g, '$1\n').split('\n');
      for (let index = 0; index < sentences.length; index += 2) result.push(sentences.slice(index, index + 2).join(' '));
    }
    return result;
  }

  function plainText(doc) {
    return doc.blocks.map(b => b.text.replace(/\*\*(.+?)\*\*/g, '$1')).join('\n\n');
  }
  function clipboardDocument(doc, images) {
    const html = `<html><body><!--StartFragment--><div data-blog-webtoon="1" style="text-align:left;font-family:Arial,sans-serif;color:#222;background:#fff;font-size:16px">${render(doc, images)}</div><!--EndFragment--></body></html>`;
    const text = plainText(doc);
    // 네이버의 5MB 제한보다 여유 있게 잡고 UTF-8 실제 바이트로 검사한다.
    const bytes = new TextEncoder().encode(html).byteLength + new TextEncoder().encode(text).byteLength;
    if (bytes > 4 * 1024 * 1024) throw new Error('붙여넣기 용량을 초과했습니다. 이미지를 다시 불러온 뒤 복사해주세요.');
    return { html, text, bytes };
  }
  return { plan, render, plainText, escape, safeImage, clipboardDocument };
});
