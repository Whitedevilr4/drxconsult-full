@echo off
echo ================================================================
echo    Patient Counselling Web App - Startup Script
echo ================================================================
echo.

REM Check if node_modules exists
echo Checking dependencies...
if not exist "node_modules\" (
    echo    Installing dependencies...
    call npm run install-all
    echo    Dependencies installed
) else (
    echo    Dependencies already installed
)

if not exist "backend\node_modules\" (
    echo    Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules\" (
    echo    Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)
echo.

REM Check if .env files exist
echo Checking environment files...
if not exist "backend\.env" (
    echo    Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo    Please edit backend\.env with your credentials
) else (
    echo    backend\.env exists
)

if not exist "frontend\.env.local" (
    echo    Creating frontend\.env.local from template...
    copy "frontend\.env.local.example" "frontend\.env.local" >nul
    echo    Please edit frontend\.env.local with your credentials
) else (
    echo    frontend\.env.local exists
)
echo.

echo Checking database...
echo    Run 'cd backend && npm run seed:all' if you need test accounts
echo    Test accounts: admin/admin (pharmacist) and user/user (patient)
echo.

echo ================================================================
echo    Starting servers...
echo ================================================================
echo.
echo    Backend API:  http://localhost:5000
echo    Frontend:     http://localhost:3000
echo.
echo    Test Accounts:
echo       Admin: admin / admin (Pharmacist)
echo       User:  user / user (Patient)
echo.
echo    Press Ctrl+C to stop all servers
echo.
echo ================================================================
echo.

REM Start both servers concurrently
npm run dev:plain
