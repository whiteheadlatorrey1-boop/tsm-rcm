/*
=========================================================
TSM Expand-on-Demand Runtime
Version: 2.0
=========================================================
*/

window.TSMExpandEngine = (() => {

    const cache = new Map();

    async function explain(engine, section, context = {}) {

        const key = `${engine}:${section}`;

        if (cache.has(key)) {
            return cache.get(key);
        }

        const response = await fetch("/api/strategist/explain", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                engine,
                section,
                context
            })
        });

        const data = await response.json();

        cache.set(key, data);

        return data;
    }

    async function expand(button) {

        const engine = button.dataset.engine;
        const section = button.dataset.section;

        const card = button.closest(".tsm-engine-card");
        const target = card.querySelector(".tsm-expand-body");

        target.innerHTML = `
            <div class="tsm-loading">
                Generating explanation...
            </div>
        `;

        const result = await explain(engine, section);

        target.innerHTML = `
            <div class="tsm-expanded-content">
                ${result.explanation}
            </div>
        `;
    }

    function initialize() {

        document.querySelectorAll(".tsm-expand-btn")
            .forEach(btn => {

                btn.addEventListener("click", () => expand(btn));

            });

    }

    return {

        initialize,
        explain

    };

})();

document.addEventListener("DOMContentLoaded", () => {

    TSMExpandEngine.initialize();

});