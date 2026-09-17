const { calculateCost } = require("../costCalculator");

function parseGeminiResponse(response, modelName = "gemini-2.0-flash", meta) {
  const usage = response.usageMetadata || {};
  const promptTokens = usage.promptTokenCount || 0;
  const completionTokens = usage.candidatesTokenCount || 0;
  const cachedTokens = usage.cachedContentTokenCount || 0;
  const totalTokens = usage.totalTokenCount || promptTokens + completionTokens;

  const cost = calculateCost({
    model: modelName,
    promptTokens,
    completionTokens,
    cachedTokens,
  });

  return {
    id: "gem_" + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    provider: "gemini",
    model: modelName,
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    estimatedCost: cost,
    latencyMs: meta?.latencyMs,
    status: "success",
    promptSnippet: meta?.promptSnippet,
    finishReason: response.candidates?.[0]?.finishReason || "STOP",
  };
}

module.exports = {
  parseGeminiResponse,
};
