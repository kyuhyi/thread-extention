/* 생성 상태는 서버에, 본문과 작업 ID는 확장 저장소에 보관한다. */
(function () {
  const BASE = 'http://localhost:5000/blog-images';
  const KEY = 'blogWebtoonDraft';
  const $ = id => document.getElementById(id);
  let draft = null;
  let doc = null;
  let job = null;
  let images = new Map();
  let timer;
  let revision = 0;
  let starting = false;
  let copyReady = false;

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(BASE + path, {
        ...options,
        headers: { 'X-Blog-Client': 'webtoon-v1', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        signal: AbortSignal.timeout(30000)
      });
    } catch (_) {
      throw new Error('로컬 서버에 연결할 수 없습니다. start_server.bat 실행 후 다시 시도해주세요.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const failure = new Error(error.error || '이미지 작업 요청에 실패했습니다.');
      failure.status = response.status;
      throw failure;
    }
    return response;
  }

  function message(text, error = false) {
    const el = $('blog-image-status');
    if (el) { el.textContent = text; el.classList.toggle('error', error); }
  }

  function refresh() {
    if (!doc) return;
    $('blog-text').innerHTML = BlogDocument.render(doc, [...images.values()]);
    const scenes = job?.scenes || [];
    const active = starting || ['queued', 'running'].includes(job?.status);
    const completed = scenes.filter(s => s.status === 'completed').length;
    const loadingImages = !active && completed > images.size;
    copyReady = !active && completed === doc.scenes.length && images.size === doc.scenes.length;
    document.querySelectorAll('[data-target="blog"]').forEach(button => { button.disabled = !copyReady; });
    $('blog-images-start').disabled = active || loadingImages || copyReady;
    $('blog-images-start').textContent = active ? '이미지 생성 중…' : loadingImages ? '이미지 불러오는 중…' : copyReady ? '웹툰 준비 완료' : job ? '실패한 이미지 재시도' : '웹툰 이미지 생성';
    $('blog-image-count').disabled = active;
    $('blog-images-save').disabled = !copyReady;
    $('blog-images-download').disabled = images.size === 0;
    const list = $('blog-image-scenes');
    list.replaceChildren();
    for (const scene of doc.scenes) {
      const state = scenes[scene.index];
      const item = document.createElement('span');
      const label = images.has(scene.index) ? '완료' : state?.status === 'completed' ? '불러오는 중' : state?.status === 'generating' ? '생성 중' : state?.status === 'failed' ? '실패' : '대기';
      item.textContent = `${scene.index + 1} · ${label}`;
      item.className = `scene-chip ${images.has(scene.index) ? 'done' : state?.status || ''}`;
      if (state?.error) item.title = state.error;
      list.appendChild(item);
    }
    if (copyReady) message(`웹툰 ${images.size}장 준비 완료 · 글+이미지를 함께 복사할 수 있습니다.`);
    else if (loadingImages) message(`복사용 이미지를 준비하고 있습니다 · ${images.size}/${doc.scenes.length}장`);
    else if (job?.status === 'partial' || job?.status === 'interrupted') message(`${images.size}/${doc.scenes.length}장 완료 · ${scenes.find(s => s.error)?.error || '실패한 이미지를 재시도해주세요.'}`, true);
    else if (active) message(`${completed}/${doc.scenes.length}장 완료 · 팝업을 닫아도 이미지 생성은 계속됩니다.`);
  }

  async function persist() { await BlogStore.set({ [KEY]: draft }); }

  function suspend() {
    revision++;
    clearTimeout(timer);
    starting = false;
    doc = null;
    job = null;
    images = new Map();
    copyReady = false;
    ['blog-images-start', 'blog-images-save', 'blog-images-download', 'blog-text-copy'].forEach(id => { if ($(id)) $(id).disabled = true; });
    document.querySelectorAll('[data-target="blog"]').forEach(button => { button.disabled = true; });
    $('blog-image-scenes')?.replaceChildren();
    message('완성된 블로그 글을 기다리고 있습니다.');
  }

  async function loadJob(expectedRevision = revision) {
    if (!draft?.jobId) return;
    try {
      const received = await (await api(`/jobs/${draft.jobId}`)).json();
      if (expectedRevision !== revision) return;
      job = received;
      refresh();
      for (const scene of job.scenes) {
        if (scene.status === 'completed' && !images.has(scene.index)) {
          const img = await (await api(`/jobs/${job.id}/images/${scene.index}`)).json();
          if (expectedRevision !== revision) return;
          if (!BlogDocument.safeImage(img.src)) throw new Error('이미지 파일을 확인할 수 없습니다.');
          const compactSource = await BlogImageEncoding.forClipboard(img.src);
          if (expectedRevision !== revision) return;
          images.set(scene.index, { ...img, src: compactSource, caption: `본문 내용에 맞춘 웹툰 ${scene.index + 1}` });
          refresh();
        }
      }
      if (['queued', 'running'].includes(job.status)) timer = setTimeout(() => loadJob(expectedRevision), 3000);
    } catch (error) {
      if (expectedRevision !== revision) return;
      message(error.message, true);
      $('blog-images-start').disabled = false;
      $('blog-images-start').textContent = '연결 다시 시도';
      if (error.status === 404) {
        draft.jobId = null;
        job = null;
        await persist();
        return;
      }
      timer = setTimeout(() => loadJob(expectedRevision), 10000);
    }
  }

  async function start() {
    if (!doc) { message('블로그 글을 먼저 생성하거나 입력해주세요.', true); return; }
    if (starting) return;
    const expected = revision;
    clearTimeout(timer);
    starting = true;
    refresh();
    try {
      const status = await (await api('/status')).json();
      if (expected !== revision) return;
      if (!status.ready) throw new Error(status.message);
      const received = await (await api(draft.jobId ? `/jobs/${draft.jobId}/retry` : '/jobs', {
        method: 'POST', body: JSON.stringify({ text: draft.text, scenes: doc.scenes })
      })).json();
      if (expected !== revision) return;
      job = received;
      draft.jobId = received.id;
      await persist();
    } catch (error) {
      if (expected === revision) message(error.message, true);
    } finally {
      if (expected === revision) {
        starting = false;
        refresh();
        if (draft.jobId) await loadJob(expected);
      }
    }
  }

  async function setArticle(text, options = {}) {
    const count = Number($('blog-image-count').value);
    const next = BlogDocument.plan(text, count);
    revision++;
    clearTimeout(timer);
    starting = false;
    job = null;
    images = new Map();
    doc = next;
    $('blog-text-copy').disabled = false;
    draft = { text, count, jobId: null, auto: $('blog-images-auto').checked, wantGeneration: Boolean(options.auto && $('blog-images-auto').checked) };
    await persist();
    refresh();
    message('본문 준비 완료 · 웹툰 이미지에 Codex 계정 사용량이 적용됩니다.');
    if (options.auto && draft.auto) await start();
  }

  async function prepareNaver() {
    if (globalThis.chrome?.runtime?.id) return chrome.runtime.sendMessage({ action: 'prepareNaverPaste' });
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const receive = event => {
        if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'blog-webtoon-prepared' || event.data.id !== id) return;
        clearTimeout(timeout); window.removeEventListener('message', receive); resolve(event.data.result);
      };
      const timeout = setTimeout(() => {
        window.removeEventListener('message', receive);
        reject(new Error('큰 화면과 확장 연결을 확인하지 못했습니다. 확장을 새로고침한 뒤 이 페이지도 새로고침해주세요.'));
      }, 5000);
      window.addEventListener('message', receive);
      window.postMessage({ type: 'blog-webtoon-prepare', id }, location.origin);
    });
  }

  async function copyAll() {
    if (!copyReady) { message('모든 이미지가 준비된 뒤 전체 복사를 이용해주세요.', true); return; }
    try {
      message('네이버 글쓰기의 이미지 첨부 연결을 확인하고 있습니다…');
      const connection = await prepareNaver();
      if (!connection?.success) throw new Error(connection?.error || '네이버 연결을 확인하지 못했습니다. 확장을 새로고침해주세요.');
      const { html, text, bytes } = BlogDocument.clipboardDocument(doc, [...images.values()]);
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })]);
      } else {
        // 구형 브라우저에서도 두 형식을 함께 복사한다. 글자만 복사하고 성공으로 알리지 않는다.
        const handler = event => { event.preventDefault(); event.clipboardData.setData('text/html', html); event.clipboardData.setData('text/plain', text); };
        document.addEventListener('copy', handler);
        let ok;
        try { ok = document.execCommand('copy'); } finally { document.removeEventListener('copy', handler); }
        if (!ok) throw new Error('복사 권한이 없습니다.');
      }
      message(`글+이미지를 복사했습니다 (${(bytes / 1024 / 1024).toFixed(2)}MB). 확장이 켜진 네이버 본문에 Ctrl+V 후 이미지 첨부 완료까지 기다려주세요.`);
    } catch (error) { message(error.message || '전체 복사에 실패했습니다. 큰 화면에서 다시 시도해주세요.', true); }
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function init() {
    if (!$('blog-image-count')) return;
    $('blog-images-start').addEventListener('click', start);
    $('blog-image-count').addEventListener('change', () => { if (draft) setArticle(draft.text, { auto: false }); });
    $('blog-images-auto').addEventListener('change', async () => { if (draft) { draft.auto = $('blog-images-auto').checked; await persist(); } });
    $('blog-text-copy').addEventListener('click', async () => {
      if (!doc) return;
      try { await navigator.clipboard.writeText(BlogDocument.plainText(doc)); message('글만 복사했습니다.'); }
      catch (_) { message('글 복사에 실패했습니다.', true); }
    });
    $('blog-images-save').addEventListener('click', () => {
      if (!copyReady) return;
      const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>블로그 포스팅</title><body style="max-width:800px;margin:40px auto;padding:24px;font-family:sans-serif">${BlogDocument.render(doc, [...images.values()])}</body></html>`;
      saveBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), '블로그-글과이미지.html');
    });
    $('blog-images-download').addEventListener('click', async () => {
      if (!draft?.jobId) return;
      try { saveBlob(await (await api(`/jobs/${draft.jobId}/download`)).blob(), '블로그-웹툰원본.zip'); }
      catch (error) { message(error.message, true); }
    });
    $('blog-editor-open')?.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('blog-editor.html') }));
    const saved = (await BlogStore.get(KEY))[KEY];
    if (saved?.text) {
      try { doc = BlogDocument.plan(saved.text, saved.count); }
      catch (_) {
        await BlogStore.set({ [KEY + 'Rejected']: saved, [KEY]: null });
        suspend();
        $('blog-text').textContent = '블로그 글을 다시 생성해주세요.';
        return;
      }
      draft = saved;
      $('blog-image-count').value = saved.count;
      $('blog-images-auto').checked = saved.auto !== false;
      refresh();
      if ($('resultSection')) $('resultSection').classList.remove('hidden');
      if (saved.jobId) await loadJob();
      else if (saved.wantGeneration) await start();
    }
  }

  window.BlogImages = { init, setArticle, copyAll, suspend, getArticleText: () => doc?.text };
})();
