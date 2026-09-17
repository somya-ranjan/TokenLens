const vscode = require("vscode");
const { formatCurrency } = require("./utils/formatters");

class DashboardProvider {
  constructor(extensionUri, store) {
    this.extensionUri = extensionUri;
    this.store = store;
    this.panel = undefined;
    this.currentTimeRange = "today";

    this.store.onDidUpdate(() => {
      this.sendState();
    });
  }

  open() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.sendState();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "aiUsageDashboard",
      "AI Usage Dashboard",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      },
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      "icon.svg",
    );
    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "setTimeRange":
          this.currentTimeRange = message.range;
          this.sendState();
          break;

        case "syncAccount":
          vscode.commands.executeCommand("aiUsageMonitor.syncCloudUsage");
          break;

        case "clearUsage": {
          const answer = await vscode.window.showWarningMessage(
            "Are you sure you want to reset all recorded token usage data?",
            { modal: true },
            "Reset Data",
          );
          if (answer === "Reset Data") {
            await this.store.clearAll();
            vscode.window.showInformationMessage("TokenLens usage data reset.");
          }
          break;
        }

        case "exportJSON": {
          const data = this.store.exportJSON();
          const doc = await vscode.workspace.openTextDocument({
            content: data,
            language: "json",
          });
          await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          vscode.window.showInformationMessage(
            "Exported usage records opened in editor.",
          );
          break;
        }

        case "openSettings":
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "tokenlens",
          );
          break;

        case "showRequestDetails": {
          const r = message.record;
          const costStr = formatCurrency(r.estimatedCost);
          vscode.window
            .showInformationMessage(
              `[${r.provider.toUpperCase()} / ${r.model}] Total Tokens: ${r.totalTokens.toLocaleString()} (${r.promptTokens} prompt, ${r.completionTokens} comp, ${r.cachedTokens || 0} cached) | Cost: ${costStr} | Latency: ${r.latencyMs || 0}ms`,
              "Copy ID",
            )
            .then((choice) => {
              if (choice === "Copy ID") {
                vscode.env.clipboard.writeText(r.id);
              }
            });
          break;
        }

        case "refresh":
          this.sendState();
          break;
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.sendState();
  }

  sendState() {
    if (this.panel) {
      const state = this.store.getDashboardState(this.currentTimeRange);
      this.panel.webview.postMessage({
        type: "stateUpdate",
        state,
      });
    }
  }

  getHtmlForWebview(webview) {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "styles.css"),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "dashboard.js"),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>AI Usage Dashboard</title>
