/*
 * @title: Push file to GitHub
 * @author: thechelsuk
 * @version: 1.3.0
 * @notes: Creates a new file in a GitHub repo using the GitHub API.
 *         The draft content is used as the file content, and the draft title is used as the filename.
 *         The GitHub API requires a personal access token with repo permissions.
 *
 */

// Configuration

const PATH = "_posts"; // folder path

const GITHUB_TOKEN = "gh_pat";
const GITHUB_REPO = "gh_repo";
const GITHUB_OWNER = "gh_owner";

// Get credentials from credential store
let credential = Credential.create("GH Tools", "Repo Details");
credential.addPasswordField(GITHUB_TOKEN, "GitHub Personal Access Token");
credential.addTextField(GITHUB_OWNER, "GitHub Repository Owner");
credential.addTextField(GITHUB_REPO, "GitHub Repository Name");

// Prompt for credentials if needed
if (!credential.authorize()) {
    app.displayErrorMessage("GitHub credentials not configured");
    context.cancel();
}

// FIX: Use the correct label constants to retrieve stored values
let token = credential.getValue(GITHUB_TOKEN);
let owner = credential.getValue(GITHUB_OWNER);
let repo = credential.getValue(GITHUB_REPO);

// Parse the draft
let draftText = draft.content;
let lines = draftText.split("\n");

// Extract title (first line)
let title = lines[0].trim();

// Extract source URL (line starting with "source:")
let sourceUrl = "";
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("source:")) {
        sourceUrl = lines[i].replace(/^source:\s*/i, "").trim();
        break;
    }
}

// Extract body (everything except first line and source line, trimmed)
let bodyLines = [];
for (let i = 1; i < lines.length; i++) {
    let trimmedLine = lines[i].trim();
    if (!trimmedLine.toLowerCase().startsWith("source:")) {
        bodyLines.push(lines[i]);
    }
}
let body = bodyLines.join("\n").trim();

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

let slug = generateSlug(title);

// Get today's date in YYYY-MM-DD format
let today = new Date();
let dateString = today.toISOString().split("T")[0];

// Generate filename
let filename = `${dateString}-${slug}.md`;

// Create Jekyll front matter
let frontMatter = `---
title: "${title}"
date: ${dateString}
layout: post 
---

`;

// Combine front matter and body
let fileContent = frontMatter + body;

// Encode content to base64 for GitHub API
let base64Content = Base64.encode(fileContent);

// GitHub API endpoint
let apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PATH}/${filename}`;

// Create HTTP request
let http = HTTP.create();
let response = http.request({
    url: apiUrl,
    method: "PUT",
    headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Drafts-GitHub-Action",
    },
    data: {
        message: `Add new post: ${title}`,
        content: base64Content,
        branch: "main",
    },
});

// Handle response
if (response.success) {
    app.displaySuccessMessage(`✓ Published: ${filename}`);
} else {
    let errorMsg = `Failed to publish post.\nStatus: ${response.statusCode}`;
    if (response.responseText) {
        errorMsg += `\nResponse: ${response.responseText}`;
    }
    app.displayErrorMessage(errorMsg);
}
