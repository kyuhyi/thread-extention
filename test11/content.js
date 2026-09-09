// 콘텐츠 스크립트: 웹페이지에서 텍스트 선택 감지

// 텍스트 선택 이벤트 리스너
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

let selectedText = '';

function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text && text !== selectedText) {
    selectedText = text;

    // 선택된 텍스트를 storage에 저장 (옵션)
    chrome.storage.local.set({ selectedText: text });
  }
}

// 메시지 리스너: popup에서 요청할 때 선택된 텍스트 반환
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    sendResponse({ text: selection.toString().trim() });
  }
  return true;
});
