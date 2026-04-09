/*
 * @title: sort list items
 * @author: thechelsuk
 * @notes: every list in a draft is updated to be sorted alphabetically
 */

let content = draft.content;
let lines = content.split("\n");

let result = [];
let currentList = [];

// Process each line
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check if line starts with "- "
    if (line.trimStart().startsWith("- ")) {
        currentList.push(line);
    } else {
        // Not a list item - sort and flush current list if it exists
        if (currentList.length > 0) {
            // Sort the list items alphabetically (case-insensitive)
            currentList.sort((a, b) => {
                // Extract the text after "- " for comparison
                let textA = a.trimStart().substring(2).toLowerCase();
                let textB = b.trimStart().substring(2).toLowerCase();
                return textA.localeCompare(textB);
            });

            // Add sorted list to result
            result = result.concat(currentList);
            currentList = [];
        }

        // Add the non-list line
        result.push(line);
    }
}

// Don't forget to sort and add any remaining list at the end
if (currentList.length > 0) {
    currentList.sort((a, b) => {
        let textA = a.trimStart().substring(2).toLowerCase();
        let textB = b.trimStart().substring(2).toLowerCase();
        return textA.localeCompare(textB);
    });
    result = result.concat(currentList);
}

// Update the draft with sorted content
draft.content = result.join("\n");
draft.update();
