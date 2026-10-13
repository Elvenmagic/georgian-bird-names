import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportNames } from "./names.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "birds.json");
const sourcesDir = path.join(root, "data", "sources");
const snapshotPath = path.join(sourcesDir, "iliauni-checklist.json");
const userAgent =
  "GeorgianBirdNames/1.0 (static nomenclature site; Iliauni import)";

const remoteSources = [
  "https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/",
  "http://sabuko.ge/bird-checklist/",
  "https://sabuko.ge/bird-checklist/",
];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeLatin(value) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length < 2) return "";
  return [capitalize(words[0]), ...words.slice(1).map((word) => word.toLowerCase())].join(
    " ",
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isBinomial(value) {
  return /^[A-Z][a-z]+(?:\s+[A-Za-z-]+){1,3}$/.test(String(value || "").trim());
}

function isHeaderCell(value) {
  return /^(order|famili|family|species|scientific name|common name|რიგი|ოჯახი|სახეობა|georgia)$/i.test(
    value,
  );
}

function latinSlug(value) {
  return normalizeLatin(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => value.trim()).filter(hasText))];
}

const statusCodes = {
  "yr-r": "YR-R",
  "yr-v": "YR-V",
  bb: "BB",
  sv: "SV",
  wv: "WV",
  m: "M",
  nd: "ND",
  fb: "FB",
  ib: "IB",
  ob: "OB",
  ad: "AD",
  int: "INT",
  esc: "ESC",
  ex: "EX",
  cas: "Cas",
};

function normalizeStatus(value) {
  const tokens = [];
  for (const part of String(value || "").split(/[,.]/)) {
    const code = statusCodes[part.trim().toLowerCase()];
    if (code && !tokens.includes(code)) tokens.push(code);
  }
  return tokens.join(", ");
}

function georgianLabel(value) {
  const text = String(value || "").trim();
  if (!/[\u10A0-\u10FF]/.test(text)) return "";
  return text;
}

function orderLabel(value) {
  const text = georgianLabel(value);
  return /ნაირნი$/.test(text) ? text : "";
}

function familyLabel(value) {
  const text = georgianLabel(value).replaceAll("გრატასებნრი", "გრატასებრნი");
  return /ებრნი$/.test(text) ? text : "";
}

function parseSpeciesRow(cells) {
  const cleaned = cells.map((cell) => stripHtml(cell)).filter(Boolean);
  if (cleaned.length < 4) return null;
  if (cleaned.filter(isHeaderCell).length >= 2) return null;

  let start = 0;
  if (/^\d+$/.test(cleaned[0])) start = 1;

  let la = normalizeLatin(cleaned[start + 2] || "");
  let en = cleaned[start + 3] || "";
  let ka = cleaned[start + 6] || "";
  let order = cleaned[start] || "";
  let family = cleaned[start + 1] || "";
  let status = cleaned[start + 7] || "";

  if (!isBinomial(la)) {
    const index = cleaned.findIndex((cell) => isBinomial(normalizeLatin(cell)));
    if (index < 0) return null;
    la = normalizeLatin(cleaned[index]);
    en = cleaned[index + 1] || en;
    ka =
      cleaned.find((cell) => /[\u10A0-\u10FF]/.test(cell) && !/ნაირნი|ებრნი$/.test(cell)) ||
      ka;
    order = cleaned[index - 2] || order;
    family = cleaned[index - 1] || family;
    status = cleaned[cleaned.length - 1] || status;
  }

  if (!isBinomial(la) || !hasText(en)) return null;

  const georgian = cleaned.filter((cell) => /[\u10A0-\u10FF]/.test(cell));
  const orderKa = orderLabel(cleaned[start + 4]) || georgian.map(orderLabel).find(Boolean) || "";
  const familyKa =
    familyLabel(cleaned[start + 5]) || georgian.map(familyLabel).find(Boolean) || "";

  return {
    la,
    en: en.trim(),
    ka: ka.trim(),
    order: /^[A-Z][A-Z-]+$/.test(order) ? order : "",
    orderKa,
    family: /^[A-Z][a-z]+/.test(family) ? family : "",
    familyKa,
    status: normalizeStatus(status),
  };
}

function parseChecklistHtml(html) {
  const rows = [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows
    .map(([, inner]) => {
      const cells = [...inner.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (match) => match[1],
      );
      return parseSpeciesRow(cells);
    })
    .filter(Boolean);
}

function parseChecklistMarkdown(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      if (!line.includes("|")) return null;
      const cells = line.split("|").map((cell) => cell.trim());
      while (cells.length && !cells[0]) cells.shift();
      while (cells.length && !cells[cells.length - 1]) cells.pop();
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
      return parseSpeciesRow(cells);
    })
    .filter(Boolean);
}

function parseChecklist(text) {
  if (/<table[\s>]/i.test(text) || /<tr[\s>]/i.test(text)) {
    const fromHtml = parseChecklistHtml(text);
    if (fromHtml.length) return fromHtml;
  }
  return parseChecklistMarkdown(text);
}

function mergeSpecies(groups) {
  const byLatin = new Map();
  for (const { species, fetchedFrom } of groups) {
    for (const row of species) {
      const key = normalizeName(row.la);
      const existing = byLatin.get(key);
      if (!existing) {
        byLatin.set(key, { ...row, sources: [fetchedFrom] });
        continue;
      }
      for (const field of ["en", "ka", "order", "orderKa", "family", "familyKa", "status"]) {
        if (!hasText(existing[field]) && hasText(row[field])) {
          existing[field] = row[field];
        }
      }
      existing.sources = uniqueStrings([...(existing.sources || []), fetchedFrom]);
    }
  }
  return [...byLatin.values()];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "text/html,*/*" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.text();
}

