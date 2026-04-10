/*
 * @title: Super Search Router
 * @author: thechelsuk
 * @version: 1.0
 * @notes: Routes search queries to various search engines and sites
 *  - !shortcode to pick search engine/site
 *  - @shortcode to add site: filter (snap)
 *  - [[default_engine]] is a template tag. Set Value to whichever
 *     shortcode you want as default search (default otherwise is DuckDuckGo Lite).
 *  - If query is just a shortcode with no other text, opens the base URL of that engine/site instead of performing a search.
 *  - If @token doesn't match a known shortcode, treated as site: filter with the token as domain.
 *  - Shortcode matching is case-insensitive.
 *  - Example query: "!g @w climate change" → searches Google for "site:wikipedia.org climate change"
 *  - Example query: "@yt lo-fi beats" → searches YouTube for "site:www.youtube.com lo-fi beats"
 *  - Example query: "!hn" → opens Hacker News homepage
 *  - Example query: "@example.com security" → searches default engine for "site:example.com security"

 */

const shortcodes = {
    g: { url: "www.google.com/search?q=", desc: "Google" },
    gm: {
        url: "www.google.com/maps/search/",
        base: "google.com/maps",
        desc: "Google Maps",
    },
    gt: { url: "trends.google.com/explore?q=", desc: "Google Trends" },
    yt: { url: "www.youtube.com/search?q=", desc: "YouTube" },
    appm: { url: "music.apple.com/search?term=", desc: "Apple Music" },
    b: { url: "www.bing.com/search?q=", desc: "Bing Search" },
    ddg: { url: "start.duckduckgo.com/?q=", desc: "DuckDuckGo" },
    ddgh: { url: "html.duckduckgo.com/html?q=", desc: "DuckDuckGo (HTML)" },
    ddgl: { url: "lite.duckduckgo.com/lite?q=", desc: "DuckDuckGo (Lite)" },
    yan: { url: "yandex.com/search/?text=", desc: "Yandex" },
    y: { url: "search.yahoo.com/search?p=", desc: "Yahoo!" },
    ask: { url: "www.ask.com/web?q=", desc: "Ask" },
    q: { url: "www.qwant.com/?q=", desc: "Qwant" },
    sp: { url: "www.startpage.com/do/search?query=", desc: "StartPage" },
    br: { url: "search.brave.com/search?q=", desc: "Brave Search" },
    eco: { url: "www.ecosia.org/search?q=", desc: "Ecosia" },
    amz: { url: "www.amazon.co.uk/s?k=", desc: "Amazon" },
    hn: {
        url: "hn.algolia.com/?q=",
        base: "news.ycombinator.com",
        desc: "Hacker News",
    },
    w: { url: "wikipedia.org/w/index.php?search=", desc: "Wikipedia" },
    ud: {
        url: "www.urbandictionary.com/define.php?term=",
        desc: "Urban Dictionary",
    },
    r: { url: "www.reddit.com/search/?q=", desc: "Reddit" },
    ciu: { url: "caniuse.com/?search=", desc: "Can I Use" },
    imdb: { url: "www.imdb.com/find/?q=", desc: "IMDB" },
    osm: { url: "www.openstreetmap.org/search?query=", desc: "OpenStreetMap" },
    mdn: { url: "developer.mozilla.org/en-US/search?q=", desc: "MDN Web Docs" },
    html: {
        url: "developer.mozilla.org/en-US/search?topic=html&q=",
        base: "developer.mozilla.org/en-US/docs/Web/HTML",
        desc: "MDN HTML",
    },
    css: {
        url: "developer.mozilla.org/en-US/search?topic=css&q=",
        base: "developer.mozilla.org/en-US/docs/Web/CSS",
        desc: "MDN CSS",
    },
    js: {
        url: "developer.mozilla.org/en-US/search?topic=js&q=",
        base: "developer.mozilla.org/en-US/docs/Web/JavaScript",
        desc: "MDN JavaScript",
    },
    cfd: {
        url: "developer.chrome.com/s/results?q=",
        desc: "Chrome for Developers",
    },
    pypi: { url: "pypi.org/search/?q=", desc: "Python Package Index" },
    bs: { url: "bsky.app/search?q=", desc: "Bluesky" },
    gh: { url: "github.com/search?q=", desc: "GitHub" },
    mcw: { url: "minecraft.wiki/w/?search=", desc: "Minecraft Wiki" },
    sms: { url: "searchmysite.net/search/?q=", desc: "Search My Site" },
    s: { url: "www.shodan.io/search?query=", desc: "Shodan" },
    apple: { url: "www.apple.com/search/", desc: "Apple" },
    v: { url: "www.theverge.com/search?q=", desc: "The Verge" },
};

