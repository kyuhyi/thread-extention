// Background Service Worker: Gemini API 호출 처리

// Gemini API 설정
// gemini-2.5-flash: Google Gemini 2.5 Flash 모델
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// 서버 설정
const SERVER_URL = 'http://localhost:5000';
let serverCheckInterval = null;

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateContent') {
    generateContentWithGemini(request.apiKey, request.selectedText)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 비동기 응답을 위해 true 반환
  }
});

// Gemini API로 콘텐츠 생성
async function generateContentWithGemini(apiKey, selectedText) {
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
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API 호출에 실패했습니다.');
    }

    const data = await response.json();

    // 응답에서 텍스트 추출
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('AI 응답을 받지 못했습니다.');
    }

    // JSON 파싱 시도
    return parseGeneratedContent(generatedText);

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

2. **블로그 게시글** (1500-2000자):
   - SEO 최적화 제목
   - 서론 → 본론 → 결론 구조
   - 읽기 쉬운 문단 구성
   - 마지막에 해시태그 3-5개

3. **스레드 짧은 글** (150-300자):
   - 첫 문장에 강한 임팩트
   - SNS 바이럴 톤앤매너
   - 이모지 2-3개 활용

**중요: 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명을 절대 추가하지 마세요.**

{
  "shorts_script": "유튜브 숏츠 대본",
  "blog_post": "블로그 게시글",
  "thread_post": "스레드 짧은 글"
}`;
}

// 생성된 콘텐츠 파싱
function parseGeneratedContent(text) {
  try {
    console.log('=== 원본 AI 응답 ===');
    console.log(text);
    console.log('==================');

    // 1단계: 코드 블록 제거 (```json ... ```, ``` ... ```)
    let cleanedText = text
      .replace(/```json\s*/gi, '')
      .replace(/```javascript\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // 2단계: JSON 객체 추출 (중괄호 기반)
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1);

      console.log('=== 추출된 JSON ===');
      console.log(jsonString);
      console.log('==================');

      const parsed = JSON.parse(jsonString);

      // 필수 필드 확인
      if (parsed.shorts_script && parsed.blog_post && parsed.thread_post) {
        console.log('✅ JSON 파싱 성공');

        // 문단 포맷팅 적용
        return {
          shorts_script: formatContent(parsed.shorts_script),
          blog_post: formatContent(parsed.blog_post),
          thread_post: formatContent(parsed.thread_post)
        };
      } else {
        console.warn('⚠️ JSON 필드 누락:', Object.keys(parsed));
      }
    }

    // JSON 파싱 실패 시 텍스트 기반 파싱 시도
    console.warn('❌ JSON 파싱 실패, 대체 파싱 사용');
    return fallbackParsing(text);

  } catch (error) {
    console.error('❌ 파싱 오류:', error);
    return fallbackParsing(text);
  }
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

  console.log('=== 포맷팅 후 ===');
  console.log(formatted);
  console.log('================');

  return formatted;
}

// 대체 파싱 방법
function fallbackParsing(text) {
  console.warn('⚠️ Fallback 파싱 사용 (JSON 파싱 실패)');

  // JSON 키워드로 분리 시도
  const shortsMatch = text.match(/"shorts_script"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
  const blogMatch = text.match(/"blog_post"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
  const threadMatch = text.match(/"thread_post"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);

  if (shortsMatch || blogMatch || threadMatch) {
    console.log('✅ JSON 키워드 기반 추출 성공');
    return {
      shorts_script: shortsMatch ? shortsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '생성 실패',
      blog_post: blogMatch ? blogMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '생성 실패',
      thread_post: threadMatch ? threadMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '생성 실패'
    };
  }

  // 최후의 수단: 길이 기반 분리
  console.warn('⚠️ 길이 기반 분리 사용');
  const cleanText = text.replace(/```json|```|{|}|"shorts_script"|"blog_post"|"thread_post"|:/g, '').trim();
  const sections = cleanText.split(/\n\n+/).filter(s => s.length > 50);

  return {
    shorts_script: sections[0] || '생성 실패',
    blog_post: sections[1] || '생성 실패',
    thread_post: sections[2] || '생성 실패'
  };
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
