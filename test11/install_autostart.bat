@echo off
chcp 65001 >nul
echo ===================================
echo 바이브 콘텐츠 메이커 - 자동 시작 설정
echo ===================================
echo.

cd /d %~dp0

REM 시작 폴더 경로
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

REM 현재 디렉토리의 start_server_hidden.bat 경로
set SERVER_BAT=%~dp0start_server_hidden.bat

echo [1/2] 시작 폴더에 바로가기 생성 중...
echo.

REM VBScript를 사용하여 바로가기 생성
set VBS_SCRIPT=%TEMP%\create_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%STARTUP_FOLDER%\바이브콘텐츠메이커서버.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%SERVER_BAT%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%~dp0" >> "%VBS_SCRIPT%"
echo oLink.WindowStyle = 7 >> "%VBS_SCRIPT%"
echo oLink.Description = "바이브 콘텐츠 메이커 서버 자동 시작" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo [2/2] 설정 완료!
echo.
echo ✅ Windows 시작 시 서버가 자동으로 실행됩니다.
echo.
echo 시작 폴더 위치:
echo %STARTUP_FOLDER%
echo.
echo 자동 시작을 해제하려면 시작 폴더에서
echo "바이브콘텐츠메이커서버.lnk" 파일을 삭제하세요.
echo.
echo ===================================
pause
