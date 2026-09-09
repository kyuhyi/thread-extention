# 🚨 긴급 수정 가이드

## 증상
- 첫 화면에서는 모든 것이 정상 표시됨
- 탭 전환 후 다시 돌아오면 콘텐츠가 사라짐
- "월간 검색량" 탭에서 키워드 입력창이 보이지 않음

## 🔍 즉시 확인사항

확장 프로그램을 열고 F12(개발자 도구)를 누른 후, Console에 다음을 입력:

```javascript
// 1. 요소들이 존재하는지 확인
console.log('Content tab:', document.getElementById('contentGeneratorTab'));
console.log('Keyword tab:', document.getElementById('keywordAnalyzerTab'));

// 2. 클래스 확인
const contentTab = document.getElementById('contentGeneratorTab');
const keywordTab = document.getElementById('keywordAnalyzerTab');
console.log('Content tab classes:', contentTab.className);
console.log('Keyword tab classes:', keywordTab.className);

// 3. display 스타일 확인
console.log('Content display:', window.getComputedStyle(contentTab).display);
console.log('Keyword display:', window.getComputedStyle(keywordTab).display);
```

## 🔧 임시 해결 방법 (콘솔에서 실행)

### 방법 1: 강제로 탭 표시
```javascript
// 월간 검색량 탭 강제 표시
const keywordTab = document.getElementById('keywordAnalyzerTab');
keywordTab.classList.add('active');
keywordTab.style.display = 'block';
keywordTab.classList.remove('blur');

// AI 콘텐츠 생성 탭 숨김
const contentTab = document.getElementById('contentGeneratorTab');
contentTab.classList.remove('active');
```

### 방법 2: blur 클래스 모두 제거
```javascript
document.querySelectorAll('.blur').forEach(el => {
  el.classList.remove('blur');
});
```

### 방법 3: 탭 전환 수동 실행
```javascript
// 이 함수가 정의되어 있다면
if (typeof switchMainTab === 'function') {
  switchMainTab('keyword-analyzer');
} else {
  console.error('switchMainTab is not defined!');
}
```

## 📋 체크리스트

확인해야 할 사항:

1. **확장 프로그램 재로드 했는가?**
   - [ ] chrome://extensions에서 새로고침 버튼 클릭함

2. **Console에 오류가 있는가?**
   - [ ] Console 탭 확인함
   - [ ] 빨간색 오류 메시지 없음

3. **탭 요소가 존재하는가?**
   - [ ] `contentGeneratorTab` 존재
   - [ ] `keywordAnalyzerTab` 존재

4. **이벤트 리스너가 등록되었는가?**
   ```javascript
   console.log('Setting up main tab listeners...');
   console.log('Found tab buttons: 2');
   console.log('Keyword functions initialized');
   ```

## 🎯 근본 원인 분석

### 가능성 1: blur 클래스 문제
- `showApiKeySection()`이 호출되면 blur 추가
- `hideApiKeySection()`이 제대로 호출되지 않으면 blur 남아있음

**해결**: ✅ 수정 완료 - 모든 탭에서 blur 제거하도록 변경

### 가능성 2: display 스타일 충돌
- CSS `display: none`이 우선순위가 높아서 `display: block`을 덮어씀

**확인**:
```javascript
const tab = document.getElementById('keywordAnalyzerTab');
console.log('Inline style:', tab.style.display);
console.log('Computed style:', window.getComputedStyle(tab).display);
```

### 가능성 3: active 클래스가 제대로 토글되지 않음

**확인**:
```javascript
document.querySelectorAll('.main-tab-content').forEach((tab, i) => {
  console.log(`Tab ${i}:`, tab.id, 'active:', tab.classList.contains('active'));
});
```

## 🔨 완전한 리셋 (최후의 수단)

Console에서 실행:

```javascript
// 1. 모든 blur 제거
document.querySelectorAll('.blur').forEach(el => el.classList.remove('blur'));

// 2. 모든 탭 초기화
document.querySelectorAll('.main-tab-content').forEach(tab => {
  tab.classList.remove('active');
  tab.style.display = 'none';
});

// 3. AI 콘텐츠 생성 탭 활성화
const contentTab = document.getElementById('contentGeneratorTab');
contentTab.classList.add('active');
contentTab.style.display = 'block';

// 4. 탭 버튼 초기화
document.querySelectorAll('.main-tab-btn').forEach(btn => {
  btn.classList.remove('active');
});
document.querySelector('[data-main-tab="content-generator"]').classList.add('active');
```

## 📞 디버그 정보 수집

다음 정보를 콘솔에 복사해서 전체 상태를 확인:

```javascript
console.log('=== COMPLETE DEBUG INFO ===');
console.log('Tab Elements:');
console.log('  contentGeneratorTab:', !!document.getElementById('contentGeneratorTab'));
console.log('  keywordAnalyzerTab:', !!document.getElementById('keywordAnalyzerTab'));

console.log('\nTab Classes:');
document.querySelectorAll('.main-tab-content').forEach(tab => {
  console.log(`  ${tab.id}:`, tab.className);
});

console.log('\nTab Buttons:');
document.querySelectorAll('.main-tab-btn').forEach(btn => {
  console.log(`  ${btn.textContent.trim()}:`, btn.className, 'data-main-tab:', btn.dataset.mainTab);
});

console.log('\nFunctions:');
console.log('  switchMainTab:', typeof switchMainTab);
console.log('  setupMainTabListeners:', typeof setupMainTabListeners);
console.log('  searchKeyword:', typeof searchKeyword);

console.log('\nBlurred Elements:');
console.log('  Count:', document.querySelectorAll('.blur').length);
document.querySelectorAll('.blur').forEach(el => {
  console.log('  -', el.id || el.className);
});

console.log('\nKeyword Input:');
const input = document.getElementById('keywordInput');
console.log('  Exists:', !!input);
if (input) {
  console.log('  Visible:', window.getComputedStyle(input).display !== 'none');
  console.log('  Parent display:', window.getComputedStyle(input.parentElement).display);
}
console.log('===========================');
```

---

**이 정보를 공유해주시면 정확한 문제를 파악할 수 있습니다!**
