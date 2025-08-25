#!/usr/bin/env bash
set -euo pipefail

# Manual GitHub Pages deploy using git worktree
# - Builds the app with a proper BASE_PATH
# - Publishes build/client to gh-pages branch

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT_DIR"

echo "==> Preparing dependencies"
if [[ "${SKIP_INSTALL:-}" != "1" ]]; then
  yarn install --frozen-lockfile
fi

echo "==> Determining BASE_PATH and Pages URL"
ORIGIN_URL=$(git config --get remote.origin.url || echo "")

# Extract OWNER and REPO from origin URL (supports ssh/https)
CLEAN_URL="${ORIGIN_URL%.git}"
PATH_PART="$CLEAN_URL"
if [[ "$PATH_PART" == *:* ]]; then
  PATH_PART="${PATH_PART#*:}"
fi
OWNER=""
REPO_NAME=""
if [[ "$PATH_PART" == */* ]]; then
  OWNER=$(echo "$PATH_PART" | awk -F'/' '{print $(NF-1)}')
  REPO_NAME=$(echo "$PATH_PART" | awk -F'/' '{print $NF}')
fi
if [[ -z "$REPO_NAME" ]]; then
  REPO_NAME=$(basename -s .git "${ORIGIN_URL:-repo}")
fi

if [[ -z "${BASE_PATH:-}" ]]; then
  if [[ "$REPO_NAME" == *.github.io ]]; then
    BASE_PATH="/"
  else
    BASE_PATH="/${REPO_NAME}/"
  fi
fi
echo "Using BASE_PATH=$BASE_PATH"

# Default Pages URL
if [[ "$REPO_NAME" == *.github.io ]]; then
  PAGES_URL="https://${REPO_NAME}/"
elif [[ -n "$OWNER" && -n "$REPO_NAME" ]]; then
  PAGES_URL="https://${OWNER}.github.io/${REPO_NAME}/"
else
  PAGES_URL="https://<owner>.github.io/${REPO_NAME}/"
fi

echo "==> Building"
BASE_PATH="$BASE_PATH" yarn build

echo "==> Preparing gh-pages worktree"
WORKTREE_DIR=".gh-pages"

git worktree prune || true

if git worktree list --porcelain | grep -q "^worktree $WORKTREE_DIR$"; then
  git worktree remove -f "$WORKTREE_DIR" || true
elif [[ -d "$WORKTREE_DIR" ]]; then
  rm -rf "$WORKTREE_DIR"
fi

git fetch origin gh-pages || true
HAS_REMOTE=false
git show-ref --quiet refs/remotes/origin/gh-pages && HAS_REMOTE=true

HAS_LOCAL=false
git show-ref --quiet refs/heads/gh-pages && HAS_LOCAL=true

if $HAS_REMOTE; then
  git worktree add -f --checkout -B gh-pages "$WORKTREE_DIR" origin/gh-pages
elif $HAS_LOCAL; then
  git worktree add -f --checkout "$WORKTREE_DIR" gh-pages
else
  # Create an orphan gh-pages branch if it doesn't exist
  git worktree add -f --detach "$WORKTREE_DIR"
  pushd "$WORKTREE_DIR" >/dev/null
  git checkout --orphan gh-pages
  git reset --hard
  popd >/dev/null
fi

echo "==> Syncing files"
rsync -av --delete --exclude .git build/client/ "$WORKTREE_DIR"/

# SPA fallback and disable Jekyll processing
cp "$WORKTREE_DIR/index.html" "$WORKTREE_DIR/404.html" || true
touch "$WORKTREE_DIR/.nojekyll"

# If a CNAME exists, prefer it for URL
if [[ -f "$WORKTREE_DIR/CNAME" ]]; then
  CN=$(tr -d '\r\n' < "$WORKTREE_DIR/CNAME")
  if [[ -n "$CN" ]]; then
    PAGES_URL="https://${CN}/"
  fi
fi

echo "==> Committing and pushing"
pushd "$WORKTREE_DIR" >/dev/null
git add -A
if git diff --staged --quiet; then
  echo "No changes to deploy"
else
  # Ensure identity exists
  if ! git config user.email >/dev/null; then
    git config user.email "actions@users.noreply.github.com"
  fi
  if ! git config user.name >/dev/null; then
    git config user.name "gh-pages deploy"
  fi
  git commit -m "Deploy to GitHub Pages: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "DRY_RUN=1 set: skipping push"
  else
    # Use -u if no upstream is set
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
      git push
    else
      git push -u origin gh-pages
    fi
  fi
fi
popd >/dev/null

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "DRY_RUN=1 set: keeping worktree at $WORKTREE_DIR"
else
  echo "==> Cleaning up worktree"
  git worktree remove -f "$WORKTREE_DIR" || true
fi

echo "✅ Done"
echo "🔗 Pages URL: $PAGES_URL"
