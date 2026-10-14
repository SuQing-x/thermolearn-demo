@echo off
chcp 65001 >nul
title Thermo Learn - Local Demo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动演示.ps1" -NoPause
echo.
pause
