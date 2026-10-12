const resultsEl = document.querySelector("#results");
const emptyEl = document.querySelector("#empty");
const countEl = document.querySelector("#count");
const searchEl = document.querySelector("#q");
const statusButtons = document.querySelectorAll("[data-status]");
const familyEl = document.querySelector("#family");
const nameListEl = document.querySelector("#name-list");
const alphabetEl = document.querySelector("#alphabet");
const viewButtons = document.querySelectorAll("[data-view]");
const listViewEl = document.querySelector("#list-view");
const listToolsEl = document.querySelector("#list-tools");
const detailEl = document.querySelector("#detail");
const siteTitle = document.title;

const state = {
  birds: [],
  cards: [],
  rows: [],
  query: "",
  status: "all",
  family: "",
  view: "cards",
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stripNameConjunction(value) {
  return String(value || "")
    .replace(/^(?:ანუ|ან)\s+/u, "")
    .trim();
}

function splitAliasList(value) {
  return String(value || "")
    .split(/[,;]/)
    .map(stripNameConjunction)
    .filter(Boolean);
}

function uniqueNames(values) {
  const seen = new Set();
  const names = [];
  for (const value of values) {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    const key = normalize(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function parseGeorgianName(value) {
  let primary = String(value || "").replace(/\s+/g, " ").trim();
  const aliases = [];
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

function georgianNames(bird) {
  const parsed = bird.georgian || parseGeorgianName(bird.names?.ka);
  return [parsed.primary, ...parsed.aliases].filter(Boolean);
}

function aliasLine(bird) {
  const aliases = bird.georgian?.aliases || [];
  if (!aliases.length) return "";
  return `<p class="aliases">ასევე: ${escapeHtml(aliases.join(", "))}</p>`;
}

const statusLabels = {
  "YR-R": "მუდმივი",
  "YR-V": "მუდმივი სტუმარი",
  BB: "მობუდარი",
  SV: "ზაფხულის სტუმარი",
  M: "გადამფრენი",
  WV: "მოზამთრე",
  Cas: "შემთხვევითი",
  ND: "უცნობი",
  FB: "ყოფილი მობუდარი",
  IB: "არარეგულარული მობუდარი",
  OB: "იშვიათი მობუდარი",
  AD: "შემთხვევითი",
  INT: "ინტროდუცირებული",
  ESC: "გაქცეული",
  EX: "გადაშენებული",
};

function statusCodesOf(bird) {
  return String(bird.status || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function statusText(bird) {
  return statusCodesOf(bird)
    .map((code) => statusLabels[code] || "")
    .filter(Boolean)
    .join(", ");
}

function taxonLine(bird) {
  const parts = [bird.familyKa, statusText(bird)].filter(Boolean);
  if (!parts.length) return "";
  return `<p class="taxon">${escapeHtml(parts.join(" · "))}</p>`;
}

function matches(bird, query) {
  if (!query) return true;
  const haystack = normalize(
    [...georgianNames(bird), bird.names.en, bird.names.la, bird.ebirdCode].join(" "),
  );
  return query.split(/\s+/).every((part) => haystack.includes(part));
}

const statusGroups = {
  resident: ["YR-R", "YR-V"],
  breeding: ["YR-R", "BB"],
  migrant: ["M"],
  winter: ["WV"],
  casual: ["Cas"],
};

function isVisible(bird) {
  if (state.status !== "all") {
    const wanted = statusGroups[state.status] || [];
    if (!statusCodesOf(bird).some((code) => wanted.includes(code))) return false;
  }
  if (state.family && bird.familyKa !== state.family) return false;
  return matches(bird, normalize(state.query));
}

function photoCredit(photo, { link = true } = {}) {
  if (!photo) return "";
  const parts = [photo.credit, photo.license].filter(Boolean).join(", ");
  if (!parts) return "";
  if (link && photo.source) {
    return `<p class="credit"><a href="${escapeHtml(photo.source)}" target="_blank" rel="noreferrer">${escapeHtml(parts)}</a></p>`;
  }
  return `<p class="credit">${escapeHtml(parts)}</p>`;
}

function commonsThumb(url, width) {
  const value = String(url || "");
  // Wikimedia thumbs end in /500px-File.jpg, or /lossy-page1-500px-File.tif.jpg for TIFFs.
  const resized = value.replace(
    /\/((?:lossy-)?page\d+-)?\d+px-(?=[^/?#]*$)/i,
    `/$1${width}px-`,
  );
  if (resized !== value) return resized;

  const match = value.match(
    /^(https?:\/\/[^/]+\/wikipedia\/commons\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/?#]+)/i,
  );
  if (match) {
    const [, prefix, hash, file] = match;
    const thumbHost = prefix.replace(
      "/wikipedia/commons/",
      "/wikipedia/commons/thumb/",
    );
    const suffix = /\.svg$/i.test(decodeURIComponent(file)) ? ".png" : "";
    return `${thumbHost}${hash}${file}/${width}px-${file}${suffix}`;
  }

  return birdPhotoFallback(value, width);
}

function birdPhotoFallback(url, width) {
  try {
    const file = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    if (!file) return url;
    return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&w=${width}`;
  } catch {
    return url;
  }
}

function photoSources(url, widths) {
  const src = commonsThumb(url, widths[Math.min(1, widths.length - 1)]);
  const srcset = widths
    .map((width) => `${commonsThumb(url, width)} ${width}w`)
    .join(", ");
  return { src, srcset };
}

function renderCard(bird, index) {
  let photo = `<div class="card-placeholder" aria-hidden="true">ფოტო არ არის</div>`;
  if (bird.photo?.url) {
    const image = photoSources(bird.photo.thumb || bird.photo.url, [250, 330, 500]);
    const eager = index < 4;
    photo = `<img class="card-photo" src="${escapeHtml(image.src)}" srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 600px) 92vw, 250px" width="330" height="248" alt="" decoding="async" loading="${eager ? "eager" : "lazy"}" fetchpriority="${eager ? "high" : "low"}">`;
  }

  return `
    <a class="card" href="#${escapeHtml(bird.id)}" data-id="${escapeHtml(bird.id)}" data-letter="${escapeHtml(firstLetter(bird))}">
      ${photo}
      <div class="card-body">
        <h2>${escapeHtml(bird.georgian?.primary || "—")}</h2>
        ${aliasLine(bird)}
        <p class="en">${escapeHtml(bird.names.en || "")}</p>
        <p class="la">${escapeHtml(bird.names.la || "")}</p>
        ${taxonLine(bird)}
      </div>
    </a>
  `;
}

function firstLetter(bird) {
  return bird.georgian?.primary?.[0] || "";
}

function renderNameRow(bird) {
  const aliases = bird.georgian?.aliases || [];
  return `
    <a class="name-row" href="#${escapeHtml(bird.id)}" data-id="${escapeHtml(bird.id)}" data-letter="${escapeHtml(firstLetter(bird))}">
      <span class="name-ka">
        <span class="name-primary">${escapeHtml(bird.georgian?.primary || "—")}</span>
        ${aliases.length ? `<span class="aliases">ასევე: ${escapeHtml(aliases.join(", "))}</span>` : ""}
      </span>
      <span class="en">${escapeHtml(bird.names.en || "")}</span>
      <span class="la">${escapeHtml(bird.names.la || "")}</span>
    </a>
  `;
}

function detailPhoto(bird) {
  if (!bird.photo?.url) {
    return `<div class="detail-placeholder" aria-hidden="true">ფოტო არ არის</div>`;
  }

  const source = bird.photo.url;
  const image = photoSources(source, [330, 500, 800]);
  const alt = bird.names.en || bird.names.ka || "";
  const fallback = escapeHtml(source);
  return `<img class="detail-photo" src="${escapeHtml(image.src)}" srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 840px) 92vw, 42vw" alt="${escapeHtml(alt)}" decoding="async" onerror="this.onerror=null;this.removeAttribute('srcset');this.src='${fallback}'">`;
}

const linkIcons = {
  ebird: `<svg class="link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 7h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m20 7 2 .5-2 .5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 18v3M14 17.75V21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 18a6 6 0 0 0 3.84-10.61" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  wikipedia: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M6.6 16.4 8.7 7.8h1.2l2.1 6.4 2.1-6.4h1.2l2.1 8.6"/></svg>`,
};

function wikiCredit(bird) {
  if (!String(bird.description || "").trim()) return "";
  const url = bird.links?.wikipedia;
  const name = url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">English Wikipedia</a>`
    : "English Wikipedia";
  return `<p class="source-note">${name}, CC BY-SA.</p>`;
}

function detailLinks(bird) {
  const items = [
    ["eBird", bird.links?.ebird, "ebird"],
    ["Wikipedia", bird.links?.wikipedia, "wikipedia"],
  ].filter(([, url]) => url);
  if (!items.length) return "";
  return `<p class="detail-links">${items
    .map(
      ([label, url, icon]) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${linkIcons[icon]}<span>${label}</span></a>`,
    )
    .join("")}</p>`;
}

function renderDetail(bird) {
  const georgian = bird.georgian?.primary || "";
  const heading = georgian || bird.names.en || "—";
  const description = String(bird.description || "").trim();
  return `
    <a class="back" href="#"><svg class="link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 19-7-7 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>სიაში დაბრუნება</span></a>
    <div class="detail-layout">
      <figure class="detail-figure">
        ${detailPhoto(bird)}
        ${photoCredit(bird.photo)}
      </figure>
      <div class="detail-info">
        <h2>${escapeHtml(heading)}</h2>
        ${aliasLine(bird)}
        ${georgian ? `<p class="en">${escapeHtml(bird.names.en || "")}</p>` : ""}
        <p class="la">${escapeHtml(bird.names.la || "")}</p>
        ${taxonLine(bird)}
        ${description ? `<p class="description">${escapeHtml(description)}</p>` : ""}
        ${wikiCredit(bird)}
        ${detailLinks(bird)}
      </div>
    </div>
  `;
}

function birdFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
  if (!id) return null;
  return state.birds.find((bird) => bird.id === id) || null;
}

function showList() {
  listViewEl.hidden = false;
  listToolsEl.hidden = false;
  detailEl.hidden = true;
  detailEl.innerHTML = "";
  delete detailEl.dataset.birdId;
  document.title = siteTitle;
}

function showDetail(bird) {
  listViewEl.hidden = true;
  listToolsEl.hidden = true;
  listToolsEl.classList.remove("is-stuck");
  detailEl.hidden = false;
  detailEl.innerHTML = renderDetail(bird);
  detailEl.dataset.birdId = bird.id;
  document.title = bird.georgian?.primary || bird.names.en || siteTitle;
}

function route() {
  const bird = birdFromHash();
  const previousId = detailEl.dataset.birdId || "";
  if (bird) {
    showDetail(bird);
    if (previousId !== bird.id) window.scrollTo(0, 0);
    return;
  }
  showList();
  if (previousId) window.scrollTo(0, 0);
}

function mount() {
  const families = [...new Set(state.birds.map((bird) => bird.familyKa).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ka"),
  );
  familyEl.innerHTML = [
    `<option value="">ყველა ოჯახი</option>`,
    ...families.map(
      (name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`,
    ),
  ].join("");
  const letters = [...new Set(state.birds.map(firstLetter).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ka"),
  );
  alphabetEl.innerHTML = letters
    .map(
      (letter) =>
        `<button type="button" data-letter="${escapeHtml(letter)}">${escapeHtml(letter)}</button>`,
    )
    .join("");
  resultsEl.innerHTML = state.birds.map(renderCard).join("");
  nameListEl.innerHTML = state.birds.map(renderNameRow).join("");
  state.cards = [...resultsEl.querySelectorAll(".card")];
  state.rows = [...nameListEl.querySelectorAll(".name-row")];
  applyView();
  filterList();
}

function filterList() {
  let shown = 0;
  const visibleLetters = new Set();
  state.birds.forEach((bird, index) => {
    const visible = isVisible(bird);
    state.cards[index].classList.toggle("is-hidden", !visible);
    state.rows[index].classList.toggle("is-hidden", !visible);
    if (!visible) return;
    shown += 1;
    const letter = firstLetter(bird);
    if (letter) visibleLetters.add(letter);
  });
  alphabetEl.querySelectorAll("button").forEach((button) => {
    button.disabled = !visibleLetters.has(button.dataset.letter);
  });
  emptyEl.hidden = shown > 0;
  const total = state.birds.length;
  countEl.textContent =
    shown === total ? `${shown} ფრინველი` : `${shown} შედეგი / ${total}`;
}

function applyView() {
  const list = state.view === "list";
  resultsEl.hidden = list;
  nameListEl.hidden = !list;
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function jumpToLetter(letter) {
  const items = state.view === "list" ? state.rows : state.cards;
  const target = items.find(
    (item) => !item.classList.contains("is-hidden") && item.dataset.letter === letter,
  );
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - listToolsEl.offsetHeight - 12;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
}

function sortBirds(birds) {
  return [...birds].sort((a, b) =>
    (a.georgian?.primary || a.names.en).localeCompare(
      b.georgian?.primary || b.names.en,
      "ka",
    ),
  );
}

searchEl.addEventListener("input", (event) => {
  state.query = event.target.value;
  filterList();
});

statusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.status = button.dataset.status;
    statusButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    filterList();
  });
});

familyEl.addEventListener("change", () => {
  state.family = familyEl.value;
  filterList();
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    applyView();
  });
});

alphabetEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  jumpToLetter(button.dataset.letter);
});

window.addEventListener("hashchange", route);

new IntersectionObserver(
  ([entry]) => {
    if (listToolsEl.hidden) {
      listToolsEl.classList.remove("is-stuck");
      return;
    }
    listToolsEl.classList.toggle("is-stuck", entry.intersectionRatio < 1);
  },
  { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
).observe(listToolsEl);

const data = await fetch("data/birds.json").then((response) => {
  if (!response.ok) {
    throw new Error("birds.json ვერ ჩაიტვირთა");
  }
  return response.json();
});

state.birds = sortBirds(
  (data.birds || []).map((bird) => {
    bird.georgian = parseGeorgianName(bird.names?.ka);
    return bird;
  }),
);
mount();
route();
