/*
 * @title: Super Social Post Maker
 * @author: thechelsuk
 * @version: 2.0.0
 * @notes: Create markdown social post in Working Copy.
 *         Posts always go to _posts/[year]/.
 *         Supports note, mention-of, in-reply-to, like-of, repost-of, bookmark-of types via front matter.
 */

var credential = Credential.create("Jekyll Post Path", "Jekyll Post Path");
credential.addTextField("jekyll-repo", "Jekyll repo name");
credential.addTextField("working-copy-key", "Working Copy x-url-callback key");

var result = credential.authorize();

if (!result) {
    alert(
        "Failed to obtain required Jekyll data. Please check it and try again.",
    );
    context.cancel(
        "Failed to obtain required Jekyll data. Please check it and try again.",
    );
} else if (
    !credential.getValue("jekyll-repo") ||
    String(credential.getValue("jekyll-repo")).length === 0 ||
    !credential.getValue("working-copy-key") ||
    String(credential.getValue("working-copy-key")).length === 0
) {
    alert(
        "Repo values are invalid. Please rerun action and enter credentials again.",
    );
    credential.forget();
    context.cancel("Repo values were invalid.");
} else {
    var date = new Date(),
        year = date.getFullYear().toString(),
        dateForFilename = date.toISOString().slice(0, 10),
        nowWithTime = date.toISOString().slice(0, 16).replace("T", " ");

    var rawContent = draft.content,
        linkMatch = rawContent.match(/^Link:\s*(.+)$/m),
        citedMatch = rawContent.match(/^Cited:\s*(.+)$/m),
        dateMatch = rawContent.match(/^Date:\s*(.+)$/m),
        extractedLink = linkMatch ? linkMatch[1].trim() : "",
        extractedCited = citedMatch ? citedMatch[1].trim() : "",
        extractedDate = dateMatch ? dateMatch[1].trim() : "";

    var content = rawContent
        .replace(/^Link:.*$/m, "")
        .replace(/^Cited:.*$/m, "")
        .replace(/^Date:.*$/m, "")
        .trim();

    var frontMatterDate =
        extractedDate.length > 0 ? extractedDate : nowWithTime;

    // --- SOCIAL POST ONLY VERSION ---
    // i_typeMap for supported types
    var i_typeMap = {
        note: "note",
        "bookmark-of": "bookmark-of",
        "mention-of": "mention-of",
        "in-reply-to": "in-reply-to",
        "like-of": "like-of",
        "repost-of": "repost-of",
    };

    var prompt = Prompt.create();
    prompt.title = "Social Post Data";
    prompt.message = "Enter details for your social post.";
    prompt.isCancellable = true;

    var titleDefault = draft.title || "";
    prompt.addTextField("title", "Title", titleDefault);
    prompt.addSelect(
        "i_type",
        "Interaction Type",
        Object.keys(i_typeMap),
        ["note"],
        false,
    );
    prompt.addTextField("i_url", "Interaction URL", "");
    prompt.addButton("Ok");
    prompt.show();

    if (prompt.buttonPressed === "Ok") {
        var titleVal = prompt.fieldValues["title"];
        var i_type = prompt.fieldValues["i_type"][0];
        var i_url = prompt.fieldValues["i_url"];

        // Helper to create a safe slug from a title
        function makeSlug(str) {
            return str
                .replace(/\//g, "-")
                .toLowerCase()
                .replace(/:/g, "-")
                .replace(/ - /g, "-")
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9\-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
        }

        function makeDatedFilename(title, date) {
            var slug = makeSlug(title);
            return date + "-" + slug + ".md";
        }

        var fileName = makeDatedFilename(titleVal, dateForFilename);
        var postPath = "_posts/" + year + "/" + fileName.toLowerCase();

        // Remove title from content if present
        var contentBody = content.replace(titleVal, "").trim();

        var newDraft = "---\n";
        newDraft += "layout: post\n";
        newDraft += "title: '" + titleVal.replace(/'/g, "''") + "'\n";
        newDraft += "syndicate: true\n";
        newDraft += "date: " + frontMatterDate + "\n";
        newDraft += "type: social\n";
        newDraft += "show: false\n";
        newDraft += "i_type: " + i_typeMap[i_type] + "\n";
        newDraft += "i_url: '" + i_url + "'\n";
        newDraft += "---\n\n";
        newDraft += contentBody;

        var baseURL =
                "working-copy://x-callback-url/write/?key=" +
                credential.getValue("working-copy-key") +
                "&repo=" +
                encodeURIComponent(credential.getValue("jekyll-repo")) +
                "&path=" +
                encodeURIComponent(postPath) +
                "&text=" +
                encodeURIComponent(newDraft),
            cb = CallbackURL.create();
        cb.baseURL = baseURL;

        if (cb.open()) {
            editor.setText(newDraft);
        } else {
            app.displayErrorMessage("Failed to send to Working Copy");
            context.fail();
        }
    } else {
        context.cancel("Social post creation cancelled.");
    }
}
