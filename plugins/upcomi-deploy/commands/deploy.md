---
description: Bump the Upcomi web app version, create a release commit, and push main.
---

# Deploy Upcomi

Run the Upcomi release workflow from the current repository.

## Preflight

Check the repo state before doing any write:

1. Run `git status --short --branch`.
2. Confirm the current branch is `main`.
3. Confirm `package.json` contains the `deploy` script.
4. Note any uncommitted changes that will be included in the release.

If the current branch is not `main`, stop and explain that this command must run from `main`.

## Plan

Tell the user that the command will:

1. Run the project deploy script.
2. Bump the version by `patch` by default, unless `$ARGUMENTS` is `minor`, `major`, or an exact semver.
3. Commit all staged and unstaged repo changes as `chore: release vX.Y.Z`.
4. Push `main` to `origin`.

## Commands

Run:

```bash
npm run deploy -- $ARGUMENTS
```

If `$ARGUMENTS` is empty, run:

```bash
npm run deploy
```

Do not force-push. Do not create tags unless the user explicitly asks.

## Verification

After the deploy command exits, run:

```bash
git status --short --branch
git show --stat --oneline --decorate --name-only HEAD
```

Confirm:

1. `main` and `origin/main` point to the same commit.
2. The working tree is clean.
3. `package.json` and `package-lock.json` have the same version.

## Summary

Report:

- Version before and after.
- Commit hash.
- Remote branch pushed.
- Whether the working tree is clean.

## Next Steps

If the push succeeds, say that the release is on `origin/main`.

If the command fails because local `main` is behind or diverged from `origin/main`, tell the user to pull/rebase or resolve the divergence before re-running `/deploy`.
