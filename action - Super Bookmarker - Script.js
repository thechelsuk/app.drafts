/*
 * @title: Push file to GitHub
 * @author: thechelsuk
 * @version: 1.5.0
 * @notes: Creates a new file in a GitHub repo using the GitHub API.
 *         The draft content is used as the file content, and the draft title is used as the filename.
 *         The GitHub API requires a personal access token with repo permissions.
 *
 */

// Configuration
const PATH = "_bookmarks";
const GITHUB_TOKEN_LABEL = "bm_gh_pat";
const GITHUB_REPO_LABEL = "bm_gh_repo";
const GITHUB_OWNER_LABEL = "bm_gh_owner";

// Get credentials from credential store
let credential = Credential.create("Bookmarker GH", "PAT and Repo Details");
credential.addPasswordField(GITHUB_TOKEN_LABEL, "GitHub Personal Access Token");
credential.addTextField(GITHUB_OWNER_LABEL, "GitHub Repository Owner");
credential.addTextField(GITHUB_REPO_LABEL, "GitHub Repository Name");

// Prompt for credentials if needed
if (!credential.authorize()) {
    app.displayErrorMessage("GitHub credentials not configured");
    context.cancel();
}

// FIX: Use the correct label constants to retrieve stored values
let token = credential.getValue(GITHUB_TOKEN_LABEL);
let owner = credential.getValue(GITHUB_OWNER_LABEL);
let repo = credential.getValue(GITHUB_REPO_LABEL);

let draftText = draft.content;
let lines = draftText.split("\n");

// Extract title (first line)
let title = lines[0].trim();

let sourceUrl = "";
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("link:")) {
        sourceUrl = lines[i].replace(/^link:\s*/i, "").trim();
        break;
    }
}

let bodyLines = [];
for (let i = 1; i < lines.length; i++) {
    let trimmedLine = lines[i].trim().toLowerCase();
    if (
        !trimmedLine.startsWith("source:") &&
        !trimmedLine.startsWith("link:")
    ) {
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
i_url: "${sourceUrl}"
i_type: u-bookmark-of
type: bookmark
layout: bookmark
---

`;


let fileContent = frontMatter + body;
let base64Content = Base64.encode(fileContent);
let apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PATH}/${filename}`;

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


if (response.success) {
    app.displaySuccessMessage(`✓ Published: ${filename}`);
} else {
    let errorMsg = `Failed to publish post.\nStatus: ${response.statusCode}`;
    if (response.responseText) {
        errorMsg += `\nResponse: ${response.responseText}`;
    }
    app.displayErrorMessage(errorMsg);
}
