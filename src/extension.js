const vscode = require("vscode");
const { UsageStore } = require("./usageStore");
const { SidebarProvider } = require("./sidebarProvider");
const { DashboardProvider } = require("./dashboardProvider");
const { TokenTracker } = require("./tokenTracker");
const { CloudSyncService } = require("./services/cloudSyncService");
const { CredentialManager } = require("./services/credentialManager");
const { Logger } = require("./utils/logger");

let budgetAlert80Shown = false;
let budgetAlert100Shown = false;

function activate(context) {
  // Initialize structured logger and secure credential manager
  const logger = Logger.initialize();
  logger.info("TokenLens extension activating...");
  const credentials = CredentialManager.initialize(context);

  // Initialize shared persistent store
  const store = UsageStore.initialize(context);
  const tokenTracker = TokenTracker.getInstance();

  // Monitor budget threshold crossings in real-time
  store.on("recordAdded", () => {
    const config = vscode.workspace.getConfiguration("tokenlens");
    const dailyBudget = config.get("dailyBudget", 2.0);
    const currency = config.get("currencySymbol", "$");

    if (dailyBudget <= 0) return;

    const stats = store.getAggregateStats("today");
    const spend = stats.totalCost || 0;
    const ratio = spend / dailyBudget;

    if (ratio >= 1.0 && !budgetAlert100Shown) {
      budgetAlert100Shown = true;
      logger.warn(
        `Daily budget limit reached: ${currency}${spend.toFixed(2)} of ${currency}${dailyBudget.toFixed(2)}`,
      );
      vscode.window
        .showWarningMessage(
          `TokenLens: You have reached 100% of your daily spend limit (${currency}${spend.toFixed(2)} / ${currency}${dailyBudget.toFixed(2)}).`,
          "Open Dashboard",
          "Adjust Budget",
        )
        .then((choice) => {
          if (choice === "Open Dashboard") {
            vscode.commands.executeCommand("aiUsageMonitor.openDashboard");
          } else if (choice === "Adjust Budget") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "tokenlens.dailyBudget",
            );
          }
        });
    } else if (ratio >= 0.8 && ratio < 1.0 && !budgetAlert80Shown) {
      budgetAlert80Shown = true;
      logger.warn(
        `Daily budget warning: ${currency}${spend.toFixed(2)} of ${currency}${dailyBudget.toFixed(2)} (80%)`,
      );
      vscode.window.showInformationMessage(
        `TokenLens: You have used 80% of your daily budget (${currency}${spend.toFixed(2)} / ${currency}${dailyBudget.toFixed(2)}).`,
      );
    }
  });

  // Register Sidebar Webview Provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, store);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  );

  // Register Full Dashboard Panel
  const dashboard = new DashboardProvider(context.extensionUri, store);

  // Command: Open Full Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand("aiUsageMonitor.openDashboard", () => {
      logger.info("Opening full analytics dashboard");
      dashboard.open();
    }),
  );

  // Command: Show Logs
  context.subscriptions.push(
    vscode.commands.registerCommand("aiUsageMonitor.showLogs", () => {
      logger.show();
    }),
  );

  // Command: Clear / Reset Usage Data
  context.subscriptions.push(
    vscode.commands.registerCommand("aiUsageMonitor.clearUsage", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Are you sure you want to reset all TokenLens usage data?",
        { modal: true },
        "Reset",
      );
      if (confirm === "Reset") {
        await store.clearAll();
        budgetAlert80Shown = false;
        budgetAlert100Shown = false;
        logger.info("All usage data reset by user");
        vscode.window.showInformationMessage("TokenLens usage data reset.");
      }
    }),
  );

  // Command: Export Usage Data (JSON)
  context.subscriptions.push(
    vscode.commands.registerCommand("aiUsageMonitor.exportData", async () => {
      logger.info("Exporting usage data to JSON");
      const data = store.exportJSON();
      const doc = await vscode.workspace.openTextDocument({
        content: data,
        language: "json",
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    }),
  );

  // Secure Credential Management Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("tokenlens.setOpenAiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your OpenAI API Key (stored encrypted in OS keychain)",
        password: true,
        ignoreFocusOut: true,
      });
      if (key !== undefined) {
        await credentials.setOpenAiKey(key);
        logger.info("OpenAI API key updated in OS keychain");
        vscode.window.showInformationMessage(
          key ? "OpenAI API Key securely saved." : "OpenAI API Key removed.",
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tokenlens.setAnthropicKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt:
          "Enter your Anthropic Admin API Key (sk-ant-admin..., stored encrypted in OS keychain)",
        password: true,
        ignoreFocusOut: true,
      });
      if (key !== undefined) {
        await credentials.setAnthropicKey(key);
        logger.info("Anthropic API key updated in OS keychain");
        vscode.window.showInformationMessage(
          key
            ? "Anthropic API Key securely saved."
            : "Anthropic API Key removed.",
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tokenlens.clearKeys", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Clear all stored API keys from OS keychain?",
        { modal: true },
        "Clear",
      );
      if (confirm === "Clear") {
        await credentials.clearAllKeys();
        logger.info("All API keys removed from OS keychain");
        vscode.window.showInformationMessage(
          "All API keys removed from keychain.",
        );
      }
    }),
  );

  // Command: Sync Cloud Account Usage (OpenAI & Anthropic)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiUsageMonitor.syncCloudUsage",
      async () => {
        logger.info("Initiating cloud usage sync...");
        const openaiKey = await credentials.getOpenAiKey();
        const anthropicKey = await credentials.getAnthropicKey();

        if (!openaiKey && !anthropicKey) {
          const choice = await vscode.window.showInformationMessage(
            "TokenLens: No API keys configured for cloud sync. Store your key securely in the OS keychain to sync usage.",
            "Set OpenAI Key",
            "Set Anthropic Key",
            "Open Settings",
          );
          if (choice === "Set OpenAI Key") {
            vscode.commands.executeCommand("tokenlens.setOpenAiKey");
          } else if (choice === "Set Anthropic Key") {
            vscode.commands.executeCommand("tokenlens.setAnthropicKey");
          } else if (choice === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "tokenlens",
            );
          }
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "TokenLens: Syncing cloud usage...",
            cancellable: false,
          },
          async () => {
            try {
              const result = await CloudSyncService.syncAll({
                openaiKey,
                anthropicKey,
                days: 30,
              });

              if (result.records.length > 0) {
                const addedCount = await store.mergeRecords(result.records);
                logger.info(
                  `Synced ${addedCount} records: ${result.totalTokens} tokens, $${result.totalCost}`,
                );
                vscode.window.showInformationMessage(
                  `[TokenLens] Successfully synced ${addedCount} cloud record(s) (${result.totalTokens.toLocaleString()} tokens, $${result.totalCost.toFixed(4)})!`,
                );
              } else if (result.errors.length === 0) {
                logger.info("Sync completed: no new records found");
                vscode.window.showInformationMessage(
                  "[TokenLens] Cloud sync complete. No new usage records found in the last 30 days.",
                );
              }

              if (result.errors.length > 0) {
                for (const err of result.errors) {
                  logger.error(
                    `Sync error from ${err.provider}: ${err.message}`,
                  );
                  vscode.window.showErrorMessage(
                    `[TokenLens Cloud Sync] ${err.provider}: ${err.message}`,
                  );
                }
              }
            } catch (err) {
              logger.error("Cloud sync failed with unexpected error", err);
              vscode.window.showErrorMessage(
                `[TokenLens Cloud Sync Failed] ${err.message}`,
              );
            }
          },
        );
      },
    ),
  );

  logger.info("TokenLens successfully activated");

  return {
    tracker: tokenTracker,
    store,
    credentials,
    logger,
  };
}

function deactivate() {
  const logger = Logger.getInstance();
  logger.info("TokenLens deactivated");
  logger.dispose();
}

module.exports = {
  activate,
  deactivate,
};
