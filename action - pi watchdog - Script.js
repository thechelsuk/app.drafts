/*
 * @title: Pi Watchdog
 * @author: thechelsuk
 * @version: 1.0.1
 * @notes: Shows who is running Cheltenham Open Data's 5-minute checks (the
 * Raspberry Pi or Cloudflare), switches the watchdog's mode, and can add the
 * status to the current draft.
 *
 * Modes: Auto follows the Pi's check-ins, Pi Only never lets Cloudflare take
 * over, and Cloud makes Cloudflare take over now.
 *
 * Nothing private is in this script. Drafts asks once per device for:
 * - the watchdog's address (Pi Watchdog Address), the first time it runs
 * - the admin token (Pi Watchdog Admin, WATCHDOG_ADMIN_TOKEN in 1Password),
 *   the first time you switch the mode
 * Either is forgotten if it doesn't work, so you're asked again next time.
 */

const MODES = {
    auto: {
        name: "Auto",
        button: "Switch to Auto (follow the Pi's check-ins)",
    },
    pi: {
        name: "Pi Only",
        button: "Switch to Pi Only (Cloudflare never takes over)",
    },
    cloud: {
        name: "Cloud",
        button: "Switch to Cloud (Cloudflare takes over now)",
    },
};

function ukParts(iso) {
    const parts = {};
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .formatToParts(new Date(iso))
        .forEach((p) => (parts[p.type] = p.value));
    return parts;
}

// "2026-11-01 00:30" in UK time, for the popup.
function ukTime(iso) {
    const p = ukParts(iso);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// "1 November 2026 at 00:30" in UK time, for the draft.
function ukLongTime(iso) {
    const p = ukParts(iso);
    const month = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        month: "long",
    }).format(new Date(iso));
    return `${Number(p.day)} ${month} ${p.year} at ${p.hour}:${p.minute}`;
}

function modeName(mode) {
    return MODES[mode] ? MODES[mode].name : mode;
}

function takeoverRule(s) {
    return (
        {
            auto: `Cloudflare takes over after ${s.stale_after_minutes} minutes without a check-in`,
            pi: "Cloudflare never takes over",
            cloud: "Cloudflare runs the checks, whatever the Pi does",
        }[s.mode] || ""
    );
}

function startedWorkflows(s) {
    return Object.entries(s.scheduled_started_by_cloudflare || {}).filter(
        ([, v]) => v,
    );
}

function title(s) {
    return s.cloud_active
        ? "Pi Watchdog: Cloudflare Is in Charge"
        : "Pi Watchdog: the Pi Is in Charge";
}

// The popup's message.
function message(s) {
    const checkIn = s.last_heartbeat
        ? `Checked in ${s.minutes_since_heartbeat} min ago (${ukTime(s.last_heartbeat)})`
        : "The Pi hasn't checked in yet";
    const fallback = s.last_fallback
        ? `Last fallback run: ${ukTime(s.last_fallback.at)}${s.last_fallback.ok === false ? " (failed)" : ""}`
        : "Last fallback run: never";
    const lines = [
        `${checkIn} · Mode: ${modeName(s.mode)}`,
        "",
        `${takeoverRule(s)}.`,
        fallback,
    ];
    const started = startedWorkflows(s);
    if (started.length > 0) {
        lines.push("", "Workflows Cloudflare started:");
        started.forEach(([workflow, v]) => {
            lines.push(
                `${workflow}: ${ukTime(v.at)}${v.ok === false ? " (failed)" : ""}`,
            );
        });
    }
    return lines.join("\n");
}

// The status as Markdown, for the draft.
function statusText(s, now) {
    const minutes =
        s.minutes_since_heartbeat === 1
            ? "1 minute"
            : `${s.minutes_since_heartbeat} minutes`;
    const checkIn = s.last_heartbeat
        ? `${ukLongTime(s.last_heartbeat)} (${minutes} ago)`
        : "not yet";
    const fallback = s.last_fallback
        ? `${ukLongTime(s.last_fallback.at)} (${s.last_fallback.ok === false ? "failed" : "worked"})`
        : "never";
    const lines = [
        "# Pi Watchdog Status",
        "",
        `Checked ${ukLongTime(now)} (UK time)`,
        "",
        `- In charge: ${s.cloud_active ? "Cloudflare" : "the Pi"}`,
        `- Mode: ${modeName(s.mode)} (${takeoverRule(s)})`,
        `- Last Pi check-in: ${checkIn}`,
        `- Last fallback run: ${fallback}`,
    ];
    const started = startedWorkflows(s);
    if (started.length === 0) {
        lines.push("- Workflows Cloudflare started: none");
    } else {
        lines.push("- Workflows Cloudflare started:");
        started.forEach(([workflow, v]) => {
            lines.push(
                `  - ${workflow}: ${ukLongTime(v.at)} (${v.ok === false ? "failed" : "worked"})`,
            );
        });
    }
    return lines.join("\n");
}

