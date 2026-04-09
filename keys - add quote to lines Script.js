/*
 * @title: Quote it all
 * @author: thechelsuk
 * @notes: Makes each non-title line in a Draft a quote
 */

if (draft) {
    console.log("Draft found...");

    let lines = draft.content.split("\n");

    if (lines.length > 0) {
        console.log(`Draft has ${lines.length} lines. Processing content...`);

        let title = lines[0];
        let quotedLines = lines.slice(1).map(
            (line) => (line.trim() ? `> ${line}` : line), // Add prefix only if the line is non-empty
        );
        let updatedContent = [title, ...quotedLines].join("\n");

        // Update the draft content
        draft.content = updatedContent;
        draft.update();

        console.log("Draft updated successfully!");
    } else {
        console.log("Draft is empty..");
    }
} else {
    console.log("No active draft found...");
}
