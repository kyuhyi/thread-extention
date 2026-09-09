# 🚨 확장프로그램 강제 재시작 방법

## ⚡ 즉시 해결 (3단계)

### 1️⃣ Service Worker 중지

1. 크롬 주소창에 입력:
   ```
   chrome://extensions/
   ```

2. **"바이브 콘텐츠 메이커"** 찾기

3. **"Service Worker"** 옆에 있는 **파란색 링크** 클릭
   - 예: `Service Worker (활성)`

4. DevTools 창이 열리면 **우클릭** → **"중지"** 또는 **"Stop"**

---

### 2️⃣ 확장프로그램 다시 로드

1. `chrome://extensions/` 페이지로 돌아가기

2. **"바이브 콘텐츠 메이커"** 카드에서 **↻ (다시 로드)** 버튼 클릭

---

### 3️⃣ 확인

1. 확장프로그램 아이콘 클릭

2. DevTools 콘솔 확인:
   - **F12** 누르기
   - Console 탭에서 에러 메시지 확인
   - `gemini-1.5-flash` 사용 확인

---

## 🔥 그래도 안 되면 (완전 초기화)

### 방법 A: 확장프로그램 제거 후 재설치

1. `chrome://extensions/` 접속

2. **"제거"** 버튼 클릭 (바이브 콘텐츠 메이커)

3. **크롬 완전 종료** (모든 창 닫기)

4. 크롬 다시 시작

5. `chrome://extensions/` 접속

6. **"압축해제된 확장 프로그램을 로드합니다"** 클릭

7. 폴더 선택:
   ```
   C:\project\쓰레드,키워드검색 자동화\test11
   ```

---

### 방법 B: 캐시 완전 삭제

1. `chrome://extensions/` 접속

2. 확장프로그램 **ID** 복사
   - 예: `abcdefghijklmnopqrstuvwxyz123456`

3. 다음 폴더로 이동:
   ```
   %LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions
   ```

4. 확장프로그램 ID 폴더 **삭제**

5. 크롬 재시작

6. 확장프로그램 다시 로드

---

## ✅ 정상 동작 확인

콘솔에 다음 메시지가 나타나야 합니다:

```
Using Gemini API: gemini-1.5-flash
AI 콘텐츠 생성기가 설치되었습니다.
```

**에러가 여전히 `gemini-2.0-flash-exp`를 언급하면 Service Worker가 제대로 중지되지 않은 것입니다.**

---

## 🎯 빠른 체크리스트

- [ ] Service Worker 중지 (`chrome://extensions/`)
- [ ] 확장프로그램 다시 로드 (↻ 버튼)
- [ ] 확장프로그램 아이콘 클릭
- [ ] F12 → Console 확인
- [ ] `gemini-1.5-flash` 사용 확인

---

**문제가 계속되면 크롬을 완전히 재시작하세요!**
