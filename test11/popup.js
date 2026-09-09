// DOM 요소
const elements = {
  // 버튼
  settingsBtn: document.getElementById('settingsBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  generateBtn: document.getElementById('generateBtn'),
  clearTextBtn: document.getElementById('clearTextBtn'),
  youtubeChannelBtn: document.getElementById('youtubeChannelBtn'),
  blogChannelBtn: document.getElementById('blogChannelBtn'),
  threadChannelBtn: document.getElementById('threadChannelBtn'),

  // 섹션
  apiKeySection: document.getElementById('apiKeySection'),
  mainContent: document.getElementById('contentGeneratorTab'),
  loadingSection: document.getElementById('loadingSection'),
  resultSection: document.getElementById('resultSection'),

  // 입력
  apiKeyInput: document.getElementById('apiKeyInput'),
  naverClientIdInput: document.getElementById('naverClientIdInput'),
  naverSecretKeyInput: document.getElementById('naverSecretKeyInput'),
  naverCustomerIdInput: document.getElementById('naverCustomerIdInput'),
  directTextInput: document.getElementById('directTextInput'),
  charCount: document.getElementById('charCount'),
  youtubeUrlInput: document.getElementById('youtubeUrlInput'),
  blogUrlInput: document.getElementById('blogUrlInput'),
  threadUrlInput: document.getElementById('threadUrlInput'),
  statusMessage: document.getElementById('statusMessage'),

  // 결과 텍스트
  shortsText: document.getElementById('shorts-text'),
  blogText: document.getElementById('blog-text'),
  threadText: document.getElementById('thread-text'),

  // 로고
  logoIcon: document.getElementById('logoIcon'),
};

// 유튜브 채널 영상 ID 목록
const VIDEO_IDS = [
  'lXl0rIHo9Xo',
  'NxAvvhTd7G0',
  '3AFrSU14SnM',
  'Mm0334lgU1E',
  'P0OdJkOiuhs',
  'bjwuoLe7dVg',
  'mYCEnuUHatY',
  '4hkSakzamV0'
];

// 랜덤 유튜브 썸네일 로드
function loadRandomThumbnail() {
  const randomVideoId = VIDEO_IDS[Math.floor(Math.random() * VIDEO_IDS.length)];
  const thumbnailLink = document.querySelector('.video-thumbnail-link');
  const thumbnailImg = document.querySelector('.video-thumbnail');

  if (thumbnailLink && thumbnailImg) {
    thumbnailLink.href = `https://www.youtube.com/watch?v=${randomVideoId}`;
    thumbnailImg.src = `https://img.youtube.com/vi/${randomVideoId}/maxresdefault.jpg`;
    console.log('Thumbnail loaded:', randomVideoId);
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  await checkApiKey();
  await loadChannelUrls();
  setupEventListeners();
  loadRandomThumbnail();

  // 메인 탭 전환 이벤트 리스너 추가
  setupMainTabListeners();
});

// API 키 확인
async function checkApiKey() {
  const result = await chrome.storage.local.get(['geminiApiKey']);

  if (!result.geminiApiKey) {
    showApiKeySection();
    showStatus('API 키를 먼저 설정해주세요.', 'warning');
  } else {
    hideApiKeySection();
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 설정 버튼
  elements.settingsBtn.addEventListener('click', () => {
    showApiKeySection();
    loadCurrentApiKey();
  });

  // 테마 토글 버튼
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // API 키 저장
  elements.saveApiKeyBtn.addEventListener('click', saveApiKey);

  // 설정 취소
  elements.cancelSettingsBtn.addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      hideApiKeySection();
    }
  });

  // 콘텐츠 생성
  elements.generateBtn.addEventListener('click', generateContent);

  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });

  // 복사 버튼
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      copyContent(e.target.dataset.target);
    });
  });

  // 채널 이동 버튼
  elements.youtubeChannelBtn.addEventListener('click', () => openChannel('youtube'));
  elements.blogChannelBtn.addEventListener('click', () => openChannel('blog'));
  elements.threadChannelBtn.addEventListener('click', () => openChannel('thread'));

  // 텍스트 지우기 버튼
  elements.clearTextBtn.addEventListener('click', () => {
    elements.directTextInput.value = '';
    updateCharCount();
    elements.directTextInput.focus();
  });

  // 글자 수 카운터
  elements.directTextInput.addEventListener('input', updateCharCount);
}

