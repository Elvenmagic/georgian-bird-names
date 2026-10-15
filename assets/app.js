import data from "./birds.js";

const resultsEl = document.querySelector("#results");
const emptyEl = document.querySelector("#empty");
const countEl = document.querySelector("#count");
const searchEl = document.querySelector("#q");
const nameListEl = document.querySelector("#name-list");
const alphabetEl = document.querySelector("#alphabet");
const alphabetMenuEl = document.querySelector(".alphabet-menu");
const alphabetToggleEl = document.querySelector(".alphabet-toggle");
const alphabetToggleLetterEl = document.querySelector(".alphabet-toggle-letter");
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
  letter: "",
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

function highlight(value) {
  const text = String(value || "");
  const parts = [...new Set(normalize(state.query).split(/\s+/).filter(Boolean))];
  if (!text || !parts.length) return escapeHtml(text);

  const folded = text.toLocaleLowerCase();
  const ranges = [];
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
  if (!ranges.length) return escapeHtml(text);

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  }

  let html = "";
  let cursor = 0;
  for (const [start, end] of merged) {
    html += escapeHtml(text.slice(cursor, start));
    html += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + escapeHtml(text.slice(cursor));
}

function marked(value) {
  const text = String(value || "");
  return `<span data-hl="${escapeHtml(text)}">${highlight(text)}</span>`;
}

