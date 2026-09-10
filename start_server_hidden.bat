@echo off
REM 백그라운드에서 Python 서버 실행 (창 숨김)

cd /d %~dp0

REM pythonw.exe를 사용하여 창 없이 실행
set PYTHONDONTWRITEBYTECODE=1
start /B pythonw -B server.py

REM 서버가 시작되었다는 알림
echo 서버가 백그라운드에서 시작되었습니다.
timeout /t 2 >nul
