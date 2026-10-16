export type BirdPhoto = {
  url?: string;
  thumb?: string;
  credit?: string;
  license?: string;
  source?: string;
};

export type BirdNames = {
  ka?: string;
  en?: string;
  la?: string;
};

export type BirdLinks = {
  wikipedia?: string;
  ebird?: string;
  wikipediaKa?: string;
};

export type Bird = {
  id: string;
  ebirdCode?: string;
  inGeorgia?: boolean;
  names: BirdNames;
  photo?: BirdPhoto;
  order?: string;
  orderKa?: string;
  family?: string;
  familyKa?: string;
  status?: string;
  iucn?: string;
  description?: string;
  links?: BirdLinks;
  georgian?: GeorgianName;
  search?: string;
};

export type GeorgianName = {
  primary: string;
  aliases: string[];
};

export type BirdData = {
  updated?: string;
  birds: Bird[];
};

export function normalize(value: string | undefined | null) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stripNameConjunction(value: string) {
  return String(value || "")
    .replace(/^(?:ანუ|ან)\s+/u, "")
    .trim();
}

function splitAliasList(value: string) {
  return String(value || "")
    .split(/[,;]/)
    .map(stripNameConjunction)
    .filter(Boolean);
}

function uniqueNames(values: string[]) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values) {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    const key = normalize(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function parseGeorgianName(value: string | undefined | null): GeorgianName {
  let primary = String(value || "").replace(/\s+/g, " ").trim();
  const aliases: string[] = [];
  if (!primary) return { primary: "", aliases };

  let trailing = primary.match(/^(.*\S)\s*\(([^()]*)\)\s*$/u);
  while (trailing) {
    aliases.unshift(...splitAliasList(trailing[2]));
    primary = trailing[1].trim();
    trailing = primary.match(/^(.*\S)\s*\(([^()]*)\)\s*$/u);
  }

  const embedded = primary.match(/^(.*?)\s*\(([^()]*)\)\s*(.+)$/u);
  if (embedded) {
    const left = embedded[1].trim();
    const right = embedded[3].trim();
    const alternate = splitAliasList(embedded[2]).map((part) =>
      `${part} ${right}`.replace(/\s+/g, " ").trim(),
    );
    primary = `${left} ${right}`.replace(/\s+/g, " ").trim();
    aliases.unshift(...alternate);
  }

  return {
    primary,
    aliases: uniqueNames(aliases).filter((name) => normalize(name) !== normalize(primary)),
  };
}

export function georgianNames(bird: Bird) {
  const parsed = bird.georgian || parseGeorgianName(bird.names?.ka);
  return [parsed.primary, ...parsed.aliases].filter(Boolean);
}

export function firstLetter(bird: Bird) {
  return bird.georgian?.primary?.[0] || "";
}

const exactSearchExceptions: Record<string, string> = {
  ქარიტყანია: "comkes",
};

function searchText(bird: Bird) {
  if (bird.search) return bird.search;
  return normalize(
    [...georgianNames(bird), bird.names.en, bird.names.la, bird.ebirdCode].join(" "),
  );
}

export function matches(bird: Bird, query: string) {
  if (!query) return true;
  if (exactSearchExceptions[query] === bird.id) return true;
  const haystack = searchText(bird);
  return query.split(/\s+/).every((part) => haystack.includes(part));
}

export function isVisible(bird: Bird, query: string, letter: string) {
  if (!matches(bird, normalize(query))) return false;
  return !letter || firstLetter(bird) === letter;
}

export function sortBirds(birds: Bird[]) {
  return [...birds].sort((a, b) =>
    (a.georgian?.primary || a.names.en || "").localeCompare(
      b.georgian?.primary || b.names.en || "",
      "ka",
    ),
  );
}

export type HighlightRange = [number, number];

let cachedQuery = "";
let cachedParts: string[] = [];

function queryParts(query: string) {
  if (query === cachedQuery) return cachedParts;
  cachedQuery = query;
  cachedParts = [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
  return cachedParts;
}

export function highlightRanges(value: string, query: string): HighlightRange[] {
  const text = String(value || "");
  const parts = queryParts(query);
  if (!text || !parts.length) return [];

  const folded = text.toLocaleLowerCase();
  const ranges: HighlightRange[] = [];
  for (const part of parts) {
    const needle = part.toLocaleLowerCase();
    let from = 0;
    while (from < folded.length) {
      const at = folded.indexOf(needle, from);
      if (at < 0) break;
      ranges.push([at, at + needle.length]);
      from = at + needle.length;
    }
  }
  if (!ranges.length) return [];

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: HighlightRange[] = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  }
  return merged;
}

export function prepareBirds(birds: Bird[]) {
  return sortBirds(
    birds.map((bird) => {
      const prepared = { ...bird, georgian: parseGeorgianName(bird.names?.ka) };
      prepared.search = normalize(
        [...georgianNames(prepared), prepared.names.en, prepared.names.la, prepared.ebirdCode].join(
          " ",
        ),
      );
      return prepared;
    }),
  );
}
