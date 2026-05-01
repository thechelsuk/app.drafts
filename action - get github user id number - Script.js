/*
 * @title: Get GitHub User ID Number
 * @author: thechelsuk
 * @version: 1.0.4
 * @notes: Drafts App Script: Get GitHub User ID Number from username.
 */

var sourceText = editor.getSelectedText().trim();
if (!sourceText) {
    sourceText = draft.content.trim();
}

var username = "";
var githubUrlMatch = sourceText.match(
    /https?:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/i,
);
var mentionMatch = sourceText.match(
    /@([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/,
);
var lineMatch = sourceText.match(
    /^\s*([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\s*$/m,
);

if (githubUrlMatch) {
    username = githubUrlMatch[1];
} else if (mentionMatch) {
    username = mentionMatch[1];
} else if (lineMatch) {
    username = lineMatch[1];
}

if (!username) {
    app.displayErrorMessage("No username found in selection or draft content.");
    context.fail();
} else if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
    app.displayErrorMessage("Invalid GitHub username: " + username);
    context.fail();
} else {
    var url = "https://api.github.com/users/" + encodeURIComponent(username);
    var http = HTTP.create();
    var response = null;

    try {
        response = http.request({
            url: url,
            method: "GET",
            timeout: 10,
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "Drafts-App",
            },
        });
    } catch (e) {
        app.displayErrorMessage("Network error while fetching GitHub profile.");
        context.fail();
    }

    if (!response || !response.success || !response.responseText) {
        app.displayErrorMessage(
            "Failed to fetch GitHub user: " +
                ((response && response.statusCode) || "network error"),
        );
        context.fail();
    } else {
        var data = null;
        var parseFailed = false;

        try {
            data = JSON.parse(response.responseText);
        } catch (e) {
            app.displayErrorMessage("GitHub returned unreadable user data.");
            context.fail();
            parseFailed = true;
        }

        if (!parseFailed) {
            if (!data || !data.id) {
                app.displayErrorMessage("GitHub user not found: " + username);
                context.fail();
            } else {
                var userId = String(data.id);
                var content = draft.content
                    .replace(/^User ID: \d+\s*$/m, "")
                    .trimEnd();
                draft.content = content + "\nUser ID: " + userId;
                draft.update();
            }
        }
    }
}
