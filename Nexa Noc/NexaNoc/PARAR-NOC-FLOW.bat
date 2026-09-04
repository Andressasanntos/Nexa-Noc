@echo off
setlocal
cd /d "%~dp0"
echo Parando o NOC Flow Studio...
docker compose down
if errorlevel 1 (
    echo Nao foi possivel parar o container.
    pause
    exit /b 1
)
echo NOC Flow Studio parado.
timeout /t 2 /nobreak >nul
exit /b 0
