@echo off
chcp 65001 >nul 2>&1
title SEEG FIBRAS - Instalador
color 0E

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                                                  ║
echo  ║       SEEG FIBRAS - Instalador Automatico        ║
echo  ║       Sistema de Impressao de Boletos            ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "APP_DIR=%~dp0"

:: =============================================
:: ETAPA 1: Verificar Node.js
:: =============================================
echo  [1/6] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════╗
    echo  ║  ERRO: Node.js nao encontrado!                  ║
    echo  ║                                                  ║
    echo  ║  Baixe e instale o Node.js antes de continuar:   ║
    echo  ║  https://nodejs.org                              ║
    echo  ║                                                  ║
    echo  ║  Escolha a versao LTS (recomendada).             ║
    echo  ║  Apos instalar, execute este script novamente.   ║
    echo  ╚══════════════════════════════════════════════════╝
    echo.
    echo  Abrindo o site do Node.js...
    start https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo         OK! Node.js %NODE_VERSION% encontrado.
echo.

:: =============================================
:: ETAPA 2: Verificar Google Chrome
:: =============================================
echo  [2/6] Verificando Google Chrome...
set "CHROME_FOUND=0"
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"

if %CHROME_FOUND% equ 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════╗
    echo  ║  AVISO: Google Chrome nao encontrado!            ║
    echo  ║                                                  ║
    echo  ║  O sistema usa o Chrome em modo quiosque.        ║
    echo  ║  Sem ele, o navegador padrao sera usado.         ║
    echo  ║                                                  ║
    echo  ║  Recomendado: instale o Chrome antes.            ║
    echo  ╚══════════════════════════════════════════════════╝
    echo.
    set /p "CONT_CHROME=  Deseja continuar sem o Chrome? (S/N): "
    if /i not "%CONT_CHROME%"=="S" (
        echo  Abrindo download do Chrome...
        start https://www.google.com/chrome/
        echo.
        pause
        exit /b 1
    )
) else (
    echo         OK! Google Chrome encontrado.
)
echo.

:: =============================================
:: ETAPA 3: Instalar dependencias
:: =============================================
echo  [3/6] Instalando dependencias (npm install)...
echo         Isso pode levar alguns minutos...
echo.
cd /d "%APP_DIR%"
call npm install --production 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERRO: Falha ao instalar dependencias!
    echo  Verifique sua conexao com a internet e tente novamente.
    echo.
    pause
    exit /b 1
)
echo.
echo         OK! Dependencias instaladas.
echo.

:: =============================================
:: ETAPA 4: Configurar credenciais da API
:: =============================================
echo  [4/6] Configurando credenciais da API IXC...
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║  Voce vai precisar informar:                     ║
echo  ║                                                  ║
echo  ║  - URL do IXC Provedor                           ║
echo  ║  - ID do usuario da API                          ║
echo  ║  - Token da API                                  ║
echo  ║  - Porta do servidor (padrao: 3000)              ║
echo  ║  - Telefone de atendimento (opcional)            ║
echo  ╚══════════════════════════════════════════════════╝
echo.

cd /d "%APP_DIR%"
call node setup.js
if %errorlevel% neq 0 (
    echo.
    echo  ERRO: Falha na configuracao!
    echo  Verifique as credenciais e tente novamente.
    echo.
    pause
    exit /b 1
)
echo.

:: =============================================
:: ETAPA 5: Gerar icone e criar atalhos
:: =============================================
echo  [5/6] Gerando icone e criando atalhos...
echo.

cd /d "%APP_DIR%"
powershell -ExecutionPolicy Bypass -File "%APP_DIR%gerar-icone.ps1" 2>nul
powershell -ExecutionPolicy Bypass -File "%APP_DIR%criar-atalho.ps1"
echo.

:: =============================================
:: ETAPA 6: Configurar inicio automatico
:: =============================================
echo  [6/6] Configurar inicio automatico com o Windows?
echo.
echo         Isso faz o sistema abrir sozinho quando
echo         o computador ligar.
echo.
set /p "AUTO_START=  Ativar inicio automatico? (S/N): "
if /i "%AUTO_START%"=="S" (
    set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    set "STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SEEG FIBRAS - Boletos.lnk"
    set "VBS_PATH=%APP_DIR%launcher.vbs"
    set "ICON_PATH=%APP_DIR%public\assets\seeg-boletos.ico"

    powershell -ExecutionPolicy Bypass -Command ^
        "$ws = New-Object -ComObject WScript.Shell; ^
         $s = $ws.CreateShortcut('%STARTUP_LNK%'); ^
         $s.TargetPath = 'wscript.exe'; ^
         $s.Arguments = '\"%VBS_PATH%\"'; ^
         $s.WorkingDirectory = '%APP_DIR%'; ^
         $s.Description = 'SEEG FIBRAS - Boletos'; ^
         $s.WindowStyle = 7; ^
         if (Test-Path '%ICON_PATH%') { $s.IconLocation = '%ICON_PATH%,0' }; ^
         $s.Save()"

    if exist "%STARTUP_LNK%" (
        echo.
        echo         OK! Inicio automatico configurado.
    ) else (
        echo.
        echo         Aviso: Nao foi possivel configurar inicio automatico.
        echo         Voce pode fazer manualmente depois.
    )
) else (
    echo.
    echo         OK! Inicio automatico nao ativado.
    echo         Voce pode ativar depois copiando o atalho
    echo         para a pasta Inicializar do Windows.
)

:: =============================================
:: CONCLUSAO
:: =============================================
echo.
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                                                  ║
echo  ║          INSTALACAO CONCLUIDA!                    ║
echo  ║                                                  ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║                                                  ║
echo  ║  Para abrir o sistema:                           ║
echo  ║  - Clique no atalho "SEEG FIBRAS - Boletos"     ║
echo  ║    na Area de Trabalho                           ║
echo  ║                                                  ║
echo  ║  Para fechar:                                    ║
echo  ║  - Alt+F4 fecha o navegador                      ║
echo  ║  - Execute "encerrar.bat" para parar o servidor  ║
echo  ║                                                  ║
echo  ║  Para reinstalar/reconfigurar:                   ║
echo  ║  - Execute "instalar.bat" novamente              ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo.
set /p "ABRIR_AGORA=  Deseja abrir o sistema agora? (S/N): "
if /i "%ABRIR_AGORA%"=="S" (
    echo.
    echo  Iniciando SEEG FIBRAS...
    cd /d "%APP_DIR%"
    start "" wscript.exe "%APP_DIR%launcher.vbs"
)

echo.
pause
