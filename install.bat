@echo off
REM ==============================================
REM FitTrack PWA - Windows Setup Script
REM Usage: Double-click install.bat or run in cmd
REM ==============================================

echo.
echo  FitTrack PWA — Windows Setup
echo  =============================
echo.

REM Check Node.js
node --version >nul 2>&1
IF ERRORLEVEL 1 (
  echo [ERROR] Node.js not found.
  echo         Download from: https://nodejs.org
  pause
  exit /b 1
)
echo [OK] Node.js found: 
node --version

REM Check MongoDB
mongosh --eval "db.adminCommand('ping')" --quiet >nul 2>&1
IF ERRORLEVEL 1 (
  echo [WARN] MongoDB not running or not found.
  echo        Download: https://www.mongodb.com/try/download/community
  echo        Make sure MongoDB service is running.
  echo        Windows: Open Services ^(services.msc^) and start MongoDB
  echo.
) ELSE (
  echo [OK] MongoDB is running
)

REM Install dependencies
echo.
echo [..] Installing npm dependencies...
npm install
IF ERRORLEVEL 1 (
  echo [ERROR] npm install failed
  pause
  exit /b 1
)
echo [OK] Dependencies installed

REM Seed database
echo.
echo [..] Seeding demo data...
npm run seed
IF ERRORLEVEL 1 (
  echo [WARN] Seed failed. MongoDB may not be running.
) ELSE (
  echo [OK] Demo data seeded
)

echo.
echo  =============================
echo  Setup complete!
echo.
echo  Start the app:
echo    npm run dev
echo.
echo  Then open: http://localhost:3000
echo.
echo  Demo login:
echo    Email:    demo@fittrack.app
echo    Password: password123
echo  =============================
echo.
pause
