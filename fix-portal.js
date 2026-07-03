const fs = require('fs');
const path = require('path');

// Adjust this path if the script is not running in the same directory as your html file
const filePath = path.join(__dirname, 'html', 'healthcare', 'executive-portal.html');

if (!fs.existsSync(filePath)) {
    console.error(`Error: Could not find file at ${filePath}`);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let modified = false;

console.log("Starting optimization of executive-portal.html...");

// 1. FIX LEAKING TEXT AT THE BOTTOM
// Finds the un-wrapped TSM_AUTONOMY block and wraps it cleanly in a script tag
const leakingTextRegex = /(\/\/ ===== TSM_AUTONOMY_STANDARDIZED =====[\s\S]*?)(?=<\/body>|$)/;
if (leakingTextRegex.test(content) && !content.includes('<script>\n// ===== TSM_AUTONOMY_STANDARDIZED =====')) {
    content = content.replace(leakingTextRegex, (match) => {
        console.log("✔ Found leaking text at bottom. Wrapping in <script> tag...");
        return `<script>\n${match.trim()}\n</script>\n`;
    });
    modified = true;
}

// 2. FIX TOP-LEVEL AWAIT SYNTAX ERROR
// Finds common standalone await lines around line 1521 and wraps them in an async IIFE block
// Adjust the matching pattern below if your local file uses a specific variable name assignment
const topLevelAwaitRegex = /(await\s+[a-zA-Z0-9_\.]+\(.*?\);)/g; 
if (topLevelAwaitRegex.test(content)) {
    // To be perfectly safe, we'll look for standard async initialization sequences or wrap the target block
    // Alternatively, converting standard script tags using await to type="module" is cleaner:
    content = content.replace(/<script>([\s\S]*?await\s+[\s\S]*?)<\/script>/g, (match, innerScript) => {
        if (!match.includes('type="module"') && !match.includes('async ()')) {
            console.log("✔ Found top-level await in standard script tag. Converting to module...");
            return `<script type="module">${innerScript}</script>`;
        }
        return match;
    });
    modified = true;
}

// 3. FIX BROKEN SCRIPT PATHS (404 / MIME TYPE ERRORS)
// Changes relative healthcare paths to absolute or upper root directory paths depending on your folder layout.
// Adjust the replacement string below if your JS files live elsewhere (e.g., '/js/')
const brokenPathRegex = /src=["'](?:html\/healthcare\/)?(tsm-[^"']+\.js)["']/g;
if (brokenPathRegex.test(content)) {
    content = content.replace(brokenPathRegex, (match, fileName) => {
        console.log(`✔ Fixing broken script source path for: ${fileName}`);
        // Adjust '/js/' to your actual static assets directory if needed
        return `src="/js/${fileName}"`; 
    });
    modified = true;
}

// Save changes if modifications occurred
if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("🎉 Successfully updated executive-portal.html! Clear your browser cache and refresh.");
} else {
    console.log("⚠ No target patterns found. The file might already be modified or requires custom path rules.");
}