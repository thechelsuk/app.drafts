/*
 * @title: Move complete tasks to bottom
 * @author: thechelsuk
 * @notes: Completed items moved to bottom of draft
 */

(() => {
    // main :: () -> IO Bool
    const main = () => {
        // completedItemsToEnd :: Draft -> String
        const completedItemsToEnd = (d) =>
            concat(
                // Two lists rejoined,
                partition(
                    // after partition.
                    d.languageGrammar === "Taskpaper"
                        ? (x) => !x.includes("@done")
                        : (x) => !/^\s*-\s*\[[x\-\*\+]\]/.exec(x),
                    d.content.split("\n"),
                ),
            ).join("\n");

        draft.content = completedItemsToEnd(draft);
        draft.update();

        console.log(true);
        return true;
    };

    // General reusable helper functions ------------------

    // concat :: [[a]] -> [a]
    // concat :: [String] -> String
    const concat = (xs) =>
        xs.length > 0
            ? (() => {
                  const unit = typeof xs[0] === "string" ? "" : [];
                  return unit.concat.apply(unit, xs);
              })()
            : [];

    // partition :: Predicate -> List -> (Matches, nonMatches)
    // partition :: (a -> Bool) -> [a] -> ([a], [a])
    const partition = (p, xs) =>
        xs.reduce(
            (a, x) => (p(x) ? [a[0].concat(x), a[1]] : [a[0], a[1].concat(x)]),
            [[], []],
        );

    // MAIN -----------------------------------------------
    return main();
})();
