param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [int]$FrameCount = 24
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $ProjectRoot 'www/assets/theme-live-v2'
$frameRoot = Join-Path $ProjectRoot 'tmp/theme-apng-frames'
New-Item -ItemType Directory -Path $frameRoot -Force | Out-Null

function New-Brush([System.Drawing.Color]$color, [int]$alpha) {
    return [System.Drawing.SolidBrush]::new(
        [System.Drawing.Color]::FromArgb([Math]::Clamp($alpha, 0, 255), $color.R, $color.G, $color.B)
    )
}

function Draw-Oval($graphics, [double]$x, [double]$y, [double]$width, [double]$height,
                   [System.Drawing.Color]$color, [int]$alpha) {
    $brush = New-Brush $color $alpha
    try {
        $graphics.FillEllipse($brush, [single]$x, [single]$y, [single]$width, [single]$height)
    } finally { $brush.Dispose() }
}

function Draw-Ring($graphics, [double]$x, [double]$y, [double]$rx, [double]$ry,
                   [System.Drawing.Color]$color, [int]$alpha, [double]$stroke = 3) {
    $pen = [System.Drawing.Pen]::new(
        [System.Drawing.Color]::FromArgb([Math]::Clamp($alpha, 0, 255), $color.R, $color.G, $color.B),
        [single]$stroke
    )
    try { $graphics.DrawEllipse($pen, [single]($x - $rx), [single]($y - $ry), [single](2 * $rx), [single](2 * $ry)) }
    finally { $pen.Dispose() }
}

function Draw-Glow($graphics, [double]$x, [double]$y, [double]$radius,
                   [System.Drawing.Color]$color, [int]$alpha) {
    Draw-Oval $graphics ($x - 2.2 * $radius) ($y - 2.2 * $radius) (4.4 * $radius) (4.4 * $radius) $color ([int]($alpha * 0.13))
    Draw-Oval $graphics ($x - 1.5 * $radius) ($y - 1.5 * $radius) (3 * $radius) (3 * $radius) $color ([int]($alpha * 0.26))
    Draw-Oval $graphics ($x - $radius) ($y - $radius) (2 * $radius) (2 * $radius) $color $alpha
    Draw-Oval $graphics ($x - $radius * 0.36) ($y - $radius * 0.47) ($radius * 0.75) ($radius * 0.75) ([System.Drawing.Color]::White) ([int]($alpha * 0.72))
}

function Draw-Bezier($graphics, [double[]]$points, [System.Drawing.Color]$color,
                     [int]$alpha, [double]$width, [bool]$dashed = $false) {
    $pen = [System.Drawing.Pen]::new(
        [System.Drawing.Color]::FromArgb([Math]::Clamp($alpha, 0, 255), $color.R, $color.G, $color.B),
        [single]$width
    )
    try {
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        if ($dashed) { $pen.DashPattern = [single[]]@(1.5, 4.5) }
        $graphics.DrawBezier($pen,
            [single]$points[0], [single]$points[1], [single]$points[2], [single]$points[3],
            [single]$points[4], [single]$points[5], [single]$points[6], [single]$points[7])
    } finally { $pen.Dispose() }
}

function Bezier-Point([double[]]$p, [double]$t) {
    $u = 1 - $t
    $x = $u * $u * $u * $p[0] + 3 * $u * $u * $t * $p[2] + 3 * $u * $t * $t * $p[4] + $t * $t * $t * $p[6]
    $y = $u * $u * $u * $p[1] + 3 * $u * $u * $t * $p[3] + 3 * $u * $t * $t * $p[5] + $t * $t * $t * $p[7]
    return [double[]]@($x, $y)
}

function Draw-Cloud($graphics, [double]$x, [double]$y, [double]$size, [int]$alpha) {
    $cloud = [System.Drawing.Color]::FromArgb(255, 255, 246, 236)
    Draw-Oval $graphics ($x - $size * 0.9) ($y + $size * 0.05) ($size * 1.8) ($size * 0.58) $cloud $alpha
    Draw-Oval $graphics ($x - $size * 0.56) ($y - $size * 0.28) ($size * 0.9) ($size * 0.85) $cloud $alpha
    Draw-Oval $graphics ($x + $size * 0.03) ($y - $size * 0.12) ($size * 0.72) ($size * 0.67) $cloud $alpha
}

