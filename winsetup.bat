@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Torrent Auto Description Maker - Setup

cls
echo ===============================================
echo   Torrent Auto Description Maker - Setup
echo ===============================================
echo.

:: ---------- Check winget ----------
where winget >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] winget not found. Install "App Installer" from Microsoft Store.
    pause
    exit /b 1
)

:: ---------- Config ----------
set "PYTHON_VERSION=3.11"
set "PYTHON_ID=Python.Python.%PYTHON_VERSION%"
set "PY_CMD=python"
set "BASE_DIR=%~dp0"
set "TOOLS_DIR=C:\Tools"

if not exist "%TOOLS_DIR%" (
    echo [*] Creating %TOOLS_DIR% ...
    mkdir "%TOOLS_DIR%"
)

:: ---------- Python ----------
echo [*] Checking Python...
%PY_CMD% --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [*] Installing Python %PYTHON_VERSION%...
        winget install -e --id %PYTHON_ID% --accept-package-agreements --accept-source-agreements --silent
    ) else (
        set "PY_CMD=py"
    )
) else (
    echo [OK] Python already installed.
)

%PY_CMD% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python installed but PATH not refreshed. Re-open terminal and run again.
    pause
    exit /b 1
)

:: ---------- pip + requests ----------
echo [*] Updating pip...
%PY_CMD% -m pip install --upgrade pip

echo [*] Installing requests...
%PY_CMD% -m pip install -U requests
if %errorlevel% neq 0 (
    echo [!] Failed to install requests.
    pause
    exit /b 1
)

:: ---------- FFmpeg + MediaInfo ----------
echo.
echo [*] Installing FFmpeg (Essentials)...
winget install -e --id Gyan.FFmpeg.Essentials --accept-package-agreements --accept-source-agreements --silent
echo [OK] FFmpeg checked.

echo [*] Installing MediaInfo...
winget install -e --id MediaArea.MediaInfo --accept-package-agreements --accept-source-agreements --silent
echo [OK] MediaInfo checked.

:: ---------- mkbrr (download Windows ZIP, extract exe) ----------
echo.
echo [*] Downloading mkbrr (Windows x64 ZIP) ...

powershell -NoProfile -Command ^
  "$r = Invoke-RestMethod https://api.github.com/repos/autobrr/mkbrr/releases/latest; " ^
  "$a = $r.assets | Where-Object { $_.name -match 'windows' -and $_.name -match 'x86_64' -and $_.name -match '\.zip$' } | Select-Object -First 1; " ^
  "if (-not $a) { Write-Error 'No Windows ZIP asset found'; exit 1 } " ^
  "$zip = '%TOOLS_DIR%\mkbrr.zip'; " ^
  "Invoke-WebRequest $a.browser_download_url -OutFile $zip; " ^
  "Expand-Archive -Force $zip '%TOOLS_DIR%'; " ^
  "Remove-Item $zip"

:: Find mkbrr.exe after extract
for /r "%TOOLS_DIR%" %%F in (mkbrr*.exe) do (
    copy /Y "%%F" "%TOOLS_DIR%\mkbrr.exe" >nul
)

if not exist "%TOOLS_DIR%\mkbrr.exe" (
    echo [!] Failed to install mkbrr.
    pause
    exit /b 1
)

echo [OK] mkbrr installed to %TOOLS_DIR%\mkbrr.exe

:: ---------- Add C:\Tools to PATH (permanent, user) ----------
echo.
echo [*] Adding C:\Tools to PATH (user)...

for /f "usebackq tokens=2,*" %%A in (`reg query HKCU\Environment /v Path 2^>nul`) do set "OLDPATH=%%B"

echo %OLDPATH% | find /I "%TOOLS_DIR%" >nul
if %errorlevel% neq 0 (
    setx PATH "%OLDPATH%;%TOOLS_DIR%" >nul
    echo [OK] Added C:\Tools to PATH. (New terminals will see it)
) else (
    echo [OK] C:\Tools already in PATH.
)

:: Also update current session
set "PATH=%PATH%;%TOOLS_DIR%"

:: ---------- Download main.py ----------
echo.
echo [*] Downloading main.py...

powershell -NoProfile -Command ^
  "Invoke-WebRequest 'https://raw.githubusercontent.com/xNabil/torrent-creator/refs/heads/main/main.py' -OutFile '%BASE_DIR%main.py'"

if not exist "%BASE_DIR%main.py" (
    echo [!] Failed to download main.py
    pause
    exit /b 1
)

echo [OK] main.py downloaded.

:: ---------- Verify ----------
echo.
echo ===============================================
echo   Verifying Tools
echo ===============================================

where python >nul 2>nul && echo [OK] Python || echo [!!] Python NOT FOUND
where ffmpeg >nul 2>nul && echo [OK] FFmpeg || echo [!!] FFmpeg NOT FOUND
where mediainfo >nul 2>nul && echo [OK] MediaInfo || echo [!!] MediaInfo NOT FOUND
where mkbrr >nul 2>nul && echo [OK] mkbrr || echo [!!] mkbrr NOT FOUND

echo.
echo ===============================================
echo   Setup Complete
echo ===============================================
echo Close this window and open a NEW terminal so PATH updates apply.
echo Then run:
echo   python main.py
echo.
pause
exit /b 0

