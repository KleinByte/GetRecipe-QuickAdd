async function scrapeFunction($) {
    // Extracting the data
    let recipeData = {};
    recipeData.name = $(".wprm-recipe-name").text().trim();
    recipeData.description = $(".wprm-recipe-summary").text().trim();
    recipeData.image = $(".wprm-recipe-image img").attr("data-lazy-src");
    recipeData.prepTime = $(".wprm-recipe-prep_time-minutes").text().trim();
    recipeData.cookTime = $(".wprm-recipe-cook_time-hours").text().trim();
    recipeData.totalTime = `${prepTime} mins + ${cookTime} hrs`;
    recipeData.recipeYield = $(".wprm-recipe-servings").text().trim();
    recipeData.recipeCategory = $(".wprm-recipe-course").text().trim();
    recipeData.recipeCuisine = $(".wprm-recipe-cuisine").text().trim();
    recipeData.recipeIngredients = $(".wprm-recipe-ingredients li")
        .map((i, el) => $(el).text().trim())
        .get();
    recipeData.recipeInstructions = $(".wprm-recipe-instructions li")
        .map((i, el) => $(el).text().trim())
        .get();

    // Extracting nutrition information
    recipeData.recipeNutrition = {};
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

    return recipeData;
}

module.exports = {
    domainPattern: 'hungryhobby.net',
    scrapeFunction,
};
