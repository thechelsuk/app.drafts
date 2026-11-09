/*
 * @title: Cheltenham Property Snapshot
 * @author: thechelsuk
 * @version: 1.0.0
 * @notes: Appends Cheltenham's latest house prices, rents and home
 * affordability to the current draft, from Cheltenham Open Data.
 * Source: https://cheltenham-od.uk/widgets
 */

const WIDGETS = [
    "https://cheltenham-od.uk/widgets/house-prices",
    "https://cheltenham-od.uk/widgets/rents",
    "https://cheltenham-od.uk/widgets/affordability",
];

function clean(html) {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&middot;/g, "·")
        .replace(/&times;/g, "×")
        .replace(/&copy;/g, "©")
        .replace(/&pound;/g, "£")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function byClass(html, className) {
    let match = html.match(new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)</(?:p|span)>`));
    return match ? clean(match[1]) : "";
}

function section(html) {
    let label = byClass(html, "info-card__label");
    let title = byClass(html, "info-card__title");
    let subtitle = byClass(html, "info-card__subtitle");
    let rows = (html.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) => {
        let name = clean((li.match(/<span>([\s\S]*?)<\/span>/) || [])[1] || "");
        let value = clean((li.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1] || "");
        return `- ${name}: ${value}`;
    });
    let credit = html.match(/info-card__label widget-credit">([\s\S]*?)&middot;\s*<a href="([^"]+)"/);
    let source = credit ? clean(credit[1]) : "";
    let page = credit ? credit[2] : "https://cheltenham-od.uk/";

    let text = `### ${label}\n\n**${title}** · ${subtitle}\n\n`;
    text += rows.join("\n") + "\n\n";
    text += `${source}. [More on Cheltenham Open Data](${page}).\n`;
    return title ? text : "";
}

let http = HTTP.create();
let sections = [];
let failed = false;

WIDGETS.forEach((url) => {
    let response = http.request({ url: url, method: "GET", timeout: 15 });
    let text = response.success && response.responseText ? section(response.responseText) : "";
    if (text) {
        sections.push(text);
    } else {
        failed = true;
    }
});

if (!sections.length) {
    app.displayErrorMessage("Couldn't load Cheltenham property data");
    context.fail();
} else {
    if (failed) {
        app.displayWarningMessage("Some Cheltenham property data couldn't be loaded");
    }
    let output = "## Cheltenham Property Snapshot\n\n" + sections.join("\n");
    draft.content = draft.content.trimEnd() + "\n\n" + output;
    draft.update();
}
