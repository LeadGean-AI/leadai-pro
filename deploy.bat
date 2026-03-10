@echo off
title LeadAI Pro — Vercel Deployment
color 0B

echo.
echo  ========================================
echo   LeadAI Pro — Vercel Deployment Script
echo  ========================================
echo.

:: Check Node
node -v >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)
echo  [OK] Node.js found: 
node -v

:: Check npm
npm -v >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] npm not found.
  pause
  exit /b 1
)
echo  [OK] npm found

echo.
echo  Step 1/4: Installing dependencies...
call npm install
if errorlevel 1 (
  echo  [ERROR] npm install failed
  pause
  exit /b 1
)
echo  [OK] Dependencies installed

echo.
echo  Step 2/4: Building production bundle...
call npm run build
if errorlevel 1 (
  echo  [ERROR] Build failed
  pause
  exit /b 1
)
echo  [OK] Build complete (dist/ folder created)

echo.
echo  Step 3/4: Installing Vercel CLI...
call npm install -g vercel
if errorlevel 1 (
  echo  [ERROR] Could not install Vercel CLI
  pause
  exit /b 1
)
echo  [OK] Vercel CLI ready

echo.
echo  Step 4/4: Deploying to Vercel...
echo  (A browser window will open — log in with GitHub/Google)
echo.
call vercel --prod

echo.
echo  ========================================
echo   Deployment Complete!
echo   Your site is LIVE on Vercel!
echo  ========================================
echo.
pause
