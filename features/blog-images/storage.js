/* 확장 프로그램과 localhost의 큰 화면 편집기에서 같은 UI를 사용한다. */
window.BlogStore = {
  async get(key) {
    if (globalThis.chrome?.storage?.local) return chrome.storage.local.get(key);
    try { return { [key]: JSON.parse(localStorage.getItem(`blog-webtoon:${key}`) || 'null') }; }
    catch (_) { return { [key]: null }; }
  },
  async set(values) {
    if (globalThis.chrome?.storage?.local) return chrome.storage.local.set(values);
    for (const [key, value] of Object.entries(values)) localStorage.setItem(`blog-webtoon:${key}`, JSON.stringify(value));
  }
};
