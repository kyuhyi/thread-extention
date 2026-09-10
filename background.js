// Background Service Worker: Gemini API 호출 처리
importScripts('features/thread-post/format.js', 'features/content-generation/contract.js', 'features/shorts-post/format.js', 'features/blog-images/naver-connection.js');

// Gemini API 설정
// gemini-2.5-flash: Google Gemini 2.5 Flash 모델
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// 서버 설정
const SERVER_URL = 'http://localhost:5000';
let serverCheckInterval = null;

// 작업 상태는 팝업을 닫아도 저장되며, 완료된 응답만 본문으로 저장한다.
let activeGeneration = null;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'prepareNaverPaste') {
    NaverPasteConnection.prepare(chrome).then(sendResponse).catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (request.action === 'getContentGenerationState') {
    chrome.storage.local.get('contentGenerationState').then(async saved => {
      let state = saved.contentGenerationState;
      if (state?.status === 'generating' && !activeGeneration) {
        state = { ...state, status: 'error', error: '글 생성 연결이 중단되었습니다. 다시 생성해주세요.' };
        await chrome.storage.local.set({ contentGenerationState: state });
      }
      sendResponse({ state });
    });
    return true;
  }
  if (request.action === 'generateContent') {
    if (!activeGeneration) {
      const state = { id: crypto.randomUUID(), status: 'generating', startedAt: Date.now() };
      activeGeneration = (async () => {
        await chrome.storage.local.set({ contentGenerationState: state });
        try {
          const data = await generateContentWithGemini(request.apiKey, request.selectedText);
          const completed = { ...state, status: 'completed', data };
          await chrome.storage.local.set({ lastGeneratedContent: data, contentGenerationState: completed });
          return { success: true, data, state: completed };
        } catch (error) {
          const failed = { ...state, status: 'error', error: error.message };
          await chrome.storage.local.set({ contentGenerationState: failed });
          return { success: false, error: error.message, state: failed };
        }
      })().finally(() => { activeGeneration = null; });
    }
    activeGeneration.then(sendResponse).catch(() => sendResponse({ success: false, error: '생성 상태를 저장하지 못했습니다. 다시 시도해주세요.' }));
    return true;
  }
});

// Gemini API로 콘텐츠 생성
async function generateContentWithGemini(apiKey, selectedText, attempt = 0) {
  const prompt = createPrompt(selectedText);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { shorts_script: { type: "STRING" }, blog_post: { type: "STRING" }, thread_post: { type: "STRING" } },
            required: ["shorts_script", "blog_post", "thread_post"]
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API 호출에 실패했습니다.');
    }

    const data = await response.json();

    // 응답에서 텍스트 추출
    const generatedText = (data.candidates?.[0]?.content?.parts || []).filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');

    if (!generatedText) {
      if (attempt === 0) return generateContentWithGemini(apiKey, selectedText, 1);
      throw new Error('글 응답이 완성되지 않았습니다. 다시 생성해주세요.');
    }

    // JSON 파싱 시도
    let parsed;
    try { parsed = parseGeneratedContent(generatedText); }
    catch (error) {
      if (attempt === 0) return generateContentWithGemini(apiKey, selectedText, 1);
      throw error;
    }
    return { ...parsed, shorts_script: ShortsPost.format(parsed.shorts_script), thread_post: ThreadPost.format(parsed.thread_post) };

  } catch (error) {
    console.error('Gemini API 오류:', error);

    // API 키 오류 처리
    if (error.message.includes('API key')) {
      throw new Error('API 키가 올바르지 않습니다. 설정에서 확인해주세요.');
    }

    // 네트워크 오류 처리
    if (error.message.includes('fetch')) {
      throw new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }

    throw error;
  }
}

// 프롬프트 생성
function createPrompt(selectedText) {
  return `당신은 1인 지식사업가를 위한 콘텐츠 전문가입니다.
아래 원문을 분석하여 3가지 포맷의 콘텐츠를 생성하세요.

**원문:**
${selectedText}

**생성 규칙:**

1. **유튜브 숏츠 시나리오** (60초 분량):
   - 0-3초: 강력한 후킹 멘트
   - 3-43초: 핵심 메시지 전달
   - 43-60초: CTA (행동 유도)
   - 자연스러운 말투, 시간 표시 제거
   - 한 호흡에 읽을 짧은 문장으로 작성하고 문장마다 줄바꿈
   - 후킹 / 문제·공감 / 핵심 설명 / 마무리 행동 유도를 3~5개 문단으로 나눔
   - 한 문단은 1~2문장, 문단 사이에는 빈 줄을 반드시 한 줄 넣음
   - JSON 문자열에서 줄바꿈은 \\n, 문단 구분은 \\n\\n으로 표현. 한 덩어리 장문 금지
   - 따옴표는 실제 문자로 작성하고 &#39; 같은 HTML 문자 코드를 출력하지 않음

2. **블로그 게시글** (1500-2000자):
   - SEO 최적화 제목
   - 서론 → 본론 → 결론 구조
   - 읽기 쉬운 문단 구성
   - 마지막에 해시태그 3-5개

3. **스레드 짧은 글**:
   - 첫 줄은 눈길을 끄는 자연스러운 제목으로 작성하고 숫자(0-9)를 반드시 포함
   - 첫 줄은 공백과 숫자, 문장부호를 포함하여 15~18자를 목표로 작성하며 절대 18자를 넘기지 않음
   - 첫 줄 뒤에는 줄바꿈 두 번을 넣어 빈 줄을 정확히 한 줄 둔 뒤 본문 시작
   - 본문은 2~4개의 짧은 문장, 180자 이내. 스레드에 어울리는 간결한 대화체
   - 첫 문장은 호기심을 끌고, 본문은 구체적인 핵심과 짧은 여운 또는 질문으로 마무리
   - 원문에 없는 통계·금액·성과 수치를 지어내지 않음. 제목의 항목 수와 본문 내용은 일치
   - 마크다운 제목 기호나 과도한 이모지·해시태그를 쓰지 않음
   - JSON 문자열에는 첫 줄과 본문 사이를 \\n\\n으로 표현

**중요: 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명을 절대 추가하지 마세요.**

{
  "shorts_script": "유튜브 숏츠 대본",
  "blog_post": "블로그 게시글",
  "thread_post": "스레드 짧은 글"
}`;
}

