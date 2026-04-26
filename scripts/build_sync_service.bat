@echo off
chcp 65001 >nul
echo ========================================
echo   掌上仓库 - 数据同步服务 打包脚本
echo ========================================
echo.

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未安装Python，请先安装Python
    pause
    exit /b 1
)

:: 安装依赖
echo [1/3] 安装依赖...
pip install cherrypy openpyxl pystray Pillow pyinstaller -q

:: 打包
echo [2/3] 打包中...
pyinstaller --onefile --windowed --name "数据同步服务" --icon=NONE label_sync_server.py

:: 清理
echo [3/3] 清理临时文件...
if exist build rmdir /s /q build
if exist "数据同步服务.spec" del /q "数据同步服务.spec"

echo.
echo ========================================
echo   打包完成！
echo   输出文件: dist\数据同步服务.exe
echo ========================================
echo.

:: 打开输出目录
explorer dist

pause
