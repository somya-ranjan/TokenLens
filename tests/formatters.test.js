const { describe, it, expect } = require("bun:test");
const {
  formatTokensCompact,
  formatTokensFull,
  formatCurrency,
  formatRelativeTime,
  getStartOfDay,
} = require("../src/utils/formatters");

describe("Formatters Utility", () => {
  it("formats tokens into compact notation", () => {
    expect(formatTokensCompact(950)).toBe("950");
    expect(formatTokensCompact(1500)).toBe("1.5K");
    expect(formatTokensCompact(1000000)).toBe("1M");
    expect(formatTokensCompact(2500000)).toBe("2.5M");
  });

  it("formats tokens into full notation", () => {
    expect(formatTokensFull(128450)).toBe((128450).toLocaleString());
  });

  it("formats currency with proper precision", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(0.0042)).toBe("$0.0042");
    expect(formatCurrency(12.5)).toBe("$12.50");
    expect(formatCurrency(12.5, "€")).toBe("€12.50");
  });

  it("formats relative timestamps", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10000)).toBe("Just now");
    expect(formatRelativeTime(now - 120000)).toBe("2m ago");
    expect(formatRelativeTime(now - 7200000)).toBe("2h ago");
    expect(formatRelativeTime(now - 172800000)).toBe("2d ago");
  });

  it("calculates midnight timestamp for start of day", () => {
    const midnight = getStartOfDay();
    const d = new Date(midnight);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});
