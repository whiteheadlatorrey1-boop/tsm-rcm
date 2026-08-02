#!/usr/bin/env bash
# Sets GROQ_API_KEY for the current shell session AND persists it so it
# survives new terminals / Codespace restarts.
#
# Usage:
#   source set-groq-key.sh gsk_your_actual_key_here
#
# Must be run with `source` (or `.`), not executed directly --
# a plain `./set-groq-key.sh` runs in a subshell and the export
# won't reach your current terminal.

if [ -z "$1" ]; then
  echo "Usage: source set-groq-key.sh <your-groq-api-key>"
  return 1 2>/dev/null || exit 1
fi

export GROQ_API_KEY="$1"

# Persist across new terminals/sessions in this Codespace
if ! grep -q "GROQ_API_KEY" ~/.bashrc 2>/dev/null; then
  echo "export GROQ_API_KEY=\"$1\"" >> ~/.bashrc
  echo "Added GROQ_API_KEY to ~/.bashrc (persists for new terminals)."
else
  sed -i "s|^export GROQ_API_KEY=.*|export GROQ_API_KEY=\"$1\"|" ~/.bashrc
  echo "Updated existing GROQ_API_KEY entry in ~/.bashrc."
fi

echo "GROQ_API_KEY set for this session (length: ${#GROQ_API_KEY} chars)."