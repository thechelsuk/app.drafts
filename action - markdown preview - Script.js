/*
 * @title: Markdown Preview
 * @author: thechelsuk
 * @notes: Drafts App Script: Render Simplified HTML for Markdown Preview
 */

// Get the current draft content
const draftContent = draft.content;

// Separate front matter and body
let frontMatter = "";
let bodyContent = draftContent;

// Check if the content starts with front matter (YAML block)
if (draftContent.startsWith("---")) {
    const splitContent = draftContent.split("---");
    if (splitContent.length >= 3) {
        frontMatter = splitContent[1].trim(); // Extract the YAML front matter
        bodyContent = splitContent.slice(2).join("---").trim(); // Extract the main body
    }
}

// Parse the front matter to extract the title
let title = "Untitled"; // Default title if none is found
const frontMatterLines = frontMatter.split("\n");
frontMatterLines.forEach((line) => {
    const [key, value] = line.split(":").map((part) => part.trim());
    if (key.toLowerCase() === "title") {
        title = value;
    }
});

// Simple Markdown to HTML conversion (basic implementation)
function markdownToHTML(markdown) {
    return markdown
        .replace(/^### (.*$)/gim, "<h3>$1</h3>") // Convert ### headers
        .replace(/^## (.*$)/gim, "<h2>$1</h2>") // Convert ## headers
        .replace(/^# (.*$)/gim, "<h1>$1</h1>") // Convert # headers
        .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>") // Convert blockquotes
        .replace(/\*\*(.*)\*\*/gim, "<b>$1</b>") // Convert bold text
        .replace(/\*(.*)\*/gim, "<i>$1</i>") // Convert italic text
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>') // Convert links
        .replace(/\n$/gim, "<br>"); // Convert newlines to <br>
}

const renderedHTML = markdownToHTML(bodyContent);

// Set the placeholders for the HTMLPreview
draft.setTemplateTag("title", title); // Set the title
draft.setTemplateTag("content", renderedHTML); // Set only the rendered Markdown HTML content