// 글자 수 업데이트
function updateCharCount() {
  const length = elements.directTextInput.value.length;
  elements.charCount.textContent = `${length.toLocaleString()}자`;
}

// 채널 URL 로드
async function loadChannelUrls() {
  const result = await chrome.storage.local.get(['youtubeUrl', 'blogUrl', 'threadUrl']);

  // 버튼 활성화/비활성화
  elements.youtubeChannelBtn.disabled = !result.youtubeUrl;
  elements.blogChannelBtn.disabled = !result.blogUrl;
  elements.threadChannelBtn.disabled = !result.threadUrl;
}

// 채널 열기
async function openChannel(type) {
  const result = await chrome.storage.local.get(['youtubeUrl', 'blogUrl', 'threadUrl']);

  let url = '';
  if (type === 'youtube') url = result.youtubeUrl;
  else if (type === 'blog') url = result.blogUrl;
  else if (type === 'thread') url = result.threadUrl;

  if (url) {
    chrome.tabs.create({ url });
  } else {
    showStatus(`${type} URL을 설정해주세요.`, 'warning');
    showApiKeySection();
  }
}

// API 키 및 URL 저장
async function saveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  const naverClientId = elements.naverClientIdInput.value.trim();
  const naverSecretKey = elements.naverSecretKeyInput.value.trim();
  const naverCustomerId = elements.naverCustomerIdInput.value.trim();
  const youtubeUrl = elements.youtubeUrlInput.value.trim();
  const blogUrl = elements.blogUrlInput.value.trim();
  const threadUrl = elements.threadUrlInput.value.trim();

  if (!apiKey) {
    showStatus('Gemini API 키를 입력해주세요.', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({
      geminiApiKey: apiKey,
      naverClientId: naverClientId,
      naverSecretKey: naverSecretKey,
      naverCustomerId: naverCustomerId,
      youtubeUrl: youtubeUrl,
      blogUrl: blogUrl,
      threadUrl: threadUrl
    });
    showStatus('설정이 저장되었습니다.', 'success');
    await loadChannelUrls(); // 버튼 상태 업데이트
    hideApiKeySection();
  } catch (error) {
    showStatus('설정 저장에 실패했습니다.', 'error');
    console.error('설정 저장 오류:', error);
  }
}

// 현재 설정 로드
async function loadCurrentApiKey() {
  const result = await chrome.storage.local.get([
    'geminiApiKey',
    'naverClientId',
    'naverSecretKey',
    'naverCustomerId',
    'youtubeUrl',
    'blogUrl',
    'threadUrl'
  ]);

  if (result.geminiApiKey) {
    elements.apiKeyInput.value = result.geminiApiKey;
  }
  if (result.naverClientId) {
    elements.naverClientIdInput.value = result.naverClientId;
  }
  if (result.naverSecretKey) {
    elements.naverSecretKeyInput.value = result.naverSecretKey;
  }
  if (result.naverCustomerId) {
    elements.naverCustomerIdInput.value = result.naverCustomerId;
  }
  if (result.youtubeUrl) {
    elements.youtubeUrlInput.value = result.youtubeUrl;
  }
  if (result.blogUrl) {
    elements.blogUrlInput.value = result.blogUrl;
  }
  if (result.threadUrl) {
    elements.threadUrlInput.value = result.threadUrl;
  }
}

