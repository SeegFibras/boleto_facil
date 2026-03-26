# SEEG FIBRAS - Cria atalho no Desktop com ícone personalizado
# Execute: powershell -ExecutionPolicy Bypass -File criar-atalho.ps1

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconPath = Join-Path $appPath "public\assets\seeg-boletos.ico"
$desktopPath = [Environment]::GetFolderPath("Desktop")

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  SEEG FIBRAS - Criando atalho no Desktop" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# =============================================
# PASSO 1: Gerar icone personalizado
# =============================================
Write-Host "[1/3] Gerando icone..." -ForegroundColor Cyan

function Create-Icon {
    param([string]$OutputPath, [int]$Size = 256)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Cores
    $azulEscuro = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $azul = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    $amarelo = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)
    $laranja = [System.Drawing.Color]::FromArgb(255, 249, 115, 22)
    $branco = [System.Drawing.Color]::White
    $verde = [System.Drawing.Color]::FromArgb(255, 34, 197, 94)

    # Fundo - circulo azul escuro
    $bgBrush = New-Object System.Drawing.SolidBrush($azulEscuro)
    $g.FillEllipse($bgBrush, 4, 4, $Size-8, $Size-8)

    # Borda amarela/laranja gradient
    $borderPen = New-Object System.Drawing.Pen($amarelo, 8)
    $g.DrawEllipse($borderPen, 4, 4, $Size-8, $Size-8)

    # Documento/boleto (retangulo branco)
    $docX = [int]($Size * 0.22)
    $docY = [int]($Size * 0.18)
    $docW = [int]($Size * 0.56)
    $docH = [int]($Size * 0.52)

    $docBrush = New-Object System.Drawing.SolidBrush($branco)

    # Cantos arredondados do documento
    $docPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = 12
    $docRect = New-Object System.Drawing.Rectangle($docX, $docY, $docW, $docH)
    $docPath.AddArc($docRect.X, $docRect.Y, $radius, $radius, 180, 90)
    $docPath.AddArc($docRect.X + $docRect.Width - $radius, $docRect.Y, $radius, $radius, 270, 90)
    $docPath.AddArc($docRect.X + $docRect.Width - $radius, $docRect.Y + $docRect.Height - $radius, $radius, $radius, 0, 90)
    $docPath.AddArc($docRect.X, $docRect.Y + $docRect.Height - $radius, $radius, $radius, 90, 90)
    $docPath.CloseFigure()
    $g.FillPath($docBrush, $docPath)

    # Linhas no documento (simulando texto/codigo de barras)
    $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 200, 200, 210), 4)
    $lineY = $docY + 20
    $lineX1 = $docX + 16
    $lineX2 = $docX + $docW - 16

    for ($j = 0; $j -lt 4; $j++) {
        $lw = if ($j -eq 3) { ($lineX2 - $lineX1) * 0.6 } else { ($lineX2 - $lineX1) }
        $g.DrawLine($linePen, $lineX1, $lineY, $lineX1 + $lw, $lineY)
        $lineY += 14
    }

    # Codigo de barras na parte inferior do documento
    $barY = $docY + $docH - 35
    $barX = $docX + 16
    $barBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 50, 50, 60))
    $barWidths = @(3,2,4,2,3,5,2,3,4,2,3,2,5,3,2,4,2,3)
    $currentX = $barX
    for ($j = 0; $j -lt $barWidths.Count; $j++) {
        if ($j % 2 -eq 0) {
            $g.FillRectangle($barBrush2, $currentX, $barY, $barWidths[$j], 20)
        }
        $currentX += $barWidths[$j] + 1
    }

    # Cifrao "$" grande sobreposto (amarelo/laranja)
    $font = New-Object System.Drawing.Font("Arial", [float]($Size * 0.28), [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush($amarelo)

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $dollarRect = New-Object System.Drawing.RectangleF([float]($Size * 0.35), [float]($Size * 0.55), [float]($Size * 0.5), [float]($Size * 0.45))

    # Sombra do cifrao
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
    $shadowRect = New-Object System.Drawing.RectangleF($dollarRect.X + 3, $dollarRect.Y + 3, $dollarRect.Width, $dollarRect.Height)
    $g.DrawString("R$", $font, $shadowBrush, $shadowRect, $sf)

    # Cifrao
    $g.DrawString("R$", $font, $textBrush, $dollarRect, $sf)

    # Bolinha verde (status "pago/ok") no canto superior direito
    $checkSize = [int]($Size * 0.22)
    $checkX = [int]($Size * 0.68)
    $checkY = [int]($Size * 0.12)
    $greenBrush = New-Object System.Drawing.SolidBrush($verde)
    $g.FillEllipse($greenBrush, $checkX, $checkY, $checkSize, $checkSize)

    # Check mark branco
    $checkPen = New-Object System.Drawing.Pen($branco, [float]($Size * 0.025))
    $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $cx = $checkX + $checkSize/2
    $cy = $checkY + $checkSize/2
    $g.DrawLine($checkPen, [int]($cx - $checkSize*0.2), [int]($cy), [int]($cx - $checkSize*0.05), [int]($cy + $checkSize*0.18))
    $g.DrawLine($checkPen, [int]($cx - $checkSize*0.05), [int]($cy + $checkSize*0.18), [int]($cx + $checkSize*0.22), [int]($cy - $checkSize*0.15))

    # Cleanup
    $g.Dispose()

    # Salvar como ICO
    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $stream = [System.IO.File]::Create($OutputPath)
    $icon.Save($stream)
    $stream.Close()
    $icon.Dispose()
    $bmp.Dispose()
}

try {
    Create-Icon -OutputPath $iconPath
    Write-Host "  Icone criado: $iconPath" -ForegroundColor Green
} catch {
    if (Test-Path $iconPath) {
        Write-Host "  Usando icone existente: $iconPath" -ForegroundColor Green
    } else {
        Write-Host "  Aviso: Nao foi possivel criar icone personalizado. Usando padrao." -ForegroundColor Yellow
        $iconPath = $null
    }
}

# =============================================
# PASSO 2: Criar atalho no Desktop
# =============================================
Write-Host "[2/3] Criando atalho no Desktop..." -ForegroundColor Cyan

$shortcutPath = Join-Path $desktopPath "SEEG FIBRAS - Boletos.lnk"
$vbsPath = Join-Path $appPath "launcher.vbs"

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = """$vbsPath"""
$shortcut.WorkingDirectory = $appPath
$shortcut.Description = "SEEG FIBRAS - Sistema de Impressao de Boletos"
$shortcut.WindowStyle = 7  # Minimizado

if ($iconPath -and (Test-Path $iconPath)) {
    $shortcut.IconLocation = "$iconPath,0"
}

$shortcut.Save()
Write-Host "  Atalho criado: $shortcutPath" -ForegroundColor Green

# =============================================
# PASSO 3: Criar tambem no Menu Iniciar
# =============================================
Write-Host "[3/3] Criando atalho no Menu Iniciar..." -ForegroundColor Cyan

$startMenuPath = [Environment]::GetFolderPath("StartMenu")
$startMenuProgramsPath = Join-Path $startMenuPath "Programs"
$startShortcutPath = Join-Path $startMenuProgramsPath "SEEG FIBRAS - Boletos.lnk"

try {
    $shortcut2 = $WScriptShell.CreateShortcut($startShortcutPath)
    $shortcut2.TargetPath = "wscript.exe"
    $shortcut2.Arguments = """$vbsPath"""
    $shortcut2.WorkingDirectory = $appPath
    $shortcut2.Description = "SEEG FIBRAS - Sistema de Impressao de Boletos"
    $shortcut2.WindowStyle = 7
    if ($iconPath -and (Test-Path $iconPath)) {
        $shortcut2.IconLocation = "$iconPath,0"
    }
    $shortcut2.Save()
    Write-Host "  Atalho criado no Menu Iniciar" -ForegroundColor Green
} catch {
    Write-Host "  Aviso: Nao foi possivel criar atalho no Menu Iniciar" -ForegroundColor Yellow
}

# =============================================
# PASSO 4 (BONUS): Criar script para encerrar
# =============================================
$killScript = Join-Path $appPath "encerrar.bat"
@"
@echo off
echo Encerrando SEEG FIBRAS...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') DO taskkill /F /PID %%a 2>nul
echo Servidor encerrado.
timeout /t 2 /nobreak >nul
"@ | Out-File -FilePath $killScript -Encoding ascii

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  TUDO PRONTO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Atalho criado na Area de Trabalho:" -ForegroundColor White
Write-Host "  >> SEEG FIBRAS - Boletos" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Basta clicar duas vezes para abrir!" -ForegroundColor White
Write-Host ""

Read-Host "Pressione Enter para fechar"
