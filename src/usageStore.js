const vscode = require("vscode");
const { getStartOfDay, getStartOfDaysAgo } = require("./utils/formatters");

const STORAGE_KEY = "tokenlens.usageRecords.v2";

class UsageStore {
  static instance = null;

  constructor(context) {
    this.context = context;
    this.records = [];
    this._onDidUpdate = new vscode.EventEmitter();
    this.onDidUpdate = this._onDidUpdate.event;
    this.load();
  }

  static initialize(context) {
    if (!UsageStore.instance) {
      UsageStore.instance = new UsageStore(context);
    }
    return UsageStore.instance;
  }

  static getInstance() {
    if (!UsageStore.instance) {
      throw new Error("UsageStore has not been initialized yet");
    }
    return UsageStore.instance;
  }

  load() {
    const raw = this.context.globalState.get(STORAGE_KEY);
    if (raw && Array.isArray(raw)) {
      this.records = raw;
    } else {
      this.records = [];
    }
  }

  async save() {
    if (this.records.length > 5000) {
      this.records = this.records.slice(0, 5000);
    }
    await this.context.globalState.update(STORAGE_KEY, this.records);
    this._onDidUpdate.fire();
  }

  async recordUsage(entry) {
    const record = {
      ...entry,
      id:
        entry.id ||
        "req_" +
          Math.random().toString(36).substring(2, 11) +
          "_" +
          Date.now().toString(36),
    };

    this.records.unshift(record);
    await this.save();
    return record;
  }

  async mergeRecords(newRecords) {
    if (!Array.isArray(newRecords) || newRecords.length === 0) {
      return 0;
    }

    const existingIds = new Set(this.records.map((r) => r.id));
    const toAdd = [];

    for (const r of newRecords) {
      if (!existingIds.has(r.id)) {
        existingIds.add(r.id);
        toAdd.push(r);
      }
    }

    if (toAdd.length > 0) {
      this.records = [...toAdd, ...this.records].sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      await this.save();
    }

    return toAdd.length;
  }

  getFilteredRecords(timeRange = "today") {
    if (timeRange === "today") {
      const startOfDay = getStartOfDay();
      return this.records.filter((r) => r.timestamp >= startOfDay);
    }
    if (timeRange === "7d") {
      const sevenDaysAgo = getStartOfDaysAgo(7);
      return this.records.filter((r) => r.timestamp >= sevenDaysAgo);
    }
    if (timeRange === "30d") {
      const thirtyDaysAgo = getStartOfDaysAgo(30);
      return this.records.filter((r) => r.timestamp >= thirtyDaysAgo);
    }
    return this.records;
  }

  getSummary(timeRange = "today") {
    const filtered = this.getFilteredRecords(timeRange);
    const todayRecords = this.getFilteredRecords("today");

    const config = vscode.workspace.getConfiguration("tokenlens");
    const dailyBudget = config.get("dailyBudget", 2.0);

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let cachedTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const r of filtered) {
      totalTokens += r.totalTokens;
      promptTokens += r.promptTokens;
      completionTokens += r.completionTokens;
      cachedTokens += r.cachedTokens || 0;
      totalCost += r.estimatedCost;
      if (r.latencyMs) {
        totalLatency += r.latencyMs;
        latencyCount++;
      }
    }

    const todayCost = todayRecords.reduce((acc, r) => acc + r.estimatedCost, 0);
    const todayTokens = todayRecords.reduce((acc, r) => acc + r.totalTokens, 0);

