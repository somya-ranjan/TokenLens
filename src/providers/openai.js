const { calculateCost } = require("../costCalculator");

function parseOpenAIResponse(response, meta) {
  const model = response.model || "gpt-4o";
  const usage = response.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

  const cost = calculateCost({
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    cachedTokens,
  });

  return {
    id: response.id || "oai_" + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    provider: "openai",
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens:
      usage.total_tokens || usage.prompt_tokens + usage.completion_tokens,
    cachedTokens,
    estimatedCost: cost,
    latencyMs: meta?.latencyMs,
    status: "success",
    promptSnippet: meta?.promptSnippet,
    finishReason: response.choices?.[0]?.finish_reason || "stop",
  };
}

module.exports = {
  parseOpenAIResponse,
};
