const vscode = require("vscode");

class Logger {
  constructor() {
    this.channel = vscode.window.createOutputChannel("TokenLens");
  }

  static initialize() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Redacts sensitive authorization tokens from log text
   * @param {string} text
   * @returns {string}
   */
  sanitize(text) {
    if (typeof text !== "string") {
      try {
        text = JSON.stringify(text);
      } catch {
        text = String(text);
      }
    }
    return text
      .replace(/Bearer\s+sk-[a-zA-Z0-9_-]+/gi, "Bearer [REDACTED]")
      .replace(/sk-(ant-)?[a-zA-Z0-9_-]{12,}/gi, "sk-[REDACTED]");
  }

  format(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${this.sanitize(message)}`;
  }

  info(message) {
    this.channel.appendLine(this.format("INFO", message));
  }

  warn(message) {
    this.channel.appendLine(this.format("WARN", message));
  }

  error(message, error) {
    let details = message;
    if (error && error.stack) {
      details += `\n${error.stack}`;
    } else if (error) {
      details += ` - ${error.message || error}`;
    }
    this.channel.appendLine(this.format("ERROR", details));
  }

  show() {
    this.channel.show(true);
  }

  dispose() {
    this.channel.dispose();
  }
}

module.exports = { Logger };
