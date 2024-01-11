const cheerio = require("cheerio");
const utils = require('./utils');
const Recipe = require('./Recipe');
//const request = require("request-promise"); // uncomment when debugging
// Import all scrapers
const defaultScraper = require('./scrapers/defaultScraper');
const hungryHobbyScraper = require('./scrapers/hungryhobbyScraper');

class RecipeFetcher {
  constructor() {
    this.scrapers = {};
    this.registerScrapers();
  }

  registerScrapers() {
    // Register each scraper statically
    this.addScraper(hungryHobbyScraper.domainPattern, hungryHobbyScraper.scrapeFunction);
    // Register additional scrapers here
  }

  addScraper(domainPattern, scraperFunction) {
    this.scrapers[domainPattern] = scraperFunction;
  }

  getScraper(url) {
    const domain = new URL(url).hostname;
    return (
        Object.entries(this.scrapers).find(([pattern]) =>
            domain.includes(pattern)
        )?.[1] || defaultScraper
    );
}

  async fetchAndParseRecipe(url) {
    try {
      const html = await request(url);
      const $ = cheerio.load(html);
      const scraper = this.getScraper(url);
      const recipeData = await scraper($);
      return recipeData ? new Recipe(recipeData) : null;
    } catch (error) {
      utils.logError(error);
      return null;
    }
  }
}

const recipeFetcher = new RecipeFetcher();
module.exports = recipeFetcher;
