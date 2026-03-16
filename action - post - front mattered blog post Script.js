/*
 * @title: Create mixtape post in Working Copy
 * @author: thechelsuk
 * @notes: Creates a blog post in working copy based on front matter
 */

var credential = Credential.create("Jekyll Post Path", "Jekyll Post Path");
credential.addTextField("jekyll-repo", "Jekyll repo name");
credential.addTextField("jekyll-path", "Path to your Jekyll posts directory");
credential.addTextField("working-copy-key", "Working Copy x-url-callback key");

var result = credential.authorize();

if (!result) {
    alert(
        "Failed to obtain required Jekyll data. Please check it and try again."
    );
    context.cancel("Failed to obtain required Jekyll data.");
} else {
    // Validate credentials
    if (
        !credential.getValue("jekyll-repo") ||
        !credential.getValue("jekyll-path") ||
        !credential.getValue("working-copy-key")
    ) {
        alert(
            "Repo values are invalid. Please rerun the action and enter the credentials again."
        );
        credential.forget();
        context.cancel("Repo values were invalid.");
    } else {
        // Extract the front matter from the draft content
        var content = draft.content.trim(),
            frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/),
            title = "untitled", // Default title
            date = new Date(),
            year = date.getFullYear().toString(), // Current year in yyyy format
            now = date.toISOString().substr(0, 10), // yyyy-mm-dd
            fileName = "";

        if (frontMatterMatch) {
            // Extract front matter content
            var frontMatter = frontMatterMatch[1];

            // Extract title from the front matter (handles with or without quotes)
            var titleMatch = frontMatter.match(
                /title:\s*["']?([^"'\n]+?)["']?\s*$/m
            );
            if (titleMatch) {
                title = titleMatch[1].trim();
            }

            // Extract date from the front matter, if available
            var dateMatch = frontMatter.match(
                /date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/
            );
            if (dateMatch) {
                now = dateMatch[1];
            }
        }

        // Generate the slugified filename
        var titleSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""); // Slugify title
        fileName = `${now}-${titleSlug}.md`; // Format yyyy-mm-dd-title.md

        // Construct the path with the year as a subfolder
        var filePath = `${credential.getValue(
            "jekyll-path"
        )}/${year}/${fileName}`; // Append year subfolder to path

        // Construct Working Copy URL
        var baseURL =
            "working-copy://x-callback-url/write/?key=" +
            credential.getValue("working-copy-key") +
            "&repo=" +
            encodeURIComponent(credential.getValue("jekyll-repo")) +
            "&path=" +
            encodeURIComponent(filePath) +
            "&text=" +
            encodeURIComponent(content);

        // Open URL to create the file
        var cb = CallbackURL.create();
        cb.baseURL = baseURL;

        if (!cb.open()) {
            alert("Failed to send the file to Working Copy.");
            context.cancel("Callback failed.");
        } else {
            app.displaySuccessMessage("Post created: " + fileName);
        }
    }
}
