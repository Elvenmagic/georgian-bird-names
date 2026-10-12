import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "birds.json");
const userAgent =
  "GeorgianBirdNames/1.0 (https://github.com/bird-names-georgian-nomenclature; seed script)";
const delayMs = 1500;
const missingOnly = process.argv.includes("--missing");
const kaWikiOnly = process.argv.includes("--ka-wiki");

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isGeorgian(value) {
  return /[\u10A0-\u10FF]/.test(value || "");
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
  if (words.length < 2) return String(value || "").trim();
  return [
    words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase(),
    ...words.slice(1).map((word) => word.toLowerCase()),
  ].join(" ");
}

function cleanUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWikimediaError(data) {
  if (!data || typeof data !== "object") return false;
  const type = String(data.type || "");
  const code = String(data.error?.code || data.code || "");
  return (
    /rate_limit|hyperswitch|error/i.test(type) ||
    /ratelimit|rate_limit|busy/i.test(code)
  );
}

async function readData() {
  const raw = await readFile(dataPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.birds)) {
    throw new Error("data/birds.json must contain a birds array");
  }
  return data;
}

async function writeData(data, { sort = false } = {}) {
  data.updated = new Date().toISOString().slice(0, 10);
  if (sort) {
    data.birds.sort((a, b) =>
      (a.names.ka || a.names.en || a.id).localeCompare(
        b.names.ka || b.names.en || b.id,
        "ka",
      ),
    );
  }
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function indexBirds(birds) {
  const byId = new Map();
  const byLatin = new Map();
  const byEnglish = new Map();
  for (const bird of birds) {
    if (bird.id) byId.set(bird.id, bird);
    if (hasText(bird.ebirdCode)) byId.set(bird.ebirdCode, bird);
    if (hasText(bird.names?.la)) {
      byLatin.set(normalizeName(normalizeLatin(bird.names.la)), bird);
    }
    if (hasText(bird.names?.en)) {
      byEnglish.set(normalizeName(bird.names.en), bird);
    }
  }
  return { byId, byLatin, byEnglish };
}

function fillName(target, key, incoming) {
  if (hasText(target.names[key]) || !hasText(incoming)) return false;
  target.names[key] = incoming.trim();
  return true;
}

async function fetchJson(url, headers = {}, attempt = 1) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json", ...headers },
  });
  const retryableStatus = response.status === 429 || response.status >= 500;
  if (retryableStatus && attempt < 8) {
    const wait = Math.min(30000, 2000 * 2 ** (attempt - 1));
    console.warn(`  ${response.status} retry ${attempt} ${wait}ms`);
    await sleep(wait);
    return fetchJson(url, headers, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }

  const data = await response.json();
  if (isWikimediaError(data) && attempt < 8) {
    const wait = Math.min(30000, 2000 * 2 ** (attempt - 1));
    console.warn(`  wiki error retry ${attempt} ${wait}ms`);
    await sleep(wait);
    return fetchJson(url, headers, attempt + 1);
  }
  if (isWikimediaError(data)) {
    throw new Error(`wikimedia error ${data.error?.code || data.type || url}`);
  }
  return data;
}

async function fetchEbirdSpecies() {
  const key = process.env.EBIRD_API_KEY;
  if (!key) {
    console.log("EBIRD_API_KEY not set — skipping eBird code matching.");
    return [];
  }

  const headers = { "X-eBirdApiToken": key };
  const [codes, taxonomyKa, taxonomyEn] = await Promise.all([
    fetchJson("https://api.ebird.org/v2/product/spplist/GE", headers),
    fetchJson(
      "https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&locale=ka&cat=species",
      headers,
    ),
    fetchJson(
      "https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&locale=en&cat=species",
      headers,
    ),
  ]);

  const kaByCode = new Map(taxonomyKa.map((row) => [row.speciesCode, row]));
  const enByCode = new Map(taxonomyEn.map((row) => [row.speciesCode, row]));
  const wanted = new Set(codes);

  return [...wanted]
    .map((code) => {
      const en = enByCode.get(code);
      const ka = kaByCode.get(code);
      if (!en) return null;
      return {
        id: code,
        ebirdCode: code,
        inGeorgia: true,
        names: {
          ka: isGeorgian(ka?.comName) ? ka.comName : "",
          en: en.comName || "",
          la: en.sciName || "",
        },
      };
    })
    .filter(Boolean);
}

