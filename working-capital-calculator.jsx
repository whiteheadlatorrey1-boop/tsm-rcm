import React, { useMemo, useState } from "react";

const INK = "#1c2b1f";
const INK_SOFT = "#4b5f4e";
const PAPER = "#eef2e6";
const PAPER_LINE = "#c7d3ba";
const PAPER_DARK = "#e2e9d7";
const RED = "#a63d2f";
const BRASS = "#8a6a26";
const BRASS_BG = "#e4dcc0";

const mono = "'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace";

function money(n, opts = {}) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
}

function parseNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function monthsElapsed(startStr, endStr, cap) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start) || isNaN(end)) return 0;
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate()) months += 1;
  return Math.max(0, Math.min(cap, months));
}

function Field({ label, value, onChange, prefix = "$", type = "number", width }) {
  return (
    <label className="flex flex-col gap-1" style={{ width }}>
      <span
        className="uppercase"
        style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", color: INK_SOFT }}
      >
        {label}
      </span>
      <span className="flex items-center" style={{ borderBottom: `1px solid ${PAPER_LINE}` }}>
        {type === "number" && (
          <span style={{ fontFamily: mono, fontSize: 13, color: INK_SOFT, marginRight: 4 }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none"
          style={{
            fontFamily: mono,
            fontSize: 13,
            color: INK,
            padding: "4px 2px",
            fontWeight: 600,
          }}
        />
      </span>
    </label>
  );
}

function Tick({ letter }) {
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `1px solid ${RED}`,
        color: RED,
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {letter}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="flex items-center gap-2 mb-3"
      style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", color: BRASS }}
    >
      <span style={{ fontWeight: 700 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: PAPER_LINE }} />
    </div>
  );
}

function LedgerRow({ label, unadjusted, tick, delta, adjusted, note, first }) {
  return (
    <div
      className="grid items-baseline"
      style={{
        gridTemplateColumns: "1fr 110px 24px 100px 110px",
        gap: 8,
        borderTop: first ? "none" : `1px solid ${PAPER_LINE}`,
        padding: "7px 0",
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 12.5, color: INK }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 12.5, color: INK_SOFT, textAlign: "right" }}>
        {money(unadjusted)}
      </span>
      <span className="flex justify-center">{tick ? <Tick letter={tick} /> : null}</span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 12.5,
          textAlign: "right",
          color: delta === 0 ? INK_SOFT : RED,
        }}
      >
        {delta === 0 ? "—" : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}`}
      </span>
      <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: INK, textAlign: "right" }}>
        {money(adjusted)}
      </span>
    </div>
  );
}

export default function WorkingCapitalWorksheet() {
  // --- Unadjusted balances ---
  const [cash, setCash] = useState("418722");
  const [arGross, setArGross] = useState("1284000");
  const [ap, setAp] = useState("961313");
  const [accruedWages, setAccruedWages] = useState("87179");
  const [currentLTD, setCurrentLTD] = useState("182350");

  // --- Inventory workpaper ---
  const [invCount, setInvCount] = useState("2139655");
  const [invConsignmentIn, setInvConsignmentIn] = useState("92000");
  const [invOwnedNotPresent, setInvOwnedNotPresent] = useState("0");

  // --- AR / allowance workpaper ---
  const [writeOff, setWriteOff] = useState("54000");
  const [allowancePct, setAllowancePct] = useState("4");

  // --- Prepaid insurance workpaper ---
  const [prepaidCost, setPrepaidCost] = useState("144000");
  const [policyStart, setPolicyStart] = useState("2019-10-01");
  const [policyTermMonths, setPolicyTermMonths] = useState("12");
  const [asOfDate, setAsOfDate] = useState("2019-12-31");

  // --- Unearned revenue workpaper ---
  const [unearnedUnadj, setUnearnedUnadj] = useState("118250");
  const [earnedAmount, setEarnedAmount] = useState("35000");

  const calc = useMemo(() => {
    const cashN = parseNum(cash);
    const apN = parseNum(ap);
    const accruedN = parseNum(accruedWages);
    const ltdN = parseNum(currentLTD);

    // Inventory
    const invCountN = parseNum(invCount);
    const consignN = parseNum(invConsignmentIn);
    const ownedNotPresentN = parseNum(invOwnedNotPresent);
    const inventoryAdj = invCountN - consignN + ownedNotPresentN;
    const inventoryDelta = inventoryAdj - invCountN;

    // AR
    const arGrossN = parseNum(arGross);
    const writeOffN = parseNum(writeOff);
    const arAfterWriteoff = arGrossN - writeOffN;
    const pct = parseNum(allowancePct) / 100;
    const allowanceReq = arAfterWriteoff * pct;
    const arNet = arAfterWriteoff - allowanceReq;
    const arDelta = arNet - arGrossN;

    // Prepaid
    const termMonths = Math.max(1, parseNum(policyTermMonths));
    const costN = parseNum(prepaidCost);
    const elapsed = monthsElapsed(policyStart, asOfDate, termMonths);
    const monthly = costN / termMonths;
    const expired = monthly * elapsed;
    const prepaidAdj = costN - expired;
    const prepaidDelta = prepaidAdj - costN;

    // Unearned revenue (liability — decreases when earned)
    const unearnedN = parseNum(unearnedUnadj);
    const earnedN = parseNum(earnedAmount);
    const unearnedAdj = unearnedN - earnedN;
    const unearnedDelta = unearnedAdj - unearnedN;

    const currentAssets = cashN + arNet + inventoryAdj + prepaidAdj;
    const currentLiabilities = apN + accruedN + unearnedAdj + ltdN;
    const workingCapital = currentAssets - currentLiabilities;
    const rounded = Math.round(workingCapital / 1000) * 1000;

    return {
      cashN,
      apN,
      accruedN,
      ltdN,
      costN,
      invCountN,
      consignN,
      ownedNotPresentN,
      inventoryAdj,
      inventoryDelta,
      arGrossN,
      writeOffN,
      arAfterWriteoff,
      allowanceReq,
      arNet,
      arDelta,
      elapsed,
      monthly,
      expired,
      prepaidAdj,
      prepaidDelta,
      unearnedN,
      earnedN,
      unearnedAdj,
      unearnedDelta,
      currentAssets,
      currentLiabilities,
      workingCapital,
      rounded,
    };
  }, [
    cash, ap, accruedWages, currentLTD,
    invCount, invConsignmentIn, invOwnedNotPresent,
    arGross, writeOff, allowancePct,
    prepaidCost, policyStart, policyTermMonths, asOfDate,
    unearnedUnadj, earnedAmount,
  ]);

  return (
    <div
      className="w-full min-h-full flex justify-center"
      style={{ background: PAPER, padding: "28px 16px 60px" }}
    >
      <div className="w-full" style={{ maxWidth: 880 }}>
        {/* Header */}
        <div
          className="flex items-end justify-between pb-4 mb-6"
          style={{ borderBottom: `2px solid ${INK}` }}
        >
          <div>
            <div
              style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", color: BRASS, fontWeight: 700 }}
            >
              WORKPAPER NO. WC-1
            </div>
            <div
              style={{ fontFamily: mono, fontSize: 20, letterSpacing: "0.02em", color: INK, fontWeight: 700 }}
            >
              Adjusted Working Capital Worksheet
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: INK_SOFT, textAlign: "right" }}>
            PREPARED BY: CAO<br />
            REVIEWED BY: —
          </div>
        </div>

        {/* Unadjusted balances */}
        <SectionLabel>1 · Unadjusted Balances</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-8">
          <Field label="Cash" value={cash} onChange={setCash} />
          <Field label="Accounts Payable" value={ap} onChange={setAp} />
          <Field label="Accrued Wages Payable" value={accruedWages} onChange={setAccruedWages} />
          <Field label="Current Portion Long-Term Debt" value={currentLTD} onChange={setCurrentLTD} />
        </div>

        {/* Inventory workpaper */}
        <SectionLabel>2 · Inventory — Physical Count Reconciliation</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-2">
          <Field label="Physical count, 12/31" value={invCount} onChange={setInvCount} />
          <Field label="Less: held on consignment (not owned)" value={invConsignmentIn} onChange={setInvConsignmentIn} />
          <Field label="Add: owned, not physically present" value={invOwnedNotPresent} onChange={setInvOwnedNotPresent} />
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: RED, marginBottom: 28 }}>
          <Tick letter="a" /> <span style={{ marginLeft: 6 }}>
            Consignment goods on hand belong to the consignor, not Rosen — excluded. Goods sold FOB destination but not yet shipped remain the seller's property and stay in the count as-is — no adjustment.
          </span>
        </div>

        {/* AR workpaper */}
        <SectionLabel>3 · Accounts Receivable — Write-off &amp; Allowance</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-2">
          <Field label="Gross accounts receivable" value={arGross} onChange={setArGross} />
          <Field label="Write off as uncollectible" value={writeOff} onChange={setWriteOff} />
          <Field label="Required allowance (%)" value={allowancePct} onChange={setAllowancePct} prefix="" />
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: RED, marginBottom: 28 }}>
          <Tick letter="b" /> <span style={{ marginLeft: 6 }}>
            Write-off first reduces gross AR to {money(calc.arAfterWriteoff)}; allowance then reset to {allowancePct}% of that balance ({money(calc.allowanceReq)}) and netted against AR.
          </span>
        </div>

        {/* Prepaid workpaper */}
        <SectionLabel>4 · Prepaid Insurance — Amortization</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mb-2">
          <Field label="Original policy cost" value={prepaidCost} onChange={setPrepaidCost} />
          <Field label="Policy term (months)" value={policyTermMonths} onChange={setPolicyTermMonths} prefix="" />
          <Field label="Policy start date" value={policyStart} onChange={setPolicyStart} type="date" />
          <Field label="As-of / statement date" value={asOfDate} onChange={setAsOfDate} type="date" />
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: RED, marginBottom: 28 }}>
          <Tick letter="c" /> <span style={{ marginLeft: 6 }}>
            {calc.elapsed} month(s) expired at {money(calc.monthly, { cents: true })}/mo = {money(calc.expired)} recognized as expense; remainder stays prepaid.
          </span>
        </div>

        {/* Unearned revenue workpaper */}
        <SectionLabel>5 · Unearned Revenue — Revenue Recognized</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-2">
          <Field label="Unadjusted unearned revenue" value={unearnedUnadj} onChange={setUnearnedUnadj} />
          <Field label="Earned by 12/31, not yet recorded" value={earnedAmount} onChange={setEarnedAmount} />
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: RED, marginBottom: 32 }}>
          <Tick letter="d" /> <span style={{ marginLeft: 6 }}>
            Revenue earned reduces the liability — moves from unearned revenue to recognized revenue.
          </span>
        </div>

        {/* Adjusted ledger */}
        <SectionLabel>6 · Adjusted Trial of Working Capital Items</SectionLabel>
        <div
          style={{
            background: PAPER_DARK,
            border: `1px solid ${PAPER_LINE}`,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "1fr 110px 24px 100px 110px",
              gap: 8,
              fontFamily: mono,
              fontSize: 9.5,
              letterSpacing: "0.08em",
              color: INK_SOFT,
              paddingBottom: 6,
              borderBottom: `1px solid ${PAPER_LINE}`,
              marginBottom: 2,
            }}
          >
            <span>ACCOUNT</span>
            <span style={{ textAlign: "right" }}>UNADJUSTED</span>
            <span></span>
            <span style={{ textAlign: "right" }}>ADJ.</span>
            <span style={{ textAlign: "right" }}>ADJUSTED</span>
          </div>

          <div
            style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: BRASS, marginTop: 10, marginBottom: 2, fontWeight: 700 }}
          >
            CURRENT ASSETS
          </div>
          <LedgerRow label="Cash" unadjusted={calc.cashN} tick={null} delta={0} adjusted={calc.cashN} first />
          <LedgerRow label="Accounts receivable, net" unadjusted={calc.arGrossN} tick="b" delta={calc.arDelta} adjusted={calc.arNet} />
          <LedgerRow label="Inventory" unadjusted={calc.invCountN} tick="a" delta={calc.inventoryDelta} adjusted={calc.inventoryAdj} />
          <LedgerRow label="Prepaid insurance" unadjusted={calc.costN} tick="c" delta={calc.prepaidDelta} adjusted={calc.prepaidAdj} />
          <div
            className="flex justify-between items-center"
            style={{ padding: "8px 0 2px", borderTop: `1px solid ${INK}` }}
          >
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: INK }}>
              Total Current Assets
            </span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: INK }}>
              {money(calc.currentAssets)}
            </span>
          </div>

          <div
            style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: BRASS, marginTop: 22, marginBottom: 2, fontWeight: 700 }}
          >
            CURRENT LIABILITIES
          </div>
          <LedgerRow label="Accounts payable" unadjusted={calc.apN} tick={null} delta={0} adjusted={calc.apN} first />
          <LedgerRow label="Accrued wages payable" unadjusted={calc.accruedN} tick={null} delta={0} adjusted={calc.accruedN} />
          <LedgerRow label="Unearned revenue" unadjusted={calc.unearnedN} tick="d" delta={calc.unearnedDelta} adjusted={calc.unearnedAdj} />
          <LedgerRow label="Current portion, long-term debt" unadjusted={calc.ltdN} tick={null} delta={0} adjusted={calc.ltdN} />
          <div
            className="flex justify-between items-center"
            style={{ padding: "8px 0 2px", borderTop: `1px solid ${INK}` }}
          >
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: INK }}>
              Total Current Liabilities
            </span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: INK }}>
              {money(calc.currentLiabilities)}
            </span>
          </div>
        </div>

        {/* Final tally */}
        <div
          className="flex items-center justify-between"
          style={{
            background: BRASS_BG,
            border: `1px solid ${BRASS}`,
            padding: "18px 22px",
          }}
        >
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", color: BRASS, fontWeight: 700 }}>
              ADJUSTED WORKING CAPITAL
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: INK_SOFT, marginTop: 2 }}>
              Current Assets − Current Liabilities, rounded to nearest $1,000
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 30, fontWeight: 700, color: INK }}>
            {money(calc.rounded)}
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: INK_SOFT, marginTop: 8, textAlign: "right" }}>
          unrounded: {money(calc.workingCapital, { cents: true })}
        </div>
      </div>
    </div>
  );
}
