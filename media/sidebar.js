(function () {
  const vscode = acquireVsCodeApi();

  const tokensEl = document.getElementById("sidebar-tokens");
  const costEl = document.getElementById("sidebar-cost");
  const requestsEl = document.getElementById("sidebar-requests");
  const promptTokensEl = document.getElementById("sidebar-prompt-tokens");
  const compTokensEl = document.getElementById("sidebar-comp-tokens");
  const promptBarEl = document.getElementById("sidebar-prompt-bar");
  const compBarEl = document.getElementById("sidebar-comp-bar");
  const sparklineSvg = document.getElementById("sidebar-sparkline");

  // Format helpers
  function formatCompact(num) {
    if (num >= 1000000)
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return (num || 0).toLocaleString();
  }

  function formatCost(val, sym = "$") {
    if (val === 0) return `${sym}0.00`;
    if (val < 0.01) return `${sym}${val.toFixed(3)}`;
    return `${sym}${val.toFixed(2)}`;
  }

  function renderSparkline(points) {
    if (!sparklineSvg || !points || points.length === 0) return;
    const width = 240;
    const height = 40;
    const max = Math.max(...points, 1);
    const min = 0;
    const step = width / Math.max(points.length - 1, 1);

    const coords = points.map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / (max - min)) * (height - 8) - 4;
      return { x, y };
    });

    const pathD = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    sparklineSvg.innerHTML = `
      <defs>
        <linearGradient id="sbSparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0D9488" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0D9488" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#sbSparkGrad)" />
      <path d="${pathD}" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="3" fill="#2DD4BF" />
    `;
  }

  function updateState(state) {
    if (!state) return;

    if (tokensEl) tokensEl.textContent = formatCompact(state.todayTokens || 0);
    if (costEl)
      costEl.textContent = formatCost(
        state.todayCost || 0,
        state.currencySymbol,
      );
    if (requestsEl)
      requestsEl.textContent = (state.todayRequests || 0) + " reqs";

    const prompt = state.promptTokens || 0;
    const comp = state.completionTokens || 0;
    const total = prompt + comp || 1;

    const promptPct = Math.round((prompt / total) * 100);
    const compPct = Math.round((comp / total) * 100);

    if (promptTokensEl)
      promptTokensEl.textContent = `Prompt: ${formatCompact(prompt)} (${promptPct}%)`;
    if (compTokensEl)
      compTokensEl.textContent = `Comp: ${formatCompact(comp)} (${compPct}%)`;

    if (promptBarEl) promptBarEl.style.width = promptPct + "%";
    if (compBarEl) compBarEl.style.width = compPct + "%";

    if (state.sparkline) {
      renderSparkline(state.sparkline);
    }
  }

  // Button actions
  document
    .getElementById("btn-open-dashboard")
    ?.addEventListener("click", () => {
      vscode.postMessage({ command: "openDashboard" });
    });

  document.getElementById("btn-sync")?.addEventListener("click", () => {
    vscode.postMessage({ command: "syncAccount" });
  });

  document.getElementById("btn-refresh")?.addEventListener("click", () => {
    vscode.postMessage({ command: "refresh" });
  });

  // Listen for messages from extension host
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "stateUpdate") {
      updateState(message.state);
    }
  });

  // Request initial state
  vscode.postMessage({ command: "refresh" });
})();
