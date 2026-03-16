/*
 * @title: Film to GitHub Actions
 * @author: thechelsuk
 * @notes: Runs a github action to
 * process which adds a film to a yaml
 * datastore. Uses GitHub API to trigger
 */

// === CHECK DRAFT FIRST ===
if (draft.content && draft.content.trim() !== "") {
    // === GET CREDENTIALS ===
    let credential = Credential.create(
        "GitHub Film Tracker",
        "Enter your GitHub details"
    );
    credential.addTextField("GH_USER", "GitHub Username");
    credential.addTextField("GH_REPO", "Repository Name");
    credential.addPasswordField("GH_PAT", "Personal Access Token");
    credential.authorize();

    const GH_USER = credential.getValue("GH_USER");
    const GH_REPO = credential.getValue("GH_REPO");
    const GH_PAT = credential.getValue("GH_PAT");
    const GH_WORKFLOW = "add-film.yml";

    // === PARSE DRAFT ===
    let lines = draft.content.split("\n");

    let title = null;
    let rating = null;

    // Parse each line looking for Title: and Rating:
    for (let line of lines) {
        line = line.trim();

        // Skip empty lines and the # Film header
        if (!line || line.startsWith("#")) {
            continue;
        }

        // Extract title
        if (line.toLowerCase().startsWith("title:")) {
            title = line.substring(6).trim();
        }

        // Extract rating
        if (line.toLowerCase().startsWith("rating:")) {
            rating = line.substring(7).trim();
        }
    }

    // Validate we found both title and rating
    if (title && rating) {
        // Validate rating is an integer between 1-10
        let ratingNum = parseInt(rating);
        if (
            !isNaN(ratingNum) &&
            ratingNum >= 1 &&
            ratingNum <= 10 &&
            rating === ratingNum.toString()
        ) {
            // Build API URL
            const BASE_URL = "https://api.github.com";
            const API_URL = `${BASE_URL}/repos/${GH_USER}/${GH_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`;

            // Prepare request
            let http = HTTP.create();

            let requestData = {
                ref: "main",
                inputs: {
                    title: title,
                    rating: rating,
                },
            };

            let response = http.request({
                url: API_URL,
                method: "POST",
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: "Bearer " + GH_PAT,
                    "X-GitHub-Api-Version": "2022-11-28",
                    "Content-Type": "application/json",
                },
                data: requestData,
            });

            // Check response
            if (response.success && response.statusCode === 204) {
                app.displaySuccessMessage(
                    "Film added: " + title + " (" + rating + ")"
                );

                // Archive the draft after successful submission
                draft.isArchived = true;
                draft.update();
            } else {
                app.displayErrorMessage(
                    "GitHub API error: " + response.statusCode
                );
                console.log("Response: " + JSON.stringify(response));
                context.fail();
            }
        } else {
            app.displayErrorMessage(
                "Rating must be an integer between 1 and 10"
            );
            context.cancel();
        }
    } else {
        let missing = [];
        if (!title) missing.push("Title");
        if (!rating) missing.push("Rating");
        app.displayErrorMessage("Missing: " + missing.join(" and "));
        context.cancel();
    }
} else {
    app.displayErrorMessage(
        "Draft is empty. Add a film title and rating first."
    );
    context.cancel();
}
