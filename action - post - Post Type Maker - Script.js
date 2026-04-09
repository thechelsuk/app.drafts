/*
 * @title: Post Type Maker
 * @author: thechelsuk
 * @notes: Create markdown blog post in Working Copy.
 *         Posts always go to _posts/[year]/.
 *         Supports post, quote, rss, til, ways as post types via front matter.
 *         Extracts Link/Cited/Date from draft content automatically if present.
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
            dateForFilename = date.toISOString().substr(0, 10),
            nowWithTime = date.toISOString().substr(0, 16).replace("T", " ");

        // extract metadata lines from draft content
        var rawContent = draft.content,
            linkMatch = rawContent.match(/^Link:\s*(.+)$/m),
            citedMatch = rawContent.match(/^Cited:\s*(.+)$/m),
            dateMatch = rawContent.match(/^Date:\s*(.+)$/m),
            extractedLink = linkMatch ? linkMatch[1].trim() : "",
            extractedCited = citedMatch ? citedMatch[1].trim() : "",
            extractedDate = dateMatch ? dateMatch[1].trim() : "";

        // strip extracted lines from content
        var content = rawContent
            .replace(/^Link:.*$/m, "")
            .replace(/^Cited:.*$/m, "")
            .replace(/^Date:.*$/m, "")
            .trim();

        // use capture date if present, otherwise fall back to now with time
        var frontMatterDate =
            extractedDate.length > 0 ? extractedDate : nowWithTime;

        var prompt = Prompt.create();
        prompt.title = "Jekyll post data";
        prompt.message = "Choose Post Type";
        prompt.addSelect(
            "postType",
            "Post type",
            ["post", "quote", "rss", "til", "ways"],
            ["post"],
            false,
        );

        var titleDefault =
            draft.title && draft.title.length > 0 ? draft.title : "";
        prompt.addTextField("title", "Title", titleDefault);

        prompt.isCancellable = true;
        prompt.addButton("Ok");
        prompt.show();

        if (prompt.buttonPressed == "Ok") {
            var postType = prompt.fieldValues["postType"][0],
                titleVal = prompt.fieldValues["title"],
                linkVal = extractedLink,
                citedVal = extractedCited;

            // build filename: yyyy-mm-dd-title.md (no time)
            var fileTitle = titleVal
                .replace(/:/g, "-")
                .replace(/ - /g, "-")
                .trim();
            var titleArr = fileTitle.split(" "),
                fileName = dateForFilename + "-";
            titleArr.map((t) => (fileName += t + "-"));
            fileName = fileName.replace(/-$/, "") + ".md";

            // remove the title line from content
            content = content.replace(titleVal, "").trim();

            // assemble front matter
            var newDraft = "---\n\n";
            newDraft += "layout: post\n";
            newDraft += "date: " + frontMatterDate + "\n";
            newDraft += "title: " + titleVal + "\n";

            if (linkVal !== "") newDraft += "link: " + linkVal + "\n";
            if (citedVal !== "") newDraft += "cited: " + citedVal + "\n";

            if (postType === "rss") newDraft += "type: RSS\n";
            else if (postType === "til") newDraft += "type: TIL\n";
            else if (postType === "ways") newDraft += "type: Ways\n";

            newDraft += "\n---\n\n";
            newDraft += content;

            // set draft content
            editor.setText(newDraft);

            // send to working copy — path is always _posts/[year]/
            var postPath = "_posts/" + year + "/" + fileName.toLowerCase(),
                baseURL =
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
                app.displaySuccessMessage("Post created: " + fileName);
            } else {
                app.displayErrorMessage("Failed to send to Working Copy");
                context.fail();
            }
        }
    }
}
