/* 복사 전에 실제 네이버 편집기에 이미지 붙여넣기 처리를 연결한다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NaverPasteConnection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  async function prepare(chrome) {
    const tabs = await chrome.tabs.query({ url: 'https://blog.naver.com/*' });
    if (!tabs.length) throw new Error('네이버 블로그 글쓰기 페이지를 먼저 열어주세요.');
    let connected = 0;
    for (const tab of tabs) {
      try {
        const frames = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['features/blog-images/naver-paste.js'] });
        if (frames.some(frame => frame.result?.ready)) connected++;
      } catch (_) { /* 다른 네이버 탭에서 연결 여부를 계속 확인한다. */ }
    }
    if (!connected) throw new Error('네이버 글쓰기 연결을 확인하지 못했습니다. 확장을 새로고침하고 네이버 사이트 접근 권한을 확인해주세요.');
    return { success: true, connected };
  }
  return { prepare };
});
