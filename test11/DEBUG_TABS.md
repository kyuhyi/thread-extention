# 🔍 탭 전환 문제 디버깅 가이드

## 🚨 발생한 문제

1. **월간 검색량 탭 클릭 시**: 키워드 입력창이 보이지 않음
2. **다시 AI 콘텐츠 생성 탭으로 전환 시**: 아무것도 보이지 않음

---

## 🔧 즉시 확인 사항

### 1단계: 확장 프로그램 재로드
```
chrome://extensions (또는 whale://extensions)
→ "바이브 콘텐츠 메이커" 찾기
→ 새로고침 버튼 (🔄) 클릭
```

### 2단계: 개발자 도구 열기
```
확장 프로그램 아이콘 클릭
→ 팝업에서 우클릭
→ "검사" 또는 "Inspect" 선택
```

### 3단계: 콘솔에서 확인
다음 명령어들을 하나씩 입력하여 확인:

```javascript
// 1. 탭 요소가 존재하는지 확인
console.log('Content Tab:', document.getElementById('contentGeneratorTab'));
console.log('Keyword Tab:', document.getElementById('keywordAnalyzerTab'));

// 2. 탭 버튼이 존재하는지 확인
console.log('Tab Buttons:', document.querySelectorAll('.main-tab-btn'));

// 3. switchMainTab 함수가 정의되어 있는지 확인
console.log('switchMainTab:', typeof switchMainTab);

// 4. 수동으로 탭 전환 테스트
switchMainTab('keyword-analyzer');

// 5. 현재 활성화된 탭 확인
console.log('Active tabs:', document.querySelectorAll('.main-tab-content.active'));
```

---

## 🎯 예상 원인 및 해결책

### 원인 1: CSS `display: none` + `padding` 문제
**증상**: 탭은 전환되지만 내용이 보이지 않음
**확인 방법**:
```javascript
const tab = document.getElementById('keywordAnalyzerTab');
console.log('Computed style:', window.getComputedStyle(tab).display);
console.log('Has active class:', tab.classList.contains('active'));
```

**해결책**: ✅ 이미 수정됨 - `styles.css`에 `padding: 20px` 추가됨

### 원인 2: 이벤트 리스너가 등록되지 않음
**증상**: 탭 버튼 클릭 시 아무 반응 없음
**확인 방법**:
```javascript
// 버튼에 클릭 이벤트가 있는지 확인
const btns = document.querySelectorAll('.main-tab-btn');
btns.forEach((btn, i) => {
  console.log(`Button ${i}:`, btn, 'data-main-tab:', btn.dataset.mainTab);
});
```

**해결책**:
확장 프로그램 재로드 후 확인 필요

### 원인 3: `switchMainTab` 함수가 로드되지 않음
**증상**: `switchMainTab is not defined` 오류
**확인 방법**:
```javascript
console.log(typeof switchMainTab); // "function"이어야 함
```

**해결책**:
`keyword-functions.js`가 제대로 로드되었는지 확인
- Network 탭에서 `keyword-functions.js` 로드 상태 확인
- Console에서 로드 오류 메시지 확인

---

## 🧪 단계별 테스트

### 테스트 1: HTML 구조 확인
```javascript
// Elements 탭에서 확인
// <div id="contentGeneratorTab" class="main-tab-content active"> 가 있어야 함
// <div id="keywordAnalyzerTab" class="main-tab-content"> 가 있어야 함
```

### 테스트 2: CSS 적용 확인
```javascript
const keywordTab = document.getElementById('keywordAnalyzerTab');
const styles = window.getComputedStyle(keywordTab);
console.log('Display:', styles.display); // "none" 또는 "block"
console.log('Padding:', styles.padding); // "20px"이어야 함
```

### 테스트 3: 탭 전환 수동 실행
```javascript
// 월간 검색량으로 전환
switchMainTab('keyword-analyzer');

// 다시 AI 콘텐츠 생성으로 전환
switchMainTab('content-generator');
```

### 테스트 4: 입력창 표시 확인
```javascript
const keywordInput = document.getElementById('keywordInput');
console.log('Keyword input:', keywordInput);
console.log('Visible:', keywordInput ? window.getComputedStyle(keywordInput).display : 'not found');
```

---

## ✅ 정상 작동 시 예상 결과

### AI 콘텐츠 생성 탭 (기본)
```html
<div id="contentGeneratorTab" class="main-tab-content active" style="display: block; padding: 20px;">
  <!-- 유튜브 썸네일, 생성 버튼 등이 보여야 함 -->
</div>
```

### 월간 검색량 탭 (클릭 후)
```html
<div id="keywordAnalyzerTab" class="main-tab-content active" style="display: block; padding: 20px;">
  <input id="keywordInput" type="text" placeholder="키워드를 입력하세요">
  <button id="keywordSearchBtn">검색</button>
  <!-- 차트, 테이블 등이 보여야 함 -->
</div>
```

---

## 🔨 긴급 수정 방법

만약 여전히 작동하지 않는다면, 콘솔에서 직접 실행:

```javascript
// 1. 강제로 탭 전환
document.getElementById('contentGeneratorTab').classList.remove('active');
document.getElementById('keywordAnalyzerTab').classList.add('active');

// 2. 강제로 display 속성 변경
document.getElementById('keywordAnalyzerTab').style.display = 'block';
document.getElementById('keywordAnalyzerTab').style.padding = '20px';

// 3. 입력창 확인
const input = document.getElementById('keywordInput');
console.log('Input element:', input);
console.log('Parent visible:', input.parentElement.style.display);
```

---

## 📋 체크리스트

테스트 순서대로 체크:

- [ ] 확장 프로그램 재로드 완료
- [ ] 개발자 도구 열기 완료
- [ ] `contentGeneratorTab` 요소 존재 확인
- [ ] `keywordAnalyzerTab` 요소 존재 확인
- [ ] `switchMainTab` 함수 정의 확인
- [ ] 탭 버튼에 `data-main-tab` 속성 있음 확인
- [ ] 이벤트 리스너 등록 확인
- [ ] 수동 탭 전환 테스트 성공
- [ ] 키워드 입력창 표시 확인
- [ ] 양방향 탭 전환 성공

---

## 📞 여전히 문제가 있다면

다음 정보를 확인해주세요:

```javascript
// 전체 상태 덤프
console.log('=== DEBUG INFO ===');
console.log('Content tab exists:', !!document.getElementById('contentGeneratorTab'));
console.log('Keyword tab exists:', !!document.getElementById('keywordAnalyzerTab'));
console.log('Tab buttons count:', document.querySelectorAll('.main-tab-btn').length);
console.log('switchMainTab defined:', typeof switchMainTab);
console.log('Active tabs:', document.querySelectorAll('.main-tab-content.active').length);
console.log('Keyword input exists:', !!document.getElementById('keywordInput'));
```

이 정보를 공유해주시면 추가 디버깅이 가능합니다.

---

## 🎁 보너스: 테스트 페이지

간단한 탭 전환 테스트를 위한 독립 페이지를 제공했습니다:
- `test-tabs.html` - 브라우저에서 직접 열어서 테스트 가능

이 페이지가 정상 작동한다면, 확장 프로그램 내 문제는 JavaScript 로드 순서나 이벤트 리스너 타이밍 문제일 가능성이 높습니다.