function commonsFileFromUrl(url) {
  const decoded = decodeURIComponent(String(url));
  const thumb = decoded.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
  if (thumb) return thumb[1];
  const match = decoded.match(/\/([^/]+\.(?:jpe?g|png|gif|webp))/i);
  return match ? match[1] : "";
}

async function fetchCommonsMeta(fileName) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "extmetadata|url");
  url.searchParams.set("titles", `File:${fileName}`);
  url.searchParams.set("origin", "*");

  const data = await fetchJson(url);
  const page = Object.values(data.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  const meta = info?.extmetadata || {};
  return {
    credit: stripHtml(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons"),
    license: stripHtml(meta.LicenseShortName?.value || ""),
    source:
      meta.LicenseUrl?.value ||
      `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
  };
}

function wikiApiUrl(params) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function pageFromQuery(data) {
  const page = Object.values(data.query?.pages || {})[0];
  if (!page || page.missing != null || page.invalid != null || page.pageid < 0) {
    return null;
  }
  if (page.pageprops && "disambiguation" in page.pageprops) {
    return null;
  }
  return page;
}

async function fetchWikiPage(title) {
  const data = await fetchJson(
    wikiApiUrl({
      redirects: "1",
      prop: "extracts|pageimages|pageprops|info",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      piprop: "original|thumbnail",
      pithumbsize: "1200",
      titles: title,
    }),
  );
  return pageFromQuery(data);
}

async function searchWikiTitle(query) {
  const data = await fetchJson(
    wikiApiUrl({
      list: "search",
      srlimit: "5",
      srsearch: query,
    }),
  );
  return (data.query?.search || [])
    .map((row) => row.title)
    .filter((title) => hasText(title) && !/disambiguation/i.test(title));
}

async function photoFromPage(page) {
  const imageUrl = cleanUrl(page.original?.source || page.thumbnail?.source);
  if (!imageUrl) return null;

  const fileName = page.pageimage || commonsFileFromUrl(imageUrl);
  let credit = "Wikimedia Commons";
  let license = "";
  let source =
    page.canonicalurl ||
    `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/\s+/g, "_"))}`;

  if (fileName) {
    try {
      const meta = await fetchCommonsMeta(fileName);
      credit = meta.credit || credit;
      license = meta.license || license;
      source = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
    } catch {
      // Keep the Wikipedia fallback if Commons metadata is unavailable.
    }
  }

  return { url: imageUrl, credit, license, source };
}

function ebirdSpeciesUrl(code) {
  if (!hasText(code)) return "";
  return `https://ebird.org/species/${encodeURIComponent(code.trim())}`;
}

function ensureLinks(bird) {
  if (!bird.links || typeof bird.links !== "object" || Array.isArray(bird.links)) {
    bird.links = {};
  }
}

function setLink(bird, key, value, { overwrite = false } = {}) {
  if (!hasText(value)) return false;
  ensureLinks(bird);
  if (hasText(bird.links[key]) && !overwrite) return false;
  if (bird.links[key] === value.trim()) return false;
  bird.links[key] = value.trim();
  return true;
}

function setEbirdLink(bird) {
  const value = ebirdSpeciesUrl(bird.ebirdCode);
  if (!hasText(value)) return false;
  ensureLinks(bird);
  if (bird.links.ebird === value) return false;
  bird.links.ebird = value;
  return true;
}

function wikiTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("wikipedia.org")) return "";
    const prefix = "/wiki/";
    if (!parsed.pathname.startsWith(prefix)) return "";
    return decodeURIComponent(parsed.pathname.slice(prefix.length)).replaceAll("_", " ");
  } catch {
    return "";
  }
}

function georgianWikiUrl(title) {
  const page = String(title || "").trim().replaceAll(" ", "_");
  if (!page) return "";
  return `https://ka.wikipedia.org/wiki/${encodeURIComponent(page)}`;
}

function resolveTitle(title, redirectTo) {
  let current = title;
  const seen = new Set();
  while (redirectTo.has(current) && !seen.has(current)) {
    seen.add(current);
    current = redirectTo.get(current);
  }
  return current;
}

