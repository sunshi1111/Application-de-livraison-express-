@echo off
setlocal
echo Package Tracker Frontend - Start Script
echo ========================================

REM Vérifier si Node.js et npm sont disponibles (where renvoie 0 si trouvés)
where node >nul 2>&1
if errorlevel 1 (
  echo [WARN] Node non détecté, tentative d'ajout du chemin d'installation par défaut au PATH: C:\Program Files\nodejs\
    set "PATH=%PATH%;C:\Program Files\nodejs\"
)
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js introuvable. Installez la version LTS officielle: https://nodejs.org/en
  echo Ou, dans PowerShell: winget install --id OpenJS.NodeJS.LTS -e
    pause
    @echo off
    setlocal
    echo ========================================
    echo Package Tracker Frontend - Start Script (Safe Mode)
    echo ========================================
    echo.

    REM Force use of absolute Node.js installation path (avoid PATH issues inside Python venv shells)
    set "NODE_DIR=C:\Program Files\nodejs"
    set "NODE_EXE=%NODE_DIR%\node.exe"
    set "NPM_CMD=%NODE_DIR%\npm.cmd"

    if not exist "%NODE_EXE%" (
  echo [ERROR] Node.exe introuvable à %NODE_EXE%
  echo Installez Node.js LTS : winget install --id OpenJS.NodeJS.LTS -e
      pause
      exit /b 1
    )

    echo Node version:
    "%NODE_EXE%" -v
    echo NPM version:
    "%NPM_CMD%" -v
    echo.

    REM Install dependencies if missing node_modules
    if not exist "node_modules" (
  echo Installation des dépendances avec le chemin npm absolu...
      "%NPM_CMD%" install || (echo [ERROR] npm install failed & pause & exit /b 1)
  echo Dépendances installées.
      echo.
    )

    REM Optional quick vulnerability notice (non-blocking)
  echo Audit de sécurité (npm audit --omit=dev)...
    "%NPM_CMD%" audit --omit=dev > audit-temp.txt 2>&1
  findstr /i "high critical" audit-temp.txt >nul 2>&1 && echo [NOTICE] Vulnérabilités élevées détectées. Exécutez : npm audit fix
    del audit-temp.txt >nul 2>&1
    echo.

    REM Open browser proactively (optional)
    start "" "http://localhost:3000"

  echo Démarrage du serveur de développement...
  echo (Repli : invocation directe de node si npm start échoue)
    echo.
    "%NPM_CMD%" start || (echo [WARN] npm start failed, trying direct node... & "%NODE_EXE%" .\node_modules\react-scripts\bin\react-scripts.js start)

    endlocal
    pause
    echo.
)

  echo Démarrage du serveur de développement (npm start)...
echo L'application sera disponible sur : http://localhost:3000
echo Appuyez sur Ctrl+C pour arrêter.
echo.

REM Ouverture automatique du navigateur (optionnel)
start "" "http://localhost:3000"

npm start

endlocal
pause
