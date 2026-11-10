param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Join-Path $ProjectRoot 'background-concepts/drzava-live-v3-sprites'

function Save-Cell([string]$source, [string]$destination,
                   [int]$x, [int]$y, [int]$width, [int]$height) {
    $image = [System.Drawing.Bitmap]::new((Join-Path $root $source))
    try {
        $rect = [System.Drawing.Rectangle]::new($x, $y, $width, $height)
        $cell = $image.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try { $cell.Save((Join-Path $root $destination), [System.Drawing.Imaging.ImageFormat]::Png) }
        finally { $cell.Dispose() }
    } finally { $image.Dispose() }
}

Save-Cell 'plane-sheet.png' 'plane-front.png' 0 0 768 512
Save-Cell 'plane-sheet.png' 'plane-right.png' 768 0 768 512
Save-Cell 'plane-sheet.png' 'plane-away.png' 0 512 768 512
Save-Cell 'plane-sheet.png' 'plane-left.png' 768 512 768 512
Save-Cell 'plane-diagonals-sheet.png' 'plane-front-left.png' 0 0 768 512
Save-Cell 'plane-diagonals-sheet.png' 'plane-away-left.png' 768 0 768 512
Save-Cell 'plane-diagonals-sheet.png' 'plane-away-right.png' 0 512 768 512
Save-Cell 'plane-diagonals-sheet.png' 'plane-front-right.png' 768 512 768 512

Save-Cell 'pins-sheet.png' 'pin-coral.png' 0 0 724 724
Save-Cell 'pins-sheet.png' 'pin-gold.png' 724 0 724 724
Save-Cell 'pins-sheet.png' 'pin-rose.png' 1448 0 724 724

Save-Cell 'clouds-sheet.png' 'cloud-left.png' 0 0 724 724
Save-Cell 'clouds-sheet.png' 'cloud-middle.png' 724 0 724 724
Save-Cell 'clouds-sheet.png' 'cloud-right.png' 1448 0 724 724
