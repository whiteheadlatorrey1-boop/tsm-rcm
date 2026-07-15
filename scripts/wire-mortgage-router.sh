#!/bin/bash
set -e


echo "=============================================="
echo " MORTGAGE ROUTER WIRING"
echo "=============================================="


mkdir -p runtime/verticals/mortgage


cat > runtime/verticals/mortgage/router.js <<'EOF'


module.exports={


detect(file){


if(file.match(/ClosingDisclosure|LoanEstimate|1003|Appraisal/i))
{
return {
vertical:"mortgage",
mission:"LOAN_PROCESSING"
};
}


return null;


}


};

EOF


echo "Mortgage router connected"