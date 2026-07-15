#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE DEMO DOCUMENT BUILDER"
echo "=============================================="

mkdir -p demo-documents/mortgage


touch demo-documents/mortgage/1003-Loan-Application.pdf
touch demo-documents/mortgage/LoanEstimate.pdf
touch demo-documents/mortgage/ClosingDisclosure.pdf
touch demo-documents/mortgage/Appraisal.pdf
touch demo-documents/mortgage/TitleCommitment.pdf
touch demo-documents/mortgage/PurchaseAgreement.pdf
touch demo-documents/mortgage/BankStatement.pdf
touch demo-documents/mortgage/Paystub.pdf
touch demo-documents/mortgage/W2.pdf
touch demo-documents/mortgage/InsuranceBinder.pdf


echo "Mortgage documents created"