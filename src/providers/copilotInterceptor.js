const { calculateCost } = require("../costCalculator");

function parseCopilotEvent(entry) {
  const model = entry.model || "copilot-gpt-4o";
  // Approx 4 characters per token if only character length is available
  const promptTokens =
    entry.promptTokens ?? Math.round((entry.promptLength || 1000) / 4);
  const completionTokens =
    entry.completionTokens ?? Math.round((entry.completionLength || 400) / 4);
  const totalTokens = promptTokens + completionTokens;

  const cost = calculateCost({
    model,
    promptTokens,
    completionTokens,
  });

  return {
    id: "cop_" + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    provider: "copilot",
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost: cost,
    latencyMs: entry.latencyMs || 650,
    status: "success",
    promptSnippet: `[${(entry.source || "COPILOT").toUpperCase()}] Code completion / inline chat`,
    finishReason: "stop",
  };
}

module.exports = {
  parseCopilotEvent,
};
