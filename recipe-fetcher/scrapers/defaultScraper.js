const Recipe = require("../Recipe");
const utils = require("../utils");

async function defaultScraper($) {
  const jsonLdData = $('script[type="application/ld+json"]')
    .map((i, el) => {
      try {
        const rawJsonLd = $(el).html();
        const decodedJsonLd = utils.decodeHtmlEntities(rawJsonLd);
        return JSON.parse(decodedJsonLd);
      } catch (error) {
        console.log("Error parsing JSON-LD script: ", error);
        return null;
      }
    })
    .get();

  const recipeData = jsonLdData.find(
    (data) => data && data["@type"] && data["@type"].includes("Recipe")
  );

  if (recipeData) {
    const normalizedRecipeData = utils.convertJsonLdToRecipeFormat(recipeData);
    return normalizedRecipeData;
  }
  return null;
}

module.exports = defaultScraper;
