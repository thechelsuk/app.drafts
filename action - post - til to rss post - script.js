/*
 * @title: TIL to Working Copy
 * @author: thechelsuk
 * @notes: Creates a Today I Learned micro-post in Jekyll format
 */

var credential = Credential.create("Jekyll TIL path", "Jekyll TIL path");
credential.addTextField("jekyll-repo", "Jekyll repo name");
credential.addTextField("jekyll-path", "Path to your jekyll posts directory");
credential.addTextField("working-copy-key", "Working Copy x-url-callback key");

var result = credential.authorize();

if (!result) {
    alert(
        "Failed to obtain required Jekyll data. Please check it and try again.",
    );
    context.cancel("Failed to obtain required Jekyll data.");
} else {
    if (
        !credential.getValue("jekyll-repo") ||
        !credential.getValue("jekyll-path") ||
        !credential.getValue("working-copy-key")
    ) {
        alert(
            "Repo values are invalid. Please rerun action and enter credentials again.",
        );
        credential.forget();
        context.cancel("Repo values were invalid.");
    } else {
        var content = draft.content.trim(),
            date = new Date(),
            now = date.toISOString().substr(0, 10),
            year = date.getFullYear().toString(),
            timestamp = date.toISOString().substr(11, 5),
            fileName = now + "-til-" + timestamp.replace(":", "") + ".md",
            newDraft = "";

        if (!content) {
            alert("Draft is empty. Add your TIL content first.");
            context.cancel();
        }

        // Extract title from first line if it starts with #
        var lines = content.split("\n"),
            title = "",
            bodyContent = content;

        if (lines[0].startsWith("#")) {
            title = lines[0].replace(/^#+\s*/, "").trim();
            bodyContent = lines.slice(1).join("\n").trim();
        } else {
            // Use first sentence or first 60 chars as title
            var firstLine = lines[0];
            if (firstLine.length > 60) {
                title = firstLine.substring(0, 57) + "...";
            } else {
                title = firstLine;
            }
        }

        // Assemble post frontmatter
        newDraft += "---\n";
        newDraft += "layout: post\n";
        newDraft += "date: " + now + "\n";
        newDraft += "title: TIL: " + title + "\n";
        newDraft += "tags: [TIL]\n";
        newDraft += "category: learning\n";
        newDraft += "---\n";
        newDraft += "\n";
        newDraft += bodyContent;

        // Set draft content
        editor.setText(newDraft);

        // Construct the path with year subfolder
        var filePath =
            credential.getValue("jekyll-path") + "/" + year + "/" + fileName;

        // Send to Working Copy
        var baseURL =
                "working-copy://x-callback-url/write/?key=" +
                credential.getValue("working-copy-key") +
                "&repo=" +
                encodeURIComponent(credential.getValue("jekyll-repo")) +
                "&path=" +
                encodeURIComponent(filePath) +
                "&text=" +
                encodeURIComponent(newDraft),
            cb = CallbackURL.create();

        cb.baseURL = baseURL;

        if (cb.open()) {
            app.displaySuccessMessage("TIL posted: " + fileName);
            draft.isArchived = true;
            draft.update();
        } else {
            app.displayErrorMessage("Failed to send to Working Copy");
            context.fail();
        }
    }
}
