/*
 * @title: New Draft from Template
 * @author: thechelsuk
 * @notes: Creates a new draft based on selected templates
 */

(() => {
    // anonymous function prevents variable conflicts with other actions

    function add_tag_except_template(tag) {
        if (tag !== "template") this.addTag(tag);
    }

    function sort_drafts_by_title(a, b) {
        return ("" + a.displayTitle).localeCompare(b.displayTitle);
    }

    // create temp workspace to query drafts
    let workspace = Workspace.create();
    workspace.tagFilter = "template";
    // get list of drafts in workspace
    let drafts = new Map(
        workspace
            .query("all")
            .sort(sort_drafts_by_title)
            .map((d) => [d.displayTitle, d]),
    );

    // check if we found any valid templates
    if (drafts.size == 0) {
        alert(
            "No templates found. To make templates available to this action, create a draft with the template content and assign it the tag 'template'.",
        );
        return false;
    }

    // if the current draft has a title of "New Draft Templates," its body will
    // be treated as a list of templates to use (this is for passing by URL);
    // else prompt to select
    let templates;
    if (draft.title === "New Draft Templates") {
        templates = draft.lines.slice(1);
    } else {
        let p = Prompt.create();
        p.title = "New Draft with Template";
        p.message =
            "Select templates. A new draft will be created based on the templates selected.";

        p.addSelect(
            "templates",
            "Templates",
            Array.from(drafts.keys()),
            [],
            true,
        );
        p.addButton("OK");

        if (!p.show()) {
            context.cancel();
            return false;
        }

        templates = p.fieldValues.templates;
    }

    let d = Draft.create();

    // get the selected template draft
    const multi = templates.length > 1;
    let template = "";
    if (multi) {
        template = "\n";
    }
    let first_template = true;
    for (let selected of templates) {
        let td = drafts.get(selected);
        if (!td) {
            context.fail(selected + ": template draft not found");
            return false;
        }
        const body = td.content.substring(td.content.indexOf("\n"));
        if (multi) {
            template += "\n#";
        }
        template += td.content;

        if (first_template) {
            d.languageGrammar = td.languageGrammar;
            td.tags.forEach(add_tag_except_template, d);
            first_template = false;
        }
    }

    let macros = [...template.matchAll(/«(.*?)[|»]/g)].map((x) => x[1]);
    if (macros != null && macros.length > 0) {
        const date_options = {
            weekday: "long",
            month: "long",
            day: "numeric",
        };
        const distinct = (value, index, self) => {
            return self.indexOf(value) === index;
        };
        macros = macros.filter(distinct);

        let pp = Prompt.create();
        pp.title = "Placeholder Values";
        pp.message =
            "Supply values for the placeholders appearing in the templates you chose";
        for (var i = 0; i < macros.length; i++) {
            let prompt_input;
            const type = macros[i].split(" ")[0];
            const key = "var" + String(i);
            switch (type) {
                case "Date":
                    pp.addDatePicker(key, macros[i], new Date(), {
                        mode: "date",
                    });
                    break;
                case "Hidden":
                    continue;
                default:
                    pp.addTextField(key, macros[i], "", {});
                    break;
            }
        }
        pp.addButton("OK");

        if (!pp.show()) {
            context.cancel();
            return false;
        }

        let dict = {};
        for (var i = 0; i < macros.length; i++) {
            const key = macros[i];
            const type = key.split(" ")[0];
            let value = pp.fieldValues["var" + String(i)];
            if (type === "Date")
                value = value.toLocaleDateString(undefined, date_options);
            template = template
                .replaceAll("«" + key + "»", value)
                .replaceAll("«" + key + "|u»", encodeURIComponent(value));
        }
    }

    d.content = d.processTemplate(template);
    d.update();

    // load new draft
    editor.load(d);
    editor.activate();
    return true;
})();