async function fillGeorgianWiki(birds) {
  const pending = birds.filter(
    (bird) => hasText(bird.links?.wikipedia) && !hasText(bird.links?.wikipediaKa),
  );
  let filled = 0;
  const chunkSize = 40;

  for (let index = 0; index < pending.length; index += chunkSize) {
    const chunk = pending.slice(index, index + chunkSize);
    const titles = [...new Set(chunk.map((bird) => wikiTitleFromUrl(bird.links.wikipedia)).filter(Boolean))];
    if (!titles.length) continue;
    try {
      const pages = [];
      const normalized = [];
      const redirects = [];
      let extra = null;
      let rounds = 0;
      do {
        const data = await fetchJson(
          wikiApiUrl({
            redirects: "1",
            prop: "langlinks",
            lllang: "ka",
            lllimit: "max",
            titles: titles.join("|"),
            ...(extra || {}),
          }),
        );
        pages.push(...Object.values(data.query?.pages || {}));
        normalized.push(...(data.query?.normalized || []));
        redirects.push(...(data.query?.redirects || []));
        extra = data.continue || null;
        rounds += 1;
      } while (extra && rounds < 5);
      const redirectTo = new Map();
      for (const row of normalized) redirectTo.set(row.from, row.to);
      for (const row of redirects) redirectTo.set(row.from, row.to);
      const byTitle = new Map();
      for (const page of pages) {
        const link = page.langlinks?.[0];
        const kaTitle = link?.title || link?.["*"] || "";
        if (page.title && kaTitle) byTitle.set(page.title, kaTitle);
      }
      for (const bird of chunk) {
        const requested = wikiTitleFromUrl(bird.links.wikipedia);
        const kaTitle =
          byTitle.get(resolveTitle(requested, redirectTo)) || byTitle.get(requested);
        if (setLink(bird, "wikipediaKa", georgianWikiUrl(kaTitle))) filled += 1;
      }
    } catch (error) {
      console.warn(`ka wiki batch: ${error.message}`);
    }
    if (index + chunkSize < pending.length) await sleep(400);
  }

  return filled;
}

function scorePage(page, scientificName, englishName) {
  const hay = normalizeName([page.title, page.extract].join(" "));
  let score = 0;
  const latin = normalizeName(scientificName);
  const english = normalizeName(String(englishName || "").split("(")[0]);
  if (latin && hay.includes(latin)) score += 3;
  if (english && hay.includes(english)) score += 2;
  const genus = latin.split(" ")[0];
  if (genus && hay.includes(genus)) score += 1;
  if (page.original?.source || page.thumbnail?.source) score += 1;
  return score;
}

function wikiTitles(scientificName, englishName) {
  const titles = [];
  if (hasText(scientificName)) titles.push(scientificName);
  if (hasText(englishName)) {
    titles.push(englishName);
    const stripped = englishName
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped && stripped !== englishName) titles.push(stripped);
  }
  return [...new Set(titles.map((title) => title.replace(/[’‘‛]/g, "'")))];
}

async function recordFromPage(page, scientificName, englishName, { needPhoto }) {
  return {
    photo: needPhoto ? await photoFromPage(page) : null,
    description: stripHtml(page.extract || ""),
    wikipedia: cleanUrl(page.canonicalurl || ""),
    wikibaseItem: page.pageprops?.wikibase_item || "",
    score: scorePage(page, scientificName, englishName),
    title: page.title,
  };
}

