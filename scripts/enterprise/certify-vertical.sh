#!/bin/bash

VERTICAL=$1

if [ -z "$VERTICAL" ]; then
 echo "Usage: ./certify-vertical.sh mortgage"
 exit 1
fi


echo "=============================================="
echo " TSM $VERTICAL CERTIFICATION"
echo "=============================================="


npx playwright test \
tests/e2e/$VERTICAL/${VERTICAL}-lifecycle.spec.js


echo
echo "$VERTICAL READY"

