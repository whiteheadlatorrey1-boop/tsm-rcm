function runAudit(sector, factor) {
    const searchBar = document.querySelector('.audit-search-bar') || document.querySelector('input[type="text"]');
    const prompt = `auditops "${sector.toUpperCase()} - Factor: ${factor}" --logic=strategist`;
    if (searchBar) {
        searchBar.value = prompt;
        searchBar.focus();
        console.log("Strategist Prompt Loaded: " + prompt);
    }
}
