#!/usr/bin/env bash

BASE="html/war-rooms"

echo "======================================"
echo "TSM WAR ROOM COMPLETION ENGINE"
echo "======================================"

for dir in "$BASE"/*; do
  [ -d "$dir" ] || continue

  name=$(basename "$dir")

  STRATEGIST="$dir/${name}-strategist.html"
  EXECUTIVE="$dir/${name}-executive-portal.html"

  echo ""
  echo "→ Processing $name"

  # Strategist
  if [ ! -f "$STRATEGIST" ]; then
    cat > "$STRATEGIST" << STRAT
<!DOCTYPE html>
<html>
<head>
  <title>${name} Strategist</title>
</head>
<body>
  <h1>${name} Strategist Layer</h1>
  <p>Decision orchestration layer for ${name}</p>

  <script>
    const RELAY_KEY = "TSM_${name^^}_RELAY";
    console.log("Strategist initialized:", RELAY_KEY);
  </script>
</body>
</html>
STRAT
    echo "  ✔ Created strategist"
  else
    echo "  ✔ Strategist exists"
  fi

  # Executive Portal
  if [ ! -f "$EXECUTIVE" ]; then
    cat > "$EXECUTIVE" << EXEC
<!DOCTYPE html>
<html>
<head>
  <title>${name} Executive Portal</title>
</head>
<body>
  <h1>${name} Executive Dashboard</h1>
  <p>Executive visibility layer for ${name}</p>

  <script>
    const RELAY_KEY = "TSM_${name^^}_RELAY";
    console.log("Executive portal initialized:", RELAY_KEY);
  </script>
</body>
</html>
EXEC
    echo "  ✔ Created executive portal"
  else
    echo "  ✔ Executive exists"
  fi

done

echo ""
echo "======================================"
echo "DONE - WAR ROOMS COMPLETED"
echo "======================================"
