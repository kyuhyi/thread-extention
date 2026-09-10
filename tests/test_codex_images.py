import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
from PIL import Image
from features.codex_images.service import ImageJobs, validate_scenes, read_png
from features.codex_images.routes import create_blueprint
from flask import Flask


class ImageTests(unittest.TestCase):
    def test_error_message_is_not_an_article(self):
        with self.assertRaisesRegex(ValueError, '완성'):
            validate_scenes({'text': '생성 실패', 'scenes': [{'index': i, 'context': '생성 실패'} for i in range(5)]})

    def test_untrusted_scene_validation(self):
        with self.assertRaises(ValueError):
            validate_scenes({'text': '글', 'scenes': []})
        with self.assertRaises(ValueError):
            validate_scenes({'text': '글', 'scenes': [{'index': '../escape', 'context': '글'}] * 4})

    def test_image_bytes_are_actually_png(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'fake.png'
            target.write_text('not an image')
            with self.assertRaises(ValueError):
                read_png(target)
            Image.new('RGB', (256, 256)).save(target)
            self.assertTrue(read_png(target).startswith(b'\x89PNG'))

    def test_paths_cannot_escape_job_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            jobs = ImageJobs(Path(directory))
            for value in ['../secret', 'C:/secret', 'not-a-job']:
                with self.assertRaises(ValueError):
                    jobs.directory(value)

    def test_finished_job_is_restored_and_interrupted_job_can_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            jobs = ImageJobs(Path(directory))
            job = jobs.create({'text': '글', 'scenes': [{'index': i, 'context': f'내용 {i}'} for i in range(4)]}, start=False)
            restored = ImageJobs(Path(directory)).get(job['id'])
            self.assertEqual(restored['status'], 'interrupted')
            self.assertEqual(len(restored['scenes']), 4)

    def test_partial_failure_preserves_completed_images_and_only_retries_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            jobs = ImageJobs(Path(directory))
            job = jobs.create({'text': '본문', 'scenes': [{'index': i, 'context': f'내용 {i}'} for i in range(4)]}, start=False)
            attempts = []
            def generate(current, scene):
                attempts.append(scene['index'])
                if scene['index'] == 1 and attempts.count(1) == 1:
                    raise ValueError('테스트 실패')
                Image.new('RGB', (256, 256)).save(jobs.directory(current['id']) / f'{scene["index"]}.png')
            with patch('features.codex_images.service.auth_status', return_value={'ready': True}), patch.object(jobs, 'generate', side_effect=generate):
                jobs.run(job['id'])
                self.assertEqual(jobs.get(job['id'])['status'], 'partial')
                jobs.retry(job['id'])
                jobs.futures[job['id']].result(timeout=5)
            self.assertEqual(attempts, [0, 1, 2, 3, 1])
            self.assertEqual(ImageJobs(Path(directory)).get(job['id'])['status'], 'completed')

    def test_api_rejects_cross_origin_and_does_not_expose_files(self):
        with tempfile.TemporaryDirectory() as directory:
            app = Flask(__name__)
            blueprint = create_blueprint(Path(directory))
            app.register_blueprint(blueprint)
            client = app.test_client()
            self.assertEqual(client.get('/blog-images/status').status_code, 403)
            headers = {'X-Blog-Client': 'webtoon-v1', 'Origin': 'https://attacker.example'}
            self.assertEqual(client.post('/blog-images/jobs', json={}, headers=headers).status_code, 403)
            self.assertEqual(client.options('/blog-images/jobs', headers=headers).status_code, 403)
            headers['Origin'] = 'chrome-extension://' + 'a' * 32
            self.assertEqual(client.post('/blog-images/jobs', json={}, headers=headers).status_code, 400)
            self.assertEqual(client.get('/blog-images/jobs/' + 'a' * 32, headers=headers).status_code, 404)
            self.assertEqual(client.get('/blog-images/jobs/invalid', headers=headers).status_code, 400)

    def test_duplicate_request_returns_same_job_without_generating_twice(self):
        with tempfile.TemporaryDirectory() as directory:
            jobs = ImageJobs(Path(directory))
            data = {'text': '글', 'scenes': [{'index': i, 'context': f'내용 {i}'} for i in range(4)]}
            first = jobs.create(data, start=False)
            second = jobs.create(data, start=False)
            self.assertEqual(first['id'], second['id'])


if __name__ == '__main__':
    unittest.main()
