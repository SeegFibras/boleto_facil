# Gera icone .ico para o atalho SEEG FIBRAS
Add-Type -AssemblyName System.Drawing

$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconPath = Join-Path $appPath "public\assets\seeg-boletos.ico"

# Cria bitmap 64x64 (tamanho compativel)
$size = 64
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "HighQuality"
$g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

# Cores
$amarelo = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
$branco = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$azul = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$verde = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 34, 197, 94))
$cinzaClaro = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 200, 200, 210))

# Borda amarela (circulo)
$penBorda = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), 3)
$g.DrawEllipse($penBorda, 2, 2, $size - 5, $size - 5)

# Documento branco (retangulo)
$g.FillRectangle($branco, 14, 10, 30, 36)

# Linhas de texto no documento
$penLinha = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 180, 180, 190), 2)
$g.DrawLine($penLinha, 18, 17, 38, 17)
$g.DrawLine($penLinha, 18, 23, 36, 23)
$g.DrawLine($penLinha, 18, 29, 34, 29)

# Codigo de barras
$barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 50, 50, 60))
$barX = 18
for ($i = 0; $i -lt 8; $i++) {
    $w = if ($i % 3 -eq 0) { 3 } else { 1 }
    $g.FillRectangle($barBrush, $barX, 34, $w, 8)
    $barX += $w + 1
}

# R$ amarelo grande
$font = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
$g.DrawString("R$", $font, $amarelo, 22, 38)

# Bolinha verde com check
$g.FillEllipse($verde, 42, 8, 16, 16)
$checkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
$g.DrawLine($checkPen, 46, 16, 49, 20)
$g.DrawLine($checkPen, 49, 20, 55, 12)

$g.Dispose()

# Converte para ICO via MemoryStream
$ms = New-Object System.IO.MemoryStream

# Escreve header ICO manualmente
$bw = New-Object System.IO.BinaryWriter($ms)
# ICO Header
$bw.Write([Int16]0)     # Reserved
$bw.Write([Int16]1)     # Type (1 = ICO)
$bw.Write([Int16]1)     # Count

# Salva o BMP em memoria
$bmpMs = New-Object System.IO.MemoryStream
$bmp.Save($bmpMs, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpData = $bmpMs.ToArray()

# ICO Directory Entry
$bw.Write([byte]$size)        # Width
$bw.Write([byte]$size)        # Height
$bw.Write([byte]0)            # Color palette
$bw.Write([byte]0)            # Reserved
$bw.Write([Int16]1)           # Color planes
$bw.Write([Int16]32)          # Bits per pixel
$bw.Write([Int32]$bmpData.Length) # Image size
$bw.Write([Int32]22)          # Offset (6 header + 16 entry = 22)

# Image data
$bw.Write($bmpData)
$bw.Flush()

# Salva
[System.IO.File]::WriteAllBytes($iconPath, $ms.ToArray())

$bw.Dispose()
$ms.Dispose()
$bmpMs.Dispose()
$bmp.Dispose()

Write-Host "Icone gerado: $iconPath" -ForegroundColor Green
