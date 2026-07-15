

#!/bin/bash

set -e


echo "=============================================="
echo " TSM MORTGAGE INTELLIGENCE V3 CERTIFICATION"
echo "=============================================="


node --check server/mortgage/mortgage-ai-agents.js

node --check server/mortgage/mortgage-risk-engine.js

node --check server/mortgage/mortgage-compliance-engine.js

node --check server/mortgage/mortgage-fraud-engine.js

node --check server/mortgage/mortgage-document-intelligence.js


npx playwright test \
tests/e2e/mortgage/mortgage-ai-review.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE INTELLIGENCE V3 READY"
echo "=============================================="


