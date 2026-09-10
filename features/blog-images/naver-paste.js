/* 네이버에서는 HTML의 data 이미지가 제외되므로 사진 클립보드로 순서대로 전달한다. */
(() => {
  if (globalThis.blogWebtoonPasteReceiver) return { ready: globalThis.blogWebtoonPasteReceiver.ready() };
  let active = false;
  const markReady = () => { if (document.documentElement) document.documentElement.dataset.blogWebtoonPaste = '1'; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markReady, { once: true });
  else markReady();

  function editorDocument(start = document) {
    let candidate = start;
    for (let depth = 0; depth < 5; depth++) {
      if (candidate.querySelector('article .se-component')) return candidate;
      try {
        const parent = candidate.defaultView.frameElement?.ownerDocument;
        if (!parent || parent === candidate) return null;
        candidate = parent;
      } catch (_) { return null; }
    }
    return null;
  }

  function parse(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const root = parsed.querySelector('[data-blog-webtoon="1"]');
    if (!root) return null;
    const steps = [];
    let text = '';
    let imageCount = 0;
    for (const child of root.children) {
      const image = child.querySelector('img');
      if (image) {
        if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(image.getAttribute('src') || '')) throw new Error('지원하지 않는 이미지 형식입니다.');
        if (text) { steps.push({ type: 'text', html: text }); text = ''; }
        steps.push({ type: 'image', src: image.getAttribute('src') });
        imageCount++;
      } else if (/^(P|H1|H2|H3)$/.test(child.tagName)) {
        // 외부 HTML 속성과 스크립트는 복사하지 않는다.
        const paragraph = parsed.createElement('p');
        // 줄바꿈과 굵은 소제목은 안전한 태그만 재구성해서 보존한다.
        function append(source, target) {
          for (const node of source.childNodes) {
            if (node.nodeType === 3) target.appendChild(parsed.createTextNode(node.textContent));
            else if (node.nodeName === 'BR') target.appendChild(parsed.createElement('br'));
            else if (node.nodeName === 'STRONG' || node.nodeName === 'B') {
              const strong = parsed.createElement('strong'); append(node, strong); target.appendChild(strong);
            } else if (node.nodeType === 1) append(node, target);
          }
        }
        if (child.tagName !== 'P') { const strong = parsed.createElement('strong'); append(child, strong); paragraph.appendChild(strong); }
        else append(child, paragraph);
        paragraph.style.textAlign = 'left';
        paragraph.style.lineHeight = '1.9';
        paragraph.style.fontSize = child.tagName === 'P' ? '16px' : '20px';
        text += paragraph.outerHTML + '<p style="text-align:left"><br></p>';
      }
    }
    if (text) steps.push({ type: 'text', html: text });
    if (imageCount < 1 || imageCount > 5) throw new Error('웹툰 이미지 수를 확인해주세요.');
    return { steps, imageCount };
  }

  function targetFor(editor, originalTarget) {
    const buffer = editor.querySelector('iframe[id^="input_buffer"]');
    try { if (buffer?.contentDocument?.body) return buffer.contentDocument.body; } catch (_) { /* 원래 대상 사용 */ }
    if (originalTarget.isConnected) return originalTarget;
    throw new Error('편집기 입력 위치를 찾지 못했습니다.');
  }

  function paste(editor, originalTarget, step, index) {
    const target = targetFor(editor, originalTarget);
    const view = target.ownerDocument.defaultView;
    const transfer = new view.DataTransfer();
    if (step.type === 'text') {
      transfer.setData('text/html', step.html);
      transfer.setData('text/plain', new DOMParser().parseFromString(step.html, 'text/html').body.textContent);
    } else {
      const [header, content] = step.src.split(',');
      const type = header.match(/^data:(image\/(?:jpeg|png));base64$/)[1];
      const binary = atob(content);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      transfer.items.add(new view.File([bytes], `웹툰-${index + 1}.${type === 'image/png' ? 'png' : 'jpg'}`, { type }));
    }
    target.dispatchEvent(new view.ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }));
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function alignLeft(editor) {
    // 네이버가 HTML의 text-align:left를 생략하므로 편집기 명령으로 먼저 정렬한다.
    const toggle = editor.querySelector('button[data-name="align-drop-down-with-justify"]:not([data-role="option"])');
    if (!toggle) throw new Error('본문 정렬 도구를 찾지 못했습니다. 본문을 클릭한 뒤 다시 붙여넣어주세요.');
    if (toggle.classList.contains('se-align-left-toolbar-button')) return;
    toggle.click();
    const left = editor.querySelector('button[data-name="align-drop-down-with-justify"][data-role="option"][data-value="left"]');
    if (!left) throw new Error('왼쪽 정렬을 적용하지 못했습니다.');
    left.click();
    await sleep(100);
  }

  async function handlePaste(event) {
    const html = event.clipboardData?.getData('text/html') || '';
    if (!html.includes('data-blog-webtoon="1"')) return;
    const editor = editorDocument(event.target.ownerDocument);
    if (!editor) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (active) return;
    active = true;
    const notice = editor.createElement('aside');
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;max-width:360px;padding:18px;background:#193d2c;color:white;font:14px/1.7 sans-serif;border-radius:12px;box-shadow:0 4px 24px #0004';
    editor.body.appendChild(notice);
    let completed = 0;
    try {
      if (new TextEncoder().encode(html).byteLength > 4 * 1024 * 1024) throw new Error('복사 용량이 큽니다. 확장 프로그램에서 다시 복사해주세요.');
      const plan = parse(html);
      if (!plan) throw new Error('복사할 본문을 읽을 수 없습니다.');
      notice.textContent = `글과 웹툰 ${plan.imageCount}장을 넣고 있습니다. 완료될 때까지 편집기를 클릭하지 마세요.`;
      for (const step of plan.steps) {
        if (step.type === 'text') {
          await alignLeft(editor);
          const beforeText = editor.querySelector('article').innerText;
          paste(editor, event.target, step, completed);
          const textDeadline = Date.now() + 5000;
          while (editor.querySelector('article').innerText === beforeText && Date.now() < textDeadline) await sleep(100);
          if (editor.querySelector('article').innerText === beforeText) throw new Error('본문 삽입을 확인하지 못했습니다. 현재 글은 유지됩니다.');
          await sleep(250);
          continue;
        }
        const before = new Set([...editor.querySelectorAll('article img.se-image-resource')].map(img => img.src));
        paste(editor, event.target, step, completed);
        const deadline = Date.now() + 90000;
        let uploaded = false;
        while (Date.now() < deadline) {
          await sleep(250);
          uploaded = [...editor.querySelectorAll('article img.se-image-resource')].some(img => !before.has(img.src) && /^https:\/\/(?:blogfiles|postfiles)\.pstatic\.net\//.test(img.src) && img.complete && img.naturalWidth > 0);
          if (uploaded) break;
        }
        if (!uploaded) throw new Error(`${completed + 1}번째 이미지 업로드를 확인하지 못했습니다. 현재 글은 유지됩니다.`);
        completed++;
        notice.textContent = `웹툰 ${completed}/${plan.imageCount}장 첨부 완료 · 문단 순서대로 넣고 있습니다.`;
        await sleep(400);
      }
      notice.textContent = `글과 웹툰 ${completed}장 붙여넣기 완료. 내용을 확인한 뒤 저장해주세요.`;
      setTimeout(() => notice.remove(), 12000);
    } catch (error) {
      notice.style.background = '#77332c';
      notice.textContent = `붙여넣기 중단: ${error.message} (${completed}장 완료)`;
      const close = editor.createElement('button');
      close.textContent = '닫기';
      close.style.cssText = 'margin-left:12px;cursor:pointer';
      close.addEventListener('click', () => notice.remove());
      notice.appendChild(close);
    } finally { active = false; }
  }

  const watched = new WeakSet();
  function watch(candidate) {
    if (!candidate || watched.has(candidate)) return;
    watched.add(candidate);
    candidate.defaultView.addEventListener('paste', handlePaste, true);
    const scan = () => {
      for (const frame of candidate.querySelectorAll('iframe')) {
        const attach = () => { try { watch(frame.contentDocument); } catch (_) { /* 다른 출처는 건너뛴다. */ } };
        attach();
        if (!frame.dataset.blogWebtoonWatched) { frame.dataset.blogWebtoonWatched = '1'; frame.addEventListener('load', attach); }
      }
    };
    scan();
    new MutationObserver(scan).observe(candidate, { childList: true, subtree: true });
  }
  watch(document);
  function ready() {
    if (editorDocument()) return true;
    for (const frame of document.querySelectorAll('iframe')) {
      try { if (frame.contentDocument && editorDocument(frame.contentDocument)) return true; } catch (_) { /* 다른 출처는 건너뛴다. */ }
    }
    return false;
  }
  globalThis.blogWebtoonPasteReceiver = { ready };
  return { ready: ready() };
})();
