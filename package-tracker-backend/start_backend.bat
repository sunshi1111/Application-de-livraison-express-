@echo off
setlocal

REM Simple and robust backend starter (ASCII-only)
REM - Uses venv\Scripts\python.exe directly
REM - Creates venv if missing
REM - Installs requirements if FastAPI missing
REM - Forces UTF-8 to avoid console encoding issues

pushd "%~dp0"

echo ===============================
echo Package Tracker Backend Starter
echo ===============================

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+ and add to PATH.
    pause
    exit /b 1
)

if not exist "venv" (
    echo Creating virtual environment...
    set "SYS_PY=C:\Users\35504\AppData\Local\Programs\Python\Python313\python.exe"
    if exist "%SYS_PY%" (
        "%SYS_PY%" -m venv venv
    ) else (
        python -m venv venv
    )
    if errorlevel 1 (
        echo ERROR: Failed to create venv.
        pause
        exit /b 1
    )
)

set "PY_EXE=%CD%\venv\Scripts\python.exe"
if not exist "%PY_EXE%" (
    echo ERROR: venv Python not found: %PY_EXE%
    echo Try deleting the venv folder and rerun this script.
    pause
    exit /b 1
)

REM Validate venv python; if broken, recreate venv
"%PY_EXE%" -V >nul 2>&1
if errorlevel 1 (
    echo Detected broken venv. Recreating...
    rmdir /s /q venv
    set "SYS_PY=C:\Users\35504\AppData\Local\Programs\Python\Python313\python.exe"
    if exist "%SYS_PY%" (
        "%SYS_PY%" -m venv venv
    ) else (
        python -m venv venv
    )
    if errorlevel 1 (
        echo ERROR: Failed to recreate venv.
        pause
        exit /b 1
    )
    set "PY_EXE=%CD%\venv\Scripts\python.exe"
)

"%PY_EXE%" -m pip --version >nul 2>&1 || "%PY_EXE%" -m ensurepip --upgrade
REM Ensure required deps installed (fastapi AND sqlalchemy at minimum)
"%PY_EXE%" -m pip show fastapi >nul 2>&1
set HAVE_FASTAPI=%ERRORLEVEL%
"%PY_EXE%" -m pip show sqlalchemy >nul 2>&1
set HAVE_SQLA=%ERRORLEVEL%
if not "%HAVE_FASTAPI%"=="0" ( set NEED_INSTALL=1 )
if not "%HAVE_SQLA%"=="0" ( set NEED_INSTALL=1 )
if defined NEED_INSTALL (
    echo Installing/Updating Python dependencies from requirements.txt ...
    "%PY_EXE%" -m pip install -r "%CD%\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
)

set PYTHONUTF8=1
echo Starting FastAPI server at http://localhost:8000 ...
"%PY_EXE%" "%CD%\main.py"

popd
pause