async function readSnapshot() {
  try {
    const data = JSON.parse(await readFile(snapshotPath, "utf8"));
    return Array.isArray(data.species) ? data : null;
  } catch {
    return null;
  }
}

async function localSourceFiles() {
  try {
    const names = await readdir(sourcesDir);
    return names
      .filter((name) => /\.(html?|md|markdown)$/i.test(name))
      .map((name) => path.join(sourcesDir, name));
  } catch {
    return [];
  }
}

async function loadChecklist() {
  const groups = [];

  for (const url of remoteSources) {
    try {
      const species = parseChecklist(await fetchText(url));
      console.log(`fetched ${url}: ${species.length} species`);
      if (species.length >= 300) {
        groups.push({ species, fetchedFrom: url });
      }
    } catch (error) {
      console.warn(`skip ${url}: ${error.message}`);
    }
  }

  for (const filePath of await localSourceFiles()) {
    const species = parseChecklist(await readFile(filePath, "utf8"));
    console.log(`read ${path.relative(root, filePath)}: ${species.length} species`);
    if (species.length >= 300) {
      groups.push({
        species,
        fetchedFrom: path.relative(root, filePath).replaceAll("\\", "/"),
      });
    }
  }

  const snapshot = await readSnapshot();
  if (snapshot?.species?.length >= 300) {
    console.log(`read snapshot: ${snapshot.species.length} species`);
    groups.push({
      species: snapshot.species,
      fetchedFrom: snapshot.fetchedFrom || snapshot.source,
    });
  }

  const species = mergeSpecies(groups);
  if (species.length < 300) {
    throw new Error("Could not load the Iliauni/SABUKO checklist");
  }

  const fetchedFrom =
    groups.find((group) => group.fetchedFrom.startsWith("http"))?.fetchedFrom ||
    groups[0].fetchedFrom;

  return { species, fetchedFrom };
}

async function readBirds() {
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  if (!Array.isArray(data.birds)) {
    throw new Error("data/birds.json must contain a birds array");
  }
  return data;
}

function indexBirds(birds) {
  const byId = new Map();
  const byLatin = new Map();
  const byEnglish = new Map();
  const byGeorgian = new Map();

  for (const bird of birds) {
    if (bird.id) byId.set(bird.id, bird);
    if (hasText(bird.names?.la)) byLatin.set(normalizeName(normalizeLatin(bird.names.la)), bird);
    if (hasText(bird.names?.en)) byEnglish.set(normalizeName(bird.names.en), bird);
    if (hasText(bird.names?.ka)) byGeorgian.set(normalizeName(bird.names.ka), bird);
  }

  return { byId, byLatin, byEnglish, byGeorgian };
}

function fillName(target, key, incoming) {
  if (hasText(target.names[key]) || !hasText(incoming)) return false;
  target.names[key] = incoming.trim();
  return true;
}

const taxonomyFields = ["order", "orderKa", "family", "familyKa", "status"];

function fillTaxonomy(bird, row) {
  let filled = 0;
  for (const field of taxonomyFields) {
    if (!hasText(bird[field]) && hasText(row[field])) {
      bird[field] = row[field];
      filled += 1;
    }
  }
  return filled;
}

function nextId(slug, byId) {
  if (!byId.has(slug)) return slug;
  let n = 2;
  while (byId.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

function sortBirds(birds) {
  return [...birds].sort((a, b) =>
    (a.names.ka || a.names.en || a.id).localeCompare(
      b.names.ka || b.names.en || b.id,
      "ka",
    ),
  );
}

async function main() {
  await mkdir(sourcesDir, { recursive: true });
  const { species, fetchedFrom } = await loadChecklist();
  const snapshot = {
    source: "https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/",
    fetchedFrom,
    updated: new Date().toISOString().slice(0, 10),
    species: species
      .map(({ sources, ...row }) => row)
      .sort((a, b) => a.la.localeCompare(b.la)),
  };
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${snapshot.species.length} species to data/sources/iliauni-checklist.json`);

  const data = await readBirds();
  const { byId, byLatin, byEnglish, byGeorgian } = indexBirds(data.birds);
  let added = 0;
  let namesFilled = 0;
  let taxonomyFilled = 0;
  let matched = 0;

  for (const row of snapshot.species) {
    const existing =
      byLatin.get(normalizeName(row.la)) ||
      byEnglish.get(normalizeName(row.en)) ||
      byGeorgian.get(normalizeName(row.ka));

    if (existing) {
      matched += 1;
      if (fillName(existing, "ka", row.ka)) namesFilled += 1;
      if (fillName(existing, "en", row.en)) namesFilled += 1;
      if (fillName(existing, "la", row.la)) namesFilled += 1;
      taxonomyFilled += fillTaxonomy(existing, row);
      existing.inGeorgia = true;
      continue;
    }

    const id = nextId(latinSlug(row.la), byId);
    const bird = {
      id,
      ebirdCode: "",
      inGeorgia: true,
      order: row.order || "",
      orderKa: row.orderKa || "",
      family: row.family || "",
      familyKa: row.familyKa || "",
      status: row.status || "",
      names: {
        ka: row.ka || "",
        en: row.en,
        la: row.la,
      },
      photo: null,
    };
    data.birds.push(bird);
    byId.set(id, bird);
    byLatin.set(normalizeName(row.la), bird);
    byEnglish.set(normalizeName(row.en), bird);
    if (hasText(row.ka)) byGeorgian.set(normalizeName(row.ka), bird);
    added += 1;
  }

  data.updated = new Date().toISOString().slice(0, 10);
  data.birds = sortBirds(data.birds);
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(
    `Merged into birds.json. added=${added} matched=${matched} namesFilled=${namesFilled} taxonomyFilled=${taxonomyFilled} total=${data.birds.length}`,
  );
  await exportNames();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
