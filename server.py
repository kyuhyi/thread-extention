import sys
sys.dont_write_bytecode = True  # 확장 폴더에 예약 이름인 __pycache__를 만들지 않는다.

from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import requests
import os
import hashlib
import hmac
import base64
import time
import sys
import logging
from dotenv import load_dotenv
from pathlib import Path
from features.codex_images.routes import create_blueprint

load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr  # stderr로 출력
)

app = Flask(__name__)
CORS(app)
app.register_blueprint(create_blueprint(Path(__file__).parent / 'output' / 'blog-images'))


@app.get('/blog-editor.html')
def blog_editor():
    return send_from_directory(Path(__file__).parent, 'blog-editor.html')


@app.get('/features/blog-images/<name>')
def blog_editor_asset(name):
    if name not in ('blog.css', 'document.js', 'storage.js', 'encoding.js', 'controller.js', 'editor.js'):
        abort(404)
    return send_from_directory(Path(__file__).parent / 'features' / 'blog-images', name)

# 네이버 광고 API 설정
NAVER_ACCESS_LICENSE = os.getenv('NAVER_CLIENT_ID', '')
NAVER_SECRET_KEY = os.getenv('NAVER_CLIENT_SECRET', '')
CUSTOMER_ID = os.getenv('CUSTOMER_ID', '')

def generate_signature(timestamp, method, uri, secret_key):
    """네이버 광고 API 서명 생성"""
    # 네이버 광고 API 서명 형식: timestamp.method.uri (베이스 경로만, 쿼리 제외)
    message = f"{timestamp}.{method}.{uri}"
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return base64.b64encode(signature).decode('utf-8')

@app.route('/search', methods=['GET'])
def search_keyword():
    """네이버 광고 API를 사용한 키워드 검색량 조회"""
    keyword = request.args.get('keyword', '')

    if not keyword:
        return jsonify({'error': 'keyword parameter is required'}), 400

    # 헤더에서 API 키 가져오기 (없으면 .env 파일의 값 사용)
    naver_client_id = request.headers.get('X-Naver-Client-Id', NAVER_ACCESS_LICENSE)
    naver_secret_key = request.headers.get('X-Naver-Secret-Key', NAVER_SECRET_KEY)
    customer_id = request.headers.get('X-Naver-Customer-Id', CUSTOMER_ID)

    if not naver_client_id or not naver_secret_key or not customer_id:
        return jsonify({'error': 'NAVER API credentials not configured'}), 500

    try:
        # 네이버 광고 API - 연관 키워드 통계 API 사용
        timestamp = str(int(time.time() * 1000))
        method = 'GET'

        # RelKwdStat API 엔드포인트
        uri = '/keywordstool'
        params = {
            'hintKeywords': keyword,
            'showDetail': '1'
        }

        # 쿼리 스트링
        query_string = '&'.join([f'{k}={requests.utils.quote(str(v))}' for k, v in params.items()])

        # 서명 생성 시에는 베이스 URI만 사용 (쿼리 스트링 제외)
        signature = generate_signature(timestamp, method, uri, naver_secret_key)

        # 네이버 광고 API 베이스 URL
        base_url = 'https://api.naver.com'
        url = f'{base_url}{uri}?{query_string}'

        headers = {
            'X-Timestamp': timestamp,
            'X-API-KEY': naver_client_id,
            'X-Customer': customer_id,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        }

        print(f'\n=== API Request Debug ===')
        print(f'Keyword: {keyword}')
        print(f'Timestamp: {timestamp}')
        print(f'Method: {method}')
        print(f'URI for signature: {uri}')
        print(f'Full URL: {url}')
        print(f'========================\n')

        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            print(f'API Error: {response.status_code}')
            print(f'Response: {response.text}')
            print(f'Response Headers: {response.headers}')
            return jsonify({
                'error': f'Naver API error: {response.status_code}',
                'message': response.text
            }), response.status_code

        result = response.json()
        print(f'API Response: {result}')

        # API 응답에서 검색량 추출
        if result and 'keywordList' in result and len(result['keywordList']) > 0:
            keyword_data = result['keywordList'][0]

            # 연관 키워드도 함께 반환 (첫 번째는 메인 키워드이므로 제외)
            related_keywords = []
            if len(result['keywordList']) > 1:
                related_keywords = [
                    {
                        'keyword': item.get('relKeyword', ''),
                        'pc': item.get('monthlyPcQcCnt', 0),
                        'mobile': item.get('monthlyMobileQcCnt', 0)
                    }
                    for item in result['keywordList'][1:11]  # 최대 10개
                ]

            return jsonify({
                'keyword': keyword_data.get('relKeyword', keyword),
                'pc': keyword_data.get('monthlyPcQcCnt', 0),
                'mobile': keyword_data.get('monthlyMobileQcCnt', 0),
                'relatedKeywords': related_keywords
            })
        else:
            # 데이터가 없을 경우 0 반환
            return jsonify({
                'keyword': keyword,
                'pc': 0,
                'mobile': 0,
                'relatedKeywords': []
            })

    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/related-keywords', methods=['GET'])