</head>
<body>
  <!-- Floating Tooltip -->
  <div id="chart-tooltip" style="display:none; position:fixed; z-index:100; pointer-events:none; background:rgba(18, 24, 38, 0.95); border:1px solid var(--tl-primary-border); border-radius:6px; padding:8px 12px; font-size:11px; box-shadow:0 8px 24px rgba(0,0,0,0.5);"></div>

  <div class="dashboard-container">
    <!-- Top Bar -->
    <header class="dashboard-topbar">
      <div class="dashboard-heading">
        <h1>
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#2DD4BF" stroke-width="4" stroke-dasharray="8 4" opacity="0.4" />
            <circle cx="32" cy="32" r="16" stroke="#0D9488" stroke-width="4" />
            <circle cx="32" cy="32" r="6" fill="#2DD4BF" />
          </svg>
          AI Usage Dashboard
        </h1>
        <div class="text-sm" style="margin-top: 4px;">Token usage, estimated costs, and request latency</div>
      </div>

      <div class="dashboard-controls">
        <!-- Time Range Filters -->
        <div class="time-range-group">
          <button class="time-range-btn active" data-range="today">Today</button>
          <button class="time-range-btn" data-range="7d">7 Days</button>
          <button class="time-range-btn" data-range="30d">30 Days</button>
          <button class="time-range-btn" data-range="all">All Time</button>
        </div>


        <button class="btn btn-secondary btn-sm" id="btn-sync" title="Sync usage from OpenAI & Anthropic cloud accounts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"></path>
            <polyline points="8 17 12 21 16 17"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
          </svg>
          Sync Cloud
        </button>

        <button class="btn btn-secondary btn-sm" id="btn-export" title="Export records to JSON file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export
        </button>

        <button class="btn btn-secondary btn-sm" id="btn-settings" title="Configure budget thresholds & pricing">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Settings
        </button>

        <button class="btn btn-secondary btn-sm" id="btn-clear" title="Reset all usage history" style="color: #f43f5e;" aria-label="Reset all usage history">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </header>

    <!-- Key Metrics Grid -->
    <section class="kpi-grid">
      <!-- Total Tokens -->
      <div class="card kpi-card">
        <div class="kpi-label">
          <span>Total Tokens</span>
          <span class="live-badge" style="font-size:9px; padding:2px 6px;">Live</span>
        </div>
        <div class="kpi-value" id="kpi-total-tokens">128,450</div>
        <div class="kpi-subtext">
          <span id="sub-prompt-tokens">82.0K prompt (64%)</span>
          <span>•</span>
          <span id="sub-comp-tokens">46.4K output (36%)</span>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="card kpi-card">
        <div class="kpi-label">Total Cost</div>
        <div class="kpi-value" id="kpi-total-cost" style="color: #2dd4bf;">$0.42</div>
        <div class="kpi-subtext">
          <span id="sub-cached-tokens">12.4K cached discount</span>
        </div>
      </div>

      <!-- Requests -->
      <div class="card kpi-card">
        <div class="kpi-label">Requests</div>
        <div class="kpi-value" id="kpi-requests">24</div>
        <div class="kpi-subtext">
          <span id="sub-avg-latency">680ms avg latency</span>
        </div>
      </div>

      <!-- Avg Tokens / Request -->
      <div class="card kpi-card">
        <div class="kpi-label">Avg. Tokens</div>
        <div class="kpi-value" id="kpi-avg-tokens">5.3K</div>
        <div class="kpi-subtext">
          <span>per API call</span>
        </div>
      </div>
    </section>

    <!-- Token Consumption Over Time (Interactive Area Chart) -->
    <section class="card chart-section">
      <div class="chart-header">
        <div>
          <div class="title-md" style="color: #ffffff;">Token Usage Over Time</div>
          <div class="text-xs" style="margin-top: 2px;">Daily token and cost breakdown</div>
        </div>

        <div style="display: flex; gap: 4px;">
          <button class="btn btn-secondary btn-sm active" id="toggle-chart-tokens" style="font-size: 11px;">Tokens</button>
          <button class="btn btn-secondary btn-sm" id="toggle-chart-cost" style="font-size: 11px;">Cost ($)</button>
        </div>
      </div>

      <div class="chart-wrapper">
        <svg id="chart-svg" class="chart-svg"></svg>
      </div>
    </section>

    <!-- Middle Row: Model Breakdown & Provider Integrations -->
    <section class="analytics-grid">
      <!-- Model Distribution -->
      <div class="card">
        <div class="title-md" style="color: #ffffff; margin-bottom: 4px;">Model Breakdown</div>
        <div class="text-xs">Token consumption and cost share by model</div>
        <div class="breakdown-list" id="model-breakdown-list"></div>
      </div>

      <!-- Providers & Budget Tracker -->
      <div class="card" style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <div class="title-md" style="color: #ffffff; margin-bottom: 4px;">Provider Integrations</div>
          <div class="text-xs">Active LLM API endpoints and tools</div>
          <div id="provider-cards-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;"></div>
        </div>

        <!-- Budget Tracker Widget -->
        <div style="border-top: 1px solid var(--tl-border); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="title-md" style="font-size: 13px; color: #ffffff;">Daily Budget Target</span>
            <span id="budget-percentage" style="font-weight: 700; color: #2dd4bf; font-size: 12px;">21%</span>
          </div>
          <div class="budget-bar-wrapper">
            <div class="budget-track">
              <div class="budget-fill" id="budget-bar" style="width: 21%;"></div>
            </div>
            <div class="text-xs" id="budget-text" style="color: var(--tl-text-muted);">$0.42 of $2.00 daily limit</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Detailed Request History Table -->
    <section class="card table-card">
      <div class="table-toolbar">
        <div>
          <div class="title-md" style="color: #ffffff;">Request History</div>
          <div class="text-xs">Recent API calls, token counts, cost, and latency</div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="text" id="history-search" class="search-input" placeholder="Search prompts or models..." />
          <select id="history-provider-filter" class="search-input" style="min-width: 120px; cursor: pointer;">
            <option value="all">All Providers</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
            <option value="copilot">Copilot</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Provider</th>
              <th>Model</th>
              <th>Prompt / Task</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody id="history-tbody"></tbody>
        </table>
      </div>
    </section>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

module.exports = {
  DashboardProvider,
};
