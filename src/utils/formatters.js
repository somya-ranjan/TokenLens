function formatTokensCompact(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return (num || 0).toLocaleString();
}

function formatTokensFull(num) {
  return (num || 0).toLocaleString();
}

function formatCurrency(amount, symbol = "$") {
  if (amount === 0) {
    return `${symbol}0.00`;
  }
  if (amount < 0.01) {
    return `${symbol}${amount.toFixed(4)}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) {
    return "Just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

module.exports = {
  formatTokensCompact,
  formatTokensFull,
  formatCurrency,
  formatRelativeTime,
  getStartOfDay,
  getStartOfDaysAgo,
};