function Draw-Sprite($graphics, $sprite, [double]$x, [double]$y,
                     [double]$width, [double]$height, [double]$rotation = 0) {
    $state = $graphics.Save()
    try {
        $graphics.TranslateTransform([single]$x, [single]$y)
        $graphics.RotateTransform([single]$rotation)
        $graphics.DrawImage($sprite, [single](-$width / 2), [single](-$height / 2),
            [single]$width, [single]$height)
    } finally { $graphics.Restore($state) }
}

$gold = [System.Drawing.Color]::FromArgb(255, 239, 171, 79)
$cream = [System.Drawing.Color]::FromArgb(255, 255, 246, 205)
$water = [System.Drawing.Color]::FromArgb(255, 220, 254, 255)
$leaf = [System.Drawing.Color]::FromArgb(255, 170, 210, 87)
$pink = [System.Drawing.Color]::FromArgb(255, 244, 154, 181)
$blue = [System.Drawing.Color]::FromArgb(255, 78, 145, 182)
$routes = @(
    [double[]]@(153, 581, 288, 366, 588, 389, 740, 545),
    [double[]]@(218, 1000, 374, 786, 644, 832, 837, 1004)
)
$spriteRoot = Join-Path $ProjectRoot 'background-concepts/theme-live-v2-sprites'
$sprites = @{}
foreach ($name in @('plane', 'boat', 'butterfly', 'cloud')) {
    $sprites[$name] = [System.Drawing.Image]::FromFile((Join-Path $spriteRoot "$name.png"))
}

