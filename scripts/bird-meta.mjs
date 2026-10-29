import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const birdsPath = path.join(root, "data", "birds.json");
const outPath = path.join(root, "dist", "bird-meta.json");
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

const meta = {};
for (const bird of data.birds) {
  const id = bird && typeof bird.id === "string" ? bird.id : "";
  if (!/^[a-z0-9-]+$/i.test(id) || meta[id]) continue;
  const photo = absolutePhoto(bird.photo?.url);
  const name = georgianPrimary(bird.names?.ka) || bird.names?.en || siteTitle;
  meta[id] = {
    title: pageTitle(bird),
    description: pageDescription(bird),
    image: photo || siteImageUrl(),
    imageAlt: photo ? name : siteTitle,
    url: pageUrl(id),
    photo: Boolean(photo),
  };
}

await writeFile(outPath, `${JSON.stringify(meta)}\n`, "utf8");
console.log(`Wrote ${Object.keys(meta).length} birds to dist/bird-meta.json`);
