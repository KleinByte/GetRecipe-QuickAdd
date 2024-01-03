const cheerio = require("cheerio");
const moment = require("moment");

const DEFAULT_NOTICE_DURATION = 5000;

/**
 * Displays a notice with a given message for a specified duration.
 * @param {string} message - The message to display.
 */
function displayNotice(message) {
    new Notice(message, DEFAULT_NOTICE_DURATION);
}

/**
 * The main module for the Recipe Fetcher plugin.
 */
module.exports = {
    entry: fetchRecipeAndSetVariables,
    settings: {
        name: "Recipe Fetcher",
        author: "Kleinbyte",
        options: {},
    },
};

// Global QuickAdd variable
let QuickAdd;

/**
 * Represents a Recipe with various properties and methods.
 */
class Recipe {
    constructor(data) {
        this.context = data["@context"] || "http://schema.org";
        this.type = data["@type"] || "Recipe";
        this.name = this.safeString(data.name);
        this.description = this.safeString(data.description);
        this.image = this.normalizeImages(data);
        this.author = this.formatArrayOrString(data.author, "name", "Unknown author");
        this.datePublished = this.formatDate(data.datePublished);
        this.dateModified = this.formatDate(data.dateModified);
        this.prepTime = this.formatDuration(data.prepTime);
        this.cookTime = this.formatDuration(data.cookTime);
        this.totalTime = this.formatDuration(data.totalTime);
        this.recipeYield = this.formatArrayOrString(data.recipeYield);
        this.recipeCategory = this.formatArrayOrString(data.recipeCategory);
        this.recipeCuisine = this.formatArrayOrString(data.recipeCuisine);
        this.nutrition = this.formatNutritionForMarkdown(data.nutrition || {});
        this.ingredients = this.formatListForMarkdown(data.recipeIngredient || []);
        this.instructions = this.formatInstructionsForMarkdown(data.recipeInstructions || []);
    }

    safeString(value) {
        return typeof value === 'string' ? value : 'Not available';
    }

    formatArrayOrString(data, property = null, defaultValue = 'Unknown') {
        if (Array.isArray(data)) {
            return data.map(item => property && item[property] ? item[property] : item).join(", ");
        } else if (typeof data === 'string') {
            return data;
        }
        return defaultValue;
    }

    formatDate(date) {
        return date ? moment(date).format("MMMM Do, YYYY") : "Unknown date";
    }

    formatDuration(duration) {
        if (!duration) return "Unknown duration";
        const parsedDuration = moment.duration(duration);
        const hours = parsedDuration.hours();
        const minutes = parsedDuration.minutes();
        return `${hours > 0 ? `${hours}h ` : ""}${minutes}min`;
    }

    formatListForMarkdown(list) {
        return list.map(item => `- ${item}`).join('\n');
    }

    formatInstructionsForMarkdown(instructions) {
        return instructions.map((inst, index) => `${index + 1}. ${inst.text}`).join('\n');
    }

    formatNutritionForMarkdown(nutrition) {
        return Object.entries(nutrition)
            .filter(([key]) => key !== '@type')
            .map(([key, value]) => `- ${this.capitalizeFirstLetter(key)}: ${value}`)
            .join('\n');
    }

    normalizeImages(data) {
        if (typeof data.image === "string") {
            return data.image;
        }
        if (Array.isArray(data.image)) {
            const image = data.image[0];
            if (typeof image === "string") {
                return image;
            }
            if (image?.url) {
                return image.url;
            }
        }
        if (data.image?.url) {
            return data.image.url;
        }
        return "No image available"; // Default case when no image is found
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

/**
 * The starting function for the QuickAdd entry.
 * @param {Object} params - Parameters for QuickAdd.
 */
async function fetchRecipeAndSetVariables(params) {
    QuickAdd = params;
    const url = await QuickAdd.quickAddApi.inputPrompt("Enter the Recipe URL: ");
    
    if (!url) {
        displayNotice("No URL entered.");
        return;
    }

    try {
        const recipe = await fetchAndParseRecipe(url);
        if (!recipe) {
            displayNotice("Unable to fetch or parse the recipe.");
            return;
        }

        // Setting QuickAdd variables
        QuickAdd.variables = mapRecipeToVariables(recipe);
        displayNotice("Recipe variables set for QuickAdd!");
    } catch (error) {
        displayNotice("An error occurred: " + error.message);
    }
}

/**
 * Maps recipe object to QuickAdd variables.
 * @param {Recipe} recipe - The recipe object.
 * @return {Object} The mapped variables.
 */
function mapRecipeToVariables(recipe) {
    return {
        recipeName: recipe.name,
        recipeDescription: recipe.description,
        recipeImage: recipe.image,
        recipeAuthor: recipe.author,
        datePublished: recipe.datePublished,
        dateModified: recipe.dateModified,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        recipeYield: recipe.recipeYield,
        recipeCategory: recipe.recipeCategory,
        recipeCuisine: recipe.recipeCuisine,
        nutrition: recipe.nutrition,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
    };
}

/**
 * Fetches and parses a recipe from a given URL.
 * @param {string} url - The URL to fetch the recipe from.
 * @return {Recipe|null} The parsed recipe or null if parsing fails.
 */
async function fetchAndParseRecipe(url) {
    const html = await request(url);
    const $ = cheerio.load(html);
    const jsonLdData = $('script[type="application/ld+json"]')
        .map((i, el) => {
            try {
                return JSON.parse($(el).html());
            } catch (error) {
                console.log("Error parsing JSON-LD script: ", error);
                return null;
            }
        })
        .get();

    const recipeData = jsonLdData.find(
        (data) => data && data["@type"] && data["@type"].includes("Recipe")
    );
    return recipeData ? new Recipe(recipeData) : null;
}
