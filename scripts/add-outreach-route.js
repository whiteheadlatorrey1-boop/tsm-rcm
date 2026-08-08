const fs = require("fs");

const file = "server.js";

const backup = `${file}.backup-${Date.now()}`;

let source = fs.readFileSync(file, "utf8");

fs.writeFileSync(backup, source);

if (source.includes("/war-room/outreach")) {
    console.log("Outreach route already exists.");
    process.exit(0);
}


const marker = "app.get('/', (_req, res) => {";


const route = `

// ── BUSINESS DEVELOPMENT WAR ROOM ─────────────────────────────
// TSM Outreach Command Center

app.get('/war-room/outreach', (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            'html',
            'war-rooms',
            'business-development',
            'tsm-outreach-command-center.html'
        )
    );
});

`;


if (!source.includes(marker)) {

    console.error(
        "Could not find insertion point."
    );

    process.exit(1);

}


source = source.replace(
    marker,
    route + marker
);


fs.writeFileSync(file, source);


console.log(`
SUCCESS

Added:
 /war-room/outreach

Backup:
 ${backup}
`);

