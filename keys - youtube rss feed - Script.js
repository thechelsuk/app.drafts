/*
 * @title: Find YouTube RSS Feed
 * @author: thechelsuk
 * @version: 1.0
 * @notes: Takes a YouTube username (@handle) or URL from the first line of the
 *         draft, resolves the channel ID, and appends the RSS feed URL.
 *         Supports:
 *           @SomeUser
 *           https://www.youtube.com/@SomeUser
 *           https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxx
 *         Sets a browser User-Agent and consent cookie to bypass YouTube's consent wall.

 */

(() => {
    // Read only the first line of the draft
    let firstLine = draft.content.split("\n")[0].trim();

    if (!firstLine) {
        app.displayErrorMessage(
            "Draft is empty. Add a YouTube username or URL on the first line.",
        );
        context.fail();
        return;
    }

    // Build a fetchable URL from the input
    let fetchUrl;
    if (firstLine.startsWith("@")) {
        fetchUrl = "https://www.youtube.com/" + firstLine;
    } else if (
        firstLine.startsWith("http://") ||
        firstLine.startsWith("https://")
    ) {
        fetchUrl = firstLine;
    } else {
        app.displayErrorMessage(
            "Unrecognised input. Use a @handle or YouTube URL.",
        );
        context.fail();
        return;
    }

    // Fetch the YouTube page with a browser User-Agent and consent cookie
    let http = HTTP.create();
    let response = http.request({
        url: fetchUrl,
        method: "GET",
        timeout: 10,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Accept-Language": "en-GB,en;q=0.9",
            Cookie: "SOCS=CAI",
        },
    });

    if (!response.success || !response.responseText) {
        app.displayErrorMessage(
            "Failed to fetch YouTube page: " +
                (response.statusCode || "Network error"),
        );
        context.fail();
        return;
    }

    // Pull the RSS feed URL from the <link rel="alternate"> tag YouTube embeds
    let feedMatch = response.responseText.match(
        /<link rel="alternate" type="application\/rss\+xml" title="RSS" href="([^"]+)"/,
    );

    if (!feedMatch) {
        app.displayErrorMessage(
            "Could not find an RSS feed link on that YouTube page.",
        );
        context.fail();
        return;
    }

    let rssUrl = feedMatch[1];
    draft.content = draft.content + "\n" + rssUrl;
    draft.update();
    app.displaySuccessMessage("RSS feed URL added: " + rssUrl);
})();