foreach ($theme in @('drzava', 'okean', 'grad', 'planina', 'biljka', 'zivotinja', 'predmet')) {
    $source = Join-Path $assetRoot "$theme.png"
    $themeDir = Join-Path $frameRoot $theme
    New-Item -ItemType Directory -Path $themeDir -Force | Out-Null
    $sourceImage = [System.Drawing.Image]::FromFile($source)
    try {
        $width = $sourceImage.Width
        $height = $sourceImage.Height
        $base = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($base)
            try { $g.DrawImage($sourceImage, 0, 0, $width, $height) }
            finally { $g.Dispose() }
            $base.Save((Join-Path $themeDir 'base.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $base.Dispose() }

        for ($frame = 0; $frame -lt $FrameCount; $frame++) {
            $phase = 2 * [Math]::PI * $frame / $FrameCount
            $progress = $frame / [double]$FrameCount
            $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                try {
                    $graphics.Clear([System.Drawing.Color]::Transparent)
                    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                    $graphics.ScaleTransform([single]($width / 941.0), [single]($height / 1672.0))

                    switch ($theme) {
                        'drzava' {
                            foreach ($route in $routes) {
                                Draw-Bezier $graphics $route $cream 108 3.5 $true
                            }
                            for ($i = 0; $i -lt $routes.Count; $i++) {
                                $position = Bezier-Point $routes[$i] (($progress + $i * 0.5) % 1)
                                Draw-Glow $graphics $position[0] $position[1] 11 $gold 214
                            }
                            $flightX = -95 + 1130 * $progress
                            $flightY = 490 - 80 * [Math]::Sin([Math]::PI * $progress)
                            Draw-Sprite $graphics $sprites['plane'] $flightX $flightY 115 77 8
                            $pulse = 18 + 17 * (0.5 + 0.5 * [Math]::Sin($phase))
                            Draw-Ring $graphics 153 581 $pulse $pulse $cream 120 4
                            Draw-Ring $graphics 740 545 $pulse $pulse $cream 110 4
                        }
                        'okean' {
                            for ($i = 0; $i -lt 5; $i++) {
                                $x = 72 + $i * 144 + 25 * [Math]::Sin($phase + $i)
                                $y = 580 + $i * 174 + 12 * [Math]::Sin($phase * 1.4 + $i)
                                $p = [double[]]@($x, $y, ($x + 74), ($y - 21), ($x + 142), ($y + 15), ($x + 220), ($y - 7))
                                Draw-Bezier $graphics $p $water (100 + [int](48 * [Math]::Sin($phase + $i))) 6
                            }
                            $ripple = 22 + 16 * (0.5 + 0.5 * [Math]::Sin($phase))
                            Draw-Ring $graphics 182 1145 $ripple ($ripple * 0.34) $water 125 4
                            Draw-Ring $graphics 760 1390 $ripple ($ripple * 0.34) $water 110 4
                            Draw-Sprite $graphics $sprites['boat'] (475 + 48 * [Math]::Sin($phase)) (815 + 110 * [Math]::Cos($phase)) 125 84 (4 * [Math]::Sin($phase))
                        }
                        'grad' {
                            $brightness = 95 + [int](66 * (0.5 + 0.5 * [Math]::Sin($phase)))
                            foreach ($spot in @(@(89, 514), @(847, 595), @(294, 617), @(708, 662))) {
                                Draw-Glow $graphics $spot[0] $spot[1] 12 $gold $brightness
                            }
                            $jet = 8 * [Math]::Sin($phase)
                            Draw-Bezier $graphics ([double[]]@(258, 1426, 245, (1368 - $jet), 248, (1362 - $jet), 267, 1398)) $water 164 5
                            Draw-Bezier $graphics ([double[]]@(302, 1424, 330, (1369 - $jet), 327, (1360 - $jet), 309, 1398)) $water 164 5
                            $ripple = 70 + 18 * (0.5 + 0.5 * [Math]::Sin($phase))
                            Draw-Ring $graphics 283 1441 $ripple ($ripple * 0.25) $water 105 4
                            Draw-Sprite $graphics $sprites['cloud'] (-100 + 1140 * $progress) 225 185 90
                        }
                        'planina' {
                            Draw-Sprite $graphics $sprites['cloud'] (185 + 74 * [Math]::Sin($phase)) 181 190 100
                            Draw-Sprite $graphics $sprites['cloud'] (746 - 68 * [Math]::Sin($phase)) 246 155 83
                            $mistAlpha = 38 + [int](20 * [Math]::Sin($phase))
                            Draw-Oval $graphics (191 + 26 * [Math]::Sin($phase)) 780 551 81 $cream $mistAlpha
                            Draw-Glow $graphics 129 302 8 $cream (120 + [int](70 * [Math]::Sin($phase)))
                        }
                        'biljka' {
                            for ($i = 0; $i -lt 13; $i++) {
                                $x = 90 + (($i * 137 + 20 * [Math]::Sin($phase + $i)) % 760)
                                $y = 340 + (($i * 127 + $progress * 430) % 1130)
                                $alpha = 100 + [int](75 * (0.5 + 0.5 * [Math]::Sin($phase + $i)))
                                $color = if ($i % 3 -eq 0) { $pink } elseif ($i % 3 -eq 1) { $cream } else { $leaf }
                                Draw-Oval $graphics $x $y (8 + $i % 3 * 3) (14 + $i % 4 * 3) $color $alpha
                            }
                            Draw-Sprite $graphics $sprites['butterfly'] (465 + 200 * [Math]::Cos($phase)) (690 + 85 * [Math]::Sin($phase)) 106 74 (10 * [Math]::Sin($phase))
                        }
                        'zivotinja' {
                            for ($i = 0; $i -lt 8; $i++) {
                                $x = 145 + $i * 90 + 23 * [Math]::Sin($phase + $i * 1.7)
                                $y = 490 + ($i % 4) * 185 + 28 * [Math]::Cos($phase + $i)
                                Draw-Glow $graphics $x $y (6 + $i % 3 * 2) $cream (133 + [int](70 * [Math]::Sin($phase + $i)))
                            }
                            Draw-Sprite $graphics $sprites['butterfly'] (430 + 205 * [Math]::Cos($phase + 0.5)) (810 + 105 * [Math]::Sin($phase)) 96 66 (12 * [Math]::Sin($phase))
                        }
                        'predmet' {
                            $light = 37 + [int](25 * (0.5 + 0.5 * [Math]::Sin($phase)))
                            Draw-Oval $graphics 40 824 328 280 $cream $light
                            foreach ($spot in @(@(185, 465), @(821, 1100), @(287, 1400))) {
                                Draw-Glow $graphics $spot[0] $spot[1] 10 $cream (100 + [int](70 * [Math]::Sin($phase + $spot[0])))
                            }
                            Draw-Sprite $graphics $sprites['plane'] (760 + 73 * [Math]::Cos($phase)) (1160 + 49 * [Math]::Sin($phase)) 88 59 (10 * [Math]::Sin($phase))
                        }
                    }
                } finally { $graphics.Dispose() }
                $bitmap.Save((Join-Path $themeDir ('frame-{0:D2}.png' -f $frame)), [System.Drawing.Imaging.ImageFormat]::Png)
            } finally { $bitmap.Dispose() }
        }
        Write-Output "$theme`: $FrameCount transparent frames"
    } finally { $sourceImage.Dispose() }
}

foreach ($sprite in $sprites.Values) { $sprite.Dispose() }
