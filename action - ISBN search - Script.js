/*
 * @title: Get Book Information by title or ISBN
 * @author: thechelsuk
 * @version: 1.0.0
 * @notes: Drafts App Script: Search ISBNSearch.org and insert YAML book data.
 */

function getSearchQuery() {
    if (typeof editor !== "undefined" && editor.getSelectedText) {
        let selection = editor.getSelectedText();
        if (selection && selection.trim() !== "") {
            return selection.trim();
        }
    }

    let content = draft.content || "";
    let lines = content.split("\n");
    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed !== "") {
            return trimmed;
        }
    }
    return "";
}

function escapeYamlValue(value) {
    if (value == null) {
        return "";
    }
    value = String(value).trim();
    if (value === "") {
        return "";
    }
    if (/[:\n\-\?\[\]\{\},&\*\#\!\|\>\'\"]/.test(value)) {
        return JSON.stringify(value);
    }
    return value;
}

function parseSearchResults(html) {
    let results = [];
    let listStart = html.indexOf('<ul id="searchresults">');
    if (listStart === -1) {
        return results;
    }
    let listEnd = html.indexOf("</ul>", listStart);
    if (listEnd === -1) {
        return results;
    }
    let listHtml = html.substring(listStart, listEnd + 5);
    let itemMatches = listHtml.match(/<li>[\s\S]*?<\/li>/gi) || [];

    for (let li of itemMatches) {
        if (results.length >= 5) {
            break;
        }

        let coverMatch = li.match(/<img[^>]+src="([^"]+)"/i);
        let cover = coverMatch ? coverMatch[1].trim() : "";

        let titleMatch = li.match(/<h2>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h2>/i);
        let title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

        let authorMatch = li.match(/<p>\s*Author:\s*([^<]+)<\/p>/i);
        let author = authorMatch ? authorMatch[1].trim() : "Unknown Author";

        let isbnMatch = li.match(/<p>\s*ISBN-13:\s*([0-9Xx-]+)<\/p>/i);
        if (!isbnMatch) {
            isbnMatch = li.match(/<p>\s*ISBN-10:\s*([0-9Xx-]+)<\/p>/i);
        }
        let isbn = isbnMatch ? isbnMatch[1].trim() : "";

        if (title && isbn) {
            results.push({ title, author, isbn, cover });
        }
    }
    return results;
}

function chooseBook(results) {
    let prompt = Prompt.create();
    prompt.title = "ISBN Search Results";
    let messageLines = ["Choose from the top results below:\n"];
    for (let i = 0; i < results.length; i++) {
        let book = results[i];
        messageLines.push(
            `${i + 1}. ${book.title}`,
            `   Author: ${book.author}`,
            `   ISBN: ${book.isbn}`,
            `   Cover: ${book.cover}`,
            "",
        );
    }
    prompt.message = messageLines.join("\n");

    let selectLabels = results.map(
        (book, index) =>
            `${index + 1}. ${book.title} — ${book.author} (${book.isbn})`,
    );
    prompt.addSelect(
        "bookChoice",
        "Select book",
        selectLabels,
        [selectLabels[0]],
        false,
    );
    prompt.addButton("OK");
    prompt.addButton("Cancel");

    if (!prompt.show()) {
        return null;
    }
    let selected = prompt.fieldValues.bookChoice;
    if (Array.isArray(selected)) {
        selected = selected[0];
    }
    if (!selected) {
        return null;
    }
    let selectedIndex = selectLabels.indexOf(selected);
    return selectedIndex >= 0 ? results[selectedIndex] : null;
}

function insertBookYaml(book) {
    let yaml = `- ${book.isbn}\n  title: ${escapeYamlValue(book.title)}\n  author: ${escapeYamlValue(book.author)}\n  cover: ${escapeYamlValue(book.cover)}`;
    draft.content = yaml;
    draft.update();
    app.displaySuccessMessage(`Inserted book data for ${book.title}`);
}

let searchQuery = getSearchQuery();
if (!searchQuery) {
    app.displayErrorMessage(
        "No search text found. Select a title/ISBN or add it to the first non-empty line of the draft.",
    );
    context.cancel();
} else {
    let url =
        "https://isbnsearch.org/search?s=" + encodeURIComponent(searchQuery);
    let http = HTTP.create();
    let response = http.request({
        url: url,
        method: "GET",
    });

    if (!response.success) {
        app.displayErrorMessage(
            "Unable to fetch ISBN search results. Check your network and try again.",
        );
        context.fail();
    } else {
        let results = parseSearchResults(response.responseText);
        if (!results || results.length === 0) {
            app.displayErrorMessage(
                `No books found for “${searchQuery}”. Try a different title or ISBN.`,
            );
            context.cancel();
        } else {
            let selectedBook = chooseBook(results);
            if (!selectedBook) {
                app.displayErrorMessage("No book selected. Draft unchanged.");
                context.cancel();
            } else {
                insertBookYaml(selectedBook);
            }
        }
    }
}
