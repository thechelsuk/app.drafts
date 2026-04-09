/*
 * @title: Add Date Header at Cursor
 * @author: thechelsuk
 * @notes: Inserts current date as a markdown header
 * at the cursor position
 */

// Function to get the current date in the desired format
function getFormattedDate() {
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();

    // Add ordinal suffix to the day
    const ordinalSuffix = (day) => {
        if (day > 3 && day < 21) return "th"; // Covers 11th to 13th
        switch (day % 10) {
            case 1:
                return "st";
            case 2:
                return "nd";
            case 3:
                return "rd";
            default:
                return "th";
        }
    };

    return `### ${day}${ordinalSuffix(day)} ${month} ${year}`;
}

// Main script
if (draft) {
    const formattedDate = getFormattedDate();

    // Handle empty draft
    if (!draft.content || draft.content.trim() === "") {
        draft.content = formattedDate + "\n\n";
    } else {
        const cursorPosition = draft.selectionStart || 0;
        const beforeCursor = draft.content.slice(0, cursorPosition);
        const afterCursor = draft.content.slice(cursorPosition);
        draft.content = `${beforeCursor}${formattedDate}\n\n${afterCursor}`;
    }

    draft.update();
} else {
    context.fail();
}
