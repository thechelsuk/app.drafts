/*
 * @title: Super Post Maker
 * @author: thechelsuk
 * @version: 3.5.0
 * @notes: Create markdown blog post in Working Copy.
 *         Posts always go to _posts/[year]/.
 *         Supports blog, quote, rss, til, ways, mixtapes, social as post types via front matter.
 *         mixtapes: skips front matter assembly and sends raw draft content as-is.
 *         quote: requires Link and/or Cited metadata in the draft body.
 *         Extracts Link, Cited, and Date from draft content automatically if present.
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
} else {
    if (
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

        var prompt = Prompt.create();
        prompt.title = "Jekyll post data";
        prompt.message = "Choose Post Type";
        prompt.isCancellable = true;

        var titleDefault =
            draft.title && draft.title.length > 0 ? draft.title : "";
        prompt.addTextField("title", "Title", titleDefault);
        prompt.addSelect(
            "postType",
            "Post type",
            ["blog", "quote", "rss", "til", "ways", "mixtapes", "social"],
            ["blog"],
            false,
        );
        prompt.addSwitch("pinned", "Pinned", false);
        prompt.addSwitch("indie", "Indie", false);
        prompt.addButton("Ok");
        prompt.show();

        if (prompt.buttonPressed == "Ok") {
            var postType = prompt.fieldValues["postType"][0],
                titleVal = prompt.fieldValues["title"],
                pinnedVal = prompt.fieldValues["pinned"],
                indieVal = prompt.fieldValues["indie"],
                linkVal = extractedLink,
                citedVal = extractedCited,
                newDraft = draft.content;

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

            // Helper to create a safe filename for all post types
            function makeDatedFilename(title, date) {
                var slug = makeSlug(title);
                return date + "-" + slug + ".md";
            }

            // For mixtapes, extract the value from the 'title:' line in the front matter if present
            function extractMixtapeTitle(content) {
                var lines = content.split(/\r?\n/);
                var inFrontMatter = false;
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line === "---") {
                        if (!inFrontMatter) {
                            inFrontMatter = true;
                        } else {
                            break;
                        }
                    } else if (
                        inFrontMatter &&
                        line.toLowerCase().startsWith("title:")
                    ) {
                        // Extract everything after 'title:' and trim
                        return line.substring(6).trim();
                    }
                }
                return null;
            }

            if (postType === "quote" && linkVal === "" && citedVal === "") {
                alert(
                    "Quote posts require Link and/or Cited data in the draft body. Please correct the draft or change the post type.",
                );
                context.cancel("Quote post missing link/cited data.");
            } else {
                var mixtapeTitle = null;
                if (postType === "mixtapes") {
                    mixtapeTitle =
                        extractMixtapeTitle(draft.content) || titleVal;
                }
                var fileName = makeDatedFilename(
                    postType === "mixtapes" ? mixtapeTitle : titleVal,
                    dateForFilename,
                );

                var postPath = "_posts/" + year + "/" + fileName.toLowerCase();

                if (postType !== "mixtapes") {
                    content = content.replace(titleVal, "").trim();

                    newDraft = "---\n\n";
                    newDraft += "layout: post\n";
                    newDraft += "syndicate_to: [ mastodon, bluesky, reddit ]\n";
                    newDraft += "date: " + frontMatterDate + "\n";
                    newDraft +=
                        "title: " +
                        (postType === "til" ? "TIL - " + titleVal : titleVal) +
                        "\n";

                    if (linkVal !== "") newDraft += "link: " + linkVal + "\n";
                    if (citedVal !== "")
                        newDraft += "cited: " + citedVal + "\n";

                    if (postType === "rss") newDraft += "type: rss\n";
                    else if (postType === "til") newDraft += "type: til\n";
                    else if (postType === "ways") newDraft += "type: ways\n";
                    else if (postType === "social")
                        newDraft += "type: social\n";
                    else if (postType === "blog") newDraft += "type: blog\n";
                    else if (postType === "quote") newDraft += "type: linked\n";

                    if (pinnedVal) newDraft += "pinned: true\n";
                    if (indieVal) newDraft += "class: indie\n";

                    newDraft += "\n---\n\n";
                    newDraft += content;
                }

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
                    if (postType !== "mixtapes") {
                        editor.setText(newDraft);
                    }
                } else {
                    app.displayErrorMessage("Failed to send to Working Copy");
                    context.fail();
                }
            }
        } else {
            context.cancel("Post creation cancelled.");
        }
    }
}
