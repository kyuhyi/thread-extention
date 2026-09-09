@echo off
chcp 65001 >nul
echo ===================================
echo 바이브 콘텐츠 메이커 - 서버 시작
echo ===================================
echo.

cd /d %~dp0

echo Python 서버를 시작합니다...
echo.

python server.py

pause
