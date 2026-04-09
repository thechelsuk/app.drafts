/*
 * @title: Time Zones
 * @author: thechelsuk
 * @notes: creates list of time zones given a UK time 24h clock
 */

// Get the first line (should contain time in HH:MM format)
let lines = draft.content.split("\n");
let timeString = lines[0].trim();

// Validate time format (HH:MM in 24-hour format)
let timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
let match = timeString.match(timeRegex);

if (!match) {
    app.displayErrorMessage(
        "First line must contain time in 24-hour format (e.g., 14:00)",
    );
    context.fail();
}

let hours = parseInt(match[1]);
let minutes = parseInt(match[2]);

// Determine if UK is in GMT or BST
// BST runs from last Sunday in March to last Sunday in October
let now = new Date();
let year = now.getFullYear();

// Find last Sunday in March
let marchLast = new Date(year, 2, 31);
while (marchLast.getDay() !== 0) {
    marchLast.setDate(marchLast.getDate() - 1);
}

// Find last Sunday in October
let octoberLast = new Date(year, 9, 31);
while (octoberLast.getDay() !== 0) {
    octoberLast.setDate(octoberLast.getDate() - 1);
}

// Check if current date is in BST period
let isBST = now >= marchLast && now < octoberLast;
let ukOffset = isBST ? 1 : 0; // BST is GMT+1, GMT is GMT+0

// Create a reference date in UK time
let ukDate = new Date(
    Date.UTC(year, now.getMonth(), now.getDate(), hours - ukOffset, minutes),
);

// Timezone definitions (offset from UTC)
// Note: US timezones observe DST, so we need to check
let isDST = now >= marchLast && now < octoberLast; // Approximate DST period for US

let timezones = [
    // US Timezones
    { name: "EST (New York)", offset: isDST ? -4 : -5, dst: isDST },
    { name: "CST (Chicago)", offset: isDST ? -5 : -6, dst: isDST },
    { name: "MST (Denver)", offset: isDST ? -6 : -7, dst: isDST },
    { name: "PST (Los Angeles)", offset: isDST ? -7 : -8, dst: isDST },
    { name: "AKST (Alaska)", offset: isDST ? -8 : -9, dst: isDST },
    { name: "HST (Hawaii)", offset: -10, dst: false },

    // European
    { name: "CET (Paris)", offset: isBST ? 2 : 1, dst: isBST },
    { name: "EET (Athens)", offset: isBST ? 3 : 2, dst: isBST },

    // Asia
    { name: "IST (Mumbai)", offset: 5.5, dst: false },
    { name: "SGT (Singapore)", offset: 8, dst: false },
    { name: "HKT (Hong Kong)", offset: 8, dst: false },
    { name: "JST (Tokyo)", offset: 9, dst: false },
    { name: "AEST (Sydney)", offset: isDST ? 11 : 10, dst: isDST },

    // Middle East
    { name: "GST (Dubai)", offset: 4, dst: false },

    // Others
    { name: "UTC", offset: 0, dst: false },
];

// Build output
let output = timeString + " " + (isBST ? "BST" : "GMT") + "\n\n";

timezones.forEach((tz) => {
    let convertedDate = new Date(ukDate.getTime() + tz.offset * 60 * 60 * 1000);
    let convertedHours = convertedDate.getUTCHours();
    let convertedMinutes = convertedDate.getUTCMinutes();

    // Format time
    let timeStr =
        String(convertedHours).padStart(2, "0") +
        ":" +
        String(convertedMinutes).padStart(2, "0");

    output += "- " + timeStr + " - " + tz.name + "\n";
});

// Replace first line or add to draft
if (lines.length > 1) {
    lines[0] = output.trim();
    draft.content = lines.join("\n");
} else {
    draft.content = output;
}

draft.update();

app.displaySuccessMessage("Timezones added");
