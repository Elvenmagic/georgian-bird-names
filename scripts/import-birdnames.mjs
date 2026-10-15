import { inflateRawSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportNames } from "./names.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "birds.json");
const snapshotPath = path.join(root, "data", "sources", "birdnames.json");
const defaultWorkbook = "C:\\Users\\TokaJ\\Downloads\\birdnames.xlsx";

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

const iucnCodes = ["EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD"];
const statusCodeOrder = Object.values(statusCodes).sort((a, b) => b.length - a.length);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function newlineOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function serialize(data, newline = "\n") {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  return newline === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#10;", "\n");
}

function normalizeName(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeLatin(value) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length < 2) return "";
  return [capitalize(words[0]), ...words.slice(1).map((word) => word.toLowerCase())].join(" ");
}

function latinSlug(value) {
  return normalizeLatin(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanEnglish(value) {
  return String(value || "")
    .replace(/\s*\*+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(value) {
  const tokens = [];
  for (const part of String(value || "").split(/[,;]/)) {
    const code = statusCodes[part.trim().toLowerCase()];
    if (code && !tokens.includes(code)) tokens.push(code);
  }
  return tokens.join(", ");
}

function statusKey(value) {
  return normalizeStatus(value).split(", ").filter(Boolean).sort().join("|");
}

function stripNameConjunction(value) {
  return String(value || "")
    .replace(/^(?:ანუ|ან)\s+/u, "")
    .trim();
}

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
    primary = `${embedded[1].trim()} ${embedded[3].trim()}`.replace(/\s+/g, " ").trim();
  }
  return stripNameConjunction(primary);
}

function unzip(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString("utf8", nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    if (!compSize) break;
    const compressed = buffer.subarray(dataStart, dataStart + compSize);
    const data = method === 0 ? compressed : inflateRawSync(compressed);
    files.set(name, data);
    offset = dataStart + compSize;
  }
  return files;
}

function sharedStrings(xml) {
  const strings = [];
  const entries = xml.matchAll(/<si>([\s\S]*?)<\/si>/g);
  for (const entry of entries) {
    const texts = [...entry[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) =>
      decodeXml(match[1]),
    );
    strings.push(texts.join(""));
  }
  return strings;
}

function cellText(cell, strings) {
  const type = (cell.match(/ t="([^"]+)"/) || [])[1];
  const value = (cell.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  if (type === "s") return strings[Number(value)] ?? "";
  return value ?? "";
}

function sheetRows(xml, strings) {
  const rows = [];
  for (const match of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cell of match[2].matchAll(/<c\b[^>]*r="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>/g)) {
      cells[cell[1]] = cellText(cell[0], strings);
    }
    rows.push({ row: Number(match[1]), cells });
  }
  return rows;
}

function legendEntry(text, codes) {
  const trimmed = String(text || "").replace(/\s+/g, " ").trim();
  for (const code of codes) {
    const match = trimmed.match(new RegExp(`^${code}(?:\\s+|$)`, "i"));
    if (!match) continue;
    const canonical = codes.find((item) => item.toLowerCase() === code.toLowerCase()) || code;
    return { code: canonical, text: trimmed.slice(match[0].length).trim() };
  }
  return null;
}

function readWorkbook(buffer) {
  const files = unzip(buffer);
  const strings = sharedStrings(files.get("xl/sharedStrings.xml").toString("utf8"));
  const rows = sheetRows(files.get("xl/worksheets/sheet1.xml").toString("utf8"), strings);
  const species = [];
  const legend = { status: {}, iucn: {} };
  let section = "";

  for (const { row, cells } of rows) {
    if (row === 1) continue;
    const label = String(cells.A || "").replace(/\s+/g, " ").trim();
    if (/^\d+$/.test(label)) {
      const la = normalizeLatin(cells.C);
      const en = cleanEnglish(cells.D);
      const ka = String(cells.B || "").replace(/\s+/g, " ").trim();
      const status = normalizeStatus(cells.E);
      const iucn = String(cells.F || "").trim().toUpperCase();
      if (!la || !en || !ka) {
        throw new Error(`Row ${row} is missing a Georgian, Latin, or English name.`);
      }
      if (!status) throw new Error(`Row ${row} (${la}) has no presence status.`);
      if (!iucnCodes.includes(iucn)) throw new Error(`Row ${row} (${la}) has IUCN "${iucn}".`);
      species.push({ la, en, ka, status, iucn });
      continue;
    }
    if (!label) continue;
    if (label.startsWith("საქართველოს ფრინველთა ნუსხაში")) {
      section = "status";
      continue;
    }
    if (label.startsWith("წითელი ნუსხის კატეგორიები")) {
      section = "iucn";
      continue;
    }
    if (label.startsWith("შეგროვებული") || label.startsWith("დოკუმენტური")) {
      section = "";
      continue;
    }
    if (section === "status") {
      const entry = legendEntry(label, statusCodeOrder);
      if (entry?.text) legend.status[entry.code] = entry.text;
    } else if (section === "iucn") {
      const entry = legendEntry(label, iucnCodes);
      if (entry?.text) legend.iucn[entry.code] = entry.text;
    }
  }

  if (species.length < 400) throw new Error(`Expected a full checklist, read ${species.length} species.`);
  for (const code of statusCodeOrder) {
    if (!legend.status[code]) throw new Error(`Missing status explanation for ${code}.`);
  }
  for (const code of iucnCodes) {
    if (!legend.iucn[code]) throw new Error(`Missing IUCN explanation for ${code}.`);
  }
  species.sort((a, b) => a.la.localeCompare(b.la));
  return { species, legend };
}

function indexBy(birds, keyOf) {
  const map = new Map();
  for (const bird of birds) {
    const key = keyOf(bird);
    if (!key) continue;
    if (map.has(key)) {
      throw new Error(`Duplicate match key "${key}" for ${map.get(key).id} and ${bird.id}.`);
    }
    map.set(key, bird);
  }
  return map;
}

function nextId(slug, byId) {
  if (!byId.has(slug)) return slug;
  let n = 2;
  while (byId.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

function sortBirds(birds) {
  return [...birds].sort((a, b) =>
    (a.names.ka || a.names.en || a.id).localeCompare(b.names.ka || b.names.en || b.id, "ka"),
  );
}

function uniqueMatch(pool, key, label) {
  const hits = pool.filter((bird) => key(bird));
  if (hits.length > 1) {
    throw new Error(
      `${label} matches ${hits.map((bird) => bird.id).join(", ")}. Refusing to guess.`,
    );
  }
  return hits[0] || null;
}

async function main() {
  const workbookPath = process.argv[2] || defaultWorkbook;
  const buffer = await readFile(workbookPath);
  const { species, legend } = readWorkbook(buffer);
  const snapshot = {
    source: path.basename(workbookPath),
    updated: new Date().toISOString().slice(0, 10),
    legend,
    species,
  };
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const raw = await readFile(dataPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.birds)) throw new Error("data/birds.json must contain a birds array");
  const newline = newlineOf(raw);

  const byLatin = indexBy(data.birds, (bird) => normalizeName(normalizeLatin(bird.names?.la)));
  const byId = new Map(data.birds.map((bird) => [bird.id, bird]));
  const matched = new Set();
  const latinUpdates = [];
  let statusUpdated = 0;
  let iucnSet = 0;

  function applyRow(bird, row) {
    const previousKa = bird.names.ka;
    const previousEn = bird.names.en;
    const previousId = bird.id;
    const nextLatin = row.la;
    if (bird.names.la !== nextLatin) {
      latinUpdates.push(`${bird.names.la} -> ${nextLatin}`);
      bird.names.la = nextLatin;
    }
    if (statusKey(bird.status) !== statusKey(row.status)) {
      bird.status = row.status;
      statusUpdated += 1;
    }
    bird.iucn = row.iucn;
    iucnSet += 1;
    if (bird.names.ka !== previousKa || bird.names.en !== previousEn || bird.id !== previousId) {
      throw new Error(`Match changed a protected field on ${previousId}.`);
    }
    matched.add(bird);
  }

  const pending = [];
  for (const row of species) {
    const existing = byLatin.get(normalizeName(row.la));
    if (existing) applyRow(existing, row);
    else pending.push(row);
  }

  let pool = data.birds.filter((bird) => !matched.has(bird));
  const stillPending = [];
  for (const row of pending) {
    const key = normalizeName(georgianPrimary(row.ka));
    const existing = uniqueMatch(
      pool,
      (bird) => normalizeName(georgianPrimary(bird.names?.ka)) === key,
      `${row.la} Georgian name`,
    );
    if (!existing) {
      stillPending.push(row);
      continue;
    }
    applyRow(existing, row);
    pool = pool.filter((bird) => bird !== existing);
  }

  const added = [];
  for (const row of stillPending) {
    const key = normalizeName(row.en);
    const existing = uniqueMatch(
      pool,
      (bird) => normalizeName(bird.names?.en) === key,
      `${row.la} English name`,
    );
    if (existing) {
      applyRow(existing, row);
      pool = pool.filter((bird) => bird !== existing);
      continue;
    }
    const id = nextId(latinSlug(row.la), byId);
    const bird = {
      id,
      ebirdCode: "",
      inGeorgia: true,
      names: { ka: row.ka, en: row.en, la: row.la },
      photo: null,
      order: "",
      orderKa: "",
      family: "",
      familyKa: "",
      status: row.status,
      iucn: row.iucn,
    };
    data.birds.push(bird);
    byId.set(id, bird);
    added.push(`${row.la} | ${row.en} | ${row.ka}`);
  }

  data.updated = new Date().toISOString().slice(0, 10);
  data.birds = sortBirds(data.birds);
  await writeFile(dataPath, serialize(data, newline), "utf8");

  console.log(`Snapshot: ${species.length} species`);
  console.log(
    `birds.json: matched=${matched.size} latinUpdated=${latinUpdates.length} statusUpdated=${statusUpdated} iucn=${iucnSet} added=${added.length} untouched=${pool.length} total=${data.birds.length}`,
  );
  for (const line of latinUpdates) console.log(`  latin ${line}`);
  for (const line of added) console.log(`  added ${line}`);
  for (const bird of pool) console.log(`  kept ${bird.names.la}`);

  await exportNames();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
