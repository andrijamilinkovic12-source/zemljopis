param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = Join-Path $ProjectRoot 'background-concepts/drzava-live-v3-base-blank-compass.png'
$assetRoot = Join-Path $ProjectRoot 'www/assets/theme-live-v3'
$original = [System.Drawing.Image]::FromFile($source)
try {
    $dial = [System.Drawing.Bitmap]::new($original.Width, $original.Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $g = [System.Drawing.Graphics]::FromImage($dial)
        try {
            $g.Clear([System.Drawing.Color]::Transparent)
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

            # The compass face is an oblique ellipse: its long axis points NE/SW.
            $centerX = 742.0
            $centerY = 1445.0
            $majorX = 0.707
            $majorY = -0.707
            $minorX = 0.707
            $minorY = 0.707
            $marks = @(
                @('N', 745, 1377), @('E', 815, 1439),
                @('S', 730, 1511), @('W', 665, 1450)
            )
            $tickPen = [System.Drawing.Pen]::new(
                [System.Drawing.Color]::FromArgb(125, 170, 123, 68), 3
            )
            try {
                $tickPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $tickPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
                for ($index = 0; $index -lt 16; $index++) {
                    # Cardinal letters take the place of their tick marks.
                    if ($index % 4 -eq 0) { continue }
                    $angle = 2 * [Math]::PI * $index / 16
                    $c = [Math]::Cos($angle)
                    $s = [Math]::Sin($angle)
                    $inner = 0.92
                    $outer = 1.0
                    $x1 = $centerX + $inner * (94 * $majorX * $c + 74 * $minorX * $s)
                    $y1 = $centerY + $inner * (94 * $majorY * $c + 74 * $minorY * $s)
                    $x2 = $centerX + $outer * (94 * $majorX * $c + 74 * $minorX * $s)
                    $y2 = $centerY + $outer * (94 * $majorY * $c + 74 * $minorY * $s)
                    $nearLetter = $false
                    foreach ($mark in $marks) {
                        if ([Math]::Sqrt(($x1 - $mark[1]) * ($x1 - $mark[1]) +
                                         ($y1 - $mark[2]) * ($y1 - $mark[2])) -lt 33) {
                            $nearLetter = $true
                            break
                        }
                    }
                    if (-not $nearLetter) {
                        $g.DrawLine($tickPen, [single]$x1, [single]$y1, [single]$x2, [single]$y2)
                    }
                }
            } finally { $tickPen.Dispose() }

            $font = [System.Drawing.Font]::new('Georgia', 24,
                [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $format = [System.Drawing.StringFormat]::new()
            $format.Alignment = [System.Drawing.StringAlignment]::Center
            $format.LineAlignment = [System.Drawing.StringAlignment]::Center
            $highlight = [System.Drawing.SolidBrush]::new(
                [System.Drawing.Color]::FromArgb(155, 255, 248, 225))
            $engraving = [System.Drawing.SolidBrush]::new(
                [System.Drawing.Color]::FromArgb(185, 135, 93, 51))
            try {
                foreach ($mark in $marks) {
                    $state = $g.Save()
                    try {
                        # Project text into the slanted compass face, including its vertical foreshortening.
                        $surface = [System.Drawing.Drawing2D.Matrix]::new(
                            [single]0.83, [single]-0.18, [single]0.27, [single]0.57,
                            [single]$mark[1], [single]$mark[2]
                        )
                        $g.Transform = $surface
                        $surface.Dispose()
                        $box = [System.Drawing.RectangleF]::new(-16, -16, 32, 32)
                        $lightBox = [System.Drawing.RectangleF]::new(-15, -14, 32, 32)
                        $g.DrawString([string]$mark[0], $font, $highlight, $lightBox, $format)
                        $g.DrawString([string]$mark[0], $font, $engraving, $box, $format)
                    } finally { $g.Restore($state) }
                }
            } finally {
                $engraving.Dispose()
                $highlight.Dispose()
                $format.Dispose()
                $font.Dispose()
            }
        } finally { $g.Dispose() }

        $dial.Save((Join-Path $assetRoot 'compass-dial.png'),
            [System.Drawing.Imaging.ImageFormat]::Png)
        $scene = [System.Drawing.Bitmap]::new($original.Width, $original.Height,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $sceneGraphics = [System.Drawing.Graphics]::FromImage($scene)
            try {
                $sceneGraphics.DrawImage($original, 0, 0, $original.Width, $original.Height)
                $sceneGraphics.DrawImage($dial, 0, 0, $dial.Width, $dial.Height)
            } finally { $sceneGraphics.Dispose() }
            $scene.Save((Join-Path $assetRoot 'drzava-base.png'),
                [System.Drawing.Imaging.ImageFormat]::Png)

            $compass = $scene.Clone([System.Drawing.Rectangle]::new(560, 1220, 381, 452),
                [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $compass.Save((Join-Path $assetRoot 'compass-background.png'),
                    [System.Drawing.Imaging.ImageFormat]::Png)
            } finally { $compass.Dispose() }
        } finally { $scene.Dispose() }
    } finally { $dial.Dispose() }
} finally { $original.Dispose() }

Write-Output 'Compass dial and static background PNGs rebuilt.'
