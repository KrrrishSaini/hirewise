# PowerShell script to start both frontend and backend servers
Write-Host "Starting Hiring Portal..." -ForegroundColor Green

# Start backend server in a new window
Write-Host "\nStarting Backend Server (Port 5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\vite-admin\server'; npm start"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 3

# Start frontend server in a new window
Write-Host "Starting Frontend Server (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\vite-admin\hirewise-admin-vite'; npm run dev"

Write-Host "`n✓ Both servers are starting in separate windows" -ForegroundColor Green
Write-Host "✓ Backend: http://localhost:5000" -ForegroundColor Yellow
Write-Host "✓ Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
