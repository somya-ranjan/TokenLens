const { describe, it, expect } = require("bun:test");
const { calculateCost, getPricingForModel } = require("../src/costCalculator");

describe("Cost Calculator", () => {
  it("should calculate exact cost for standard gpt-4o usage", () => {
    // 1M prompt ($2.50) + 1M completion ($10.00) = $12.50
    const cost = calculateCost({
      model: "gpt-4o",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      cachedTokens: 0,
    });
    expect(cost).toBe(12.5);
  });

  it("should calculate cached token discounts for gpt-4o", () => {
    // 500k cached ($0.625) + 500k uncached ($1.25) + 0 completion = $1.875
    const cost = calculateCost({
      model: "gpt-4o",
      promptTokens: 1_000_000,
      completionTokens: 0,
      cachedTokens: 500_000,
    });
    expect(cost).toBe(1.875);
  });

  it("should calculate exact cost for claude-3-5-sonnet", () => {
    // 1M prompt ($3.00) + 1M completion ($15.00) = $18.00
    const cost = calculateCost({
      model: "claude-3-5-sonnet",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      cachedTokens: 0,
    });
    expect(cost).toBe(18.0);
  });

  it("should calculate cost for gemini-2.0-flash", () => {
    // 1M prompt ($0.10) + 1M completion ($0.40) = $0.50
    const cost = calculateCost({
      model: "gemini-2.0-flash",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      cachedTokens: 0,
    });
    expect(cost).toBe(0.5);
  });

  it("should fallback gracefully for unknown models", () => {
    const cost = calculateCost({
      model: "custom-fine-tuned-model",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      cachedTokens: 0,
    });
    expect(cost).toBeGreaterThan(0);
  });

  it("should return pricing rates from catalog", () => {
    const rate = getPricingForModel("gpt-4o-mini");
    expect(rate).toBeDefined();
    expect(rate.inputPerMillion).toBe(0.15);
    expect(rate.outputPerMillion).toBe(0.6);
  });
});
