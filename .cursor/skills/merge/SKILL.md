---
name: merge
description: >-
  Merge the current git branch into main and push main. Use when the user
  types /merge or asks to merge the current branch, such as ux, into main.
disable-model-invocation: true
---

# Merge

Merge the branch you are on into `main` and push `main`. Do not deploy, commit, rebase, force-push, or delete the branch.

1. From the repo root, read the branch and working tree:

```bash
git branch --show-current
git status --porcelain
git fetch origin
```

2. Stop without changing branches if any of these are true:

- The current branch is `main`, or HEAD is detached.
- `git status --porcelain` is not empty. Tell the user to commit or stash first.
- `origin/main` is missing.

3. If this branch tracks a remote and is behind it, fast-forward it:

```bash
git pull --ff-only
```

If that pull is not a fast-forward, stop and report it. Do not merge yet.

4. Update local `main`, then merge this branch into it. Replace `<branch>` with the name from step 1:

```bash
git checkout main
git pull --ff-only origin main
git merge <branch>
```

5. If the merge conflicts, abort and return to the original branch:

```bash
git merge --abort
git checkout <branch>
```

Report the conflicted files. Do not resolve them yourself.

6. If the merge says "Already up to date", say so and return to `<branch>`. Do not push.

7. Otherwise push `main`:

```bash
git push origin main
```

Never use `--force` or `--no-verify`. If the push is rejected, leave the local merge in place and report the error.

8. Tell the user the merge succeeded, that they are on `main`, and that the live site was not deployed. Publishing is a separate `/deploy`.
