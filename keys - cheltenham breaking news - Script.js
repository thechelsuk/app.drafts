/*
 * @title: Cheltenham Breaking News
 * @author: thechelsuk
 * @version: 1.0.0
 * @notes: Appends the latest Cheltenham headlines from local news,
 * council, police and community sources to the current draft,
 * from Cheltenham Open Data.
 * Feed: https://cheltenham-od.uk/feeds/news-breaking.xml
 */

const FEED_URL = "https://cheltenham-od.uk/feeds/news-breaking.xml";
const PAGE_URL = "https://cheltenham-od.uk/cheltenham-news";
const HEADLINE_COUNT = 10;

function decode(text) {
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
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

let http = HTTP.create();
let response = http.request({ url: FEED_URL, method: "GET", timeout: 15 });

if (!response.success || !response.responseText) {
    app.displayErrorMessage("Couldn't load Cheltenham news");
    context.fail();
} else {
    let items = (response.responseText.match(/<entry>[\s\S]*?<\/entry>/g) || [])
        .map((entry) => ({
            title: tag(entry, "title"),
            link: attr(entry, "link", "href"),
            source: tag(entry, "name"),
            updated: new Date(tag(entry, "updated")),
        }))
        .filter((item) => item.title && !isNaN(item.updated))
        .sort((a, b) => b.updated - a.updated)
        .slice(0, HEADLINE_COUNT);

    let output = `## Cheltenham News at ${formatDate(new Date())}\n\n`;
    if (items.length) {
        output += items
            .map((item) => {
                let source = item.source ? ` (${item.source})` : "";
                return `- ${formatDate(item.updated)} · [${item.title}](${item.link})${source}`;
            })
            .join("\n");
    } else {
        output += "No Cheltenham headlines right now.";
    }
    output += `\n\nHeadlines gathered by [Cheltenham Open Data](${PAGE_URL}).\n`;

    draft.content = draft.content.trimEnd() + "\n\n" + output;
    draft.update();
}
