@echo off
setlocal enabledelayedexpansion
title Review2Product - One-Click Demo Launcher
cd /d "%~dp0"

echo ==========================================================
echo   Review2Product - Global Voice of Customer - Product Evolution Agent
echo   One-click launcher (Windows)
echo ==========================================================
echo.

rem ---------- 1. Python ----------
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ first.
    pause
    exit /b 1
)

rem ---------- 2. venv + deps ----------
if not exist ".venv\Scripts\python.exe" (
    echo [1/5] Creating virtual environment ...
    python -m venv .venv
    if errorlevel 1 ( echo [ERROR] venv creation failed & pause & exit /b 1 )
) else (
    echo [1/5] Virtual environment found.
)

echo [2/5] Checking backend dependencies ...
".venv\Scripts\python.exe" -c "import fastapi, pandas, duckdb, sklearn, pyarrow" >nul 2>&1
if errorlevel 1 (
    echo       Installing requirements.txt ...
    ".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
    if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )
) else (
    echo       Dependencies OK.
)

rem ---------- 3. pipeline ----------
echo [3/5] Running data pipeline (download - preprocess - analyze) ...
".venv\Scripts\python.exe" scripts\run_pipeline.py
if errorlevel 1 (
    echo [WARN] Pipeline returned non-zero, backend will retry lazily on startup.
)

rem ---------- 4. backend ----------
echo [4/5] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "Review2Product API" cmd /k ".venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

rem wait for backend health
set /a tries=0
:wait_api
timeout /t 2 /nobreak >nul
".venv\Scripts\python.exe" -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" >nul 2>&1
if errorlevel 1 (
    set /a tries+=1
    if !tries! lss 15 goto wait_api
    echo [WARN] Backend health check timed out; it may still be loading pipeline.
) else (
    echo       Backend is healthy.
)

rem ---------- 5. frontend ----------
echo [5/5] Starting React frontend ...
if not exist "frontend\node_modules" (
    echo       Installing npm packages (first run only) ...
    pushd frontend && call npm install && popd
)
pushd frontend
start "Review2Product Web" cmd /k npm run dev -- --port 5173
popd

echo.
echo ==========================================================
echo   Demo is starting ...
echo   Frontend : http://localhost:5173   (opens in browser)
echo   API docs : http://127.0.0.1:8000/docs
echo   Hero     : Segbeauty spray bottle (1,420 real reviews)
echo ==========================================================
timeout /t 6 /nobreak >nul
start http://localhost:5173
echo Done. Two console windows keep the servers alive; close them to stop.
pause
