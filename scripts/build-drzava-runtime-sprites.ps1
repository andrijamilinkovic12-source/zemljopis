param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path $ProjectRoot 'background-concepts/drzava-live-v3-sprites'
$outputRoot = Join-Path $ProjectRoot 'www/assets/theme-live-v3/drzava-sprites'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$sizes = @{
    'pin-coral' = @(188, 188); 'pin-gold' = @(188, 188)
    'pin-africa' = @(188, 188); 'pin-rose' = @(188, 188)
    'cloud-left' = @(570, 368); 'cloud-middle' = @(316, 248)
    'cloud-right' = @(476, 340); 'compass-needle' = @(360, 264)
}
foreach ($name in $sizes.Keys) {
    $size = $sizes[$name]
    $source = [System.Drawing.Image]::FromFile((Join-Path $sourceRoot "$name.png"))
    $bitmap = [System.Drawing.Bitmap]::new($size[0], $size[1],
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.DrawImage($source, 0, 0, $size[0], $size[1])
        } finally { $graphics.Dispose() }
        $bitmap.Save((Join-Path $outputRoot "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $bitmap.Dispose(); $source.Dispose() }
}

$atlas = [System.Drawing.Bitmap]::new(1104, 736, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($atlas)
try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($index = 0; $index -lt 16; $index++) {
        $name = 'plane-turn-{0:D2}.png' -f $index
        $source = [System.Drawing.Image]::FromFile((Join-Path $sourceRoot $name))
        try {
            $graphics.DrawImage($source, ($index % 4) * 276,
                [int][Math]::Floor($index / 4) * 184, 276, 184)
        } finally { $source.Dispose() }
    }
    $atlas.Save((Join-Path $outputRoot 'plane-atlas.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $atlas.Dispose() }

# The route and pin effects are small PNG stamps, composited like the other moving details.
$stamp = [System.Drawing.Bitmap]::new(20, 20, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
    for ($y = 0; $y -lt 20; $y++) {
        for ($x = 0; $x -lt 20; $x++) {
            $distance = [Math]::Sqrt([Math]::Pow($x - 9.5, 2) + [Math]::Pow($y - 9.5, 2))
            $alpha = if ($distance -lt 2) { 208 } elseif ($distance -lt 5) { 155 } else {
                [int](55 * [Math]::Max(0, 1 - ($distance - 5) / 5))
            }
            $stamp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 238, 172))
        }
    }
    $stamp.Save((Join-Path $outputRoot 'route-stamp.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $stamp.Dispose() }

$shadow = [System.Drawing.Bitmap]::new(100, 28, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($shadow)
try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(66, 43, 78, 91))
    try { $graphics.FillEllipse($brush, 2, 3, 96, 22) } finally { $brush.Dispose() }
    $shadow.Save((Join-Path $outputRoot 'pin-shadow.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $shadow.Dispose() }

$impact = [System.Drawing.Bitmap]::new(120, 36, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($impact)
try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, 255, 245, 197), 3)
    try { $graphics.DrawEllipse($pen, 3, 3, 114, 30) } finally { $pen.Dispose() }
    $impact.Save((Join-Path $outputRoot 'pin-impact.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $impact.Dispose() }

Get-ChildItem -Path $outputRoot -Filter '*.png' |
    Measure-Object -Property Length -Sum |
    ForEach-Object { 'Drzava runtime sprites: {0} PNGs, {1:N0} bytes' -f $_.Count, $_.Sum }