// 콘텐츠 생성
async function generateContent() {
  try {
    // API 키 확인
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (!result.geminiApiKey) {
      showStatus('API 키를 먼저 설정해주세요.', 'error');
      showApiKeySection();
      return;
    }

    let text = '';
    let sourceType = '';

    // 1순위: 직접 입력한 텍스트
    const directText = elements.directTextInput.value.trim();

    if (directText) {
      text = directText;
      sourceType = '직접 입력';

      // 로딩 시작
      showLoading();
      hideStatus();
    } else {
      // 2순위: 현재 페이지 자동 추출
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 로딩 시작
      showLoading();
      hideStatus();

      // 페이지 콘텐츠 자동 추출
      const pageContent = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });

      text = pageContent[0].result.trim();
      sourceType = '현재 페이지';

      if (!text) {
        showStatus('페이지에서 콘텐츠를 찾을 수 없습니다. 텍스트를 직접 입력해주세요.', 'error');
        hideLoading();
        return;
      }
    }

    // API 호출
    const response = await chrome.runtime.sendMessage({
      action: 'generateContent',
      apiKey: result.geminiApiKey,
      selectedText: text
    });

    if (response.success) {
      displayResults(response.data);
      showStatus(`콘텐츠가 성공적으로 생성되었습니다! (소스: ${sourceType})`, 'success');
    } else {
      throw new Error(response.error || '콘텐츠 생성에 실패했습니다.');
    }

  } catch (error) {
    console.error('콘텐츠 생성 오류:', error);
    showStatus(error.message || '오류가 발생했습니다. 다시 시도해주세요.', 'error');
  } finally {
    hideLoading();
  }
}

// 유튜브 URL 유효성 검사
function isValidYoutubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
  return youtubeRegex.test(url);
}

// 유튜브 자막 추출
async function extractYoutubeTranscript(youtubeUrl) {
  try {
    // 새 탭에서 유튜브 페이지 열기
    const tab = await chrome.tabs.create({ url: youtubeUrl, active: false });

    // 페이지 로딩 대기
    await new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    // 2초 추가 대기 (동적 콘텐츠 로딩)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 자막 추출 스크립트 실행
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTranscriptFromPage
    });

    // 탭 닫기
    await chrome.tabs.remove(tab.id);

    return result[0].result;
  } catch (error) {
    console.error('유튜브 자막 추출 오류:', error);
    return null;
  }
}

// 유튜브 페이지에서 자막 추출 (콘텐츠 스크립트)
function extractTranscriptFromPage() {
  console.log('🎬 유튜브 자막 추출 시작...');

  // 방법 1: 자막 패널에서 실제 자막 추출 (최우선)
  const transcriptContainer = document.querySelector('#body ytd-transcript-segment-list-renderer, ytd-transcript-segment-list-renderer');

  if (transcriptContainer) {
    console.log('✅ 자막 컨테이너 발견');
    const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-renderer');

    if (segments && segments.length > 0) {
      const transcriptText = Array.from(segments)
        .map(segment => {
          const textElement = segment.querySelector('.segment-text, yt-formatted-string');
          return textElement ? textElement.innerText.trim() : '';
        })
        .filter(text => text.length > 0)
        .join(' ');

      if (transcriptText.length > 100) {
        console.log(`✅ 자막 추출 성공: ${transcriptText.length}자`);
        return transcriptText;
      }
    }
  }

  console.log('⚠️ 자막 없음, 설명란 시도...');

  // 방법 2: 설명란에서 텍스트 추출
  const description = document.querySelector('#description-inline-expander, #description');
  if (description) {
    const descText = description.innerText.trim();
    if (descText.length > 100) {
      console.log(`✅ 설명란 추출: ${descText.length}자`);
      return descText;
    }
  }

  // 방법 3: 제목 + 설명
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title');
  const titleText = title ? title.innerText.trim() : '';

  if (titleText) {
    const fullText = titleText + '\n\n' + (description ? description.innerText.trim() : '');
    console.log(`✅ 제목+설명 추출: ${fullText.length}자`);
    return fullText;
  }

  // 방법 4: 메타데이터
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const metaText = titleText + '\n\n' + metaDescription.getAttribute('content');
    console.log(`✅ 메타데이터 추출: ${metaText.length}자`);
    return metaText;
  }

  console.log('❌ 추출 실패');
  return null;
}

