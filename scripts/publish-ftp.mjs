import { Client } from "basic-ftp";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distPath = path.join(root, "dist");
const envKeys = ["FTP_HOST", "FTP_USER", "FTP_PASSWORD", "FTP_REMOTE_DIR"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function loadEnvFile() {
  if (envKeys.every((key) => process.env[key])) return;

  let raw;
  try {
    raw = await readFile(path.join(root, ".env"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  const rounded = kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10;
  return `${rounded} KB`;
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      const info = await stat(full);
      const rel = path.relative(distPath, full).split(path.sep).join("/");
      files.push({ full, rel, size: info.size });
    }
  }
  return files;
}

function normalizeRemoteDir(dir) {
  const cleaned = dir.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return cleaned || "/";
}

function remoteFilePath(remoteDir, rel) {
  if (remoteDir === "/") return `/${rel}`;
  return `${remoteDir}/${rel}`;
}

await loadEnvFile();

const missing = envKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  fail(
    `Missing FTP settings: ${missing.join(", ")}. Set them in the environment or in .env.`,
  );
}

let files;
try {
  files = await listFiles(distPath);
} catch (error) {
  if (error.code === "ENOENT") {
    fail("dist/ was not found. Run npm run build first.");
  }
  throw error;
}

files.sort((a, b) => a.rel.localeCompare(b.rel));
if (files.length === 0) {
  fail("dist/ is empty. Nothing to upload.");
}

const client = new Client();

try {
  await client.access({
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: 21,
    secure: false,
  });

  const remoteDir = normalizeRemoteDir(process.env.FTP_REMOTE_DIR);
  await client.ensureDir(remoteDir);
  const ensured = new Set([remoteDir]);
  console.log(`Uploading ${files.length} files to ${remoteDir}`);

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const remotePath = remoteFilePath(remoteDir, file.rel);
    const parent = remotePath.slice(0, remotePath.lastIndexOf("/")) || "/";
    if (!ensured.has(parent)) {
      await client.ensureDir(parent);
      ensured.add(parent);
    }
    await client.uploadFrom(file.full, remotePath);
    console.log(
      `[${index + 1}/${files.length}] ${file.rel} (${formatSize(file.size)})`,
    );
  }

  console.log(`Uploaded ${files.length} files to ${remoteDir}`);
} catch (error) {
  client.close();
  fail(error instanceof Error ? error.message : String(error));
} finally {
  client.close();
}
