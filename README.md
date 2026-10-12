# ფრინველთა ქართული სახელები

A small static site for Georgian, English, and Latin bird names. There is no CMS: the site reads [`data/birds.json`](data/birds.json). Friends edit that file, someone with repo access commits, GitHub Pages publishes.

## Local preview

Do not open `index.html` as a file. The browser will block the JSON fetch.

```bash
npm start
```

Then open the URL `serve` prints, usually `http://localhost:3000`.

## Edit a bird

Open `data/birds.json` and add or change one object in the `birds` array:

```json
{
  "id": "eurrob",
  "ebirdCode": "eurrob1",
  "inGeorgia": true,
  "names": {
    "ka": "გულწითელა",
    "en": "European Robin",
    "la": "Erithacus rubecula"
  },
  "photo": {
    "url": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Erithacus_rubecula_with_cocked_head.jpg",
    "credit": "Francis C. Franklin",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Erithacus_rubecula_with_cocked_head.jpg"
  },
  "description": "The European robin is a small insectivorous passerine bird.",
  "links": {
    "wikipedia": "https://en.wikipedia.org/wiki/European_robin",
    "ebird": "https://ebird.org/species/eurrob1"
  }
}
```

Rules:

- `id` must be unique. Use the eBird species code when you know it. If eBird later changes that code, update `ebirdCode` and `links.ebird`, and leave `id` so the page address stays the same.
- `names.en` and `names.la` are required. `names.ka` can be `""` until someone fills it in.
- `inGeorgia` is `true` for birds on the Georgia list, `false` for well-known species from elsewhere.
- `order`, `orderKa`, `family`, `familyKa`, and `status` are optional. Import fills them from the checklist when they are empty. `status` is a comma-separated checklist code such as `YR-R, M`.
- `photo` can be `null`. If you set a photo, keep `credit`, `license`, and a `source` page (Wikimedia Commons file page).
- `description` is optional. Leave it out until you have a short paragraph. The seed script fills an empty one from the English Wikipedia lead and will not replace text that is already there.
- `links.wikipedia` and `links.ebird` are optional. The detail page shows a link only when that URL is present.
- The site never calls eBird or Wikipedia in the browser. What is in the JSON is what visitors see. A card links to `#eurrob` (the bird `id`) on this same page.

Check the file before you commit:

```bash
npm run validate
```

## Fill the Georgia list (maintainers)

The species list and Georgian names come from the [Ilia State University / Biodiversity Georgia checklist](https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/). A snapshot lives in [`data/sources/iliauni-checklist.json`](data/sources/iliauni-checklist.json).

```bash
npm run import:iliauni
```

That command fetches the live table (SABUKO if Iliauni is down), refreshes the snapshot, and merges new species into [`data/birds.json`](data/birds.json). It fills an empty Georgian, English, or Latin name, and it fills an empty order, family, and status. It does not replace a name, photo, or description that is already set. New birds get `inGeorgia: true` and a stable `id` from the scientific name (`gavia-stellata`) until an eBird code is known.

Then attach Wikipedia/Wikimedia lead photos, an English Wikipedia lead paragraph, and eBird/Wikipedia links:

```bash
npm run seed
```

Only birds that still lack a photo, description, Wikipedia URL, or eBird code:

```bash
npm run seed -- --missing
```

[`scripts/seed.mjs`](scripts/seed.mjs) **does not overwrite** a Georgian name, photo, description, or Wikipedia link that is already set. It does not add species that are not already in `birds.json`. Without an API key it still fills photos and descriptions, and it tries Wikidata property P3444 for a missing eBird code. With a key it matches the current eBird/Clements taxonomy, refreshes `ebirdCode`, and rebuilds `links.ebird`. `id` is left as-is.

Request a free key at [eBird API keygen](https://ebird.org/api/keygen), then:

```bash
set EBIRD_API_KEY=your-key
npm run seed
```

On macOS/Linux use `EBIRD_API_KEY=your-key npm run seed`.

English and Latin names follow eBird/Clements when a match is found; otherwise they stay as published on the Iliauni checklist. Photos come from the English Wikipedia lead image and Wikimedia Commons metadata. Descriptions are the English Wikipedia lead paragraph. eBird links are built from the species code (`https://ebird.org/species/{code}`) and do not need an API key.

## GitHub Pages

After the repo is on GitHub:

1. Settings → Pages → Source: **GitHub Actions**.
2. Push to `main`. The [pages workflow](.github/workflows/pages.yml) publishes `index.html`, `assets/`, and `data/`.
3. Pull requests run [JSON validation](.github/workflows/validate.yml) so a typo does not take the site down.

## Attribution

- Georgian names: [Ilia State University / Biodiversity Georgia bird checklist](https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/).
- Taxonomy and English/Latin names: eBird/Clements Checklist when matched; otherwise the Iliauni English and scientific names.
- Photos: Wikimedia Commons authors and licenses, stored on each entry.
- Descriptions: English Wikipedia lead paragraphs, CC BY-SA, linked from each bird that has one.

Macaulay Library / eBird photos are not used here.
