/*
 * @title: Clean urls
 * @author: thechelsuk
 * @notes: Looks and removes junk for urls.
 */

let content = draft.content;

// Common tracking parameters to remove
const trackingParams = [
    // General analytics
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_source_platform",
    "utm_creative_format",
    "utm_marketing_tactic",

    // Facebook/Meta
    "fbclid",
    "fb_action_ids",
    "fb_action_types",
    "fb_ref",
    "fb_source",

    // Google
    "gclid",
    "gclsrc",
    "dclid",
    "gbraid",
    "wbraid",

    // Twitter/X
    "twclid",
    "twsrc",

    // TikTok
    "ttclid",

    // Microsoft
    "msclkid",

    // LinkedIn
    "li_fat_id",
    "lipi",

    // Instagram
    "igshid",
    "igsh",

    // Amazon
    "ref_",
    "ref",
    "psc",
    "pd_rd",
    "qid",
    "sr",

    // Other common tracking
    "mc_cid",
    "mc_eid",
    "_ga",
    "_ke",
    "trk",
    "trkid",
    "hsCtaTracking",
    "hsLang",
    "_hsenc",
    "_hsmi",
    "mkt_tok",
    "vero_id",
    "wickedid",
    "yclid",
    "srsltid",
];

// Function to clean a single URL
function cleanURL(url) {
    try {
        let urlObj = new URL(url);
        let params = urlObj.searchParams;

        // Track if we removed anything
        let removed = false;

        // Remove tracking parameters
        trackingParams.forEach((param) => {
            if (params.has(param)) {
                params.delete(param);
                removed = true;
            }
        });

        // Also remove any parameter that starts with tracking prefixes
        let allParams = Array.from(params.keys());
        allParams.forEach((key) => {
            if (
                key.startsWith("utm_") ||
                key.startsWith("fb_") ||
                key.startsWith("_ga") ||
                key.startsWith("mc_")
            ) {
                params.delete(key);
                removed = true;
            }
        });

        // Rebuild URL
        let cleanedURL = urlObj.origin + urlObj.pathname;

        // Add back search params if any remain
        let searchString = params.toString();
        if (searchString) {
            cleanedURL += "?" + searchString;
        }

        // Add back hash if it exists
        if (urlObj.hash) {
            cleanedURL += urlObj.hash;
        }

        return cleanedURL;
    } catch (e) {
        // If URL parsing fails, return original
        return url;
    }
}

// Find all URLs in the content using regex
let urlRegex = /https?:\/\/[^\s\)]+/g;
let urls = content.match(urlRegex);

if (!urls || urls.length === 0) {
    app.displayWarningMessage("No URLs found in draft");
    context.cancel();
}

let replacements = 0;

// Clean each URL
urls.forEach((url) => {
    let cleaned = cleanURL(url);
    if (cleaned !== url) {
        content = content.replace(url, cleaned);
        replacements++;
    }
});

// Update the draft
draft.content = content;
draft.update();

// Show results
if (replacements > 0) {
    app.displaySuccessMessage(
        "Cleaned " + replacements + " URL" + (replacements === 1 ? "" : "s"),
    );
} else {
    app.displayInfoMessage("No tracking parameters found");
}
