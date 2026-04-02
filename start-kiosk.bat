@echo off
title SEEG FIBRAS - Sistema de Boletos

:: ============================================================
:: URL do sistema — alterar para a VPS quando em produção:
::   set URL_SISTEMA=https://boleto.seegfibras.com.br
:: Para uso local (totem rodando o Node.js localmente):
::   set URL_SISTEMA=http://localhost:3000
:: ============================================================
set URL_SISTEMA=https://boleto.seegfibras.com.br

echo ============================================
echo   SEEG FIBRAS - Iniciando Sistema de Boletos
echo   URL: %URL_SISTEMA%
echo ============================================
echo.

:: Abre o Chrome em modo kiosk apontando para a VPS
echo Abrindo navegador...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
	--kiosk ^
	--disable-translate ^
	--no-first-run ^
	--disable-infobars ^
	--disable-session-crashed-bubble ^
	--disable-features=TranslateUI ^
	%URL_SISTEMA%

echo.
echo Sistema iniciado! Para fechar o Chrome kiosk, pressione Alt+F4.
