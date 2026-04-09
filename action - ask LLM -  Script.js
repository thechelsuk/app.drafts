/*
 * @title: Ask LLM
 * @author: thechelsuk
 * @notes: Prompts user for input, sends to on-device LLM, and displays response in an alert
 */

let f = () => {
    // EXIT EARLY IF NOT SUPPORTED
    if (!SystemLanguageModel.isAvailable) {
        alert("Model not available. Apple Intelligence and OS 26 required.");
        return false;
    }

    // PROMPT USER FOR, WELL, PROMPT
    let p = new Prompt();
    p.title = "Ask Model";
    p.message =
        "Type a prompt below, and get a response from the on-device model";
    p.addTextView("prompt", "Prompt");
    p.addButton("Submit");

    if (!p.show()) {
        return false;
    }

    // GET PROMPT AND SUBMIT TO MODEL
    let prompt = p.fieldValues["prompt"];
    let lm = new SystemLanguageModel();
    lm.enableAllTools();
    let response = lm.respond(prompt);

    // DISPLAY RESPONSE OR ERROR
    if (!response) {
        alert(lm.lastError);
        return false;
    } else {
        alert(`${response}`);
    }
    return true;
};

if (!f()) {
    context.fail();
}