const defaultEngines = {
    ddg: "https://start.duckduckgo.com/?q=",
    ddgh: "https://html.duckduckgo.com/html?q=",
    ddgl: "https://lite.duckduckgo.com/lite?q=",
    g: "https://www.google.com/search?q=",
    b: "https://www.bing.com/search?q=",
    sp: "https://www.startpage.com/do/search?query=",
    br: "https://search.brave.com/search?q=",
    eco: "https://www.ecosia.org/search?q=",
    yan: "https://yandex.com/search/?text=",
    y: "https://search.yahoo.com/search?p=",
    ask: "https://www.ask.com/web?q=",
    q: "https://www.qwant.com/?q=",
};

function getBaseUrl(url) {
    const full = "https://" + url;
    const match = full.match(/^https?:\/\/[^/]+/i);
    return match ? match[0] : null;
}

function processCode(code, isSnap) {
    const shortcodeKey = code.toLowerCase();
    const matchingShortcode = Object.keys(shortcodes).find(
        (key) => key.toLowerCase() === shortcodeKey,
    );

    if (!matchingShortcode) {
        return null;
    }

    if (isSnap) {
        const baseUrl =
            shortcodes[matchingShortcode].base ||
            getBaseUrl(shortcodes[matchingShortcode].url);
        if (baseUrl) {
            return {
                type: "snap",
                result: "site:" + baseUrl.replace("https://", "") + " ",
            };
        }
        return null;
    }

    return {
        type: "bang",
        result: "https://" + shortcodes[matchingShortcode].url,
    };
}

function fallbackSnapSite(token) {
    const clean = token.trim().replace(/^@/, "");
    if (!clean) {
        return null;
    }
    if (clean.includes(".")) {
        return "site:" + clean.replace(/^https?:\/\//, "") + " ";
    }
    return null;
}

function getDefaultEngine() {
    const configured = (draft.processTemplate("[[default_engine]]") || "ddgl")
        .trim()
        .toLowerCase();
    return defaultEngines[configured] || defaultEngines.ddg;
}

function performSearch(rawQuery, defaultEngine) {
    let searchUrl = defaultEngine;
    let sitePrefix = "";

    const tokens = rawQuery.split(/\s+/).filter(Boolean);
    const afterBang = [];

    for (const token of tokens) {
        if (token.startsWith("!")) {
            const bangCode = token.slice(1);
            const result = processCode(bangCode, false);
            if (result && result.type === "bang") {
                searchUrl = result.result;
            } else {
                afterBang.push(token);
            }
        } else {
            afterBang.push(token);
        }
    }

    const finalTokens = [];
    for (const token of afterBang) {
        if (token.startsWith("@")) {
            const snapCode = token.slice(1);
            const result = processCode(snapCode, true);
            if (result && result.type === "snap") {
                sitePrefix = result.result;
            } else {
                const fallback = fallbackSnapSite(token);
                if (fallback) {
                    sitePrefix = fallback;
                } else {
                    finalTokens.push(token);
                }
            }
        } else {
            finalTokens.push(token);
        }
    }

    let processedQuery = finalTokens.join(" ").trim();

    if (!processedQuery) {
        const shortcodeKey = Object.keys(shortcodes).find(
            (key) => "https://" + shortcodes[key].url === searchUrl,
        );
        if (shortcodeKey) {
            const target = shortcodes[shortcodeKey].base
                ? "https://" + shortcodes[shortcodeKey].base
                : searchUrl.split("/").slice(0, 3).join("/");
            app.openURL(target);
            return target;
        }

        app.openURL(searchUrl);
        return searchUrl;
    }

    if (sitePrefix) {
        processedQuery = sitePrefix + processedQuery;
    }

    const finalUrl = searchUrl + encodeURIComponent(processedQuery);
    app.openURL(finalUrl);
    return finalUrl;
}

(function run() {
    const query = (draft.content || "").trim();
    if (!query) {
        context.fail(
            "Draft is empty. Add text and optional @/@shortcode tokens.",
        );
        return;
    }

    const url = performSearch(query, getDefaultEngine());
    console.log("Opened: " + url);
    script.complete();
})();
