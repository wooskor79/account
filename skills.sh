#!/usr/bin/env bash
# Deploy project skills to global Antigravity config (~/.gemini/config/skills)
GLOBAL_SKILLS_DIR="$HOME/.gemini/config/skills"
SOURCE_SKILLS_DIR="$(cd "$(dirname "$0")" && pwd)/.agents/skills"

mkdir -p "$GLOBAL_SKILLS_DIR"
if [ -d "$SOURCE_SKILLS_DIR" ]; then
    cp -r "$SOURCE_SKILLS_DIR/"* "$GLOBAL_SKILLS_DIR/"
    echo "Successfully deployed skills to $GLOBAL_SKILLS_DIR"
else
    echo "Source skills directory not found at $SOURCE_SKILLS_DIR"
fi