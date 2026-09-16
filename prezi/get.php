<?php
/**
 * Отдаёт HTML/JSON из prezi/ с CORS (для импорта в редактор).
 * Пример: http://pyabc.ru/prezi/get.php?path=demo.html
 *         http://pyabc.ru/prezi/get.php?path=math/lesson.slides.json
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$root = realpath(__DIR__);
if ($root === false) {
  http_response_code(500);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'root missing';
  exit;
}

$rel = isset($_GET['path']) ? (string)$_GET['path'] : '';
$rel = str_replace(["\0", '\\'], '', $rel);
$rel = trim(str_replace('..', '', $rel), '/');
if ($rel === '') {
  http_response_code(400);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'path required';
  exit;
}

$file = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
if ($file === false || strpos($file, $root) !== 0 || !is_file($file)) {
  http_response_code(404);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'not found';
  exit;
}

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$types = [
  'html' => 'text/html; charset=utf-8',
  'htm' => 'text/html; charset=utf-8',
  'json' => 'application/json; charset=utf-8',
  'png' => 'image/png',
  'jpg' => 'image/jpeg',
  'jpeg' => 'image/jpeg',
  'webp' => 'image/webp',
  'svg' => 'image/svg+xml',
];
header('Content-Type: ' . (isset($types[$ext]) ? $types[$ext] : 'application/octet-stream'));
header('Content-Length: ' . filesize($file));
readfile($file);
