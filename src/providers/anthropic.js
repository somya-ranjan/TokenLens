const { calculateCost } = require("../costCalculator");

function parseAnthropicResponse(response, meta) {
  const model = response.model || "claude-3-5-sonnet";
  const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
  const cachedTokens = usage.cache_read_input_tokens || 0;

  const cost = calculateCost({
    model,
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    cachedTokens,
  });

  return {
    id: response.id || "ant_" + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    provider: "anthropic",
    model,
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    cachedTokens,
    estimatedCost: cost,
    latencyMs: meta?.latencyMs,
    status: "success",
    promptSnippet: meta?.promptSnippet,
    finishReason: response.stop_reason || "end_turn",
  };
}

module.exports = {
  parseAnthropicResponse,
};
