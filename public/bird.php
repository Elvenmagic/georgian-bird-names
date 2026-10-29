<?php
declare(strict_types=1);

header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

$id = isset($_GET["id"]) ? (string) $_GET["id"] : "";
$indexPath = __DIR__ . "/index.html";
$metaPath = __DIR__ . "/bird-meta.json";

$index = is_file($indexPath) ? file_get_contents($indexPath) : false;
if ($index === false) {
  http_response_code(500);
  echo "Site is unavailable.";
  exit;
}

$birds = [];
if (is_file($metaPath)) {
  $decoded = json_decode((string) file_get_contents($metaPath), true);
  if (is_array($decoded)) {
    $birds = $decoded;
  }
}

$bird = preg_match("/^[A-Za-z0-9-]+$/", $id) && isset($birds[$id]) && is_array($birds[$id])
  ? $birds[$id]
  : null;

if ($bird === null) {
  echo $index;
  exit;
}

echo render_bird($index, $bird);

function h(string $value): string
{
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
}

function set_title(string $html, string $title): string
{
  $tag = "<title>" . h($title) . "</title>";
  if (preg_match("/<title>[\s\S]*?<\/title>/i", $html)) {
    return preg_replace("/<title>[\s\S]*?<\/title>/i", $tag, $html, 1);
  }
  return str_replace("</head>", "    {$tag}\n  </head>", $html);
}

function set_meta(string $html, string $attribute, string $key, string $content): string
{
  $tag = '<meta ' . $attribute . '="' . h($key) . '" content="' . h($content) . '" />';
  $pattern = '/<meta\b[^>]*?\b' . preg_quote($attribute, "/") . '\s*=\s*["\']' . preg_quote($key, "/") . '["\'][^>]*>/i';
  if (!preg_match($pattern, $html)) {
    return str_replace("</head>", "    {$tag}\n  </head>", $html);
  }
  return preg_replace($pattern, $tag, $html, 1);
}

function remove_meta(string $html, string $attribute, string $key): string
{
  $pattern = '/\n?[ \t]*<meta\b[^>]*?\b' . preg_quote($attribute, "/") . '\s*=\s*["\']' . preg_quote($key, "/") . '["\'][^>]*>/i';
  return preg_replace($pattern, "", $html, 1);
}

function set_canonical(string $html, string $url): string
{
  $tag = '<link rel="canonical" href="' . h($url) . '" />';
  $pattern = '/<link\b[^>]*\brel\s*=\s*["\']canonical["\'][^>]*>/i';
  if (preg_match($pattern, $html)) {
    return preg_replace($pattern, $tag, $html, 1);
  }
  return str_replace("</head>", "    {$tag}\n  </head>", $html);
}

function render_bird(string $html, array $bird): string
{
  $title = (string) ($bird["title"] ?? "");
  $description = (string) ($bird["description"] ?? "");
  $image = (string) ($bird["image"] ?? "");
  $imageAlt = (string) ($bird["imageAlt"] ?? "");
  $url = (string) ($bird["url"] ?? "");

  $html = set_title($html, $title);
  $html = set_meta($html, "name", "description", $description);
  $html = set_meta($html, "property", "og:title", $title);
  $html = set_meta($html, "property", "og:description", $description);
  $html = set_meta($html, "property", "og:url", $url);
  $html = set_meta($html, "property", "og:image", $image);
  $html = set_meta($html, "property", "og:image:alt", $imageAlt);
  $html = set_meta($html, "name", "twitter:title", $title);
  $html = set_meta($html, "name", "twitter:description", $description);
  $html = set_meta($html, "name", "twitter:image", $image);
  $html = set_canonical($html, $url);
  if (!empty($bird["photo"])) {
    $html = remove_meta($html, "property", "og:image:type");
    $html = remove_meta($html, "property", "og:image:width");
    $html = remove_meta($html, "property", "og:image:height");
  }
  return $html;
}
