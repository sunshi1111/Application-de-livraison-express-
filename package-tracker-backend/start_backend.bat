@echo off
echo 包裹追踪系统后端服务器启动脚本
echo ================================

:: 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未检测到Python环境，请先安装Python 3.8+
    pause
    exit /b 1
)

:: 检查是否存在虚拟环境
if not exist "venv" (
    echo 创建Python虚拟环境...
    python -m venv venv
    if errorlevel 1 (
        echo 虚拟环境创建失败
        pause
        exit /b 1
    )
)

:: 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat

:: 检查是否需要安装依赖
if not exist "venv\Lib\site-packages\fastapi" (
    echo 安装Python依赖包...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
    echo 依赖安装完成！
)

echo.
echo 🚀 启动FastAPI服务器...
echo 📍 API文档: http://localhost:8000/docs
echo 🔄 交互文档: http://localhost:8000/redoc
echo 💡 按 Ctrl+C 停止服务器
echo.

:: 启动服务器
python main.py

pause