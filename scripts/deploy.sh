#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "Deploy must run from main. Current branch: $branch" >&2
  exit 1
fi

git fetch origin main

local_ref="$(git rev-parse @)"
remote_ref="$(git rev-parse origin/main)"
base_ref="$(git merge-base @ origin/main)"

if [[ "$local_ref" != "$remote_ref" ]]; then
  if [[ "$local_ref" == "$base_ref" ]]; then
    echo "Local main is behind origin/main. Pull or rebase before deploying." >&2
    exit 1
  fi

  if [[ "$remote_ref" != "$base_ref" ]]; then
    echo "Local main and origin/main have diverged. Resolve before deploying." >&2
    exit 1
  fi
fi

bump="${1:-patch}"
next_version="$(
  BUMP="$bump" node <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const current = pkg.version;
const exact = process.env.BUMP;

if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(exact)) {
  console.log(exact);
  process.exit(0);
}

const parts = current.split(".").map(Number);
if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
  throw new Error(`Unsupported current version: ${current}`);
}

switch (exact) {
  case "major":
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
    break;
  case "minor":
    parts[1] += 1;
    parts[2] = 0;
    break;
  case "patch":
    parts[2] += 1;
    break;
  default:
    throw new Error(`Unsupported bump "${exact}". Use patch, minor, major, or an exact semver.`);
}

console.log(parts.join("."));
NODE
)"

npm version "$next_version" --no-git-tag-version

git add -A

if git diff --cached --quiet; then
  echo "Nothing to deploy."
  exit 0
fi

git commit -m "chore: release v$next_version"
git push origin main
