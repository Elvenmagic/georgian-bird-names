# ფრინველთა ქართული სახელები

A small static site for Georgian, English, and Latin bird names. Visitors see [`data/birds.json`](data/birds.json). People who correct Georgian and English names edit [`data/names.json`](data/names.json) only. The guide for them is [`EDITING.md`](EDITING.md). Publishing copies those two fields onto the bird list and leaves photos, descriptions, and links alone.

## Local preview

Do not open `index.html` as a file. The browser will block the JSON fetch.

```bash
npm start
```

Then open the URL `serve` prints, usually `http://localhost:3000`.

Name edits in `names.json` show up locally only after `npm run names:apply`. The published site applies them during deploy.

## Edit a Georgian or English name

Editors follow [`EDITING.md`](EDITING.md) and change `georgian` and `english` in [`data/names.json`](data/names.json). They do not need a photo URL, a Wikipedia link, or an eBird code.

Maintainers copy those names onto [`data/birds.json`](data/birds.json) with:

```bash
npm run names:apply
```

That updates `names.ka` and `names.en` only. It does not change the photo, description, links, eBird code, taxonomy, or `inGeorgia`.

```bash
npm run names:check
```

That reports problems without writing. It refuses an unknown `id`, a changed `latin`, a duplicate `id`, a blank English name, a deleted Georgian name, or a bird removed from `names.json`.

```bash
npm run names:export
```

That adds birds that are missing from `names.json` and refreshes `latin` from `birds.json`. It does not change a `georgian` or `english` value already in the names file.

A Georgian or English correction belongs in `names.json`. Applying that file, including the apply step during deploy, copies it onto `birds.json`. A correction made only in `birds.json` is replaced by the names file on the next apply.

`npm run import:iliauni` and `npm run seed` fill a Georgian, English, or Latin name only when that field is empty. They do not put an Iliauni or SABUKO spelling back over a name that still has text. Run `npm run names:apply` before either command so `birds.json` already has the corrected names. The checklist snapshot in [`data/sources/iliauni-checklist.json`](data/sources/iliauni-checklist.json) is rewritten from the websites and can still show their spelling. The site does not read that snapshot.

Clearing a Georgian name in `names.json` is rejected, so a deleted name cannot be filled again from the checklist. The import fills a Georgian name from Iliauni or SABUKO only when `names.ka` in `birds.json` is empty.

Other fields in `birds.json` are still edited by hand when a photo or description needs a human correction. Leave `names.ka` and `names.en` to the names file.

Check both files before you commit:

```bash
npm run validate
```

## Fill the Georgia list (maintainers)

The species list and Georgian names come from the [Ilia State University / Biodiversity Georgia checklist](https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/). A snapshot lives in [`data/sources/iliauni-checklist.json`](data/sources/iliauni-checklist.json).

```bash
npm run names:apply
npm run import:iliauni
```

That command fetches the live table (SABUKO if Iliauni is down), refreshes the snapshot, and merges new species into [`data/birds.json`](data/birds.json). It fills an empty Georgian, English, or Latin name, and it fills an empty order, family, and status. It does not replace a name, photo, or description that is already set. A bird that matches the checklist is marked `inGeorgia: true`. New birds get `inGeorgia: true` and a stable `id` from the scientific name (`gavia-stellata`) until an eBird code is known.

The import then adds any new species to [`data/names.json`](data/names.json). Georgian and English names already in that file stay as the editors left them.

Then attach Wikipedia/Wikimedia lead photos, an English Wikipedia lead paragraph, and eBird/Wikipedia links:

```bash
npm run seed
```

Only birds that still lack a photo, description, Wikipedia URL, or eBird code:

```bash
npm run seed -- --missing
```

[`scripts/seed.mjs`](scripts/seed.mjs) **does not overwrite** a Georgian name, photo, or description that is already set. It does not add species that are not already in `birds.json`. Without an API key it still fills photos and descriptions, and it tries Wikidata property P3444 for a missing eBird code. With a key it matches the current eBird/Clements taxonomy, refreshes `ebirdCode`, and rebuilds `links.ebird`. `id` is left as-is. When this command fills a missing photo and the Wikipedia page it used has a URL, it stores that URL on the bird.

Georgian Wikipedia links only, without changing names, photos, or descriptions:

```bash
npm run seed -- --ka-wiki
```

Request a free key at [eBird API keygen](https://ebird.org/api/keygen), then:

```bash
set EBIRD_API_KEY=your-key
npm run seed
```

On macOS/Linux use `EBIRD_API_KEY=your-key npm run seed`.

English and Latin names follow eBird/Clements when a match is found and that field is still empty; otherwise they stay as published on the Iliauni checklist. Photos come from the English Wikipedia lead image and Wikimedia Commons metadata. Descriptions are the English Wikipedia lead paragraph. eBird links are built from the species code (`https://ebird.org/species/{code}`) and do not need an API key.

## GitHub Pages

After the repo is on GitHub:

1. Settings → Pages → Source: **GitHub Actions**.
2. Push to `main`. The [pages workflow](.github/workflows/pages.yml) applies `names.json` onto the published `birds.json`, validates both files, then publishes `index.html`, `assets/`, and `data/`. The workflow does not commit that applied copy back to the repo.
3. Pull requests run [JSON validation](.github/workflows/validate.yml) so a typo does not take the site down.

## Who can push and deploy

GitHub does not give push or Pages deploy to the public. Anyone can open a pull request on a public repo. Only people you invite can write to the repo, and the site publishes only after a merge into `main` plus an approval on the `github-pages` environment.

On [Elvenmagic/georgian-bird-names](https://github.com/Elvenmagic/georgian-bird-names):

- Settings → Collaborators: editors who will change names get **Write**. People who may merge and deploy get **Maintain**. The owner stays **Admin**. Do not give editors Admin. People with no invite cannot push.
- Settings → Rules → Rulesets, new ruleset for branch `main`: block deletions and force pushes; require a pull request; require 1 approval; require a review from code owners; require the `Validate birds.json` status check. Do not allow the author to approve their own pull request. Leave the bypass list empty, or include only the owner.
- [`.github/CODEOWNERS`](.github/CODEOWNERS) lists `@Elvenmagic`. Add every other person who may approve on that same line, separated by spaces, before you turn on “require review from code owners”.
- Settings → Environments → `github-pages`: deployment branches limited to `main`, and required reviewers set to those same people. A push to `main` and a manual “Run workflow” both wait until one of them approves the deployment. The Pages workflow can read the repo and write Pages. It cannot push commits.

After that, an editor can propose a name change, and only the accounts you listed can approve it and publish it.

## Attribution

- Georgian names: [Ilia State University / Biodiversity Georgia bird checklist](https://aves.biodiversity-georgia.iliauni.edu.ge/checklist/).
- Taxonomy and English/Latin names: eBird/Clements Checklist when matched; otherwise the Iliauni English and scientific names.
- Photos: Wikimedia Commons authors and licenses, stored on each entry.
- Descriptions: English Wikipedia lead paragraphs, CC BY-SA, linked from each bird that has one.

Macaulay Library / eBird photos are not used here.
