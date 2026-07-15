

#!/bin/bash

set -e


echo "=============================================="
echo " TSM MORTGAGE AUTONOMOUS V4 CERTIFICATION"
echo "=============================================="


node --check server/mortgage/mortgage-workflow-engine.js

node --check server/mortgage/mortgage-borrower-agent.js

node --check server/mortgage/mortgage-copilot.js

node --check server/mortgage/mortgage-condition-resolver.js

node --check server/mortgage/mortgage-event-stream.js

node --check server/mortgage/mortgage-investor-delivery.js


npx playwright test \
tests/e2e/mortgage/mortgage-autonomous-lifecycle.spec.js


echo ""
echo "=============================================="
echo " MORTGAGE AUTONOMOUS OPERATIONS V4 READY"
echo "=============================================="


