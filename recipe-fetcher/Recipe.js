// Import necessary modules
const moment = require("moment");

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

module.exports = Recipe;
