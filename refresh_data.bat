@echo off
chcp 65001 > nul
title Central Group - Refresh UAT Dashboard Data
echo ========================================================
echo   Central Group - Online Booking UAT Dashboard Refresh  
echo ========================================================
echo.
echo Running data extraction from Excel files...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0refresh_data.ps1"
echo.
echo ========================================================
echo Finished! You can now refresh index.html in your browser.
echo ========================================================
pause
