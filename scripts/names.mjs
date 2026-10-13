import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const birdsPath = path.join(root, "data", "birds.json");
const namesPath = path.join(root, "data", "names.json");

function newlineOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function serialize(data, newline = "\n") {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  return newline === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}

function entryFromBird(bird) {
  return {
    id: bird.id,
    latin: bird.names?.la || "",
    georgian: bird.names?.ka || "",
    english: bird.names?.en || "",
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    String(a.georgian || a.english || a.id || "").localeCompare(
      String(b.georgian || b.english || b.id || ""),
      "ka",
    ),
  );
}

async function readBirdsFile() {
  let raw;
  try {
    raw = await readFile(birdsPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("data/birds.json is missing.");
    throw error;
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.birds)) {
      throw new Error("data/birds.json must contain a birds array");
    }
    return { data, newline: newlineOf(raw) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`birds.json is not valid JSON: ${error.message}`);
    }
    throw error;
  }
}

export async function readNames() {
  let raw;
  try {
    raw = await readFile(namesPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  try {
    return { data: JSON.parse(raw), newline: newlineOf(raw) };
  } catch (error) {
    throw new Error(`names.json is not valid JSON: ${error.message}`);
  }
}

export function reviewNames(namesDoc, birdsData) {
  const errors = [];
  const updates = [];
  if (!namesDoc || typeof namesDoc !== "object" || Array.isArray(namesDoc) || !Array.isArray(namesDoc.birds)) {
    errors.push("names.json must contain a top-level birds array.");
    return { errors, updates };
  }

  const birdsById = new Map();
  for (const bird of birdsData.birds || []) {
    if (bird?.id) birdsById.set(bird.id, bird);
  }

  const seen = new Set();
  namesDoc.birds.forEach((entry, index) => {
    const place = `names[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${place} must be an object.`);
      return;
    }
    if (typeof entry.id !== "string" || !entry.id) {
      errors.push(`${place} is missing id.`);
      return;
    }
    if (!birdsById.has(entry.id)) {
      errors.push(`${place} id "${entry.id}" is not in birds.json. Do not change id.`);
      return;
    }
    if (seen.has(entry.id)) {
      errors.push(`duplicate id in names.json: ${entry.id}`);
      return;
    }
    seen.add(entry.id);

    const bird = birdsById.get(entry.id);
    let invalid = false;
    for (const key of ["latin", "georgian", "english"]) {
      if (typeof entry[key] !== "string") {
        errors.push(`${place} (${entry.id}) ${key} must be a string.`);
        invalid = true;
      }
    }
    if (invalid) return;

    const latin = entry.latin.trim();
    const birdLatin = typeof bird.names?.la === "string" ? bird.names.la.trim() : "";
    const georgian = entry.georgian.trim();
    const english = entry.english.trim();
    const currentKa = typeof bird.names?.ka === "string" ? bird.names.ka.trim() : "";
    const currentEn = typeof bird.names?.en === "string" ? bird.names.en.trim() : "";
    let blocked = false;

    if (latin !== birdLatin) {
      errors.push(
        `${place} (${entry.id}) latin does not match "${birdLatin}". Do not edit latin.`,
      );
      blocked = true;
    }
    if (!english) {
      errors.push(`${place} (${entry.id}) english is empty.`);
      blocked = true;
    }
    if (!georgian && currentKa) {
      errors.push(
        `${place} (${entry.id}) georgian was removed. Do not delete a Georgian name.`,
      );
      blocked = true;
    }
    if (!blocked && (georgian !== currentKa || english !== currentEn)) {
      updates.push({ id: entry.id, ka: georgian, en: english });
    }
  });

  for (const bird of birdsData.birds || []) {
    if (bird?.id && !seen.has(bird.id)) {
      errors.push(`names.json is missing "${bird.id}". Do not delete a bird.`);
    }
  }

  return { errors, updates };
}

export async function exportNames() {
  const { data } = await readBirdsFile();
  const existingFile = await readNames();
  if (existingFile && !Array.isArray(existingFile.data?.birds)) {
    throw new Error("names.json must contain a top-level birds array");
  }

  const birdsById = new Map(data.birds.filter((bird) => bird?.id).map((bird) => [bird.id, bird]));
  const existingEntries = existingFile?.data.birds;
  let added = 0;
  let latinUpdated = 0;
  let next;

  if (!existingEntries) {
    next = sortEntries(data.birds.filter((bird) => bird?.id).map(entryFromBird));
    added = next.length;
  } else {
    const emitted = new Set();
    next = [];
    for (const entry of existingEntries) {
      if (!entry || typeof entry.id !== "string" || !birdsById.has(entry.id)) {
        next.push(entry);
        continue;
      }
      const bird = birdsById.get(entry.id);
      const latin = bird.names?.la || "";
      if (entry.latin !== latin) latinUpdated += 1;
      next.push({
        id: bird.id,
        latin,
        georgian: Object.prototype.hasOwnProperty.call(entry, "georgian")
          ? entry.georgian
          : bird.names?.ka || "",
        english: Object.prototype.hasOwnProperty.call(entry, "english")
          ? entry.english
          : bird.names?.en || "",
      });
      emitted.add(entry.id);
    }
    const addedEntries = [];
    for (const bird of data.birds) {
      if (!bird?.id || emitted.has(bird.id)) continue;
      addedEntries.push(entryFromBird(bird));
    }
    added = addedEntries.length;
    next.push(...sortEntries(addedEntries));
  }

  const newline = existingFile?.newline || "\n";
  await writeFile(namesPath, serialize({ birds: next }, newline), "utf8");
  console.log(
    `names.json: total=${next.length} added=${added} latinUpdated=${latinUpdated}`,
  );
  return { added, latinUpdated, total: next.length };
}

export async function checkNames({ apply = false } = {}) {
  const { data, newline } = await readBirdsFile();
  const namesFile = await readNames();
  if (!namesFile) {
    console.error("names.json is missing. Run npm run names:export.");
    return false;
  }

  const { errors, updates } = reviewNames(namesFile.data, data);
  if (errors.length) {
    for (const error of errors) console.error(error);
    return false;
  }
  if (!apply || !updates.length) {
    console.log(
      apply
        ? "birds.json names already match names.json"
        : `OK: ${namesFile.data.birds.length} names`,
    );
    return true;
  }

  const byId = new Map(data.birds.map((bird) => [bird.id, bird]));
  for (const update of updates) {
    const bird = byId.get(update.id);
    bird.names.ka = update.ka;
    bird.names.en = update.en;
  }
  await writeFile(birdsPath, serialize(data, newline), "utf8");
  console.log(`Applied ${updates.length} name${updates.length === 1 ? "" : "s"} to birds.json`);
  return true;
}

async function main() {
  const command = process.argv[2];
  if (command === "export") {
    await exportNames();
    return;
  }
  if (command === "apply" || command === "check") {
    const ok = await checkNames({ apply: command === "apply" });
    if (!ok) process.exitCode = 1;
    return;
  }
  console.error("Usage: node scripts/names.mjs <export|apply|check>");
  process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
