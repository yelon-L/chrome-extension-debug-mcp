@echo off
echo ======================================
echo Chrome Extension Debug MCP - 测试启动
echo ======================================
echo.

REM 查找Chrome路径
set "CHROME_PATH="

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if "%CHROME_PATH%"=="" (
    echo [错误] 未找到Chrome，请手动指定路径
    pause
    exit /b 1
)

echo [信息] 找到Chrome: %CHROME_PATH%
echo.

REM 设置扩展路径
set "EXTENSION_PATH=%~dp0test-extension-enhanced"
echo [信息] 扩展路径: %EXTENSION_PATH%
echo.

REM 设置用户数据目录
set "USER_DATA=%TEMP%\chrome-debug-mcp"
echo [信息] 数据目录: %USER_DATA%
echo.

echo [启动] 正在启动Chrome（调试模式）...
echo.
echo 提示：
echo 1. Chrome将在新窗口打开
echo 2. 访问 chrome://extensions 确认扩展已加载
echo 3. 访问 http://localhost:9222/json 验证调试端口
echo 4. 保持Chrome窗口打开，然后运行测试脚本
echo.

start "" "%CHROME_PATH%" ^
  --remote-debugging-port=9222 ^
  --load-extension="%EXTENSION_PATH%" ^
  --user-data-dir="%USER_DATA%" ^
  --no-first-run ^
  --no-default-browser-check

echo [完成] Chrome已启动
echo.
echo 下一步：在另一个终端窗口运行测试
echo   node test/test-enhanced-extension.js
echo.
pause


