const MODEL_PRICING_CATALOG = {
  // OpenAI Models (pricing per 1M tokens)
  "gpt-4o": {
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    cachedInputPerMillion: 1.25,
    description: "OpenAI GPT-4o Omnimodel",
  },
  "gpt-4o-mini": {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    cachedInputPerMillion: 0.075,
    description: "OpenAI GPT-4o Mini",
  },
  o1: {
    inputPerMillion: 15.0,
    outputPerMillion: 60.0,
    cachedInputPerMillion: 7.5,
    description: "OpenAI o1 Reasoning",
  },
  "o1-mini": {
    inputPerMillion: 3.0,
    outputPerMillion: 12.0,
    cachedInputPerMillion: 1.5,
    description: "OpenAI o1 Mini Reasoning",
  },
  "o3-mini": {
    inputPerMillion: 1.1,
    outputPerMillion: 4.4,
    cachedInputPerMillion: 0.55,
    description: "OpenAI o3 Mini",
  },
  "gpt-4-turbo": {
    inputPerMillion: 10.0,
    outputPerMillion: 30.0,
    description: "OpenAI GPT-4 Turbo",
  },
  "gpt-3.5-turbo": {
    inputPerMillion: 0.5,
    outputPerMillion: 1.5,
    description: "OpenAI GPT-3.5 Turbo",
  },

  // Anthropic Models
  "claude-3-7-sonnet": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cachedInputPerMillion: 0.3,
    description: "Anthropic Claude 3.7 Sonnet",
  },
  "claude-3-5-sonnet": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cachedInputPerMillion: 0.3,
    description: "Anthropic Claude 3.5 Sonnet",
  },
  "claude-3-5-haiku": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cachedInputPerMillion: 0.08,
    description: "Anthropic Claude 3.5 Haiku",
  },
  "claude-3-opus": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    description: "Anthropic Claude 3 Opus",
  },

  // Google Gemini Models
  "gemini-2.0-flash": {
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    cachedInputPerMillion: 0.025,
    description: "Google Gemini 2.0 Flash",
  },
  "gemini-1.5-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
    cachedInputPerMillion: 0.3125,
    description: "Google Gemini 1.5 Pro",
  },
  "gemini-1.5-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    cachedInputPerMillion: 0.01875,
    description: "Google Gemini 1.5 Flash",
  },

  // DeepSeek Models
  "deepseek-chat": {
    inputPerMillion: 0.14,
    outputPerMillion: 0.28,
    cachedInputPerMillion: 0.014,
    description: "DeepSeek-V3 Chat",
  },
  "deepseek-reasoner": {
    inputPerMillion: 0.55,
    outputPerMillion: 2.19,
    cachedInputPerMillion: 0.14,
    description: "DeepSeek-R1 Reasoner",
  },

  // Copilot & Local Ollama
  "copilot-gpt-4o": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    description: "GitHub Copilot (Flat plan)",
  },
  "copilot-claude-3.5-sonnet": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    description: "GitHub Copilot (Flat plan)",
  },
  "ollama-local": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    description: "Local Ollama / Open Source",
  },
};

function getPricingForModel(modelName) {
  const normalized = (modelName || "").toLowerCase().trim();

  if (MODEL_PRICING_CATALOG[normalized]) {
    return MODEL_PRICING_CATALOG[normalized];
  }

  // Fuzzy matching fallback
  for (const [key, pricing] of Object.entries(MODEL_PRICING_CATALOG)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return pricing;
    }
  }

  // Generic fallback if unknown
  return {
    inputPerMillion: 2.0,
    outputPerMillion: 8.0,
    cachedInputPerMillion: 1.0,
    description: "Custom/Unknown Model",
  };
}

function detectProviderFromModel(modelName) {
  const lower = (modelName || "").toLowerCase();
  if (
    lower.startsWith("gpt") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.includes("openai")
  ) {
    return "openai";
  }
  if (lower.includes("claude") || lower.includes("anthropic")) {
    return "anthropic";
  }
  if (lower.includes("gemini") || lower.includes("google")) {
    return "gemini";
  }
  if (lower.includes("copilot")) {
    return "copilot";
  }
  if (lower.includes("deepseek")) {
    return "deepseek";
  }
  if (
    lower.includes("ollama") ||
    lower.includes("llama") ||
    lower.includes("mistral") ||
    lower.includes("qwen")
  ) {
    return "ollama";
  }
  return "custom";
}

module.exports = {
  MODEL_PRICING_CATALOG,
  getPricingForModel,
  detectProviderFromModel,
};
