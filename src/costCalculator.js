const { getPricingForModel } = require("./providers/pricingCatalog");

function calculateCost(input) {
  const pricing = input.customPricing || getPricingForModel(input.model);
  const promptTokens = Math.max(0, input.promptTokens || 0);
  const completionTokens = Math.max(0, input.completionTokens || 0);
  const cachedTokens = Math.max(0, input.cachedTokens || 0);

  // Uncached prompt tokens
  const nonCachedPromptTokens = Math.max(0, promptTokens - cachedTokens);

  const cachedRate = pricing.cachedInputPerMillion ?? pricing.inputPerMillion;
  const promptCost =
    (nonCachedPromptTokens / 1000000) * pricing.inputPerMillion;
  const cachedCost = (cachedTokens / 1000000) * cachedRate;
  const completionCost =
    (completionTokens / 1000000) * pricing.outputPerMillion;

  const total = promptCost + cachedCost + completionCost;
  return Number(total.toFixed(6));
}

module.exports = {
  calculateCost,
  getPricingForModel,
};
