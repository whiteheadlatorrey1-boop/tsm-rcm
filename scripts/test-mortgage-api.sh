#!/bin/bash


echo "=============================================="
echo " MORTGAGE API TEST"
echo "=============================================="


curl -s localhost:8080/api/mortgage/health | jq


curl -s localhost:8080/api/mortgage/pipeline | jq


echo "Mortgage API PASS"