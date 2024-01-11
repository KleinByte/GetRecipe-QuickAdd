const DEFAULT_NOTICE_DURATION = 5000;
const he = require("he");

function decodeHtmlEntities(text) {
  return he.decode(text);
}

/**
 * Displays a notice with a given message for a specified duration.
 * @param {string} message - The message to display.
 */
function displayNotice(message) {
  new Notice(message, DEFAULT_NOTICE_DURATION);
}

/**
 * Logs an error with a prefixed message.
 * @param {Error} error - The error to log.
 */
function logError(error) {
  console.error(`[Recipe Fetcher Error] ${error}`);
}

/**
 * Converts a JSON-LD object to a recipe format.
 * @param {Object} jsonLd - The JSON-LD object to convert.
 * @returns {Object} - The converted recipe object.
 */
function convertJsonLdToRecipeFormat(jsonLd) {
  return {
    "@context": jsonLd["@context"],
    "@type": jsonLd["@type"],
    name: jsonLd.headline,
    description: jsonLd.description,
    image: jsonLd.image.url, // Assuming image is always an object with a url
    author: Array.isArray(jsonLd.author)
      ? jsonLd.author.map((author) => author.name) // If it's an array of objects
      : jsonLd.author
      ? jsonLd.author.name
      : "Unknown author", // If it's a single object or undefined
    datePublished: jsonLd.datePublished,
    dateModified: jsonLd.dateModified,
    prepTime: jsonLd.prepTime,
    cookTime: jsonLd.cookTime,
    totalTime: jsonLd.totalTime, // Assuming totalTime is already in the correct format
    recipeYield: jsonLd.recipeYield,
    recipeCategory: jsonLd.recipeCategory,
    recipeCuisine: jsonLd.recipeCuisine,
    recipeNutrition: jsonLd.nutrition, // Assuming nutrition is in the correct format
    recipeIngredients: jsonLd.recipeIngredient,
    recipeInstructions: jsonLd.recipeInstructions.map((inst) => inst.text), // Extracts text from instruction objects
  };
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
    recipeNutrition: recipe.recipeNutrition,
    recipeIngredients: recipe.recipeIngredients,
    recipeInstructions: recipe.recipeInstructions,
  };
}

/**
 * Other utility functions can be added here...
 */

module.exports = {
  logError,
  convertJsonLdToRecipeFormat,
  mapRecipeToVariables,
  displayNotice,
  decodeHtmlEntities,
};
