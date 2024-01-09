const cheerio = require("cheerio");
const moment = require("moment");

const DEFAULT_NOTICE_DURATION = 5000;
// Global QuickAdd variable
let QuickAdd;
/**
 * Displays a notice with a given message for a specified duration.
 * @param {string} message - The message to display.
 */
function displayNotice(message) {
  new Notice(message, DEFAULT_NOTICE_DURATION);
}

function logError(error) {
  console.error(`[Recipe Fetcher Error] ${error}`);
}

// Recipe Fetcher Module
const recipeFetcher = {
  settings: {
    name: "Recipe Fetcher",
    author: "Kleinbyte",
    options: {},
  },
  scrapers: {},
  addScraper: function (domainPattern, scraperFunction) {
    this.scrapers[domainPattern] = scraperFunction;
  },
  getScraper: function (url) {
    const domain = new URL(url).hostname;
    return (
      Object.entries(this.scrapers).find(([pattern]) =>
        domain.includes(pattern)
      )?.[1] || this.defaultScraper
    );
  },
  defaultScraper: async (url) => {
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
    const normalizedRecipeData = convertJsonLdToRecipeFormat(recipeData);
    return normalizedRecipeData ? new Recipe(normalizedRecipeData) : null;
  },
  fetchAndParseRecipe: async function (url) {
    const scraper = this.getScraper(url);
    return scraper ? await scraper(url) : null;
  },
};

/* Scrapers For Different Websites not handled by default scraper*/
// TODO : Refactor this to a separate file

recipeFetcher.addScraper("hungryhobby.net", async (url) => {
  const html = await request(url);
  const $ = cheerio.load(html);

  // Extracting the data
  const name = $(".wprm-recipe-name").text().trim();
  const description = $(".wprm-recipe-summary").text().trim();
  const image = $(".wprm-recipe-image img").attr("data-lazy-src");
  const prepTime = $(".wprm-recipe-prep_time-minutes").text().trim();
  const cookTime = $(".wprm-recipe-cook_time-hours").text().trim();
  const totalTime = `${prepTime} mins + ${cookTime} hrs`;
  const recipeYield = $(".wprm-recipe-servings").text().trim();
  const recipeCategory = $(".wprm-recipe-course").text().trim();
  const recipeCuisine = $(".wprm-recipe-cuisine").text().trim();
  const recipeIngredients = $(".wprm-recipe-ingredients li")
    .map((i, el) => $(el).text().trim())
    .get();
  const recipeInstructions = $(".wprm-recipe-instructions li")
    .map((i, el) => $(el).text().trim())
    .get();

  // Extracting nutrition information
  const recipeNutrition = {};
  $(".wprm-nutrition-label-container span").each((i, el) => {
    const label = $(el)
      .find(".wprm-nutrition-label-text-nutrition-label")
      .text()
      .trim()
      .replace(":", "");
    const value = $(el)
      .find(".wprm-nutrition-label-text-nutrition-value")
      .text()
      .trim();
    const unit = $(el)
      .find(".wprm-nutrition-label-text-nutrition-unit")
      .text()
      .trim();
    if (label) {
      recipeNutrition[label] = `${value} ${unit}`;
    }
  });

  // Creating a new Recipe object
  return new Recipe({
    name,
    description,
    image,
    prepTime,
    cookTime,
    totalTime,
    recipeYield,
    recipeCategory,
    recipeCuisine,
    recipeNutrition,
    recipeIngredients,
    recipeInstructions,
  });
});

/**
 * Represents a Recipe with various properties and methods.
 */
class Recipe {
  constructor(data) {
    this.context = data["@context"] || "http://schema.org";
    this.type = data["@type"] || "Recipe";
    this.name = this.ensureString(data.name);
    this.description = this.ensureString(data.description);
    this.image = this.normalizeImage(data.image);
    this.author = this.formatArrayOrString(
      data.author,
      "name",
      "Unknown author"
    );
    this.datePublished = this.parseDate(data.datePublished);
    this.dateModified = this.parseDate(data.dateModified);
    this.prepTime = this.parseDuration(data.prepTime);
    this.cookTime = this.parseDuration(data.cookTime);
    this.totalTime = this.calculateTotalTime(this.prepTime, this.cookTime);
    this.recipeYield = this.formatArrayOrString(data.recipeYield);
    this.recipeCategory = this.formatArrayOrString(data.recipeCategory);
    this.recipeCuisine = this.formatArrayOrString(data.recipeCuisine);
    this.recipeNutrition = this.formatForMarkdown(data.recipeNutrition || {});
    this.recipeIngredients = this.formatForMarkdown(data.recipeIngredients);
    this.recipeInstructions = this.formatForMarkdown(
      data.recipeInstructions,
      true
    ); // Instructions as numbered list
  }

  removeHtmlTags(text) {
    return typeof text === "string" ? text.replace(/<[^>]*>/g, "") : text;
  }

  ensureString(value) {
    return typeof value === "string"
      ? this.removeHtmlTags(value)
      : "Not available";
  }

  normalizeImage(image) {
    if (typeof image === "string") return image;
    if (Array.isArray(image))
      return (
        image.find((img) => typeof img === "string") || "No image available"
      );
    return image?.url || "No image available";
  }

