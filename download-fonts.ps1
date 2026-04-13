$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

$fontsDir = [System.IO.Path]::Combine($ProjectDir, "fonts")
if (-not [System.IO.Directory]::Exists($fontsDir)) {
    [System.IO.Directory]::CreateDirectory($fontsDir) | Out-Null
    Write-Host "Created fonts\ - put your font files there and run again."
    Read-Host; exit 0
}

$exts = @(".woff2", ".woff", ".ttf", ".otf")
$files = Get-ChildItem -Path $fontsDir | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name

if ($files.Count -eq 0) {
    Write-Host "No font files in fonts\ folder. Add .woff2 or .ttf files and run again."
    Read-Host; exit 0
}

Write-Host "Found $($files.Count) font files, embedding as base64..."
Write-Host ""

$faceLines = @()
$namesList = @()

foreach ($file in $files) {
    $fmt = switch ($file.Extension.ToLower()) {
        ".woff2" { "woff2" }
        ".woff"  { "woff"  }
        ".ttf"   { "truetype" }
        ".otf"   { "opentype" }
    }

    $base = $file.BaseName
    if ($base -match '^(.+)[-_](Bold|Italic|BoldItalic|Light|Medium|SemiBold|Black|Thin|ExtraBold|ExtraLight|Regular|\d+)$') {
        $familyRaw = $Matches[1]
        $weightRaw = $Matches[2]
    } else {
        $familyRaw = $base
        $weightRaw = "Regular"
    }

    $family = [regex]::Replace($familyRaw, '(?<=[a-z])(?=[A-Z])', ' ')

    $weight = switch ($weightRaw) {
        "Thin"       { "100" }
        "ExtraLight" { "200" }
        "Light"      { "300" }
        "Regular"    { "400" }
        "Medium"     { "500" }
        "SemiBold"   { "600" }
        "Bold"       { "700" }
        "ExtraBold"  { "800" }
        "Black"      { "900" }
        default      { if ($weightRaw -match '^\d+$') { $weightRaw } else { "400" } }
    }

    $italic = if ($base -match 'Italic') { "italic" } else { "normal" }

    # Read file and convert to base64
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)
    $dataUrl = "data:font/$fmt;base64,$b64"

    Write-Host "  $($file.Name) -> '$family' w$weight ($([Math]::Round($bytes.Length/1024))KB)"
    $faceLines += "@font-face { font-family: '$family'; font-weight: $weight; font-style: $italic; src: url('$dataUrl') format('$fmt'); }"
    $namesList += $family
}

# Write fonts.css with embedded base64
$cssLines = @("/* AUTO-GENERATED - run download-fonts.ps1 to refresh */", "/* Fonts embedded as base64 - works without HTTP server */", "") + $faceLines
$cssPath = [System.IO.Path]::Combine($fontsDir, "fonts.css")
[System.IO.File]::WriteAllLines($cssPath, $cssLines, [System.Text.Encoding]::UTF8)

$sizeMB = [Math]::Round((Get-Item $cssPath).Length / 1MB, 1)
Write-Host ""
Write-Host "[OK] fonts\fonts.css written ($($faceLines.Count) faces, $sizeMB MB)"

# Build inline _LOCAL_FONTS for index.html
$namesUnique = ($namesList | Select-Object -Unique | Sort-Object)
$namesJs = ($namesUnique | ForEach-Object { "'$_'" }) -join ","
$inlineScript = "<script>window._LOCAL_FONTS=[$namesJs];</script>"

# Update index.html
$htmlPath = [System.IO.Path]::Combine($ProjectDir, "index.html")
if ([System.IO.File]::Exists($htmlPath)) {
    $html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
    $changed = $false

    if ($html -notmatch 'fonts/fonts\.css') {
        $anchor = '<link rel="stylesheet"'
        if ($html.Contains($anchor)) {
            $html = $html.Replace($anchor, '<link rel="stylesheet" href="fonts/fonts.css">' + "`n  " + $anchor)
            $changed = $true
            Write-Host "[OK] index.html: fonts.css added"
        }
    } else {
        Write-Host "[OK] index.html: fonts.css already present"
    }

    # Update or insert inline _LOCAL_FONTS script
    $marker = "<!-- FONTS-LIST -->"
    $scriptBlock = "$marker`n  $inlineScript"
    if ($html -match '<!-- FONTS-LIST -->') {
        # Replace existing block (marker + old script on next line)
        $html = [regex]::Replace($html, '<!-- FONTS-LIST -->[\s\S]*?</script>', $scriptBlock)
        $changed = $true
        Write-Host "[OK] index.html: _LOCAL_FONTS updated"
    } else {
        # Insert before first <script src="js/
        $anchor2 = '<script src="js/'
        if ($html.Contains($anchor2)) {
            $html = $html.Replace($anchor2, $scriptBlock + "`n  " + $anchor2)
            $changed = $true
            Write-Host "[OK] index.html: _LOCAL_FONTS inserted"
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
    }
}

Write-Host ""
Write-Host "Done. Press F5 in browser."
Read-Host
