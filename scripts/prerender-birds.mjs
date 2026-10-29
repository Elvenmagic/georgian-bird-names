import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "dist", "index.html");
const birdsPath = path.join(root, "data", "birds.json");
const origin = "https://birdnames.ge";
const siteTitle = "ფრინველთა ქართული სახელები";
const fallbackDescription =
  "ქართული, ინგლისური და ლათინური სახელები ფრინველებისთვის — ძებნა და სია.";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function pageUrl(id) {
  return `${origin}/bird/${encodeURIComponent(id)}/`;
}

function siteImageUrl() {
  return `${origin}/assets/og.png`;
}

function escapeText(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

// Same primary-name rule as parseGeorgianName in src/lib/names.ts.
function georgianPrimary(value) {
  let primary = String(value || "").replace(/\s+/g, " ").trim();
  if (!primary) return "";

  let trailing = primary.match(/^(.*\S)\s*\(([^()]*)\)\s*$/u);
  while (trailing) {
    primary = trailing[1].trim();
    trailing = primary.match(/^(.*\S)\s*\(([^()]*)\)\s*$/u);
  }

  const embedded = primary.match(/^(.*?)\s*\(([^()]*)\)\s*(.+)$/u);
  if (embedded) {
    const left = embedded[1].trim();
    const right = embedded[3].trim();
    primary = `${left} ${right}`.replace(/\s+/g, " ").trim();
  }

  return primary;
}

function clip(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  const slice = value.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  const short = (cut > 40 ? slice.slice(0, cut) : slice).trim();
  return `${short}…`;
}

function pageTitle(bird) {
  const name = georgianPrimary(bird.names?.ka) || bird.names?.en || "";
  return name ? `${name} — ${siteTitle}` : siteTitle;
}

function pageDescription(bird) {
  const primary = georgianPrimary(bird.names?.ka);
  const parts = [primary, bird.names?.en, bird.names?.la]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const names = parts.join(" · ");
  const about = clip(bird.description, 180);
  if (names && about) return `${names}. ${about}`;
  return names || about || fallbackDescription;
}

function absolutePhoto(url) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return "";
  return url;
}

function setTitle(html, title) {
  const next = `<title>${escapeText(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, next);
  }
  return html.replace("</head>", `    ${next}\n  </head>`);
}

function setMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${escapeAttr(content)}" />`;
  const pattern = new RegExp(
    `<meta\\b[^>]*?\\b${attribute}\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  if (!pattern.test(html)) {
    return html.replace("</head>", `    ${tag}\n  </head>`);
  }
  return html.replace(pattern, tag);
}

function removeMeta(html, attribute, key) {
  const pattern = new RegExp(
    `\\n?[ \\t]*<meta\\b[^>]*?\\b${attribute}\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  return html.replace(pattern, "");
}

function setCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeAttr(url)}" />`;
  const pattern = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function renderBird(template, bird) {
  const title = pageTitle(bird);
  const description = pageDescription(bird);
  const url = pageUrl(bird.id);
  const photo = absolutePhoto(bird.photo?.url);
  const image = photo || siteImageUrl();
  const imageAlt = photo ? georgianPrimary(bird.names?.ka) || bird.names?.en || siteTitle : siteTitle;

  let html = template;
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:image:alt", imageAlt);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  html = setCanonical(html, url);
  if (photo) {
    html = removeMeta(html, "property", "og:image:type");
    html = removeMeta(html, "property", "og:image:width");
    html = removeMeta(html, "property", "og:image:height");
  }
  return html;
}

let template;
try {
  template = await readFile(indexPath, "utf8");
} catch (error) {
  if (error.code === "ENOENT") fail("dist/index.html is missing. Run vite build first.");
  throw error;
}

let raw;
try {
  raw = await readFile(birdsPath, "utf8");
} catch (error) {
  if (error.code === "ENOENT") fail("data/birds.json is missing.");
  throw error;
}

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  fail(`birds.json is not valid JSON: ${error.message}`);
}

if (!data || !Array.isArray(data.birds)) fail("birds.json must contain a birds array.");

const seen = new Set();
let written = 0;
for (const bird of data.birds) {
  const id = bird && typeof bird.id === "string" ? bird.id : "";
  if (!/^[a-z0-9-]+$/i.test(id) || seen.has(id)) continue;
  seen.add(id);
  const dir = path.join(root, "dist", "bird", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), renderBird(template, bird), "utf8");
  written += 1;
}

console.log(`Wrote ${written} bird pages to dist/bird/`);
