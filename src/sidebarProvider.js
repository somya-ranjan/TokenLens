const vscode = require("vscode");

class SidebarProvider {
  static viewType = "aiUsageMonitor";

  constructor(extensionUri, store) {
    this.extensionUri = extensionUri;
    this.store = store;
    this._view = undefined;

    this.store.onDidUpdate(() => {
      this.sendState();
    });
  }

  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "openDashboard":
          vscode.commands.executeCommand("aiUsageMonitor.openDashboard");
          break;
        case "syncAccount":
          vscode.commands.executeCommand("aiUsageMonitor.syncCloudUsage");
          break;
        case "refresh":
          this.sendState();
          break;
      }
    });

    this.sendState();
  }

  sendState() {
    if (this._view) {
      const state = this.store.getSidebarState();
      this._view.webview.postMessage({
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
      vscode.Uri.joinPath(this.extensionUri, "media", "sidebar.js"),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>Token Usage</title>
</head>
<body>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <div class="sidebar-title-group">
        <span class="title-md" style="color: #ffffff;">Token Usage</span>
      </div>
      <div class="live-badge">
        <span class="pulse-dot"></span>
        <span>Live</span>
      </div>
    </div>

    <div class="sidebar-stats-row">
      <div class="sidebar-stat-box">
        <div>
          <div class="sidebar-stat-label">Tokens</div>
          <div class="sidebar-stat-value" id="sidebar-tokens">128.4K</div>
        </div>
        <div class="text-xs" id="sidebar-requests" style="color: #2dd4bf;">24 reqs</div>
      </div>

      <div class="sidebar-stat-box">
        <div>
          <div class="sidebar-stat-label">Cost</div>
          <div class="sidebar-stat-value" id="sidebar-cost" style="color: #2dd4bf;">$0.42</div>
        </div>
        <div class="text-xs" style="color: var(--tl-text-muted); font-weight: 600;">Today</div>
      </div>
    </div>

    <div class="sidebar-breakdown">
      <div style="display: flex; justify-content: space-between;" class="text-xs">
        <span id="sidebar-prompt-tokens" style="color: var(--tl-text-muted);">Prompt: 82.0K (64%)</span>
        <span id="sidebar-comp-tokens" style="color: var(--tl-text-muted);">Comp: 46.4K (36%)</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill-prompt" id="sidebar-prompt-bar" style="width: 64%;"></div>
        <div class="progress-fill-completion" id="sidebar-comp-bar" style="width: 36%;"></div>
      </div>
    </div>

    <div class="sidebar-sparkline-card card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="text-xs" style="font-weight: 600; text-transform: uppercase; color: var(--tl-text-muted);">7-Day Trend</span>
      </div>
      <svg id="sidebar-sparkline" viewBox="0 0 240 40" style="width: 100%; height: 40px; overflow: visible;"></svg>
    </div>

    <div class="sidebar-actions">
      <button class="btn btn-primary" id="btn-open-dashboard" style="width: 100%;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        Open full dashboard
      </button>

      <div style="display: flex; gap: 6px; margin-top: 6px;">
        <button class="btn btn-secondary btn-sm" id="btn-sync" style="flex: 1;" title="Sync account usage from OpenAI & Anthropic">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"></path>
            <polyline points="8 17 12 21 16 17"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
          </svg>
          Sync
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-refresh" style="flex: 1;" title="Refresh metrics">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
          Refresh
        </button>
      </div>
    </div>
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
  SidebarProvider,
};