// An empty draft becomes the status; otherwise it goes at the end.
function withStatus(content, text) {
    const current = (content || "").replace(/\s+$/, "");
    return current === "" ? text : `${current}\n\n${text}`;
}

// Buttons for the modes you're not in, then Add Status to Draft.
function buttons(s) {
    const list = Object.keys(MODES)
        .filter((mode) => mode !== s.mode)
        .sort((a, b) => (a === "cloud" ? -1 : b === "cloud" ? 1 : 0))
        .map((mode) => ({ label: MODES[mode].button, value: mode }));
    list.push({ label: "Add Status to Draft", value: "draft" });
    return list;
}

function watchdogAddress() {
    const credential = Credential.create(
        "Pi Watchdog Address",
        "The watchdog's address, starting https://.",
    );
    credential.addTextField("url", "Watchdog address");
    if (!credential.authorize()) {
        return null;
    }
    return {
        credential,
        url: (credential.getValue("url") || "").trim().replace(/\/+$/, ""),
    };
}

function getStatus(address) {
    let status = null;
    if (/^https:\/\//.test(address.url)) {
        const response = HTTP.create().request({
            url: `${address.url}/status`,
            method: "GET",
        });
        if (response.success) {
            try {
                status = JSON.parse(response.responseText);
            } catch (e) {
                status = null;
            }
        }
    }
    if (!status || typeof status.mode !== "string") {
        address.credential.forget();
        throw new Error(
            "Couldn't reach the watchdog at that address. Run the action again to enter it.",
        );
    }
    return status;
}

function confirmCloud() {
    const p = Prompt.create();
    p.title = "Switch to Cloud?";
    p.message =
        "Cloudflare will run the 5-minute checks, email you and turn the light orange.";
    p.addButton("Switch to Cloud", "yes");
    return p.show() && p.buttonPressed === "yes";
}

function setMode(address, mode) {
    const credential = Credential.create(
        "Pi Watchdog Admin",
        "The watchdog's admin token (WATCHDOG_ADMIN_TOKEN, in 1Password).",
    );
    credential.addPasswordField("token", "Admin token");
    if (!credential.authorize()) {
        return false;
    }
    const response = HTTP.create().request({
        url: `${address.url}/mode?mode=${mode}`,
        method: "POST",
        headers: { Authorization: `Bearer ${credential.getValue("token")}` },
    });
    if (response.statusCode === 401) {
        credential.forget();
        throw new Error(
            "The admin token was rejected. Run the action again to enter it.",
        );
    }
    if (!response.success) {
        throw new Error(
            `Couldn't change the mode (HTTP ${response.statusCode}).`,
        );
    }
    return true;
}

function main() {
    const address = watchdogAddress();
    if (!address) {
        context.cancel();
        return;
    }
    const status = getStatus(address);
    const p = Prompt.create();
    p.title = title(status);
    p.message = message(status);
    buttons(status).forEach((b) => p.addButton(b.label, b.value));
    if (!p.show()) {
        context.cancel();
        return;
    }
    const choice = p.buttonPressed;
    if (choice === "draft") {
        draft.content = withStatus(
            draft.content,
            statusText(status, new Date().toISOString()),
        );
        draft.update();
        app.displaySuccessMessage("Status added");
        return;
    }
    if (choice === "cloud" && !confirmCloud()) {
        context.cancel();
        return;
    }
    if (!setMode(address, choice)) {
        context.cancel();
        return;
    }
    app.displaySuccessMessage(`Mode set to ${modeName(choice)}`);
}

if (typeof module !== "undefined") {
    module.exports = {
        ukTime,
        ukLongTime,
        title,
        message,
        statusText,
        withStatus,
        buttons,
        main,
    };
} else {
    try {
        main();
    } catch (e) {
        app.displayErrorMessage(e.message);
        context.fail(e.message);
    }
}
