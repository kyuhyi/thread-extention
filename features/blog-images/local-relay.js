/* localhost 큰 화면에서도 확장의 네이버 연결 검사를 이용한다. */
(() => {
  if (location.origin !== 'http://localhost:5000' || location.pathname !== '/blog-editor.html') return;
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'blog-webtoon-prepare' || typeof event.data.id !== 'string') return;
    let result;
    try { result = await chrome.runtime.sendMessage({ action: 'prepareNaverPaste' }); }
    catch (_) { result = { success: false, error: '확장 연결이 갱신되었습니다. 큰 화면을 새로고침해주세요.' }; }
    window.postMessage({ type: 'blog-webtoon-prepared', id: event.data.id, result }, location.origin);
  });
})();