async function fetchWikiRecord(scientificName, englishName, { needPhoto }) {
  const titles = wikiTitles(scientificName, englishName);
  const seen = new Set();
  let best = null;

  const consider = async (title, source) => {
    const key = normalizeName(title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    try {
      const page = await fetchWikiPage(title);
      if (!page) {
        console.warn(`  skip ${title}: no article (${source})`);
        return;
      }
      const record = await recordFromPage(page, scientificName, englishName, {
        needPhoto,
      });
      if (!best || record.score > best.score || (record.score === best.score && record.photo && !best.photo)) {
        best = record;
      }
    } catch (error) {
      console.warn(`  skip ${title}: ${error.message}`);
    }
  };

  for (const title of titles) {
    await consider(title, "title");
    if (best?.score >= 3 && (!needPhoto || best.photo)) return best;
  }

  for (const query of titles) {
    try {
      const found = await searchWikiTitle(query);
      for (const title of found.slice(0, 3)) {
        await consider(title, "search");
        if (best?.score >= 4 && (!needPhoto || best.photo)) return best;
      }
    } catch (error) {
      console.warn(`  search ${query}: ${error.message}`);
    }
  }

  if (!best) {
    console.warn(`  no wikipedia match for ${scientificName || englishName}`);
  }
  return best;
}

async function fetchEbirdCodeFromWikidata(qid) {
  if (!hasText(qid)) return "";
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`;
  const data = await fetchJson(url);
  const claim = data.entities?.[qid]?.claims?.P3444?.[0]?.mainsnak?.datavalue?.value;
  return typeof claim === "string" ? claim.trim() : "";
}

function isIncomplete(bird) {
  return (
    !hasText(bird.photo?.url) ||
    !hasText(bird.description) ||
    !hasText(bird.links?.wikipedia) ||
    !hasText(bird.ebirdCode)
  );
}

async function main() {
  const data = await readData();
  const kaFilled = await fillGeorgianWiki(data.birds);
  if (kaWikiOnly) {
    await writeData(data);
    console.log(`Georgian Wikipedia links filled: ${kaFilled}`);
    return;
  }
  const incoming = await fetchEbirdSpecies();
  const { byId, byLatin, byEnglish } = indexBirds(data.birds);
  let namesFilled = 0;
  let codesFilled = 0;

  for (const row of incoming) {
    const existing =
      byId.get(row.ebirdCode) ||
      byLatin.get(normalizeName(normalizeLatin(row.names.la))) ||
      byEnglish.get(normalizeName(row.names.en));

    if (!existing) {
      continue;
    }

    if (fillName(existing, "ka", row.names.ka)) namesFilled += 1;
    if (fillName(existing, "en", row.names.en)) namesFilled += 1;
    if (fillName(existing, "la", row.names.la)) namesFilled += 1;
    if (hasText(row.ebirdCode) && existing.ebirdCode !== row.ebirdCode) {
      existing.ebirdCode = row.ebirdCode;
      codesFilled += 1;
    }
  }

  let photosFilled = 0;
  let descriptionsFilled = 0;
  let linksFilled = 0;
  let wikiTouched = 0;

  for (const bird of data.birds) {
    const needsPhoto = !hasText(bird.photo?.url);
    const needsDescription = !hasText(bird.description);
    const needsWiki = !hasText(bird.links?.wikipedia);
    const needsCode = !hasText(bird.ebirdCode);

    if (missingOnly && !isIncomplete(bird)) {
      continue;
    }

    if (!needsPhoto && (!hasText(bird.photo.license) || !hasText(bird.photo.credit))) {
      const fileName = commonsFileFromUrl(bird.photo.url);
      if (fileName) {
        try {
          const meta = await fetchCommonsMeta(fileName);
          bird.photo.credit = bird.photo.credit || meta.credit;
          bird.photo.license = bird.photo.license || meta.license;
          bird.photo.source = bird.photo.source || meta.source;
        } catch {
          // Leave the existing photo if Commons metadata is unavailable.
        }
        await sleep(delayMs);
      }
    }

    if (
      (needsPhoto || needsDescription || needsWiki || needsCode) &&
      (hasText(bird.names.la) || hasText(bird.names.en))
    ) {
      process.stdout.write(`wiki ${bird.names.la || bird.names.en}\n`);
      const record = await fetchWikiRecord(bird.names.la, bird.names.en, {
        needPhoto: needsPhoto,
      });
      if (record) {
        if (needsPhoto && record.photo) {
          bird.photo = record.photo;
          photosFilled += 1;
        }
        if (needsDescription && hasText(record.description)) {
          bird.description = record.description;
          descriptionsFilled += 1;
        }
        const overwriteWiki = needsPhoto && Boolean(record.photo) && hasText(record.wikipedia);
        if (setLink(bird, "wikipedia", record.wikipedia, { overwrite: overwriteWiki })) {
          linksFilled += 1;
        }
        if (needsCode && hasText(record.wikibaseItem)) {
          try {
            const code = await fetchEbirdCodeFromWikidata(record.wikibaseItem);
            if (hasText(code)) {
              bird.ebirdCode = code;
              codesFilled += 1;
            }
          } catch (error) {
            console.warn(`  wikidata ${record.wikibaseItem}: ${error.message}`);
          }
        }
      }
      wikiTouched += 1;
      await sleep(delayMs);
      if (wikiTouched % 10 === 0) {
        await writeData(data);
        console.log(`  saved progress (${wikiTouched} wiki lookups)`);
      }
    }

    if (setEbirdLink(bird)) linksFilled += 1;
  }

  await writeData(data, { sort: true });
  console.log(
    `Done. namesFilled=${namesFilled} codesFilled=${codesFilled} photosFilled=${photosFilled} descriptionsFilled=${descriptionsFilled} linksFilled=${linksFilled} wikiTouched=${wikiTouched} total=${data.birds.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
