@echo off
REM WildSnap Production Deployment Script

echo.
echo ========================================
echo   WildSnap - Production Deployment
echo ========================================
echo.

REM Check if ports are available
echo Checking if ports are available...
netstat -ano | findstr ":3000" >nul && (
    echo ERROR: Port 3000 is already in use
    exit /b 1
)

netstat -ano | findstr ":5000" >nul && (
    echo ERROR: Port 5000 is already in use
    exit /b 1
)

echo [OK] Ports are available
echo.

REM Build frontend
echo Building Next.js frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    exit /b 1
)
echo [OK] Frontend built successfully
echo.

REM Start backend in a new terminal
echo Starting Flask backend...
start cmd /k "cd /d %cd% && python backend.py"
timeout /t 3 /nobreak
echo [OK] Backend started
echo.

REM Start frontend in a new terminal
echo Starting Next.js production server...
start cmd /k "cd /d %cd% && npm run start"
timeout /t 3 /nobreak
echo [OK] Frontend started
echo.

echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Press any key to continue...
pause >nul
