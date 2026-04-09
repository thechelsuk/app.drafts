/*
 * @title: Sum list item costs
 * @author: thechelsuk
 * @notes: Looks for £xx.xx in markdown rows and adds a total line at the bottom.
 */

let content = draft.content;
let lines = content.split("\n");

// Regular expression to match prices in various formats
// Matches: £52.00, £14.99, £7.43, etc.
let priceRegex = /£(\d+(?:\.\d{2})?)/g;

let total = 0;
let foundPrices = 0;

// Go through each line and extract prices only from list items
for (let line of lines) {
    // Check if line starts with - (list item)
    if (line.trim().startsWith("-")) {
        let matches = line.match(priceRegex);
        if (matches) {
            for (let match of matches) {
                // Extract the number part (remove £ symbol)
                let amount = parseFloat(match.replace("£", ""));
                total += amount;
                foundPrices++;
            }
        }
    }
}

// Check if we found any prices
if (foundPrices === 0) {
    app.displayErrorMessage("No prices found in list items");
    context.fail();
}

// Remove any existing total line
let totalLineRegex = /^---+\s*$/m;
let totalRegex = /^Total:.*$/m;

// Find if there's already a total section
let hasDivider = content.match(totalLineRegex);
let hasTotal = content.match(totalRegex);

// Remove old total if it exists
if (hasDivider && hasTotal) {
    // Remove from the divider onwards
    let dividerIndex = content.search(totalLineRegex);
    content = content.substring(0, dividerIndex).trim();
}

// Add new total
let totalLine = "\n---\nTotal: £" + total.toFixed(2);
draft.content = content + totalLine;
draft.update();
