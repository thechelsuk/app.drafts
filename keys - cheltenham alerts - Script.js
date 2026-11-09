/*
 * @title: Cheltenham Alerts
 * @author: thechelsuk
 * @version: 1.0.0
 * @notes: Checks the Cheltenham Open Data alerts feed for active
 * weather warnings, flood alerts, power cuts and disruptions, then
 * appends them, plus the five latest alerts, to the current draft.
 * Feed: https://cheltenham-od.uk/feeds/alerts.xml
 */

const FEED_URL = "https://cheltenham-od.uk/feeds/alerts.xml";
const ACTIVE_HOURS = 24;
const LATEST_COUNT = 5;
const CLOSED_WORDS = /\b(Restored|Ended)\b/i;

function decode(text) {
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .trim();
}

function tag(xml, name) {
    let match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
    return match ? decode(match[1]) : "";
}

function attr(xml, name, attribute) {
    let match = xml.match(new RegExp(`<${name}[^>]*\\s${attribute}="([^"]*)"`));
    return match ? decode(match[1]) : "";
}

// YYYY-MM-DD HH:MM in UK time
function formatDate(date) {
    let parts = {};
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .formatToParts(date)
        .forEach((p) => (parts[p.type] = p.value));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function bullet(item) {
    return `- ${formatDate(item.updated)} · ${item.category}: [${item.title}](${item.link})`;
}

let http = HTTP.create();
let response = http.request({ url: FEED_URL, method: "GET", timeout: 15 });

if (!response.success || !response.responseText) {
    app.displayErrorMessage("Couldn't load the Cheltenham alerts feed");
    context.fail();
} else {
    let items = (response.responseText.match(/<entry>[\s\S]*?<\/entry>/g) || [])
        .map((entry) => ({
            title: tag(entry, "title"),
            link: attr(entry, "link", "href"),
            category: attr(entry, "category", "term"),
            updated: new Date(tag(entry, "updated")),
        }))
        .filter((item) => !isNaN(item.updated))
        .sort((a, b) => b.updated - a.updated);

    let cutoff = Date.now() - ACTIVE_HOURS * 60 * 60 * 1000;
    let active = items.filter(
        (item) => item.updated >= cutoff && !CLOSED_WORDS.test(item.title),
    );

    let output = `## Cheltenham Alerts at ${formatDate(new Date())}\n\n`;
    if (active.length) {
        output += `### Active\n\n${active.map(bullet).join("\n")}\n\n`;
    } else {
        output += "No active weather, flood, power or travel alerts for Cheltenham.\n\n";
    }
    output += `### Latest\n\n${items.slice(0, LATEST_COUNT).map(bullet).join("\n")}\n\n`;
    output += "Source: [Cheltenham Open Data](https://cheltenham-od.uk/)\n";

    draft.content = draft.content.trimEnd() + "\n\n" + output;
    draft.update();
}
