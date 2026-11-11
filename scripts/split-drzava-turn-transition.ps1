param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$spriteRoot = Join-Path $ProjectRoot 'background-concepts/drzava-live-v3-sprites'
$sheet = [System.Drawing.Bitmap]::new((Join-Path $spriteRoot 'plane-side-rear-sheet.png'))
try {
    if ($sheet.Width -ne 2172 -or $sheet.Height -ne 724) {
        throw "Unexpected turn sheet size: $($sheet.Width)x$($sheet.Height)"
    }
    foreach ($item in @(@(5, 0, 11), @(6, 724, 10))) {
        $bitmap = [System.Drawing.Bitmap]::new(768, 512,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sheet,
                    [System.Drawing.Rectangle]::new(0, 0, 768, 512),
                    [System.Drawing.Rectangle]::new($item[1], 120, 724, 483),
                    [System.Drawing.GraphicsUnit]::Pixel)
            } finally { $graphics.Dispose() }
            $bitmap.Save((Join-Path $spriteRoot ('plane-turn-{0:D2}.png' -f $item[0])),
                [System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
            $bitmap.Save((Join-Path $spriteRoot ('plane-turn-{0:D2}.png' -f $item[2])),
                [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $bitmap.Dispose() }
    }
} finally { $sheet.Dispose() }

Write-Output 'Updated plane views 05, 06, 10 and 11 from one coherent turn sheet.'
