param(
  [string]$Path = "tools/_cal36.png",
  [int]$Y0 = 101,
  [int]$Y1 = 130
)

Add-Type -AssemblyName System.Drawing
$full = (Resolve-Path $Path).Path
$bmp = [System.Drawing.Bitmap]::new($full)
$w = $bmp.Width
$h = $bmp.Height
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = New-Object byte[] ($data.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
$bmp.Dispose()
$stride = $data.Stride

$counts = @{}
for ($y = $Y0; $y -le $Y1; $y++) {
  for ($x = 0; $x -lt $w; $x += 1) {
    $i = $y * $stride + $x * 4
    $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]; $a = $bytes[$i + 3]
    if ($a -lt 200) { continue }
    $key = "#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b
    if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
  }
}
$counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15 | ForEach-Object {
  Write-Output ("{0}  x{1}" -f $_.Key, $_.Value)
}