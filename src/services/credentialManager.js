const vscode = require("vscode");

class CredentialManager {
  static SECRETS_OPENAI = "tokenlens.secret.openaiApiKey";
  static SECRETS_ANTHROPIC = "tokenlens.secret.anthropicApiKey";

  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.secrets = context.secrets;
  }

  /**
   * @param {vscode.ExtensionContext} context
   */
  static initialize(context) {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager(context);
    }
    return CredentialManager.instance;
  }

  static getInstance() {
    if (!CredentialManager.instance) {
      throw new Error(
        "CredentialManager must be initialized with ExtensionContext.",
      );
    }
    return CredentialManager.instance;
  }

  /**
   * Retrieve OpenAI API key from secure storage, with fallback to settings.json
   * @returns {Promise<string>}
   */
  async getOpenAiKey() {
    const secretKey = await this.secrets.get(CredentialManager.SECRETS_OPENAI);
    if (secretKey && secretKey.trim().length > 0) {
      return secretKey.trim();
    }
    // Fallback to workspace configuration
    const config = vscode.workspace.getConfiguration("tokenlens");
    return (config.get("openaiApiKey") || "").trim();
  }

  /**
   * Securely store OpenAI API key in OS keychain
   * @param {string} key
   */
  async setOpenAiKey(key) {
    if (!key || !key.trim()) {
      await this.secrets.delete(CredentialManager.SECRETS_OPENAI);
      return;
    }
    await this.secrets.store(CredentialManager.SECRETS_OPENAI, key.trim());
  }

  /**
   * Retrieve Anthropic API key from secure storage, with fallback to settings.json
   * @returns {Promise<string>}
   */
  async getAnthropicKey() {
    const secretKey = await this.secrets.get(
      CredentialManager.SECRETS_ANTHROPIC,
    );
    if (secretKey && secretKey.trim().length > 0) {
      return secretKey.trim();
    }
    // Fallback to workspace configuration
    const config = vscode.workspace.getConfiguration("tokenlens");
    return (config.get("anthropicApiKey") || "").trim();
  }

  /**
   * Securely store Anthropic API key in OS keychain
   * @param {string} key
   */
  async setAnthropicKey(key) {
    if (!key || !key.trim()) {
      await this.secrets.delete(CredentialManager.SECRETS_ANTHROPIC);
      return;
    }
    await this.secrets.store(CredentialManager.SECRETS_ANTHROPIC, key.trim());
  }

  /**
   * Delete stored keys from OS keychain
   */
  async clearAllKeys() {
    await this.secrets.delete(CredentialManager.SECRETS_OPENAI);
    await this.secrets.delete(CredentialManager.SECRETS_ANTHROPIC);
  }
}

module.exports = { CredentialManager };
