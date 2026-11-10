param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [int]$FrameCount = 96
)

$ErrorActionPreference = 'Stop'
if ($FrameCount -ne 96) { throw 'The pin and route timeline requires exactly 96 frames.' }
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
    $time = $frame
    if ($land -eq 96 -and $frame -lt 6) { $time += 96 }
    $lift = 0.0
    if ($time -ge $start -and $time -le $land) {
        $phase = ($time - $start) / [double]($land - $start)
        $lift = 58 * [Math]::Sin([Math]::PI * $phase)
    }
    Draw-Oval $graphics ($x - 25 + $lift * 0.08) ($groundY - 7) (50 - $lift * 0.16) 14 ([System.Drawing.Color]::FromArgb(255, 43, 78, 91)) ([int](66 - $lift * 0.42))
    Draw-Sprite $graphics $sprite $x ($groundY - 37 - $lift) 94 94
    if ($time -ge $land -and $time -le $land + 3) {
        $radius = 13 + 9 * ($time - $land)
        $pen = [System.Drawing.Pen]::new(
            [System.Drawing.Color]::FromArgb([int](115 - 28 * ($time - $land)), 255, 245, 197), 3
        )
        try { $graphics.DrawEllipse($pen, [single]($x - $radius), [single]($groundY - $radius * 0.24),
            [single](2 * $radius), [single]($radius * 0.48)) }
        finally { $pen.Dispose() }
    }
}

$sprites = @{}
foreach ($name in @('plane-front', 'plane-front-left', 'plane-left', 'plane-away-left',
                    'plane-away', 'plane-away-right', 'plane-right', 'plane-front-right',
                    'pin-coral', 'pin-gold', 'pin-africa', 'pin-rose',
                    'cloud-left', 'cloud-middle', 'cloud-right', 'compass-needle')) {
    $sprites[$name] = [System.Drawing.Image]::FromFile((Join-Path $spriteRoot "$name.png"))
}

$baseImage = [System.Drawing.Image]::FromFile((Join-Path $assetRoot 'drzava-base-v4.png'))
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
        [double[]]@(740, 545, 819, 682, 834, 876, 770, 1010),
        [double[]]@(770, 1010, 617, 818, 382, 850, 218, 1000),
        [double[]]@(218, 1000, 88, 853, 83, 678, 153, 580)
    )
    $routeWindows = @(@(0, 18, 24), @(24, 42, 48), @(48, 66, 72), @(72, 90, 96))
    $planeViews = @('plane-front', 'plane-front-left', 'plane-left', 'plane-away-left',
                    'plane-away', 'plane-away-right', 'plane-right', 'plane-front-right')
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

                for ($routeIndex = 0; $routeIndex -lt $routes.Count; $routeIndex++) {
                    $window = $routeWindows[$routeIndex]
                    $departure = $window[0]
                    $arrival = $window[1]
                    $impact = $window[2]
                    if ($frame -ge $departure -and $frame -le $arrival) {
                        Draw-Route $g $routes[$routeIndex] (($frame - $departure) / [double]($arrival - $departure)) 255
                    } elseif ($frame -gt $arrival -and $frame -lt $impact) {
                        Draw-Route $g $routes[$routeIndex] 1 ([int](255 * ($impact - $frame) / ($impact - $arrival)))
                    }
                }

                Draw-Pin $g $sprites['pin-coral'] 153 580 $frame 90 96
                Draw-Pin $g $sprites['pin-gold'] 740 545 $frame 18 24
                Draw-Pin $g $sprites['pin-africa'] 770 1010 $frame 42 48
                Draw-Pin $g $sprites['pin-rose'] 218 1000 $frame 66 72

                $planeX = 470 + 328 * [Math]::Cos($theta)
                $planeY = 514 + 205 * [Math]::Sin($theta)
                $velocityX = -328 * [Math]::Sin($theta)
                $velocityY = 205 * [Math]::Cos($theta)
                # The plane faces down in the front sprite, then turns left, away and right.
                # Select the eight perspective PNG views from the path tangent, not the ellipse position.
                $heading = [Math]::Atan2(-$velocityX, $velocityY) * 180 / [Math]::PI
                if ($heading -lt 0) { $heading += 360 }
                $viewIndex = [int][Math]::Floor(($heading + 22.5) / 45) % $planeViews.Count
                $viewHeading = 45 * $viewIndex
                $offset = $heading - $viewHeading
                if ($offset -gt 180) { $offset -= 360 }
                if ($offset -lt -180) { $offset += 360 }
                Draw-Sprite $g $sprites[$planeViews[$viewIndex]] $planeX $planeY 138 96 (0.28 * $offset)

                $needleAngle = 45 + 6 * [Math]::Sin($theta) + 3 * [Math]::Sin(2 * $theta)
                Draw-Sprite $g $sprites['compass-needle'] 742 1445 180 132 $needleAngle
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
