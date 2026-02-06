@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Torrent Tool - Uninstall

cls
echo ===============================================
echo   Torrent Auto Description Maker - Uninstall
echo ===============================================
echo.

:: ---------- Check winget ----------
where winget >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] winget not found. Cannot continue.
    pause
    exit /b 1
)

set "TOOLS_DIR=C:\Tools"

:: ---------- Remove mkbrr ----------
echo [*] Removing mkbrr...

if exist "%TOOLS_DIR%\mkbrr.exe" (
    del /f /q "%TOOLS_DIR%\mkbrr.exe"
    echo [OK] mkbrr.exe removed.
) else (
    echo [i] mkbrr.exe not found. Skipping.
)

:: Remove C:\Tools if empty
if exist "%TOOLS_DIR%" (
    dir /b "%TOOLS_DIR%" 2>nul | findstr . >nul
    if %errorlevel% neq 0 (
        rmdir "%TOOLS_DIR%"
        echo [OK] Removed empty %TOOLS_DIR% folder.
    ) else (
        echo [i] %TOOLS_DIR% not empty. Leaving folder.
    )
)

:: ---------- Remove C:\Tools from PATH (user) ----------
echo.
echo [*] Removing C:\Tools from PATH (user)...

set "OLDPATH="
for /f "usebackq tokens=2,*" %%A in (`reg query HKCU\Environment /v Path 2^>nul`) do set "OLDPATH=%%B"

if defined OLDPATH (
    set "TMPPATH=%OLDPATH%"
    set "TMPPATH=!TMPPATH:%TOOLS_DIR%;=!"
    set "TMPPATH=!TMPPATH:;%TOOLS_DIR%=!"
    set "TMPPATH=!TMPPATH:%TOOLS_DIR%=!"
    setx PATH "!TMPPATH!" >nul
    echo [OK] PATH updated. (Open new terminal to apply)
) else (
    echo [i] No user PATH found.
)

:: ---------- Uninstall packages ----------
echo.
echo [*] Uninstalling FFmpeg Essentials...
winget uninstall -e --id Gyan.FFmpeg.Essentials --silent

echo [*] Uninstalling MediaInfo...
winget uninstall -e --id MediaArea.MediaInfo --silent

echo [*] Uninstalling Python (3.11)...
winget uninstall -e --id Python.Python.3.11 --silent

:: ---------- Disable Windows Store Python aliases ----------
echo.
echo [*] Disabling Windows Store Python aliases...

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\App Execution Aliases" /v python.exe /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\App Execution Aliases" /v python3.exe /t REG_DWORD /d 0 /f >nul

echo [OK] Python app execution aliases disabled.

:: ---------- Optional: remove main.py ----------
echo.
if exist "%~dp0main.py" (
    echo [*] Removing main.py...
    del /f /q "%~dp0main.py"
    echo [OK] main.py removed.
) else (
    echo [i] main.py not found. Skipping.
)

:: ---------- Verification ----------
echo.
echo ===============================================
echo   Verifying Removal
echo ===============================================

where mkbrr >nul 2>nul && echo [!!] mkbrr still in PATH || echo [OK] mkbrr not found
where ffmpeg >nul 2>nul && echo [!!] FFmpeg still in PATH || echo [OK] FFmpeg not found
where mediainfo >nul 2>nul && echo [!!] MediaInfo still in PATH || echo [OK] MediaInfo not found
where python >nul 2>nul && echo [!!] python still resolves || echo [OK] python not found

:: Check PATH for C:\Tools
set "PATHCHECK="
for /f "usebackq tokens=2,*" %%A in (`reg query HKCU\Environment /v Path 2^>nul`) do set "PATHCHECK=%%B"
echo %PATHCHECK% | find /I "%TOOLS_DIR%" >nul
if %errorlevel% neq 0 (
    echo [OK] C:\Tools not in user PATH
) else (
    echo [!!] C:\Tools still present in user PATH
)

echo.
echo ===============================================
echo   Uninstall Complete
echo ===============================================
echo You may need to open a NEW terminal or log out/in for all changes to apply.
pause
exit /b 0