// 페이지 콘텐츠 자동 추출 함수
function extractPageContent() {
  // 1. 먼저 선택된 텍스트 확인
  const selection = window.getSelection().toString().trim();
  if (selection) {
    return selection;
  }

  // 2. 선택된 텍스트가 없으면 페이지 주요 콘텐츠 추출
  let content = '';

  // 주요 콘텐츠 선택자들 (우선순위 순)
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.post',
    '.article'
  ];

  // 선택자로 콘텐츠 찾기
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText.trim();
      if (content.length > 100) {
        break;
      }
    }
  }

  // 콘텐츠를 찾지 못했으면 body의 텍스트 사용
  if (!content || content.length < 100) {
    // 불필요한 요소 제외
    const excludeSelectors = 'script, style, nav, header, footer, aside, .sidebar, .menu, .navigation';
    const body = document.body.cloneNode(true);

    // 제외할 요소들 삭제
    body.querySelectorAll(excludeSelectors).forEach(el => el.remove());

    content = body.innerText.trim();
  }

  // 너무 긴 콘텐츠는 앞부분만 사용 (API 토큰 제한 고려)
  if (content.length > 5000) {
    content = content.substring(0, 5000) + '...';
  }

  return content;
}

// 결과 표시
function displayResults(data) {
  // 각 콘텐츠를 HTML로 포맷팅하여 표시
  elements.shortsText.innerHTML = formatTextToHTML(data.shorts_script || '생성 실패');
  elements.blogText.innerHTML = formatTextToHTML(data.blog_post || '생성 실패');
  elements.threadText.innerHTML = formatTextToHTML(data.thread_post || '생성 실패');

  elements.resultSection.classList.remove('hidden');
  switchTab('shorts');
}

