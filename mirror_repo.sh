#!/bin/bash
set -e

TARGET_OWNER="whiteheadlatorrey1-boop"
REPO_NAME="tsm-apps"
TEMP_DIR="tsm-apps-bare-temp"

echo "==> Cloning current repository as bare..."
git clone --bare https://github.com/administrator2016/tsm-apps.git "$TEMP_DIR"
cd "$TEMP_DIR"

echo "==> Ensuring target repository exists under $TARGET_OWNER/$REPO_NAME..."
gh repo create "$TARGET_OWNER/$REPO_NAME" --public --confirm || echo "Repository may already exist or require permissions, proceeding to push..."

echo "==> Pushing all branches and tags with force overwrite to target..."
git remote set-url origin "https://github.com/$TARGET_OWNER/$REPO_NAME.git"
git push --mirror --force

echo "==> Cleaning up temporary files..."
cd ..
rm -rf "$TEMP_DIR"

echo "==> Repository successfully mirrored and overwritten to https://github.com/$TARGET_OWNER/$REPO_NAME"