    return {
      period: timeRange,
      totalTokens,
      promptTokens,
      completionTokens,
      cachedTokens,
      totalCost: Number(totalCost.toFixed(4)),
      requestCount: filtered.length,
      avgTokensPerRequest:
        filtered.length > 0 ? Math.round(totalTokens / filtered.length) : 0,
      avgLatencyMs:
        latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      dailyBudget,
      todayCost: Number(todayCost.toFixed(4)),
      todayTokens,
    };
  }

  getDailyPoints(days = 7) {
    const points = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const start = new Date(targetDate).setHours(0, 0, 0, 0);
      const end = new Date(targetDate).setHours(23, 59, 59, 999);

      const dayKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
      const dayLabel = dayNames[targetDate.getDay()];
      const formattedDate = `${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;

      const dayRecords = this.records.filter(
        (r) => r.timestamp >= start && r.timestamp <= end,
      );
      const tokens = dayRecords.reduce((acc, r) => acc + r.totalTokens, 0);
      const promptTokens = dayRecords.reduce(
        (acc, r) => acc + r.promptTokens,
        0,
      );
      const completionTokens = dayRecords.reduce(
        (acc, r) => acc + r.completionTokens,
        0,
      );
      const cost = Number(
        dayRecords.reduce((acc, r) => acc + r.estimatedCost, 0).toFixed(4),
      );

      points.push({
        dateKey: dayKey,
        dayLabel,
        formattedDate,
        tokens,
        promptTokens,
        completionTokens,
        cost,
        requests: dayRecords.length,
      });
    }

    return points;
  }

  getModelBreakdown(timeRange = "today") {
    const filtered = this.getFilteredRecords(timeRange);
    const map = new Map();

    let totalTokens = 0;
    for (const r of filtered) {
      totalTokens += r.totalTokens;
      const key = r.model;
      const existing = map.get(key) || {
        model: r.model,
        provider: r.provider,
        tokens: 0,
        cost: 0,
        count: 0,
      };
      existing.tokens += r.totalTokens;
      existing.cost += r.estimatedCost;
      existing.count += 1;
      map.set(key, existing);
    }

    const items = Array.from(map.values()).map((item) => ({
      model: item.model,
      provider: item.provider,
      tokens: item.tokens,
      cost: Number(item.cost.toFixed(4)),
      percentage:
        totalTokens > 0
          ? Number(((item.tokens / totalTokens) * 100).toFixed(1))
          : 0,
      requestCount: item.count,
    }));

    return items.sort((a, b) => b.tokens - a.tokens);
  }

  getProviderBreakdown(timeRange = "today") {
    const filtered = this.getFilteredRecords(timeRange);
    const map = new Map();

    const names = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      gemini: "Google Gemini",
      copilot: "GitHub Copilot",
      deepseek: "DeepSeek",
      ollama: "Ollama / Local",
      custom: "Custom API",
    };

    let totalTokens = 0;
    for (const r of filtered) {
      totalTokens += r.totalTokens;
      const key = r.provider;
      const existing = map.get(key) || {
        provider: r.provider,
        name: names[r.provider] || r.provider,
        tokens: 0,
        cost: 0,
        count: 0,
      };
      existing.tokens += r.totalTokens;
      existing.cost += r.estimatedCost;
      existing.count += 1;
      map.set(key, existing);
    }

    const items = Array.from(map.values()).map((item) => ({
      provider: item.provider,
      name: item.name,
      tokens: item.tokens,
      cost: Number(item.cost.toFixed(4)),
      percentage:
        totalTokens > 0
          ? Number(((item.tokens / totalTokens) * 100).toFixed(1))
          : 0,
      requestCount: item.count,
    }));

    return items.sort((a, b) => b.tokens - a.tokens);
  }

  getDashboardState(timeRange = "today") {
    const config = vscode.workspace.getConfiguration("tokenlens");
    const currencySymbol = config.get("currencySymbol", "$");
    const dailyBudget = config.get("dailyBudget", 2.0);
    const monthlyBudget = config.get("monthlyBudget", 50.0);
    const daysCount = timeRange === "30d" ? 30 : 7;

    return {
      summary: this.getSummary(timeRange),
      dailyPoints: this.getDailyPoints(daysCount),
      modelBreakdown: this.getModelBreakdown(timeRange),
      providerBreakdown: this.getProviderBreakdown(timeRange),
      recentRequests: this.getFilteredRecords(timeRange).slice(0, 50),
      timeRange,
      currencySymbol,
      dailyBudget,
      monthlyBudget,
    };
  }

  getSidebarState() {
    const summary = this.getSummary("today");
    const dailyPoints = this.getDailyPoints(7);
    const sparkline = dailyPoints.map((p) => p.tokens);

    const config = vscode.workspace.getConfiguration("tokenlens");
    const currencySymbol = config.get("currencySymbol", "$");
    const dailyBudget = config.get("dailyBudget", 2.0);

    return {
      todayTokens: summary.totalTokens,
      todayCost: summary.totalCost,
      todayRequests: summary.requestCount,
      promptTokens: summary.promptTokens,
      completionTokens: summary.completionTokens,
      cachedTokens: summary.cachedTokens,
      dailyBudget,
      currencySymbol,
      sparkline,
    };
  }

  async clearAll() {
    this.records = [];
    await this.context.globalState.update(STORAGE_KEY, []);
    await this.context.globalState.update(
      "tokenlens.usageRecords.v1",
      undefined,
    );
    await this.context.globalState.update("tokenlens.hasSeeded.v1", undefined);
    this._onDidUpdate.fire();
  }

  exportJSON() {
    return JSON.stringify(this.records, null, 2);
  }

  async importRecords(imported) {
    if (Array.isArray(imported)) {
      this.records = [...imported, ...this.records].sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      await this.save();
    }
  }
}

module.exports = {
  UsageStore,
};
