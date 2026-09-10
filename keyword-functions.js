// =================
// 검색량 분석 기능
// =================

const SERVER_URL = 'http://localhost:5000';
let pieChart = null;

// 서버 연결 확인
async function checkKeywordServerConnection() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      showServerAlert(true);
      return false;
    }

    const data = await response.json();
    const isOnline = data.status === 'ok';
    showServerAlert(!isOnline);
    return isOnline;
  } catch (error) {
    console.error('Server connection failed:', error);
    showServerAlert(true);
    return false;
  }
}

// 서버 알림 표시/숨김
function showServerAlert(show) {
  const serverAlert = document.getElementById('serverAlert');
  if (serverAlert) {
    serverAlert.style.display = show ? 'block' : 'none';
  }
}

// 재시도 함수
async function fetchWithRetry(url, options, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// 파이 차트 생성
function createPieChart(pcTotal, mobileTotal) {
  const ctx = document.getElementById('pieChart').getContext('2d');

  if (pieChart) {
    pieChart.destroy();
  }

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['PC 검색량', '모바일 검색량'],
      datasets: [{
        data: [pcTotal, mobileTotal],
        backgroundColor: ['#36A2EB', '#FF6384'],
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: document.body.classList.contains('light-mode') ? '#1a1a1a' : '#e0e0e0'
          }
        }
      }
    }
  });
}

// 키워드 검색 기능
async function searchKeyword() {
  const keywordInput = document.getElementById('keywordInput');
  const keyword = keywordInput.value.trim();

  if (!keyword) {
    showKeywordStatus('키워드를 입력해주세요.', 'warning');
    return;
  }

  try {
    // 로딩 표시
    document.getElementById('keywordLoading').style.display = 'flex';
    document.getElementById('keywordSearchBtn').disabled = true;

    // 서버 연결 확인
    const isServerOnline = await checkKeywordServerConnection();
    if (!isServerOnline) {
      throw new Error('서버에 연결할 수 없습니다. start_server.bat 파일을 실행하거나 python server.py를 실행해주세요.');
    }

    // 네이버 API 키 가져오기
    const apiKeys = await chrome.storage.local.get(['naverClientId', 'naverSecretKey', 'naverCustomerId']);

    // API 키가 없으면 에러 메시지 표시
    if (!apiKeys.naverClientId || !apiKeys.naverSecretKey || !apiKeys.naverCustomerId) {
      throw new Error('네이버 API 키를 설정해주세요. (설정 버튼 ⚙️ 클릭)');
    }

    // API 호출 (네이버 API 키를 헤더에 포함)
    const mainKeywordData = await fetchWithRetry(
      `${SERVER_URL}/search?keyword=${encodeURIComponent(keyword)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Naver-Client-Id': apiKeys.naverClientId,
          'X-Naver-Secret-Key': apiKeys.naverSecretKey,
          'X-Naver-Customer-Id': apiKeys.naverCustomerId
        }
      }
    );

    console.log('API Response:', mainKeywordData);

    // 메인 키워드 데이터
    let mainKeywordResult = null;
    const relatedResults = [];

    if (mainKeywordData && mainKeywordData.keyword) {
      mainKeywordResult = {
        keyword: mainKeywordData.keyword.trim(),
        pc: mainKeywordData.pc || 0,
        mobile: mainKeywordData.mobile || 0,
        total: (mainKeywordData.pc || 0) + (mainKeywordData.mobile || 0)
      };

      // 연관 키워드
      if (mainKeywordData.relatedKeywords && mainKeywordData.relatedKeywords.length > 0) {
        mainKeywordData.relatedKeywords.forEach(item => {
          if (item.keyword && item.keyword.trim()) {
            relatedResults.push({
              keyword: item.keyword.trim(),
              pc: item.pc || 0,
              mobile: item.mobile || 0,
              total: (item.pc || 0) + (item.mobile || 0)
            });
          }
        });
      }
    }

    // 메인 키워드 테이블 업데이트
    if (mainKeywordResult) {
      const mainSection = document.getElementById('mainKeywordSection');
      const mainTbody = document.querySelector('#mainKeywordTable tbody');
      mainSection.style.display = 'block';
      mainTbody.innerHTML = '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${mainKeywordResult.keyword}</strong></td>
        <td>${mainKeywordResult.pc.toLocaleString()}</td>
        <td>${mainKeywordResult.mobile.toLocaleString()}</td>
        <td><strong>${mainKeywordResult.total.toLocaleString()}</strong></td>
      `;
      mainTbody.appendChild(row);
    }

    // 연관 키워드 테이블 업데이트
    if (relatedResults.length > 0) {
      const relatedSection = document.getElementById('relatedKeywordsSection');
      const relatedTbody = document.querySelector('#relatedKeywordsTable tbody');
      relatedSection.style.display = 'block';
      relatedTbody.innerHTML = '';

      // 총 검색량 기준 내림차순 정렬
      relatedResults.sort((a, b) => b.total - a.total);

      relatedResults.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${result.keyword}</td>
          <td>${result.pc.toLocaleString()}</td>
          <td>${result.mobile.toLocaleString()}</td>
          <td>${result.total.toLocaleString()}</td>
        `;
        relatedTbody.appendChild(row);
      });
    }

    // 차트 업데이트
    const allResults = [mainKeywordResult, ...relatedResults].filter(r => r !== null);
    if (allResults.length > 0) {
      const pcTotal = allResults.reduce((sum, item) => sum + item.pc, 0);
      const mobileTotal = allResults.reduce((sum, item) => sum + item.mobile, 0);
      createPieChart(pcTotal, mobileTotal);
    }

    showKeywordStatus('검색이 완료되었습니다.', 'success');

  } catch (error) {
    console.error('Keyword search error:', error);
    showKeywordStatus(error.message || '검색 중 오류가 발생했습니다.', 'error');
  } finally {
    document.getElementById('keywordLoading').style.display = 'none';
    document.getElementById('keywordSearchBtn').disabled = false;
  }
}

// 키워드 상태 메시지 표시
function showKeywordStatus(message, type) {
  const statusElement = document.getElementById('keywordStatusMessage');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// =================
// 초기화
// =================

// 키워드 검색 이벤트 리스너 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('Keyword functions initialized');

  // 키워드 검색 이벤트 리스너
  const keywordSearchBtn = document.getElementById('keywordSearchBtn');
  if (keywordSearchBtn) {
    keywordSearchBtn.addEventListener('click', searchKeyword);
    console.log('Keyword search button listener added');
  }

  // 키워드 입력 엔터키 지원
  const keywordInput = document.getElementById('keywordInput');
  if (keywordInput) {
    keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchKeyword();
      }
    });
    console.log('Keyword input listener added');
  }
});
