@echo off
echo Encerrando SEEG FIBRAS...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') DO taskkill /F /PID %%a 2>nul
echo Servidor encerrado.
timeout /t 2 /nobreak >nul
