/*
==================================================
TSM Engine Card Renderer
==================================================
*/

window.TSMEngineCards = (() => {

    function bullet(items = []) {

        return items.map(item =>

            `<li>${item}</li>`

        ).join("");

    }

    function metrics(metrics = {}) {

        return Object.entries(metrics)

            .map(([k,v]) => {

                return `
                <div class="metric">

                    <span>${k}</span>

                    <strong>${v}</strong>

                </div>
                `;

            })

            .join("");

    }

    function render(engine) {

        return `

<div class="tsm-engine-card">

<div class="header">

<div>

<h3>${engine.engine}</h3>

<div class="status">

${engine.status}

</div>

</div>

<div class="confidence">

${engine.confidence}%

</div>

</div>

<div class="summary">

${engine.summary}

</div>

<div class="metrics">

${metrics(engine.metrics)}

</div>

<div class="section">

<h4>Findings</h4>

<ul>

${bullet(engine.findings)}

</ul>

</div>

<div class="section">

<h4>Risks</h4>

<ul>

${bullet(engine.risks)}

</ul>

</div>

<div class="section">

<h4>Actions</h4>

<ul>

${bullet(engine.actions)}

</ul>

</div>

<button

class="tsm-expand-btn"

data-engine="${engine.engine}"

data-section="analysis">

Explain

</button>

<div class="tsm-expand-body"></div>

</div>

`;

    }

    function renderAll(container, outputs) {

        container.innerHTML = outputs

            .map(render)

            .join("");

    }

    return {

        render,
        renderAll

    };

})();