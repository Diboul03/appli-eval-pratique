@echo off
REM ============================================================
REM  Prepare la cle USB : construit l'application puis copie
REM  le fichier utilisable et le guide sur la cle choisie.
REM  Utilisation : double-cliquer sur ce fichier.
REM ============================================================
setlocal enabledelayedexpansion

REM Se placer dans le dossier du script
cd /d "%~dp0"

echo ============================================================
echo   Preparation de la cle USB - Grille d'evaluation pratique
echo ============================================================
echo.

REM 1) Verifier que Node.js / npm est installe
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js / npm est introuvable.
  echo Installez Node.js depuis https://nodejs.org puis relancez.
  echo.
  pause
  exit /b 1
)

REM 2) Dependances (premiere fois seulement)
if not exist "node_modules" (
  echo - Premiere installation des dependances ^(patientez^)...
  call npm install
  if errorlevel 1 (
    echo [ERREUR] Echec de l'installation des dependances.
    pause
    exit /b 1
  )
  echo.
)

REM 3) Construction de l'application
echo - Construction de l'application...
call npm run build
if errorlevel 1 (
  echo [ERREUR] Echec de la construction.
  pause
  exit /b 1
)
echo [OK] Application construite ^(dist\index.html^)
echo.

if not exist "dist\index.html" (
  echo [ERREUR] Introuvable : dist\index.html
  pause
  exit /b 1
)

REM 4) Choix de la cle USB
echo Lecteurs disponibles :
echo.
wmic logicaldrive get deviceid, description, volumename 2>nul
echo.

set "DEST="
set /p DEST="Entrez la lettre du lecteur de la cle USB (exemple : E) : "
if "%DEST%"=="" (
  echo Operation annulee.
  pause
  exit /b 0
)

REM Retirer un eventuel ":" saisi par l'utilisateur
set "DEST=%DEST::=%"
set "DESTPATH=%DEST%:\"

if not exist "%DESTPATH%" (
  echo [ERREUR] Le lecteur %DESTPATH% n'existe pas. Verifiez la lettre et que la cle est branchee.
  pause
  exit /b 1
)

REM 5) Copie des fichiers
echo.
echo - Copie vers %DESTPATH% ...
copy /Y "dist\index.html" "%DESTPATH%index.html" >nul
if errorlevel 1 (
  echo [ERREUR] Echec de la copie de l'application.
  pause
  exit /b 1
)
echo    [OK] index.html copie

if exist "docs\Guide-evaluateurs.html" (
  copy /Y "docs\Guide-evaluateurs.html" "%DESTPATH%Guide-evaluateurs.html" >nul
  if not errorlevel 1 echo    [OK] Guide-evaluateurs.html copie
)

echo.
echo ============================================================
echo   [OK] Termine. La cle est prete a etre distribuee.
echo ============================================================
echo.
echo Rappel : sur chaque poste, regler une fois le dossier de
echo telechargement du navigateur sur la cle (voir le guide).
echo.
pause
