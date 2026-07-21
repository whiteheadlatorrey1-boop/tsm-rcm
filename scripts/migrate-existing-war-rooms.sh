#!/bin/bash

set -e

echo "=========================================="
echo "TSM Existing War Room Migration"
echo "Canonical Enterprise War Room Structure"
echo "=========================================="

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

BACKUP="backups/war-room-migration/war-rooms-before-$TIMESTAMP"

echo
echo "Creating backup..."
mkdir -p "$BACKUP"

cp -r html/war-rooms "$BACKUP" 2>/dev/null || true

echo
echo "Backup created:"
echo "$BACKUP"

echo
echo "=========================================="
echo "Migration Helper"
echo "=========================================="

migrate_file() {

SOURCE=$1
TARGET=$2

echo

if [ ! -f "$SOURCE" ]; then
    echo "MISSING SOURCE:"
    echo " $SOURCE"
    return
fi


if [ "$SOURCE" = "$TARGET" ]; then
    echo "ALREADY CANONICAL:"
    echo " $TARGET"
    return
fi


mkdir -p "$(dirname "$TARGET")"

if [ -f "$TARGET" ]; then
    echo "TARGET EXISTS:"
    echo " $TARGET"
    echo "SKIPPING"
else
    echo "COPYING"
    echo "FROM:"
    echo " $SOURCE"
    echo "TO:"
    echo " $TARGET"

    cp "$SOURCE" "$TARGET"
fi

}


##########################################
# CONSTRUCTION
##########################################

echo
echo "===== CONSTRUCTION ====="

migrate_file \
html/construction-suite/construction-war-room.html \
html/war-rooms/construction/construction-war-room.html

migrate_file \
html/construction-suite/construction-strategist.html \
html/war-rooms/construction/construction-strategist.html

migrate_file \
html/construction-suite/construction-executive-portal.html \
html/war-rooms/construction/construction-executive-portal.html



##########################################
# HEALTHCARE
##########################################

echo
echo "===== HEALTHCARE ====="

migrate_file \
html/healthcare/hc-denial-war-room.html \
html/war-rooms/healthcare/healthcare-war-room.html

migrate_file \
html/healthcare/hc-main-strategist.html \
html/war-rooms/healthcare/healthcare-strategist.html

migrate_file \
html/healthcare/executive-portal.html \
html/war-rooms/healthcare/healthcare-executive-portal.html



##########################################
# FINOPS
##########################################

echo
echo "===== FINOPS ====="

migrate_file \
html/finops-suite/finops-war-room.html \
html/war-rooms/finops/finops-war-room.html

migrate_file \
html/finops-suite/finops-main-strategist.html \
html/war-rooms/finops/finops-strategist.html

migrate_file \
html/finops-suite/finops-executive-portal.html \
html/war-rooms/finops/finops-executive-portal.html



##########################################
# MORTGAGE
##########################################

echo
echo "===== MORTGAGE ====="

migrate_file \
html/war-rooms/mortgage/mortgage-war-room.html \
html/war-rooms/mortgage/mortgage-war-room.html

migrate_file \
html/war-rooms/mortgage/mortgage-strategist.html \
html/war-rooms/mortgage/mortgage-strategist.html

migrate_file \
html/war-rooms/mortgage/mortgage-executive-portal.html \
html/war-rooms/mortgage/mortgage-executive-portal.html



##########################################
# REAL ESTATE
##########################################

echo
echo "===== REAL ESTATE ====="

migrate_file \
html/reo-pro/re-war-room.html \
html/war-rooms/real-estate/real-estate-war-room.html

migrate_file \
html/reo-pro/re-strategist.html \
html/war-rooms/real-estate/real-estate-strategist.html

migrate_file \
html/reo-pro/re-exec-portal.html \
html/war-rooms/real-estate/real-estate-executive-portal.html



##########################################
# LEGAL
##########################################

echo
echo "===== LEGAL ====="

migrate_file \
html/legal-pro/legal-war-room.html \
html/war-rooms/legal/legal-war-room.html

migrate_file \
html/legal-pro/legal-main-strategist.html \
html/war-rooms/legal/legal-strategist.html

migrate_file \
html/legal-pro/legal-executive-portal.html \
html/war-rooms/legal/legal-executive-portal.html



##########################################
# INSURANCE
##########################################

echo
echo "===== INSURANCE ====="

migrate_file \
html/tsm-insurance/insurance-war-room.html \
html/war-rooms/insurance/insurance-war-room.html

migrate_file \
html/tsm-insurance/insurance-strategist.html \
html/war-rooms/insurance/insurance-strategist.html

migrate_file \
html/tsm-insurance/insurance-executive-portal.html \
html/war-rooms/insurance/insurance-executive-portal.html



##########################################
# BPO
##########################################

echo
echo "===== BPO ====="

migrate_file \
html/war-rooms/bpo/bpo-war-room.html \
html/war-rooms/bpo/bpo-war-room.html

migrate_file \
html/war-rooms/bpo/bpo-strategist.html \
html/war-rooms/bpo/bpo-strategist.html

migrate_file \
html/war-rooms/bpo/bpo-executive-portal.html \
html/war-rooms/bpo/bpo-executive-portal.html



##########################################
# SCHOOLS
##########################################

echo
echo "===== SCHOOLS ====="

migrate_file \
html/schools-command/schools-command.html \
html/war-rooms/schools/schools-war-room.html

migrate_file \
html/schools-command/schools-strategist.html \
html/war-rooms/schools/schools-strategist.html

migrate_file \
html/schools-command/schools-executive-portal.html \
html/war-rooms/schools/schools-executive-portal.html



echo
echo "=========================================="
echo "MIGRATION COMPLETE"
echo "Backup:"
echo "$BACKUP"
echo "=========================================="