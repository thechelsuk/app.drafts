/*
 * @title: Super Post Maker
 * @author: thechelsuk
 * @version: 3.2
 * @notes: Create markdown blog post in Working Copy.
 *         Posts always go to _posts/[year]/.
 *         Supports post, quote, rss, til, ways, mixtapes as post types via front matter.
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
            ["post", "quote", "rss", "til", "ways", "mixtapes"],
            ["post"],
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

            if (postType === "quote" && linkVal === "" && citedVal === "") {
                alert(
                    "Quote posts require Link and/or Cited data in the draft body. Please correct the draft or change the post type.",
                );
                context.cancel("Quote post missing link/cited data.");
            } else {
                var fileTitle = titleVal
                        .replace(/:/g, "-")
                        .replace(/ - /g, "-")
                        .trim(),
                    titleArr = fileTitle.split(" "),
                    fileName = dateForFilename + "-";

                titleArr.map((t) => (fileName += t + "-"));
                fileName = fileName.replace(/-$/, "") + ".md";

                var postPath = "_posts/" + year + "/" + fileName.toLowerCase();

                if (postType !== "mixtapes") {
                    content = content.replace(titleVal, "").trim();

                    newDraft = "---\n\n";
                    newDraft += "layout: post\n";
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
                    app.displaySuccessMessage("Post created: " + fileName);
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
