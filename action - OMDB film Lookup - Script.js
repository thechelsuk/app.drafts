/*
 * @title: Film OMDb Lookup
 * @author: thechelsuk
 * @notes: Uses the first non-empty line as search text,
 * searches OMDb, and inserts selected IMDb code.
 */

function extractSearchQuery(content) {
    let lines = content.split("\n");
    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith("search:")) {
            return trimmed.substring(7).trim();
        }
    }

    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return "";
}

function getFieldValue(content, fieldName) {
    let lines = content.split("\n");
    let prefix = fieldName.toLowerCase() + ":";
    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith(prefix)) {
            return trimmed.substring(prefix.length).trim();
        }
    }
    return "";
}

function chooseFilm(results) {
    let picker = Prompt.create();
    picker.title = "Pick the correct film";
    picker.message = "Choose one result to insert its IMDb code.";

    let lookup = {};
    for (let film of results) {
        let label = `${film.Title} (${film.Year}) - ${film.imdbID}`;
        lookup[label] = film;
        picker.addButton(label);
    }

    if (!picker.show()) {
        return null;
    }

    return lookup[picker.buttonPressed] || null;
}

function insertImdbCodeIntoTemplate(imdbId) {
    let current = draft.content || "";
    let dateValue = getFieldValue(current, "Date");
    let ratingValue = getFieldValue(current, "Rating");

    draft.content = `Date: ${dateValue}\nIMDB: ${imdbId}\nRating: ${ratingValue}`;
    draft.update();
    app.displaySuccessMessage("Inserted IMDb code: " + imdbId);
}

function main() {
    let content = draft.content || "";
    if (content.trim() === "") {
        app.displayErrorMessage(
            "Draft is empty. Add search text on the first line.",
        );
        context.cancel();
        return;
    }

    let searchQuery = extractSearchQuery(content);
    if (!searchQuery) {
        app.displayErrorMessage(
            "Add a search term on the first non-empty line.",
        );
        context.cancel();
        return;
    }

    let credential = Credential.create(
        "OMDb Film Search",
        "Enter your OMDb API key",
    );
    credential.addPasswordField("OMDB_API_KEY", "OMDb API Key");
    credential.authorize();

    let apiKey = credential.getValue("OMDB_API_KEY");
    if (!apiKey || apiKey.trim() === "") {
        app.displayErrorMessage("Missing OMDb API key in credentials.");
        context.cancel();
        return;
    }

    let url =
        "https://www.omdbapi.com/?s=" +
        encodeURIComponent(searchQuery) +
        "&type=movie&r=json&apikey=" +
        encodeURIComponent(apiKey.trim());

    let http = HTTP.create();
    let response = http.request({
        url: url,
        method: "GET",
    });

    if (!response.success) {
        app.displayErrorMessage(
            "Unable to reach OMDb. Check network and try again.",
        );
        context.fail();
        return;
    }

    let data = null;
    try {
        data = JSON.parse(response.responseText);
    } catch (error) {
        app.displayErrorMessage("OMDb response could not be parsed.");
        context.fail();
        return;
    }

    if (
        !data ||
        data.Response !== "True" ||
        !data.Search ||
        data.Search.length === 0
    ) {
        let message =
            data && data.Error ? data.Error : "No films found for that search.";
        app.displayErrorMessage(message);
        context.cancel();
        return;
    }

    let listOutput = data.Search.map(
        (film) => `- ${film.Title} (${film.Year}) - ${film.imdbID}`,
    ).join("\n");
    console.log("OMDb Results:\n" + listOutput);

    let selectedFilm = chooseFilm(data.Search);
    if (!selectedFilm) {
        app.displayErrorMessage("No film selected. Template is unchanged.");
        context.cancel();
        return;
    }

    insertImdbCodeIntoTemplate(selectedFilm.imdbID);
}

main();
