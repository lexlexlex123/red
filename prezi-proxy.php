<?php
/**
 * HTTPS-прокси к HTTP-каталогу презентаций.
 * Браузер на HTTPS не может качать http://…/prezi/ напрямую (mixed content).
 * Залейте этот файл в корень HTTPS-сайта (рядом с index.html).
 *
 * ?src=http://pyabc.ru/prezi/&file=list.php&path=
 * ?src=http://pyabc.ru/prezi/&file=get.php&path=demo.html
 * ?src=https://nas.local/prezi/&file=list.php&path=
 */
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$src = isset($_GET['src']) ? (string)$_GET['src'] : '';
$file = isset($_GET['file']) ? (string)$_GET['file'] : '';
$path = isset($_GET['path']) ? (string)$_GET['path'] : '';

$src = str_replace(["\0", '\\'], '', $src);
if (!preg_match('#^https?://#i', $src)) {
  http_response_code(400);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'bad src';
  exit;
}
$src = rtrim($src, '/') . '/';

$parts = parse_url($src);
$host = isset($parts['host']) ? strtolower($parts['host']) : '';
$scheme = isset($parts['scheme']) ? strtolower($parts['scheme']) : '';
$srcPath = isset($parts['path']) ? $parts['path'] : '/';

$allowHosts = [
  'pyabc.ru' => 1,
  'www.pyabc.ru' => 1,
  'slides.pyabc.ru' => 1,
];

// Same host as this PHP (typical Synology: editor + proxy + prezi together).
$reqHost = isset($_SERVER['HTTP_HOST']) ? strtolower(preg_replace('/:\d+$/', '', (string)$_SERVER['HTTP_HOST'])) : '';
if ($reqHost !== '') $allowHosts[$reqHost] = 1;

// Private / local NAS addresses (LAN import from HTTPS UI).
function _is_local_host($h) {
  if ($h === 'localhost' || $h === '127.0.0.1' || $h === '::1') return true;
  if (substr($h, -6) === '.local') return true;
  if (preg_match('/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $h)) return true;
  if (preg_match('/^192\.168\.\d{1,3}\.\d{1,3}$/', $h)) return true;
  if (preg_match('/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/', $h)) return true;
  return false;
}
if (_is_local_host($host)) $allowHosts[$host] = 1;

if (($scheme !== 'http' && $scheme !== 'https') || !isset($allowHosts[$host])) {
  http_response_code(403);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'host not allowed';
  exit;
}

function _clean_rel($s) {
  $s = str_replace(["\0", '\\'], '', (string)$s);
  $s = str_replace('..', '', $s);
  return ltrim($s, '/');
}

$file = _clean_rel($file);
$path = _clean_rel($path);

if ($file === 'list.php' || $file === 'get.php') {
  $url = $src . $file . '?path=' . rawurlencode($path);
} elseif ($file === 'index.json') {
  $url = $src . ($path !== '' ? $path . '/' : '') . 'index.json';
} else {
  $rel = $file !== '' ? $file : $path;
  if ($rel === '') {
    $url = $src;
  } else {
    $url = $src . $rel;
  }
}

function _host_allowed($h, $allowHosts) {
  $h = strtolower((string)$h);
  return isset($allowHosts[$h]) || _is_local_host($h);
}

$target = parse_url($url);
$tHost = isset($target['host']) ? strtolower($target['host']) : '';
if (!_host_allowed($tHost, $allowHosts)) {
  http_response_code(403);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'host not allowed';
  exit;
}

$body = false;
$code = 502;
$ctype = 'application/octet-stream';

if (function_exists('curl_init')) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['Accept: */*'],
    // Synology / self-signed certs on LAN
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
  ]);
  $body = curl_exec($ch);
  if ($body !== false) {
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($ct) $ctype = $ct;
    $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    if ($final) {
      $fh = parse_url($final, PHP_URL_HOST);
      if ($fh && !_host_allowed(strtolower($fh), $allowHosts)) {
        curl_close($ch);
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'redirect host not allowed';
        exit;
      }
    }
  }
  curl_close($ch);
} else {
  $ctx = stream_context_create([
    'http' => [
      'timeout' => 25,
      'ignore_errors' => true,
      'follow_location' => 1,
      'max_redirects' => 5,
      'header' => "Accept: */*\r\n",
    ],
    'ssl' => [
      'verify_peer' => false,
      'verify_peer_name' => false,
    ],
  ]);
  $body = @file_get_contents($url, false, $ctx);
  if ($body !== false && !empty($http_response_header)) {
    $code = 200;
    foreach ($http_response_header as $h) {
      if (preg_match('/^HTTP\/\S+\s+(\d+)/', $h, $m)) $code = (int)$m[1];
      if (stripos($h, 'Content-Type:') === 0) $ctype = trim(substr($h, 13));
    }
  }
}

if ($body === false) {
  http_response_code(502);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'proxy fetch failed';
  exit;
}

http_response_code($code >= 100 ? $code : 502);
header('Content-Type: ' . $ctype);
echo $body;