def get_related_keywords():
    """네이버 연관 키워드 조회"""
    keyword = request.args.get('keyword', '')

    if not keyword:
        return jsonify({'error': 'keyword parameter is required'}), 400

    # 헤더에서 API 키 가져오기 (없으면 .env 파일의 값 사용)
    naver_client_id = request.headers.get('X-Naver-Client-Id', NAVER_ACCESS_LICENSE)
    naver_secret_key = request.headers.get('X-Naver-Secret-Key', NAVER_SECRET_KEY)
    customer_id = request.headers.get('X-Naver-Customer-Id', CUSTOMER_ID)

    if not naver_client_id or not naver_secret_key or not customer_id:
        return jsonify({'error': 'NAVER API credentials not configured'}), 500

    try:
        # 네이버 광고 API 연관 키워드 조회
        timestamp = str(int(time.time() * 1000))
        method = 'GET'

        # RelKwdStat API 엔드포인트
        uri = '/keywordstool'
        params = {
            'hintKeywords': keyword,
            'showDetail': '1'
        }

        # 쿼리 스트링 생성
        query_string = '&'.join([f'{k}={requests.utils.quote(str(v))}' for k, v in params.items()])

        # 서명 생성 시에는 베이스 URI만 사용 (쿼리 스트링 제외) - /search와 동일한 방식
        signature = generate_signature(timestamp, method, uri, naver_secret_key)

        # 네이버 광고 API 베이스 URL
        base_url = 'https://api.naver.com'
        url = f'{base_url}{uri}?{query_string}'

        headers = {
            'X-Timestamp': timestamp,
            'X-API-KEY': naver_client_id,
            'X-Customer': customer_id,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        }

        print(f'\n=== Related Keywords API Request Debug ===')
        print(f'Keyword: {keyword}')
        print(f'URL: {url}')
        print(f'========================\n')

        response = requests.get(url, headers=headers)

        print(f'Related keywords API Status: {response.status_code}')

        if response.status_code != 200:
            print(f'Related keywords API Error Response: {response.text}')
            return jsonify([])

        result = response.json()
        print(f'Related keywords API Response: {result}')

        # 연관 키워드 추출 (첫 번째는 검색 키워드 자체이므로 제외, 최대 10개)
        if result and 'keywordList' in result:
            # 첫 번째 항목은 메인 키워드이므로 제외하고 나머지 최대 10개만 추출
            keywords = [item.get('relKeyword', '') for item in result['keywordList'][1:11]]
            print(f'Extracted related keywords ({len(keywords)}): {keywords}')
            return jsonify(keywords)
        else:
            print('No keywordList in response')
            return jsonify([])

    except Exception as e:
        print(f'Error getting related keywords: {e}')
        return jsonify([])

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'api_configured': bool(NAVER_ACCESS_LICENSE and NAVER_SECRET_KEY and CUSTOMER_ID)
    })

if __name__ == '__main__':
    import sys
    import io

    # Windows 콘솔 인코딩 설정
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    print('=' * 50)
    print('BSD 키워드 검색량 분석기 서버 시작')
    print('=' * 50)
    print(f'서버 주소: http://localhost:5000')
    api_status = 'OK' if NAVER_ACCESS_LICENSE and NAVER_SECRET_KEY and CUSTOMER_ID else 'NOT SET'
    print(f'API 설정 상태: {api_status}')
    print('=' * 50)
    app.run(host='127.0.0.1', debug=False, port=5000, threaded=True)
