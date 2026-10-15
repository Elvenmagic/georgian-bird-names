import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readNames, reviewNames } from "./names.mjs";

const dataPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "birds.json",
);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const raw = await readFile(dataPath, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  fail(`birds.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(data.birds)) {
  fail("birds.json must contain a top-level birds array.");
  process.exit(1);
}

const seen = new Set();
data.birds.forEach((bird, index) => {
  const place = `birds[${index}]`;
  if (!bird || typeof bird !== "object") {
    fail(`${place} must be an object.`);
    return;
  }
  if (!bird.id || typeof bird.id !== "string") {
    fail(`${place} is missing id.`);
  } else if (seen.has(bird.id)) {
    fail(`duplicate id: ${bird.id}`);
  } else {
    seen.add(bird.id);
  }

  const names = bird.names || {};
  for (const key of ["ka", "en", "la"]) {
    if (typeof names[key] !== "string") {
      fail(`${place} names.${key} must be a string.`);
    }
  }
  if (!names.en?.trim()) fail(`${place} (${bird.id}) names.en is empty.`);
  if (!names.la?.trim()) fail(`${place} (${bird.id}) names.la is empty.`);

  if (bird.inGeorgia != null && typeof bird.inGeorgia !== "boolean") {
    fail(`${place} inGeorgia must be a boolean.`);
  }

  for (const key of ["order", "orderKa", "family", "familyKa", "status"]) {
    if (bird[key] != null && typeof bird[key] !== "string") {
      fail(`${place} ${key} must be a string.`);
    }
  }

  if (bird.iucn != null && !/^(?:EX|EW|CR|EN|VU|NT|LC|DD)$/.test(bird.iucn)) {
    fail(`${place} iucn must be an IUCN category code.`);
  }

  if (bird.photo != null) {
    if (typeof bird.photo !== "object") {
      fail(`${place} photo must be an object or null.`);
    } else if (bird.photo.url && typeof bird.photo.url !== "string") {
      fail(`${place} photo.url must be a string.`);
    }
  }

  if ("description" in bird && typeof bird.description !== "string") {
    fail(`${place} description must be a string.`);
  }

  if ("links" in bird) {
    if (!bird.links || typeof bird.links !== "object" || Array.isArray(bird.links)) {
      fail(`${place} links must be an object.`);
    } else {
      for (const key of ["wikipedia", "ebird", "wikipediaKa"]) {
        if (bird.links[key] != null && typeof bird.links[key] !== "string") {
          fail(`${place} links.${key} must be a string.`);
        }
      }
    }
  }
});

let namesCount = 0;
try {
  const namesFile = await readNames();
  if (!namesFile) {
    fail("names.json is missing.");
  } else {
    namesCount = Array.isArray(namesFile.data.birds) ? namesFile.data.birds.length : 0;
    const { errors } = reviewNames(namesFile.data, data);
    for (const error of errors) fail(error);
  }
} catch (error) {
  fail(error.message);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`OK: ${data.birds.length} birds, ${namesCount} names`);