  formatArrayOrString(data, property = null, defaultValue = "Unknown") {
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          const value = property && item[property] ? item[property] : item;
          return this.removeHtmlTags(value);
        })
        .join(", ");
    }
    return typeof data === "string" ? this.removeHtmlTags(data) : defaultValue;
  }

  parseDate(date) {
    if (!date) return "Unknown date";
    try {
      return moment(
        date,
        [moment.ISO_8601, "YYYY-MM-DD", "MMMM Do, YYYY"],
        true
      ).format("MMMM Do, YYYY");
    } catch {
      return "Invalid date format";
    }
  }

  parseDuration(duration) {
    if (!duration) return "Unknown duration";

    // First, check if the duration is in a natural language format
    const durationRegex = /(\d+)\s*(hours?|hrs?|minutes?|mins?)/i;
    const matches = duration.match(durationRegex);
    if (matches) {
      return duration; // Return the original natural language string
    }

    // If not a natural language duration, try parsing with Moment.js
    try {
      const parsedDuration = moment.duration(duration);
      if (parsedDuration.isValid()) {
        const hours = parsedDuration.hours();
        const minutes = parsedDuration.minutes();
        let result = "";
        if (hours > 0) result += `${hours} hour${hours > 1 ? "s" : ""} `;
        if (minutes > 0) result += `${minutes} minute${minutes > 1 ? "s" : ""}`;
        return result.trim();
      }
    } catch {
      // If parsing fails, return an error message
      return "Invalid duration format";
    }

    return "Unknown format"; // In case none of the above conditions are met
  }

  calculateTotalTime(prepTime, cookTime) {
    // Convert natural language strings to minutes
    const convertToMinutes = (timeString) => {
      const matches = timeString.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
      if (matches) {
        const value = parseInt(matches[1]);
        const unit = matches[2];
        return unit.toLowerCase().startsWith("hour") ||
          unit.toLowerCase().startsWith("hr")
          ? value * 60
          : value;
      }
      return 0;
    };

    const prepMinutes = convertToMinutes(prepTime);
    const cookMinutes = convertToMinutes(cookTime);
    const totalMinutes = prepMinutes + cookMinutes;

    // Format the total time back into a readable format
    if (totalMinutes === 0) return "Unknown duration";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours > 0 ? `${hours}h ` : ""}${
      minutes > 0 ? `${minutes}min` : ""
    }`.trim();
  }

  formatForMarkdown(data, isInstructions = false) {
    // Check for array or array-like object (has 'length' property and indexed elements)
    if (Array.isArray(data)) {
      return this.formatArrayForMarkdown(Array.from(data), isInstructions);
    } else if (typeof data === "object" && data !== null) {
      return this.formatDictForMarkdown(data, isInstructions);
    } else if (typeof data === "string") {
      return this.formatStringForMarkdown(data, isInstructions);
    }
    return "Not available";
  }

  formatArrayForMarkdown(array, numbered = false) {
    return array
      .map((item, index) => {
        if (typeof item === "object" && item !== null) {
          return Object.entries(item)
            .filter(([key]) => key !== "@type")
            .map(
              ([key, value]) =>
                `${numbered ? `${index + 1}. ` : "- "}${this.capitalize(
                  key
                )}: ${this.removeHtmlTags(value)}`
            )
            .join("\n");
        } else {
          return `${numbered ? `${index + 1}. ` : "- "}${this.removeHtmlTags(
            item
          )}`;
        }
      })
      .join("\n");
  }

  formatDictForMarkdown(dict, isInstructions = false) {
    return Object.entries(dict)
      .filter(([key]) => key !== "@type")
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          if (isInstructions && Array.isArray(value)) {
            return `${this.capitalize(key)}:\n${this.formatArrayForMarkdown(
              value,
              true
            )}`;
          }
          return `- ${this.capitalize(key)}:\n${this.formatDictForMarkdown(
            value,
            isInstructions
          )}`;
        }
        return `- ${this.capitalize(key)}: ${this.removeHtmlTags(value)}`;
      })
      .join("\n");
  }

  formatStringForMarkdown(string, numbered = false) {
    const items = string.split("\n");
    return items
      .map(
        (item, index) =>
          `${numbered ? `${index + 1}. ` : "- "}${this.removeHtmlTags(
            item.trim()
          )}`
      )
      .join("\n");
  }

  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
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
    const recipe = await recipeFetcher.fetchAndParseRecipe(url);
    if (!recipe) {
      displayNotice("Unable to fetch or parse the recipe.");
      return;
    }

    // Setting QuickAdd variables
    QuickAdd.variables = mapRecipeToVariables(recipe);
    displayNotice("Recipe variables set for QuickAdd!");
  } catch (error) {
    displayNotice("An error occurred: " + error.message);
    logError(error);
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
    recipeNutrition: recipe.recipeNutrition,
    recipeIngredients: recipe.recipeIngredients,
    recipeInstructions: recipe.recipeInstructions,
  };
}

/**
 * The main module for the Recipe Fetcher plugin.
 */ module.exports = {
  entry: fetchRecipeAndSetVariables,
  settings: recipeFetcher.settings,
  addScraper: recipeFetcher.addScraper,
};