// 생성된 콘텐츠 파싱
function parseGeneratedContent(text) {
  const parsed = ContentContract.parse(text);
  return ContentContract.validate(Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, formatContent(value)])));
}

// 콘텐츠 포맷팅 (가독성 개선)
function formatContent(content) {
  if (!content) return '';

  let formatted = content.trim();

  // JSON 이스케이프 문자 제거
  formatted = formatted
    .replace(/\\"/g, '"')      // \" → "
    .replace(/\\'/g, "'")      // \' → '
    .replace(/\\n/g, '\n')     // \n → 실제 줄바꿈
    .replace(/\\t/g, '')       // \t 제거
    .replace(/\\\\/g, '\\');   // \\ → \

  // 시간 표시 제거 ([0-3초], [3-43초] 등)
  formatted = formatted.replace(/\[[\d\-초]+\]\s*/g, '');

  // 3개 이상의 연속 줄바꿈을 2개로 정리
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // 제목 패턴 감지 후 줄바꿈 추가 (##, ###)
  formatted = formatted.replace(/^(#{1,3}\s+.+)$/gm, '\n$1\n');

  // 해시태그 앞에 줄바꿈 추가 (문장 중간이 아닐 때만)
  formatted = formatted.replace(/([.!?])\s*(#\S+)/g, '$1\n\n$2');

  // 불필요한 시작/끝 공백 제거
  formatted = formatted.trim();


  return formatted;
}

// 서버 상태 체크
async function checkServerStatus() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch (error) {
    return false;
  }
}

// 서버 시작 알림
async function notifyServerNotRunning() {
  const isRunning = await checkServerStatus();

  if (!isRunning) {
    chrome.notifications.create('server-not-running', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '바이브 콘텐츠 메이커',
      message: '백엔드 서버가 실행되지 않았습니다.\n\n월간 검색량 기능을 사용하려면 start_server.bat 파일을 실행해주세요.',
      priority: 2,
      requireInteraction: true
    });
  }
}

// 주기적 서버 상태 체크 시작
function startServerCheck() {
  // 즉시 한 번 체크
  notifyServerNotRunning();

  // 5분마다 체크 (300000ms)
  if (!serverCheckInterval) {
    serverCheckInterval = setInterval(async () => {
      const isRunning = await checkServerStatus();
      if (!isRunning) {
        // 서버가 꺼졌을 때만 알림 (너무 자주 알림 방지)
        chrome.storage.local.get(['lastServerNotification'], (result) => {
          const now = Date.now();
          const lastNotification = result.lastServerNotification || 0;

          // 마지막 알림으로부터 30분 이상 경과했을 때만 알림
          if (now - lastNotification > 30 * 60 * 1000) {
            notifyServerNotRunning();
            chrome.storage.local.set({ lastServerNotification: now });
          }
        });
      }
    }, 5 * 60 * 1000); // 5분
  }
}

// 설치 이벤트
chrome.runtime.onInstalled.addListener(() => {
  console.log('=================================================');
  console.log('🚀 AI 콘텐츠 생성기 v1.2.0 설치/업데이트 완료');
  console.log('📡 Gemini API URL:', GEMINI_API_URL);
  console.log('✅ 사용 모델: gemini-2.5-flash');
  console.log('=================================================');

  // 서버 상태 체크 시작
  startServerCheck();
});

// 확장프로그램 시작 시
chrome.runtime.onStartup.addListener(() => {
  console.log('=================================================');
  console.log('🔄 확장프로그램 시작됨');
  console.log('📡 Gemini API URL:', GEMINI_API_URL);
  console.log('✅ 사용 모델: gemini-2.5-flash');
  console.log('=================================================');

  // 서버 상태 체크 시작
  startServerCheck();
});
