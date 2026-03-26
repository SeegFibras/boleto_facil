' SEEG FIBRAS - Lançador silencioso (sem janela de console)
' Este script inicia o servidor Node.js em background e abre o Chrome em modo kiosk

Dim WshShell, fso, appPath, nodePath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Caminho da aplicação
appPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Verifica se o .env existe (setup já foi executado)
If Not fso.FileExists(appPath & "\.env") Then
    MsgBox "Configuração não encontrada!" & vbCrLf & vbCrLf & _
           "Execute primeiro no terminal:" & vbCrLf & _
           "  npm run setup", vbExclamation, "SEEG FIBRAS"
    WScript.Quit
End If

' Verifica se node_modules existe
If Not fso.FolderExists(appPath & "\node_modules") Then
    MsgBox "Dependências não instaladas!" & vbCrLf & vbCrLf & _
           "Execute primeiro no terminal:" & vbCrLf & _
           "  npm install", vbExclamation, "SEEG FIBRAS"
    WScript.Quit
End If

' Mata processos anteriores do servidor na porta 3000 (evita conflito)
WshShell.Run "cmd /c ""FOR /F ""tokens=5"" %a IN ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') DO taskkill /F /PID %a""", 0, True
WScript.Sleep 500

' Inicia o servidor Node.js em background (sem janela)
WshShell.Run "cmd /c cd /d """ & appPath & """ && node server.js", 0, False

' Aguarda o servidor iniciar
WScript.Sleep 3000

' Tenta encontrar o Chrome
Dim chromePaths(3)
chromePaths(0) = "C:\Program Files\Google\Chrome\Application\chrome.exe"
chromePaths(1) = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
chromePaths(2) = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe"
chromePaths(3) = WshShell.ExpandEnvironmentStrings("%PROGRAMFILES%") & "\Google\Chrome\Application\chrome.exe"

Dim chromeFound, chromePath
chromeFound = False

Dim i
For i = 0 To 3
    If fso.FileExists(chromePaths(i)) Then
        chromePath = chromePaths(i)
        chromeFound = True
        Exit For
    End If
Next

If chromeFound Then
    ' Abre Chrome em modo kiosk
    WshShell.Run """" & chromePath & """ --kiosk --disable-translate --no-first-run --disable-infobars --disable-session-crashed-bubble --app=http://localhost:3000", 0, False
Else
    ' Fallback: abre no navegador padrão
    WshShell.Run "http://localhost:3000", 0, False
End If

Set WshShell = Nothing
Set fso = Nothing
