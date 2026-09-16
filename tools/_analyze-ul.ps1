param(
  [string]$Path = "tools/_cal36.png"
)

Add-Type -AssemblyName System.Drawing

$full = (Resolve-Path $Path).Path
$bmp = [System.Drawing.Bitmap]::new($full)
$w = $bmp.Width
$h = $bmp.Height
Write-Output ("PNG: {0}x{1}" -f $w, $h)

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($data.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
$bmp.Dispose()
$stride = $data.Stride

# Per-row column hit counts
$greenCols = New-Object int[] $h
$yellowCols = New-Object int[] $h
$magentaCols = New-Object int[] $h

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x += 1) {
    $i = $y * $stride + $x * 4
    $b = $bytes[$i]
    $g = $bytes[$i + 1]
    $r = $bytes[$i + 2]
    $a = $bytes[$i + 3]
    if ($a -lt 200) { continue }
    if ($g -gt 170 -and $r -lt 110 -and $b -lt 110) { $greenCols[$y]++ }
    if ($r -gt 190 -and $g -gt 190 -and $b -lt 130) { $yellowCols[$y]++ }
    if ($r -gt 190 -and $b -gt 190 -and $g -lt 130) { $magentaCols[$y]++ }
  }
}

function Get-Bands([int[]]$cols, [int]$minCols) {
  $bands = @()
  $start = -1
  $prev = -2
  for ($y = 0; $y -lt $cols.Length; $y++) {
    if ($cols[$y] -lt $minCols) {
      if ($start -ge 0) { $bands += , @($start, $prev); $start = -1 }
      continue
    }
    if ($start -lt 0) { $start = $y }
    $prev = $y
  }
  if ($start -ge 0) { $bands += , @($start, $prev) }
  return $bands
}

# Underline rows must span wide (letter-spaced). Dots/dashes repeat every 20px.
$gBands = Get-Bands $greenCols 150
$yBands = Get-Bands $yellowCols 20
$mBands = Get-Bands $magentaCols 25

Write-Output ("GREEN bands ({0}):" -f $gBands.Count)
foreach ($b in $gBands) { Write-Output ("  y {0}..{1} center {2} height {3}" -f $b[0], $b[1], [math]::Round(($b[0]+$b[1])/2,1), ($b[1]-$b[0]+1)) }
Write-Output ("YELLOW(dots) bands ({0}):" -f $yBands.Count)
foreach ($b in $yBands) { Write-Output ("  y {0}..{1} center {2} height {3}" -f $b[0], $b[1], [math]::Round(($b[0]+$b[1])/2,1), ($b[1]-$b[0]+1)) }
Write-Output ("MAGENTA(dashes) bands ({0}):" -f $mBands.Count)
foreach ($b in $mBands) { Write-Output ("  y {0}..{1} center {2} height {3}" -f $b[0], $b[1], [math]::Round(($b[0]+$b[1])/2,1), ($b[1]-$b[0]+1)) }

if ($gBands.Count -ge 1 -and $yBands.Count -ge 1) {
  $natAuto = [math]::Round(($gBands[0][0] + $gBands[0][1]) / 2, 2)
  $natUnder = $null
  if ($gBands.Count -ge 2) { $natUnder = [math]::Round(($gBands[1][0] + $gBands[1][1]) / 2, 2) }
  Write-Output ""
  Write-Output ("native-auto center = {0}" -f $natAuto)
  if ($natUnder) { Write-Output ("native-under center = {0}" -f $natUnder) }
  $names = @('cur(1em+0.12em+2px)', 'new(0.9em+0.12em)')
  for ($i = 0; $i -lt $yBands.Count -and $i -lt $names.Count; $i++) {
    $c = [math]::Round(($yBands[$i][0] + $yBands[$i][1]) / 2, 2)
    Write-Output ("  {0}: dots center {1}  delta vs native-auto = {2}px" -f $names[$i], $c, [math]::Round(($c - $natAuto), 2))
  }
}