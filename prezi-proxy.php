<?php
/**
 * HTTPS-прокси к HTTP-каталогу презентаций.
 * Браузер (slides.pyabc.ru) не может качать http://pyabc.ru/prezi/ напрямую.
 * Залейте этот файл в корень HTTPS-сайта (рядом с index.html).
 *
 * ?src=http://pyabc.ru/prezi/&file=list.php&path=
 * ?src=http://pyabc.ru/prezi/&file=get.php&path=demo.html
 * ?src=http://pyabc.ru/prezi/&path=demo.png
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

$allowHosts = ['pyabc.ru' => 1, 'www.pyabc.ru' => 1];
if ($scheme !== 'http' || !isset($allowHosts[$host])) {
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

$target = parse_url($url);
$tHost = isset($target['host']) ? strtolower($target['host']) : '';
if (!isset($allowHosts[$tHost])) {
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
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['Accept: */*'],
  ]);
  $body = curl_exec($ch);
  if ($body !== false) {
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($ct) $ctype = $ct;
  }
  curl_close($ch);
} else {
  $ctx = stream_context_create([
    'http' => [
      'timeout' => 25,
      'ignore_errors' => true,
      'follow_location' => 0,
      'header' => "Accept: */*\r\n",
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
