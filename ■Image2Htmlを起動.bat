@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ====================================
echo   開発サーバーを起動しています...
echo ====================================
echo.

REM 開発サーバーを起動してプロセスIDを取得
echo サーバーを起動中...
start /B npm run dev
set SERVER_PID=%ERRORLEVEL%

REM サーバーが起動するまで待機
echo サーバーの起動を待っています...
timeout /t 3 /nobreak > nul

REM ブラウザを開く
echo ブラウザを起動します...
start http://localhost:3000

echo.
echo ====================================
echo   開発サーバーが起動しました！
echo   URL: http://localhost:3000
echo.
echo   終了するには、このウィンドウを
echo   閉じるか、Ctrl+C を押してください
echo ====================================
echo.

REM Ctrl+Cのハンドラを設定
set CLEANUP_DONE=0

REM ユーザーの入力を待つ
pause

REM 終了処理
:CLEANUP
if !CLEANUP_DONE! EQU 1 goto :EOF
set CLEANUP_DONE=1

echo.
echo サーバーを停止しています...

REM ポート3000を使用しているプロセスを特定して停止
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo プロセスID %%a を停止します...
    taskkill /F /PID %%a > nul 2>&1
)

echo サーバーを停止しました。
timeout /t 2 /nobreak > nul

endlocal
