/*
 * @title: Cheltenham Fuel Prices
 * @author: thechelsuk
 * @version: 1.0.0
 * @notes: Appends today's cheapest fuel prices within 20 miles of
 * Cheltenham to the current draft, from Cheltenham Open Data.
 * Source: https://cheltenham-od.uk/widgets/fuel-prices
 */

const WIDGET_URL = "https://cheltenham-od.uk/widgets/fuel-prices";
const PAGE_URL = "https://cheltenham-od.uk/cheltenham-fuel-prices";

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

let http = HTTP.create();
let response = http.request({ url: WIDGET_URL, method: "GET", timeout: 15 });

if (!response.success || !response.responseText) {
    app.displayErrorMessage("Couldn't load Cheltenham fuel prices");
    context.fail();
} else {
    let html = response.responseText;
    let label = byClass(html, "info-card__label");
    let title = byClass(html, "info-card__title");
    let subtitle = byClass(html, "info-card__subtitle");
    let rows = (html.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) => {
        let fuel = clean((li.match(/<span>([\s\S]*?)<\/span>/) || [])[1] || "");
        let price = clean((li.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1] || "");
        let station = clean((li.match(/<small>([\s\S]*?)<\/small>/) || [])[1] || "");
        return `- ${fuel}: **${price}** at ${station}`;
    });

    if (!title) {
        app.displayErrorMessage("Cheltenham fuel prices page has changed");
        context.fail();
    } else {
        let output = `## ${label}\n\n`;
        output += `- ${subtitle.replace(/ at /, `: **${title}** at `)}\n`;
        output += rows.join("\n") + "\n\n";
        output += `Data from the GOV.UK fuel price scheme, OGL v3.0. More on [Cheltenham fuel prices](${PAGE_URL}).\n`;

        draft.content = draft.content.trimEnd() + "\n\n" + output;
        draft.update();
    }
}
