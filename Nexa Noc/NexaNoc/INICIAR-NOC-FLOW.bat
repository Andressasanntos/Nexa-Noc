@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo      NOC FLOW STUDIO - DOCKER
echo ========================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
    echo Docker nao foi encontrado.
    echo Instale ou abra o Docker Desktop e tente novamente.
    pause
    exit /b 1
)

echo Iniciando o NOC Flow Studio...
docker compose up -d --build
if errorlevel 1 (
    echo.
    echo Nao foi possivel iniciar o container.
    echo Confirme se o Docker Desktop esta aberto.
    pause
    exit /b 1
)

echo.
echo Sistema iniciado em http://localhost:5000

timeout /t 3 /nobreak >nul
start "" "http://localhost:5000"
exit /b 0
