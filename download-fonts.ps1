param([string]$ProjectDir = $PSScriptRoot)

Set-Location $ProjectDir
Write-Host ""
Write-Host "========================================="
Write-Host "  Загрузка кириллических шрифтов"
Write-Host "========================================="
Write-Host ""

# Создаём папку fonts
$fontsDir = Join-Path $ProjectDir "fonts"
if (-not (Test-Path $fontsDir)) {
    New-Item -ItemType Directory -Path $fontsDir | Out-Null
}

$headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }

$fonts = @(
    @{ name = 'Roboto Regular';         file = 'Roboto-Regular.woff2';           url = 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2' },
    @{ name = 'Roboto Bold';            file = 'Roboto-Bold.woff2';              url = 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2' },
    @{ name = 'Open Sans Regular';      file = 'OpenSans-Regular.woff2';         url = 'https://fonts.gstatic.com/s/opensans/v40/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsiH0C4n.woff2' },
    @{ name = 'Open Sans Bold';         file = 'OpenSans-Bold.woff2';            url = 'https://fonts.gstatic.com/s/opensans/v40/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgspH0C4n.woff2' },
    @{ name = 'PT Sans Regular';        file = 'PTSans-Regular.woff2';           url = 'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0-ExdGM.woff2' },
    @{ name = 'PT Sans Bold';           file = 'PTSans-Bold.woff2';              url = 'https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh0OqtLg.woff2' },
    @{ name = 'Montserrat Regular';     file = 'Montserrat-Regular.woff2';       url = 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.woff2' },
    @{ name = 'Montserrat Bold';        file = 'Montserrat-Bold.woff2';          url = 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w5aX8.woff2' },
    @{ name = 'PT Serif Regular';       file = 'PTSerif-Regular.woff2';          url = 'https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvAFWzr-_dSb_.woff2' },
    @{ name = 'PT Serif Bold';          file = 'PTSerif-Bold.woff2';             url = 'https://fonts.gstatic.com/s/ptserif/v18/EJRQQgYoZZY2vCFuvAnt65qVjSk_.woff2' },
    @{ name = 'Playfair Display Reg';   file = 'PlayfairDisplay-Regular.woff2';  url = 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.woff2' },
    @{ name = 'Playfair Display Bold';  file = 'PlayfairDisplay-Bold.woff2';     url = 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3vUDQ.woff2' },
    @{ name = 'Oswald Regular';         file = 'Oswald-Regular.woff2';           url = 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiZQ.woff2' },
    @{ name = 'Oswald Bold';            file = 'Oswald-Bold.woff2';              url = 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUhiZA.woff2' },
    @{ name = 'Russo One';              file = 'RussoOne-Regular.woff2';         url = 'https://fonts.gstatic.com/s/russoone/v16/Z9XUDmZRWg6M1LvRYsH-yMOInrib9Q.woff2' },
    @{ name = 'Raleway Regular';        file = 'Raleway-Regular.woff2';          url = 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrEVIT9d0c8.woff2' },
    @{ name = 'Raleway Bold';           file = 'Raleway-Bold.woff2';             url = 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCMPLEVIT9d0c8.woff2' },
    @{ name = 'Caveat Regular';         file = 'Caveat-Regular.woff2';           url = 'https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9eIWpZA.woff2' },
    @{ name = 'Caveat Bold';            file = 'Caveat-Bold.woff2';              url = 'https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjYF9eIWpZA.woff2' }
)

$ok = 0; $fail = 0

foreach ($f in $fonts) {
    $dest = Join-Path $fontsDir $f.file
    if (Test-Path $dest) {
        Write-Host "  [пропуск] $($f.name)"
        $ok++
        continue
    }
    try {
        Invoke-WebRequest -Uri $f.url -OutFile $dest -Headers $headers -TimeoutSec 30 -ErrorAction Stop
        Write-Host "  [OK] $($f.name)"
        $ok++
    } catch {
        Write-Host "  [!!] $($f.name) — ошибка: $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))"
        $fail++
    }
}

Write-Host ""
Write-Host "Результат: $ok загружено, $fail ошибок"
Write-Host ""

# Генерируем fonts/fonts.css
$css = @"
/* ====== LOCAL FONTS — кириллические шрифты ====== */

@font-face { font-family: 'Roboto'; font-weight: 400; src: url('fonts/Roboto-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Roboto'; font-weight: 700; src: url('fonts/Roboto-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Open Sans'; font-weight: 400; src: url('fonts/OpenSans-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Open Sans'; font-weight: 700; src: url('fonts/OpenSans-Bold.woff2') format('woff2'); }

@font-face { font-family: 'PT Sans'; font-weight: 400; src: url('fonts/PTSans-Regular.woff2') format('woff2'); }
@font-face { font-family: 'PT Sans'; font-weight: 700; src: url('fonts/PTSans-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Montserrat'; font-weight: 400; src: url('fonts/Montserrat-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Montserrat'; font-weight: 700; src: url('fonts/Montserrat-Bold.woff2') format('woff2'); }

@font-face { font-family: 'PT Serif'; font-weight: 400; src: url('fonts/PTSerif-Regular.woff2') format('woff2'); }
@font-face { font-family: 'PT Serif'; font-weight: 700; src: url('fonts/PTSerif-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Playfair Display'; font-weight: 400; src: url('fonts/PlayfairDisplay-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-weight: 700; src: url('fonts/PlayfairDisplay-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Oswald'; font-weight: 400; src: url('fonts/Oswald-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Oswald'; font-weight: 700; src: url('fonts/Oswald-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Russo One'; font-weight: 400; src: url('fonts/RussoOne-Regular.woff2') format('woff2'); }

@font-face { font-family: 'Raleway'; font-weight: 400; src: url('fonts/Raleway-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Raleway'; font-weight: 700; src: url('fonts/Raleway-Bold.woff2') format('woff2'); }

@font-face { font-family: 'Caveat'; font-weight: 400; src: url('fonts/Caveat-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Caveat'; font-weight: 700; src: url('fonts/Caveat-Bold.woff2') format('woff2'); }
"@

$cssPath = Join-Path $fontsDir "fonts.css"
Set-Content -Path $cssPath -Value $css -Encoding UTF8
Write-Host "[OK] fonts\fonts.css создан"

# Добавляем <link> в index.html если нужно
$htmlPath = Join-Path $ProjectDir "index.html"
if (Test-Path $htmlPath) {
    $html = Get-Content $htmlPath -Raw -Encoding UTF8
    if ($html -notmatch 'fonts/fonts\.css') {
        $tag = '<link rel="stylesheet" href="fonts/fonts.css">'
        $anchor = '<link rel="stylesheet"'
        if ($html.Contains($anchor)) {
            $html = $html.Replace($anchor, $tag + "`n  " + $anchor)
            Set-Content $htmlPath -Value $html -Encoding UTF8 -NoNewline
            Write-Host "[OK] index.html обновлён"
        } else {
            Write-Host "[!!] Добавьте вручную в index.html:"
            Write-Host "     <link rel=`"stylesheet`" href=`"fonts/fonts.css`">"
        }
    } else {
        Write-Host "[OK] index.html уже содержит fonts.css"
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "  Готово! Нажмите F5 в браузере."
Write-Host "  Шрифты работают без интернета."
Write-Host "========================================="
Write-Host ""
