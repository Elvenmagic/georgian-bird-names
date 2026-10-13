import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const birdsPath = path.join(root, "data", "birds.json");
const outPath = path.join(root, "assets", "birds.js");

let raw;
try {
  raw = await readFile(birdsPath, "utf8");
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("data/birds.json is missing.");
    process.exit(1);
  }
  throw error;
}

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error(`birds.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!data || !Array.isArray(data.birds)) {
  console.error("birds.json must contain a birds array.");
  process.exit(1);
}

const json = JSON.stringify(data)
  .replaceAll("\u2028", "\\u2028")
  .replaceAll("\u2029", "\\u2029");

await writeFile(outPath, `export default ${json};\n`, "utf8");
console.log(`Wrote ${data.birds.length} birds to assets/birds.js`);
