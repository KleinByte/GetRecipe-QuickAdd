const recipeFetcher = require('./recipeFetcher');
const utils = require('./utils');
const readline = require('readline');
const config = require('./config');

async function fetchRecipeAndSetVariables(QuickAdd) {
    let url;

    if (config.debug) {
        // Debug mode: Prompt for URL in Node.js environment
        url = await promptForURL();
        await processRecipe(url, null, true);
    } else {
        // QuickAdd mode: Use QuickAdd's API to prompt for a URL
        url = await QuickAdd.quickAddApi.inputPrompt("Enter the Recipe URL:");
        await processRecipe(url, QuickAdd, false);
    }
}

async function promptForURL() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question("Enter the Recipe URL: ", (inputUrl) => {
            rl.close();
            resolve(inputUrl);
        });
    });
}

async function processRecipe(url, QuickAdd, isDebug) {
    try {
        const recipe = await recipeFetcher.fetchAndParseRecipe(url);
        if (!recipe) {
            displayNotice("Unable to fetch or parse the recipe.", isDebug);
            return;
        }

        const recipeVariables = utils.mapRecipeToVariables(recipe);

        if (isDebug) {
            console.log("Fetched Recipe:", recipeVariables);
        } else {
            QuickAdd.variables = recipeVariables;
            displayNotice("Recipe variables set for QuickAdd!", isDebug);
        }
    } catch (error) {
        displayNotice("An error occurred: " + error.message, isDebug);
        utils.logError(error);
    }
}

function displayNotice(message, isDebug) {
    if (isDebug) {
        console.log(message);
    } else {
        utils.displayNotice(message);
    }
}

// This check ensures that fetchRecipeAndSetVariables is only called when the script is run directly
if (require.main === module && config.debug) {
    fetchRecipeAndSetVariables();
}

module.exports = {
    entry: fetchRecipeAndSetVariables,
    settings: config.settings,
};
