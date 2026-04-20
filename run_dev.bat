@echo off
echo Starting Class Scheduling Platform...

start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 5
start "Frontend App" cmd /k "cd frontend && npm run dev"

echo Servers started!