function aliasLine(bird) {
  const aliases = bird.georgian?.aliases || [];
  if (!aliases.length) return "";
  return `<p class="aliases">ასევე: ${aliases.map((name) => marked(name)).join(", ")}</p>`;
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

const statusExplanations = {
  "YR-R": "მობინადრე სახეობა; საქართველოს ტერიტორიაზე გვხვდება მთელი წლის განმავლობაში.",
  "YR-V":
    "საქართველოს ტერიტორიაზე შეიძლება შეგვხვდეს წელიწადის ყველა სეზონზე, მაგრამ სახეობის ბუდობა ქვეყანაში არ დასტურდება.",
  BB: "მობუდარი სახეობა; ბუდობის დასრულების შემდეგ საბუდარ ტერიტორიებს ტოვებს.",
  IB: "არარეგულარული მობუდარი სახეობა.",
  OB: "იშვიათი მობუდარი სახეობა.",
  FB: "წარსულში რეგულარულად მობუდარი სახეობა; ბუდობა აღარ დასტურდება.",
  SV: "სახეობა საქართველოს ტერიტორიაზე შეიძლება შეგვხვდეს გაზაფხულსა და ზაფხულში, მაგრამ ბუდობა არ დასტურდება.",
  M: "მიმომფრენი სახეობა; საქართველოს ტერიტორიაზე ძირითადად შეიძლება შეგვხვდეს, გაზაფხულსა და შემოდგომაზე.",
  WV: "მოზამთრე სახეობა; საქართველოს ტერიტორიაზე შეიძლება შეგვხვდეს გვიან შემოდგომაზე, ზამთარში და ადრეულ გაზაფხულზე.",
  AD: "შემთხვევითი შემომფრენი სახეობა; აბრევიაცია მიუთითებს, რომ სახეობა არის იშვიათი, ან ძალიან იშვიათი საქართველოში და მისი არსებობის მხოლოდ ერთეული რეგისტრირებული შემთხვევები არსებობს; სახეობის გავრცელების არეალი შორსაა საქართველოდან.",
  ND: "სახეობა ნაპოვნია საქართველოში, მაგრამ სტატუსი არაა დადგენილი.",
  EX: "გადაშენებული; სულ მცირე 20 წლის განმავლობაში, მითითებული სახეობის საქართველოში ნახვის შესახებ ცნობები არ არსებობს (აბრევიაცია მხოლოდ ეხება მობუდარ და მოზამთრე სახეობებს და არა იშვიათ მიგრანტებს).",
  Cas: "შემთხვევითი შემომფრენი სახეობა; ფიქსირდება არარეგულარულად;",
  INT: "ადამიანის მიერ შემოყვანილი სახეობა, რომლის გავრცელების არეალი ცდება საქართველოს ტერიტორიას და აქამდე ბუნებრივად არ გვხვდებოდა ქვეყანაში; სახეობამ დაიწყო გამრავლება და ადგილობრივი ორნითოფაუნის ნაწილი გახდა.",
  ESC: "გაქცეული სახეობა; აბრევიაცია ისეთ სახეობებს მიუთითებს, რომლებიც გაიქცნენ (ან თვითნებურად გაუშვეს) კერძო კოლექციებიდან, მაგრამ ქვეყნის ტერიტორიაზე დაფუძნება ვერ შეძლეს.",
};

const iucnLabels = {
  EX: "გადაშენებული",
  EW: "ბუნებაში გადაშენებული",
  CR: "კრიტიკულ საფრთხეში",
  EN: "საფრთხეში",
  VU: "მოწყვლადი",
  NT: "საფრთხესთან ახლოს",
  LC: "არ საჭიროებს ზრუნვას",
  DD: "არასრული მონაცემები",
};

const iucnExplanations = {
  EX: "გადაშენებული სახეობა.",
  EW: "ბუნებაში გადაშენებული სახეობა.",
  CR: "კრიტიკულ საფრთხეში მყოფი სახეობა.",
  EN: "საფრთხეში მყოფი სახეობა.",
  VU: "მოწყვლადი სახეობა.",
  NT: "საფრთხესთან ახლოს მყოფი სახეობა.",
  LC: "არ საჭიროებს ზრუნვას.",
  DD: "არასრული მონაცემები.",
};

const tipIcon = `<svg class="link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11.2v5.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 8h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

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

const exactSearchExceptions = {
  ქარიტყანია: "comkes",
};

function matches(bird, query) {
  if (!query) return true;
  if (exactSearchExceptions[query] === bird.id) return true;
  const haystack = normalize(
    [...georgianNames(bird), bird.names.en, bird.names.la, bird.ebirdCode].join(" "),
  );
  return query.split(/\s+/).every((part) => haystack.includes(part));
}

function isVisible(bird) {
  if (!matches(bird, normalize(state.query))) return false;
  return !state.letter || firstLetter(bird) === state.letter;
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
        <h2>${marked(bird.georgian?.primary || "—")}</h2>
        ${aliasLine(bird)}
        <p class="en">${marked(bird.names.en || "")}</p>
        <p class="la">${marked(bird.names.la || "")}</p>
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
        <span class="name-primary">${marked(bird.georgian?.primary || "—")}</span>
        ${aliases.length ? `<span class="aliases">ასევე: ${aliases.map((name) => marked(name)).join(", ")}</span>` : ""}
      </span>
      <span class="en">${marked(bird.names.en || "")}</span>
      <span class="la">${marked(bird.names.la || "")}</span>
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

function tipControl(id, label) {
  return `<button type="button" class="tip" popovertarget="${escapeHtml(id)}" aria-label="${escapeHtml(label)}">${tipIcon}</button>`;
}

function explanationPopover(id, items) {
  if (!items.length) return "";
  return `<div id="${escapeHtml(id)}" class="note" popover>${items
    .map((item) => `<p>${item}</p>`)
    .join("")}</div>`;
}

function presenceList(bird) {
  const statusNotes = statusCodesOf(bird)
    .filter((code) => statusExplanations[code])
    .map(
      (code) => `<strong>${escapeHtml(code)}</strong> ${escapeHtml(statusExplanations[code])}`,
    );
  const iucn = String(bird.iucn || "").trim();
  const iucnName = iucnLabels[iucn] || "";
  const iucnNotes = iucnExplanations[iucn]
    ? [`<strong>${escapeHtml(iucn)}</strong> ${escapeHtml(iucnExplanations[iucn])}`]
    : [];
  const rows = [
    {
      label: "საქართველოში",
      html: escapeHtml(statusText(bird)),
      tip: statusNotes.length ? tipControl("status-note", "სტატუსის ახსნა") : "",
    },
    {
      label: "წითელი ნუსხა",
      html: iucn
        ? `<span class="iucn iucn-${escapeHtml(iucn.toLowerCase())}">${escapeHtml(iucn)}</span>${escapeHtml(iucnName)}`
        : "",
      tip: iucnNotes.length ? tipControl("iucn-note", "კატეგორიის ახსნა") : "",
    },
    { label: "რიგი", html: escapeHtml(bird.orderKa || "") },
    { label: "ოჯახი", html: escapeHtml(bird.familyKa || "") },
  ].filter((row) => row.html.trim());
  if (!rows.length) return "";
  return `<dl class="presence">${rows
    .map(
      (row) =>
        `<div><dt><span>${escapeHtml(row.label)}</span>${row.tip || ""}</dt><dd>${row.html}</dd></div>`,
    )
    .join("")}</dl>${explanationPopover("status-note", statusNotes)}${explanationPopover("iucn-note", iucnNotes)}`;
}

function detailLinks(bird) {
  const items = [
    ["eBird", bird.links?.ebird, "ebird"],
    ["Wikipedia", bird.links?.wikipedia, "wikipedia"],
    ["ქართული ვიკიპედია", bird.links?.wikipediaKa, "wikipedia"],
  ].filter(([, url]) => url);
  if (!items.length) return "";
  return `<p class="detail-links">${items
    .map(
      ([label, url, icon]) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${linkIcons[icon]}<span>${label}</span></a>`,
    )
    .join("")}</p>`;
}

function copyControl(value, label) {
  const text = String(value || "").trim();
  if (!text) return "";
  return `<button type="button" class="copy" data-copy="${escapeHtml(text)}" data-label="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><svg class="link-icon copy-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><svg class="link-icon copied-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}

function renderDetail(bird) {
  const georgian = bird.georgian?.primary || "";
  const heading = georgian || bird.names.en || "—";
  return `
    <a class="back" href="#"><svg class="link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 19-7-7 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>სიაში დაბრუნება</span></a>
    <div class="detail-layout">
      <figure class="detail-figure">
        ${detailPhoto(bird)}
        ${photoCredit(bird.photo)}
      </figure>
      <div class="detail-info">
        <h2><span>${escapeHtml(heading)}</span>${copyControl(georgian || bird.names.en, georgian ? "ქართული სახელის კოპირება" : "ინგლისური სახელის კოპირება")}</h2>
        ${aliasLine(bird)}
        ${georgian ? `<p class="en"><span>${escapeHtml(bird.names.en || "")}</span>${copyControl(bird.names.en, "ინგლისური სახელის კოპირება")}</p>` : ""}
        <p class="la"><span>${escapeHtml(bird.names.la || "")}</span>${copyControl(bird.names.la, "ლათინური სახელის კოპირება")}</p>
        ${presenceList(bird)}
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

let listScroll = 0;

function readQuery() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") || "";
  state.letter = params.get("letter") || "";
  state.view = params.get("view") === "list" ? "list" : "cards";
}

function writeQuery() {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query);
  if (state.letter) params.set("letter", state.letter);
  if (state.view === "list") params.set("view", "list");
  const search = params.toString();
  const next = `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
  if (next === `${location.pathname}${location.search}${location.hash}`) return;
  history.replaceState(null, "", next);
}

function applyControls() {
  searchEl.value = state.query;
  applyView();
  writeQuery();
}

function syncStuck() {
  if (listToolsEl.hidden) {
    listToolsEl.classList.remove("is-stuck");
    return;
  }
  listToolsEl.classList.toggle("is-stuck", listToolsEl.getBoundingClientRect().top <= 0);
}

function restoreListScroll() {
  const top = listScroll;
  window.scrollTo(0, top);
  requestAnimationFrame(() => {
    window.scrollTo(0, top);
    syncStuck();
  });
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
  if (previousId) restoreListScroll();
}

function mount() {
  const letters = [...new Set(state.birds.map(firstLetter).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ka"),
  );
  alphabetEl.innerHTML = `<button type="button" data-all>ყველა</button>${letters
    .map(
      (letter) =>
        `<button type="button" data-letter="${escapeHtml(letter)}">${escapeHtml(letter)}</button>`,
    )
    .join("")}`;
  resultsEl.innerHTML = state.birds.map(renderCard).join("");
  nameListEl.innerHTML = state.birds.map(renderNameRow).join("");
  state.cards = [...resultsEl.querySelectorAll(".card")];
  state.rows = [...nameListEl.querySelectorAll(".name-row")];
  applyControls();
  filterList();
  shuffleReady = true;
}

let shuffleReady = false;

function cardInView(rect) {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
}

function snapshotCards() {
  const frames = new Map();
  if (resultsEl.hidden) return frames;
  for (const card of state.cards) {
    if (card.classList.contains("is-hidden")) continue;
    const rect = card.getBoundingClientRect();
    if (cardInView(rect)) frames.set(card, rect);
  }
  return frames;
}

function playCardShuffle(before) {
  if (resultsEl.hidden) return;
  for (const card of state.cards) {
    for (const animation of card.getAnimations()) {
      if (animation.id === "card-shuffle") animation.cancel();
    }
  }
  const maxTravel = window.innerHeight;
  for (const card of state.cards) {
    if (card.classList.contains("is-hidden")) continue;
    const next = card.getBoundingClientRect();
    if (!cardInView(next)) continue;
    const prev = before.get(card);
    const dx = prev ? prev.left - next.left : 0;
    const dy = prev ? prev.top - next.top : 0;
    const settles = prev && Math.abs(dx) < maxTravel && Math.abs(dy) < maxTravel;
    if (settles && Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    const keyframes = settles
      ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }]
      : [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ];
    card.animate(keyframes, {
      duration: 220,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
      id: "card-shuffle",
    });
  }
}

function filterList() {
  const animate =
    shuffleReady &&
    !resultsEl.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const before = animate ? snapshotCards() : null;
  let shown = 0;
  const availableLetters = new Set();
  const query = normalize(state.query);
  state.birds.forEach((bird, index) => {
    if (matches(bird, query)) {
      const letter = firstLetter(bird);
      if (letter) availableLetters.add(letter);
    }
    const visible = isVisible(bird);
    state.cards[index].classList.toggle("is-hidden", !visible);
    state.rows[index].classList.toggle("is-hidden", !visible);
    if (visible) shown += 1;
  });
  if (before) playCardShuffle(before);
  alphabetEl.querySelectorAll("button").forEach((button) => {
    if ("all" in button.dataset) {
      const active = !state.letter;
      button.disabled = false;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      return;
    }
    const letter = button.dataset.letter;
    const active = letter === state.letter;
    button.disabled = !active && !availableLetters.has(letter);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  alphabetToggleLetterEl.hidden = !state.letter;
  alphabetToggleLetterEl.textContent = state.letter;
  alphabetToggleEl.classList.toggle("is-filtering", Boolean(state.letter));
  const alphabetLabel = state.letter ? `ანბანი, ${state.letter}` : "ანბანი";
  alphabetToggleEl.setAttribute("aria-label", alphabetLabel);
  alphabetToggleEl.title = alphabetLabel;
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

function revealList() {
  const toolsBottom = listToolsEl.getBoundingClientRect().bottom;
  const listTop = listViewEl.getBoundingClientRect().top;
  if (listTop >= toolsBottom - 1) return;
  const top = window.scrollY + listTop - listToolsEl.offsetHeight - 12;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
}

const narrowAlphabetQuery = window.matchMedia("(max-width: 1199px)");

function setAlphabetOpen(open) {
  const isOpen = Boolean(open) && narrowAlphabetQuery.matches;
  alphabetMenuEl.classList.toggle("is-open", isOpen);
  alphabetToggleEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function sortBirds(birds) {
  return [...birds].sort((a, b) =>
    (a.georgian?.primary || a.names.en).localeCompare(
      b.georgian?.primary || b.names.en,
      "ka",
    ),
  );
}

function paintHighlights() {
  for (const el of document.querySelectorAll("[data-hl]")) {
    el.innerHTML = highlight(el.dataset.hl || "");
  }
}

searchEl.addEventListener("input", (event) => {
  state.query = event.target.value;
  writeQuery();
  paintHighlights();
  filterList();
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    applyView();
    writeQuery();
  });
});

alphabetToggleEl.addEventListener("click", () => {
  setAlphabetOpen(!alphabetMenuEl.classList.contains("is-open"));
});

alphabetEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const clearing = "all" in button.dataset;
  const letter = button.dataset.letter || "";
  const next = clearing || state.letter === letter ? "" : letter;
  if (next !== state.letter) {
    state.letter = next;
    writeQuery();
    filterList();
    revealList();
  }
  setAlphabetOpen(false);
});

document.addEventListener("click", (event) => {
  if (!alphabetMenuEl.classList.contains("is-open")) return;
  if (alphabetMenuEl.contains(event.target)) return;
  setAlphabetOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAlphabetOpen(false);
});

narrowAlphabetQuery.addEventListener("change", () => setAlphabetOpen(false));

detailEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const label = button.dataset.label || "";
  try {
    await navigator.clipboard.writeText(button.dataset.copy || "");
    button.classList.add("is-copied");
    button.setAttribute("aria-label", "დაკოპირდა");
  } catch {
    button.classList.remove("is-copied");
    button.setAttribute("aria-label", "ვერ დაკოპირდა");
  }
  window.clearTimeout(Number(button.dataset.timer));
  button.dataset.timer = String(
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", label);
    }, 1600),
  );
});

window.addEventListener("hashchange", route);

listViewEl.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link || !detailEl.hidden) return;
  listScroll = window.scrollY;
});

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

state.birds = sortBirds(
  (data.birds || []).map((bird) => {
    bird.georgian = parseGeorgianName(bird.names?.ka);
    return bird;
  }),
);
readQuery();
mount();
route();
