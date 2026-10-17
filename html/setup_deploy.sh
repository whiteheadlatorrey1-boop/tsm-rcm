#!/bin/bash

# 1. Create the AI Bridge Server (Correctly bound for Fly.io)
cat <<EOF > server.js
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // CRITICAL: Must be 0.0.0.0 for Fly.io

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// Fallback to index.html or your portal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log('=========================================');
    console.log('AuditOps AI Bridge active');
    console.log('Address: http://' + HOST + ':' + PORT);
    console.log('=========================================');
});
EOF

# 2. Create the Dockerfile to ensure files are included
cat <<EOF > Dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production || echo "No package.json found, skipping install"
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
EOF

# 3. Ensure fly.toml is targeting 8080
if [ -f "fly.toml" ]; then
    sed -i 's/internal_port = .*/internal_port = 8080/' fly.toml
else
    echo "Warning: fly.toml not found. Run 'fly config save -a sample-fulfillment-portal' first."
fi

# 4. Final health check of files
echo "══ FILE VERIFICATION ══"
ls -lh index.html server.js vendors.html || echo "⚠️ Warning: Some UI files are still missing in $(pwd)"

# 5. Execute Deploy
echo "══ DEPLOYING TO FLY.IO ══"
fly deploy --app sample-fulfillment-portal --now
