"""로컬 확장 프로그램 전용 이미지 작업 API."""
import base64
import io
import re
import zipfile
from flask import Blueprint, jsonify, request, send_file
from .service import ImageJobs, auth_status, read_png


def create_blueprint(root):
    api = Blueprint('blog_images', __name__, url_prefix='/blog-images')
    jobs = ImageJobs(root)
    api.jobs = jobs

    @api.before_request
    def local_client_only():
        host = request.host.split(':')[0]
        origin = request.headers.get('Origin', '')
        trusted_origin = not origin or re.fullmatch(r'chrome-extension://[a-p]{32}', origin) or origin == request.host_url.rstrip('/')
        if host not in ('localhost', '127.0.0.1') or not trusted_origin:
            return jsonify(error='로컬 확장 프로그램에서만 사용할 수 있습니다.'), 403
        if request.method != 'OPTIONS' and request.headers.get('X-Blog-Client') != 'webtoon-v1':
            return jsonify(error='잘못된 클라이언트 요청입니다.'), 403
        if request.content_length and request.content_length > 256 * 1024:
            return jsonify(error='요청 크기가 너무 큽니다.'), 413

    @api.errorhandler(ValueError)
    def invalid(error):
        return jsonify(error=str(error)), 400

    @api.errorhandler(KeyError)
    def missing(error):
        return jsonify(error='저장된 작업을 찾을 수 없습니다. 이미지를 다시 생성해주세요.'), 404

    @api.get('/status')
    def status():
        return jsonify(auth_status())

    @api.post('/jobs')
    def create():
        return jsonify(jobs.create(request.get_json())), 202

    @api.get('/jobs/<job_id>')
    def get(job_id):
        return jsonify(jobs.get(job_id))

    @api.post('/jobs/<job_id>/retry')
    def retry(job_id):
        jobs.get(job_id)
        return jsonify(jobs.retry(job_id)), 202

    @api.get('/jobs/<job_id>/images/<int:index>')
    def image(job_id, index):
        job = jobs.get(job_id)
        if index >= len(job['scenes']) or job['scenes'][index]['status'] != 'completed':
            raise ValueError('아직 완성되지 않은 이미지입니다.')
        data = read_png(jobs.directory(job_id) / f'{index}.png')
        return jsonify(index=index, src='data:image/png;base64,' + base64.b64encode(data).decode('ascii'))

    @api.get('/jobs/<job_id>/download')
    def download(job_id):
        job = jobs.get(job_id)
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
            output.writestr('본문.txt', job['text'])
            for scene in job['scenes']:
                if scene['status'] == 'completed':
                    output.writestr(f'웹툰-{scene["index"] + 1:02}.png', read_png(jobs.directory(job_id) / f'{scene["index"]}.png'))
        archive.seek(0)
        return send_file(archive, mimetype='application/zip', as_attachment=True, download_name='blog-webtoon.zip')

    return api
