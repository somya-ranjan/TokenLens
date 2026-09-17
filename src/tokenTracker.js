const { UsageStore } = require("./usageStore");
const { parseOpenAIResponse } = require("./providers/openai");
const { parseAnthropicResponse } = require("./providers/anthropic");
const { parseGeminiResponse } = require("./providers/gemini");
const { parseCopilotEvent } = require("./providers/copilotInterceptor");

class TokenTracker {
  static instance = null;

  constructor() {
    this.store = UsageStore.getInstance();
  }

  static getInstance() {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  async trackDirect(record) {
    return await this.store.recordUsage(record);
  }

  async trackOpenAI(response, meta) {
    const record = parseOpenAIResponse(response, meta);
    return await this.store.recordUsage(record);
  }

  async trackAnthropic(response, meta) {
    const record = parseAnthropicResponse(response, meta);
    return await this.store.recordUsage(record);
  }

  async trackGemini(response, model, meta) {
    const record = parseGeminiResponse(response, model, meta);
    return await this.store.recordUsage(record);
  }

  async trackCopilot(entry) {
    const record = parseCopilotEvent(entry);
    return await this.store.recordUsage(record);
  }
}

module.exports = {
  TokenTracker,
};
