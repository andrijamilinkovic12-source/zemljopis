param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [int]$FrameCount = 72
)

$ErrorActionPreference = 'Stop'
if ($FrameCount -ne 72) { throw 'The pin and route timeline requires exactly 72 frames.' }
Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $ProjectRoot 'www/assets/theme-live-v3'
$spriteRoot = Join-Path $ProjectRoot 'background-concepts/drzava-live-v3-sprites'
$frameRoot = Join-Path $ProjectRoot 'tmp/drzava-v3-frames/drzava'
New-Item -ItemType Directory -Path $frameRoot -Force | Out-Null

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

function Draw-Oval($graphics, [double]$x, [double]$y, [double]$width, [double]$height,
                   [System.Drawing.Color]$color, [int]$alpha) {
    $brush = [System.Drawing.SolidBrush]::new(
        [System.Drawing.Color]::FromArgb([Math]::Clamp($alpha, 0, 255), $color.R, $color.G, $color.B)
    )
    try { $graphics.FillEllipse($brush, [single]$x, [single]$y, [single]$width, [single]$height) }
    finally { $brush.Dispose() }
}

function Bezier-Point([double[]]$p, [double]$t) {
    $u = 1 - $t
    return [System.Drawing.PointF]::new(
        [single]($u*$u*$u*$p[0] + 3*$u*$u*$t*$p[2] + 3*$u*$t*$t*$p[4] + $t*$t*$t*$p[6]),
        [single]($u*$u*$u*$p[1] + 3*$u*$u*$t*$p[3] + 3*$u*$t*$t*$p[5] + $t*$t*$t*$p[7])
    )
}

function Draw-Route($graphics, [double[]]$path, [double]$fraction, [int]$alpha) {
    if ($fraction -le 0 -or $alpha -le 0) { return }
    $count = [Math]::Max(2, [int][Math]::Ceiling(64 * $fraction))
    $points = New-Object System.Drawing.PointF[] ($count + 1)
    for ($index = 0; $index -le $count; $index++) {
        $points[$index] = Bezier-Point $path ($fraction * $index / $count)
    }
    foreach ($stroke in @(@(11, 48), @(4, 195))) {
        $pen = [System.Drawing.Pen]::new(
            [System.Drawing.Color]::FromArgb([int]($alpha * $stroke[1] / 255), 255, 235, 165),
            [single]$stroke[0]
        )
        try {
            $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
            $graphics.DrawLines($pen, $points)
        } finally { $pen.Dispose() }
    }
}

function Draw-Pin($graphics, $sprite, [double]$x, [double]$groundY,
                  [int]$frame, [int]$start, [int]$land) {
    $lift = 0.0
    if ($frame -ge $start -and $frame -le $land) {
        $phase = ($frame - $start) / [double]($land - $start)
        $lift = 58 * [Math]::Sin([Math]::PI * $phase)
    }
    Draw-Oval $graphics ($x - 29 + $lift * 0.09) ($groundY - 8) (58 - $lift * 0.18) 16 ([System.Drawing.Color]::FromArgb(255, 43, 78, 91)) ([int](66 - $lift * 0.42))
    Draw-Sprite $graphics $sprite $x ($groundY - 43 - $lift) 88 108
    if ($frame -ge $land -and $frame -le $land + 3) {
        $radius = 13 + 9 * ($frame - $land)
        $pen = [System.Drawing.Pen]::new(
            [System.Drawing.Color]::FromArgb([int](115 - 28 * ($frame - $land)), 255, 245, 197), 3
        )
        try { $graphics.DrawEllipse($pen, [single]($x - $radius), [single]($groundY - $radius * 0.24),
            [single](2 * $radius), [single]($radius * 0.48)) }
        finally { $pen.Dispose() }
    }
}

$sprites = @{}
foreach ($name in @('plane-front', 'plane-right', 'plane-away', 'plane-left',
                    'pin-coral', 'pin-gold', 'pin-rose',
                    'cloud-left', 'cloud-middle', 'cloud-right', 'compass-needle')) {
    $sprites[$name] = [System.Drawing.Image]::FromFile((Join-Path $spriteRoot "$name.png"))
}

$baseImage = [System.Drawing.Image]::FromFile((Join-Path $assetRoot 'drzava-base.png'))
try {
    $width = $baseImage.Width
    $height = $baseImage.Height
    $base = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $g = [System.Drawing.Graphics]::FromImage($base)
        try { $g.DrawImage($baseImage, 0, 0, $width, $height) }
        finally { $g.Dispose() }
        $base.Save((Join-Path $frameRoot 'base.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $base.Dispose() }

    $routes = @(
        [double[]]@(153, 580, 278, 415, 582, 422, 740, 545),
        [double[]]@(740, 545, 725, 735, 440, 875, 218, 1000),
        [double[]]@(218, 1000, 88, 853, 83, 678, 153, 580)
    )
    for ($frame = 0; $frame -lt $FrameCount; $frame++) {
        $theta = 2 * [Math]::PI * $frame / $FrameCount
        $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $g.Clear([System.Drawing.Color]::Transparent)
                $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

                Draw-Sprite $g $sprites['cloud-left'] (137 + 21 * [Math]::Sin($theta)) 125 285 184
                Draw-Sprite $g $sprites['cloud-right'] (763 + 18 * [Math]::Sin($theta + 1.2)) 93 238 170
                Draw-Sprite $g $sprites['cloud-middle'] (741 + 14 * [Math]::Sin($theta + 2.8)) 227 158 124

                $routeAlpha = if ($frame -lt 68) { 255 } else { [int](255 * (71 - $frame) / 3) }
                Draw-Route $g $routes[0] ([Math]::Clamp(($frame - 15) / 14.0, 0, 1)) $routeAlpha
                Draw-Route $g $routes[1] ([Math]::Clamp(($frame - 34) / 14.0, 0, 1)) $routeAlpha
                Draw-Route $g $routes[2] ([Math]::Clamp(($frame - 53) / 14.0, 0, 1)) $routeAlpha

                Draw-Pin $g $sprites['pin-coral'] 153 580 $frame 7 15
                Draw-Pin $g $sprites['pin-gold'] 740 545 $frame 26 34
                Draw-Pin $g $sprites['pin-rose'] 218 1000 $frame 45 53

                $planeView = @('plane-front', 'plane-left', 'plane-away', 'plane-right')[[int]([Math]::Floor((($theta + [Math]::PI / 4) % (2 * [Math]::PI)) / ([Math]::PI / 2)))]
                $planeX = 470 + 328 * [Math]::Cos($theta)
                $planeY = 514 + 205 * [Math]::Sin($theta)
                Draw-Sprite $g $sprites[$planeView] $planeX $planeY 138 96

                $needleAngle = 9 * [Math]::Sin($theta) + 4 * [Math]::Sin(2 * $theta)
                Draw-Sprite $g $sprites['compass-needle'] 746 1450 232 174 $needleAngle
            } finally { $g.Dispose() }
            $bitmap.Save((Join-Path $frameRoot ('frame-{0:D2}.png' -f $frame)),
                [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $bitmap.Dispose() }
    }
    Write-Output "Drzava v3: $FrameCount PNG motion frames at ${width}x${height}"
} finally {
    $baseImage.Dispose()
    foreach ($sprite in $sprites.Values) { $sprite.Dispose() }
}
