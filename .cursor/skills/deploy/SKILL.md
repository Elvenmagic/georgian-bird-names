---
name: deploy
description: >-
  Deploy the latest main branch of this repo to GitHub Pages. Use when the
  user types /deploy or asks to deploy, publish, or republish the live site.
disable-model-invocation: true
---

# Deploy

Publish the latest `main` to GitHub Pages. Do not commit, push, merge, or change files.

1. From the repo root, start the existing workflow on `main`:

```bash
gh workflow run "Deploy GitHub Pages" --ref main
```

2. Find that run and wait until it finishes:

```bash
gh run list --workflow "Deploy GitHub Pages" --branch main --limit 1
gh run watch <run-id> --exit-status
```

3. Tell the user whether it succeeded, and link the run. The site is https://elvenmagic.github.io/georgian-bird-names/
