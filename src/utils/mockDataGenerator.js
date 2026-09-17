const { calculateCost } = require("../costCalculator");

const SAMPLE_MODELS = [
  { model: "gpt-4o", provider: "openai", weight: 4 },
  { model: "claude-3-5-sonnet", provider: "anthropic", weight: 3 },
  { model: "gemini-2.0-flash", provider: "gemini", weight: 2 },
  { model: "gpt-4o-mini", provider: "openai", weight: 2 },
  { model: "claude-3-5-haiku", provider: "anthropic", weight: 1 },
  { model: "deepseek-chat", provider: "deepseek", weight: 1 },
];

const SAMPLE_PROMPTS = [
  "Refactor authentication middleware to use JWT refresh tokens",
  "Generate TypeScript definitions for user preference schema",
  "Optimize SQL query with composite indexes for billing table",
  "Write unit tests for checkout cart calculation hook",
  "Explain race condition in async distributed lock pattern",
  "Fix CSS flexbox overflowing on mobile viewport",
  "Summarize GitHub PR changes for weekly release notes",
  "Generate OpenAPI 3.0 specification for invoice endpoints",
  "Implement exponential backoff retry mechanism with jitter",
  "Convert React class component into modern functional hooks",
  "Debug Docker container memory leak in Node.js service",
  "Write regex to validate international phone numbers E.164",
];

function generateSingleMockRequest(timestamp = Date.now()) {
  const rand = Math.random() * 13;
  let cumulative = 0;
  let selected = SAMPLE_MODELS[0];
  for (const item of SAMPLE_MODELS) {
    cumulative += item.weight;
    if (rand <= cumulative) {
      selected = item;
      break;
    }
  }

  const promptSnippet =
    SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
  const isMini =
    selected.model.includes("mini") ||
    selected.model.includes("flash") ||
    selected.model.includes("haiku");

  const promptTokens = Math.floor(Math.random() * (isMini ? 4000 : 8000)) + 600;
  const completionTokens =
    Math.floor(Math.random() * (isMini ? 1200 : 2500)) + 250;
  const cachedTokens =
    Math.random() > 0.4
      ? Math.floor(promptTokens * (0.3 + Math.random() * 0.4))
      : 0;
  const totalTokens = promptTokens + completionTokens;

  const estimatedCost = calculateCost({
    model: selected.model,
    promptTokens,
    completionTokens,
    cachedTokens,
  });

  const latencyMs = Math.floor(Math.random() * 2200) + 380;

  return {
    id: "req_" + Math.random().toString(36).substring(2, 11),
    timestamp,
    provider: selected.provider,
    model: selected.model,
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    estimatedCost,
    latencyMs,
    status: "success",
    promptSnippet,
    finishReason: "stop",
  };
}

function generateSeedData() {
  const records = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Generate ~24 requests for Today
  const todayCount = 24;
  for (let i = 0; i < todayCount; i++) {
    const timeOffset = Math.random() * 14 * 60 * 60 * 1000;
    records.push(generateSingleMockRequest(now - timeOffset));
  }

  // 2. Generate history for past 6 previous days
  for (let d = 1; d <= 6; d++) {
    const dayTimestamp = now - d * dayMs;
    const countForDay = Math.floor(Math.random() * 15) + 10;
    for (let i = 0; i < countForDay; i++) {
      const timeOffset = Math.random() * 18 * 60 * 60 * 1000;
      records.push(generateSingleMockRequest(dayTimestamp - timeOffset));
    }
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
  generateSingleMockRequest,
  generateSeedData,
};
