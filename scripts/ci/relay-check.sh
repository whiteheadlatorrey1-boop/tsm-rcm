#!/bin/bash

echo "CI RELAY VALIDATION"

FAIL=$(grep -R "localStorage.setItem(\"TSM_" html/war-rooms || true)

if [ ! -z "$FAIL" ]; then
  echo "BUILD FAILED: legacy relay detected"
  exit 1
fi

echo "BUILD OK: relay compliant"
