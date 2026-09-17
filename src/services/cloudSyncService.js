const { calculateCost } = require("../costCalculator");
const { Logger } = require("../utils/logger");

const REQUEST_TIMEOUT_MS = 15000;

class CloudSyncService {
  /**
   * Sync usage from OpenAI Organization Usage API
   * @param {string} apiKey
   * @param {number} days
   * @returns {Promise<Array<Object>>}
   */
  static async syncOpenAI(apiKey, days = 30) {
    if (!apiKey || !apiKey.trim()) {
      return [];
    }

    const logger = Logger.getInstance();
    logger.info(`Starting OpenAI cloud usage sync for past ${days} days...`);

    const startTime = Math.floor(
      (Date.now() - days * 24 * 60 * 60 * 1000) / 1000,
    );
    const url = `https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1d`;

    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (networkErr) {
      const isTimeout = networkErr.name === "TimeoutError";
      const msg = isTimeout
        ? "OpenAI request timed out after 15s"
        : `OpenAI connection failed: ${networkErr.message}`;
      logger.error(msg, networkErr);
      throw new Error(msg);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "OpenAI authentication failed: Invalid API Key. Please verify your key.",
        );
      }
      if (response.status === 403) {
        throw new Error(
          "OpenAI permission denied: Your API key must have the 'api.usage.read' scope or be an Organization Admin key.",
        );
      }
      if (response.status === 429) {
        throw new Error(
          "OpenAI rate limit exceeded: Please wait a moment before syncing again.",
        );
      }
      const errText = await response.text();
      logger.error(`OpenAI API returned status ${response.status}: ${errText}`);
      throw new Error(`OpenAI API error (${response.status})`);
    }

    const payload = await response.json();
    const dataList = payload.data || [];
    const records = [];

    for (const item of dataList) {
      const model = item.model || "gpt-4o";
      const promptTokens = item.input_tokens || 0;
      const completionTokens = item.output_tokens || 0;
      const cachedTokens = item.input_cached_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      const timestamp =
        (item.aggregation_timestamp || Math.floor(Date.now() / 1000)) * 1000;

      const estimatedCost = calculateCost({
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
      });

      records.push({
        id: `sync_oai_${item.aggregation_timestamp || timestamp}_${model}`,
        timestamp,
        provider: "openai",
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cachedTokens,
        estimatedCost,
        latencyMs: 650,
        status: "success",
        promptSnippet: `[OpenAI Cloud Sync] Aggregated daily usage for ${model}`,
        finishReason: "stop",
        synced: true,
      });
    }

    logger.info(`OpenAI sync completed: fetched ${records.length} records.`);
    return records;
  }

  /**
   * Sync usage from Anthropic Admin API
   * @param {string} apiKey
   * @param {number} days
   * @returns {Promise<Array<Object>>}
   */
  static async syncAnthropic(apiKey, days = 30) {
    if (!apiKey || !apiKey.trim()) {
      return [];
    }

    const logger = Logger.getInstance();
    logger.info(`Starting Anthropic cloud usage sync for past ${days} days...`);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const url = `https://api.anthropic.com/v1/organizations/usage?start_date=${startDate}`;

    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (networkErr) {
      const isTimeout = networkErr.name === "TimeoutError";
      const msg = isTimeout
        ? "Anthropic request timed out after 15s"
        : `Anthropic connection failed: ${networkErr.message}`;
      logger.error(msg, networkErr);
      throw new Error(msg);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Anthropic authentication failed: Invalid API Key. Please verify your Admin Key.",
        );
      }
      if (response.status === 403) {
        throw new Error(
          "Anthropic permission denied: Requires an Anthropic Admin API key (starts with sk-ant-admin...).",
        );
      }
      if (response.status === 429) {
        throw new Error(
          "Anthropic rate limit exceeded: Please wait a moment before syncing again.",
        );
      }
      const errText = await response.text();
      logger.error(
        `Anthropic API returned status ${response.status}: ${errText}`,
      );
      throw new Error(`Anthropic API error (${response.status})`);
    }

    const payload = await response.json();
    const dataList = payload.data || [];
    const records = [];

    for (const item of dataList) {
      const model = item.model || "claude-3-5-sonnet";
      const promptTokens =
        item.input_tokens || item.uncached_prompt_tokens || 0;
      const completionTokens = item.output_tokens || 0;
      const cachedTokens = item.cache_read_input_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      const timestamp = item.timestamp
        ? new Date(item.timestamp).getTime()
        : Date.now();

      const estimatedCost = calculateCost({
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
      });

      records.push({
        id: `sync_ant_${timestamp}_${model}`,
        timestamp,
        provider: "anthropic",
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cachedTokens,
        estimatedCost,
        latencyMs: 720,
        status: "success",
        promptSnippet: `[Anthropic Cloud Sync] Usage from Claude Console`,
        finishReason: "end_turn",
        synced: true,
      });
    }

    logger.info(`Anthropic sync completed: fetched ${records.length} records.`);
    return records;
  }

  /**
   * Run sync for all configured keys
   * @param {{ openaiKey?: string, anthropicKey?: string, days?: number }} options
   */
  static async syncAll(options = {}) {
    const { openaiKey, anthropicKey, days = 30 } = options;
    const errors = [];
    const syncedRecords = [];

    const tasks = [];

    if (openaiKey && openaiKey.trim()) {
      tasks.push(
        this.syncOpenAI(openaiKey, days)
          .then((recs) => {
            syncedRecords.push(...recs);
          })
          .catch((err) => {
            errors.push({ provider: "OpenAI", message: err.message });
          }),
      );
    }

    if (anthropicKey && anthropicKey.trim()) {
      tasks.push(
        this.syncAnthropic(anthropicKey, days)
          .then((recs) => {
            syncedRecords.push(...recs);
          })
          .catch((err) => {
            errors.push({ provider: "Anthropic", message: err.message });
          }),
      );
    }

    await Promise.all(tasks);

    const totalTokens = syncedRecords.reduce(
      (acc, r) => acc + r.totalTokens,
      0,
    );
    const totalCost = Number(
      syncedRecords.reduce((acc, r) => acc + r.estimatedCost, 0).toFixed(4),
    );

    return {
      records: syncedRecords,
      totalCount: syncedRecords.length,
      totalTokens,
      totalCost,
      errors,
    };
  }
}

module.exports = {
  CloudSyncService,
};