// 텍스트를 HTML로 변환 (문단 구분)
function formatTextToHTML(text) {
  if (!text || text === '생성 실패') {
    return '<p class="error">⚠️ 콘텐츠 생성에 실패했습니다. 다시 시도해주세요.</p>';
  }

  // JSON 코드 블록 제거 (혹시 남아있을 경우)
  let cleanText = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*{\s*$/gm, '')
    .replace(/^\s*}\s*$/gm, '')
    .replace(/^\s*"shorts_script"\s*:\s*"/gm, '')
    .replace(/^\s*"blog_post"\s*:\s*"/gm, '')
    .replace(/^\s*"thread_post"\s*:\s*"/gm, '')
    .replace(/",?\s*$/gm, '')
    .trim();

  // 이스케이프 문자 처리
  cleanText = cleanText
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  // 줄바꿈을 기준으로 문단 분리
  const paragraphs = cleanText.split('\n\n');

  // 각 문단을 <p> 태그로 감싸기
  const formatted = paragraphs
    .filter(p => p.trim().length > 0)
    .map(paragraph => {
      // 단일 줄바꿈은 <br>로 변환
      const lines = paragraph.trim().replace(/\n/g, '<br>');

      // 해시태그 스타일링
      const styledLines = lines.replace(/#(\S+)/g, '<span class="hashtag">#$1</span>');

      return `<p>${styledLines}</p>`;
    })
    .join('');

  return formatted || '<p class="error">⚠️ 콘텐츠가 비어있습니다.</p>';
}

// 탭 전환
function switchTab(tabName) {
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 모든 콘텐츠 패널 숨김
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // 선택된 탭 활성화
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-content`).classList.add('active');
}

// 콘텐츠 복사
async function copyContent(target) {
  let element;

  switch(target) {
    case 'shorts':
      element = elements.shortsText;
      break;
    case 'blog':
      element = elements.blogText;
      break;
    case 'thread':
      element = elements.threadText;
      break;
  }

  // HTML에서 텍스트만 추출 (태그 제거)
  const text = element.innerText || element.textContent;

  try {
    await navigator.clipboard.writeText(text);
    showStatus('클립보드에 복사되었습니다!', 'success');
  } catch (error) {
    showStatus('복사에 실패했습니다.', 'error');
    console.error('복사 오류:', error);
  }
}

// UI 헬퍼 함수
function showApiKeySection() {
  elements.apiKeySection.classList.remove('hidden');
  // 모든 탭 컨텐츠에 blur 추가
  document.querySelectorAll('.main-tab-content').forEach(tab => {
    tab.classList.add('blur');
  });
}

function hideApiKeySection() {
  elements.apiKeySection.classList.add('hidden');
  // 모든 탭 컨텐츠에서 blur 제거
  document.querySelectorAll('.main-tab-content').forEach(tab => {
    tab.classList.remove('blur');
  });
}

function showLoading() {
  elements.loadingSection.classList.remove('hidden');
  elements.generateBtn.disabled = true;
}

function hideLoading() {
  elements.loadingSection.classList.add('hidden');
  elements.generateBtn.disabled = false;
}

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.style.display = 'block';

  // 3초 후 자동 숨김
  setTimeout(() => {
    hideStatus();
  }, 3000);
}

function hideStatus() {
  elements.statusMessage.style.display = 'none';
}

// 테마 관련 함수
async function loadTheme() {
  const result = await chrome.storage.local.get(['theme']);
  const theme = result.theme || 'dark';

  if (theme === 'light') {
    document.body.classList.add('light-mode');
    elements.themeToggleBtn.textContent = '☀️';
    elements.logoIcon.src = 'icons/bsd-color.png';
  } else {
    document.body.classList.remove('light-mode');
    elements.themeToggleBtn.textContent = '🌙';
    elements.logoIcon.src = 'icons/bsd-white.png';
  }
}

async function toggleTheme() {
  const isLightMode = document.body.classList.contains('light-mode');

  if (isLightMode) {
    // 다크 모드로 전환
    document.body.classList.remove('light-mode');
    elements.themeToggleBtn.textContent = '🌙';
    elements.logoIcon.src = 'icons/bsd-white.png';
    await chrome.storage.local.set({ theme: 'dark' });
  } else {
    // 라이트 모드로 전환
    document.body.classList.add('light-mode');
    elements.themeToggleBtn.textContent = '☀️';
    elements.logoIcon.src = 'icons/bsd-color.png';
    await chrome.storage.local.set({ theme: 'light' });
  }
}

// =================
// 메인 탭 전환 기능
// =================

function setupMainTabListeners() {
  console.log('Setting up main tab listeners...');
  
  // 메인 탭 버튼 이벤트 리스너
  const tabButtons = document.querySelectorAll('.main-tab-btn');
  console.log('Found tab buttons:', tabButtons.length);
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.mainTab;
      console.log('Tab clicked:', tabName);
      switchMainTab(tabName);
    });
  });
}

function switchMainTab(tabName) {
  console.log('Switching to tab:', tabName);

  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 모든 콘텐츠 숨김
  document.querySelectorAll('.main-tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // kebab-case를 camelCase로 변환 (예: "content-generator" → "contentGenerator")
  const tabIdBase = tabName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const tabContentId = `${tabIdBase}Tab`;

  // 선택된 탭 활성화
  const tabButton = document.querySelector(`[data-main-tab="${tabName}"]`);
  const tabContent = document.getElementById(tabContentId);

  console.log('Tab button:', tabButton);
  console.log('Tab content ID:', tabContentId, '→', tabContent);

  if (tabButton) {
    tabButton.classList.add('active');
  }

  if (tabContent) {
    tabContent.classList.add('active');
  }

  // 검색량 탭으로 전환 시 서버 상태 체크 (keyword-functions.js에서 정의됨)
  if (tabName === 'keyword-analyzer' && typeof checkKeywordServerConnection === 'function') {
    checkKeywordServerConnection();
  }
}
