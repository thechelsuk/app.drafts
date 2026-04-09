/*
 * @title: Deduplicate list items in Drafts
 * @author: thechelsuk
 * @notes: creates new list of duplicates and updates existing list with unique items
 */

// Split the content of the current draft into lines
let lines = draft.content.split("\n");

// Process the list and remove duplicates
let uniqueItems = [];
let seenTitlesOrUrls = new Set();
let duplicates = [];

// Function to extract title and URL from a Markdown list item
function extractTitleAndUrl(line) {
    // Match the pattern "- [Title](URL)" or "- Title (URL)"
    let match = line.match(/^- \[?(.+?)\]?\((.+?)\)$/);
    if (match) {
        return { title: match[1].trim(), url: match[2].trim() };
    }
    return null;
}

// Iterate over the lines
for (let line of lines) {
    if (line.startsWith("-")) {
        let item = extractTitleAndUrl(line);
        if (item) {
            let identifier = `${item.title} - ${item.url}`;
            if (!seenTitlesOrUrls.has(identifier)) {
                uniqueItems.push(line);
                seenTitlesOrUrls.add(identifier);
            } else {
                duplicates.push(line);
            }
        } else {
            // If the line isn't a valid list item, add it to unique items
            uniqueItems.push(line);
        }
    } else {
        // Non-list items are preserved as-is
        uniqueItems.push(line);
    }
}

// Prepare the updated draft content
let updatedContent = uniqueItems.join("\n");

// Add the "### Deleted" section with duplicates, if any
if (duplicates.length > 0) {
    updatedContent += `\n\n### Deleted\n${duplicates.join("\n")}`;
}

// Update the draft content
draft.content = updatedContent;
draft.update();

// Log success
console.log("Draft updated successfully.");
