/*
 * @title: Find RSS Feed
 * @author: thechelsuk
 * @notes: Takes a URL and finds its RSS feed only appends verified, working feeds
 */

// Get URL from draft
let content = draft.content.trim();
let url = "";

// Check if there's a selection
let selection = editor.getSelectedText();
if (selection && selection.trim()) {
    url = selection.trim();
} else {
    // Use entire draft content
    url = content;
}

// Clean up URL
url = url.trim();

// Validate URL
if (!url.startsWith("http://") && !url.startsWith("https://")) {
    app.displayErrorMessage("Invalid URL. Must start with http:// or https://");
    context.fail();
}

// Fetch the page
let http = HTTP.create();
let response = http.request({
    url: url,
    method: "GET",
    timeout: 10,
});

if (!response.success || !response.responseText) {
    app.displayErrorMessage(
        "Failed to fetch URL: " + (response.statusCode || "Network error"),
    );
    context.fail();
}

let html = response.responseText;

if (!html || html.length === 0) {
    app.displayErrorMessage("No content returned from URL");
    context.fail();
}

let candidateFeeds = [];

// Pattern 1: Look for RSS/Atom link tags in HTML
let linkPattern =
    /<link[^>]*type=["'](application\/rss\+xml|application\/atom\+xml)["'][^>]*>/gi;
let linkMatches = html.match(linkPattern);

if (linkMatches) {
    for (let match of linkMatches) {
        let hrefMatch = match.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
            let feedUrl = hrefMatch[1];

            // Convert relative URLs to absolute
            try {
                if (feedUrl.startsWith("/")) {
                    let urlObj = new URL(url);
                    feedUrl = urlObj.origin + feedUrl;
                } else if (!feedUrl.startsWith("http")) {
                    let urlObj = new URL(url);
                    feedUrl = urlObj.origin + "/" + feedUrl;
                }

                candidateFeeds.push(feedUrl);
            } catch (e) {
                // Skip malformed URLs
                continue;
            }
        }
    }
}

// Pattern 2: Common RSS URL patterns to test
try {
    let urlObj = new URL(url);
    let baseUrl = urlObj.origin;

    let commonPatterns = [
        "/feed",
        "/feed/",
        "/rss",
        "/rss/",
        "/atom",
        "/atom/",
        "/feed.xml",
        "/rss.xml",
        "/atom.xml",
        "/index.xml",
    ];

    for (let pattern of commonPatterns) {
        candidateFeeds.push(baseUrl + pattern);
    }
} catch (e) {
    // Skip if URL parsing fails
}

// Remove duplicates
candidateFeeds = [...new Set(candidateFeeds)];

if (candidateFeeds.length === 0) {
    app.displayWarningMessage("No potential feeds found in page");
    context.cancel();
}

// Validate each feed
let validFeeds = [];

app.displayInfoMessage(
    "Checking " + candidateFeeds.length + " potential feeds...",
);

for (let feedUrl of candidateFeeds) {
    try {
        let feedResponse = http.request({
            url: feedUrl,
            method: "GET",
            timeout: 5,
        });

        if (
            feedResponse.success &&
            feedResponse.statusCode === 200 &&
            feedResponse.responseText
        ) {
            let feedContent = feedResponse.responseText;

            // Check if it's actually RSS/Atom XML
            if (
                feedContent.includes("<rss") ||
                feedContent.includes("<feed") ||
                feedContent.includes("</rss>") ||
                feedContent.includes("</feed>")
            ) {
                validFeeds.push(feedUrl);
            }
        }
    } catch (e) {
        // Skip feeds that fail
        continue;
    }
}

if (validFeeds.length === 0) {
    app.displayWarningMessage("No valid RSS feeds found");
    context.cancel();
}

// Build output
let output =
    "\n\n---\n## RSS Feed" + (validFeeds.length > 1 ? "s" : "") + "\n\n";

if (validFeeds.length === 1) {
    output += `${validFeeds[0]}\n`;
} else {
    for (let feed of validFeeds) {
        output += `- ${feed}\n`;
    }
}

// Append to draft
draft.content = content + output;
draft.update();

app.displaySuccessMessage("Found " + validFeeds.length + " valid feed(s)");
