# 🚀 바이브 콘텐츠 메이커

AI 콘텐츠 생성 및 네이버 월간 키워드 검색량 분석을 통합한 크롬/웨일 확장 프로그램

## 📋 주요 기능

### 1️⃣ AI 콘텐츠 생성
- **유튜브 숏츠 시나리오**: 60초 분량의 대본 (후킹 멘트, 전개, 클로징)
- **블로그 게시글**: 2000자 내외의 완성된 포스팅 (제목, 본문, 해시태그)
- **스레드 짧은 글**: 임팩트 있는 짧은 글 (150-300자)

### 2️⃣ 월간 검색량 분석
- **키워드 검색**: 네이버 월간 검색량 조회
- **연관 키워드**: 최대 10개 연관 키워드 자동 분석
- **시각화 차트**: PC/모바일 검색량 비율 차트
- **검색 데이터**: PC, 모바일, 총 검색량 테이블

## 🎯 설치 방법

### 1단계: 확장 프로그램 설치
1. 이 프로젝트 폴더 다운로드
2. 크롬/웨일 브라우저에서 `chrome://extensions` 또는 `whale://extensions` 접속
3. 우측 상단 "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 이 프로젝트 폴더 선택

### 2단계: API 키 설정

#### Gemini API 키 (AI 콘텐츠 생성용)
1. [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) 접속
2. API 키 발급
3. 확장 프로그램 설정에서 입력

#### 네이버 검색광고 API (검색량 분석용)
1. [https://searchad.naver.com/](https://searchad.naver.com/) 접속 및 회원가입
2. API 관리 > API 인증키 발급
3. `.env.example` 파일을 `.env`로 복사
4. 발급받은 값으로 수정:
```env
NAVER_CLIENT_ID=발급받은_클라이언트_ID
NAVER_CLIENT_SECRET=발급받은_시크릿_키
CUSTOMER_ID=발급받은_고객_ID
```

### 3단계: Python 환경 설정 (검색량 기능 사용 시)
```bash
# Python 패키지 설치
pip install flask flask-cors requests python-dotenv

# 서버 실행 (방법 1: 배치 파일)
start_server.bat

# 서버 실행 (방법 2: 직접 실행)
python server.py
```

## 🎨 사용 방법

### AI 콘텐츠 생성
1. 원하는 웹페이지 방문
2. 텍스트 선택 (선택하지 않으면 페이지 전체 분석)
3. 확장 프로그램 아이콘 클릭
4. "AI 콘텐츠 생성" 탭에서 "이 페이지 콘텐츠 분석하기" 버튼 클릭
5. 생성된 콘텐츠 확인 및 복사

### 월간 검색량 분석
1. 확장 프로그램 아이콘 클릭
2. "월간 검색량" 탭 클릭
3. Python 서버 실행 (`start_server.bat` 또는 `python server.py`)
4. 키워드 입력 후 검색 버튼 클릭
5. 검색량 데이터 및 차트 확인

## 📁 프로젝트 구조

```
test11/
├── manifest.json           # 확장 프로그램 설정
├── popup.html              # 팝업 UI
├── popup.js                # AI 콘텐츠 생성 로직
├── keyword-functions.js    # 검색량 분석 로직
├── styles.css              # 통합 스타일
├── background.js           # 백그라운드 서비스 워커
├── content.js              # 콘텐츠 스크립트
├── server.py               # Python 백엔드 서버
├── start_server.bat        # 서버 실행 스크립트
├── .env.example            # 환경 변수 예시
└── icons/                  # 아이콘 파일들
```

## ⚙️ 기술 스택

### 프론트엔드
- HTML/CSS/JavaScript
- Chrome Extension Manifest V3
- Chart.js (차트 라이브러리)

### 백엔드
- Python Flask
- 네이버 검색광고 API
- Gemini 2.0 Flash API

## 🔧 문제 해결

### 서버가 실행되지 않는 경우
- Python이 설치되어 있는지 확인
- 필요한 패키지가 설치되었는지 확인: `pip install flask flask-cors requests python-dotenv`
- `.env` 파일이 올바르게 설정되었는지 확인

### API 키 오류
- Gemini API 키: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)에서 재확인
- 네이버 API 키: [https://searchad.naver.com/](https://searchad.naver.com/)에서 재확인

### 검색량이 표시되지 않는 경우
- Python 서버가 실행 중인지 확인
- 네이버 검색광고 계정이 활성화되어 있는지 확인
- `.env` 파일의 API 키가 정확한지 확인

## 📝 라이선스

MIT License

## 🙏 도움말

문의사항이 있으시면 확장 프로그램 하단의 "문의하기" 버튼을 클릭해주세요.

---

**제작**: BSD Class
**버전**: 1.1.0
**업데이트**: 2025-05-01
