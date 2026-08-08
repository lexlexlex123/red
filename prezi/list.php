<?php
/**
 * Каталог презентаций с CORS.
 * Залейте этот файл в папку prezi/ на сайте.
 * Пример: http://pyabc.ru/prezi/list.php?path=
 *         http://pyabc.ru/prezi/list.php?path=math
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$root = realpath(__DIR__);
if ($root === false) {
  http_response_code(500);
  echo json_encode(['error' => 'root missing'], JSON_UNESCAPED_UNICODE);
  exit;
}

$rel = isset($_GET['path']) ? (string)$_GET['path'] : '';
$rel = str_replace(["\0", '\\'], '', $rel);
$rel = trim(str_replace('..', '', $rel), '/');

$dir = $rel === '' ? $root : realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
if ($dir === false || strpos($dir, $root) !== 0 || !is_dir($dir)) {
  http_response_code(404);
  echo json_encode(['error' => 'not found', 'path' => $rel], JSON_UNESCAPED_UNICODE);
  exit;
}

$skip = ['list.php' => 1, 'get.php' => 1, 'index.json' => 1, '.htaccess' => 1, '.' => 1, '..' => 1];
$items = [];

foreach (scandir($dir) as $name) {
  if (isset($skip[$name]) || $name === '' || $name[0] === '.') continue;
  $full = $dir . DIRECTORY_SEPARATOR . $name;
  if (is_dir($full)) {
    $items[] = ['type' => 'folder', 'name' => $name, 'id' => $name];
    continue;
  }
  // HTML-презентация или компактный проект (.slides.json / .json)
  if (!preg_match('/\.(html?|slides\.json|json)$/i', $name)) continue;
  if (preg_match('/\.slides\.json$/i', $name)) {
    $base = preg_replace('/\.slides\.json$/i', '', $name);
  } elseif (preg_match('/\.json$/i', $name)) {
    $base = preg_replace('/\.json$/i', '', $name);
  } else {
    $base = preg_replace('/\.html?$/i', '', $name);
  }
  $thumb = null;
  foreach (['.png', '.jpg', '.jpeg', '.webp'] as $ext) {
    if (is_file($dir . DIRECTORY_SEPARATOR . $base . $ext)) {
      $thumb = $base . $ext;
      break;
    }
  }
  $items[] = [
    'type' => 'pres',
    'name' => $base,
    'file' => $name,
    'thumb' => $thumb,
  ];
}

usort($items, function ($a, $b) {
  if ($a['type'] !== $b['type']) return $a['type'] === 'folder' ? -1 : 1;
  return strcasecmp($a['name'], $b['name']);
});

echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
