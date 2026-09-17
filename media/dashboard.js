(function () {
  const vscode = acquireVsCodeApi();

  let currentState = null;
  let activeMetric = "tokens"; // 'tokens' | 'cost'
  let searchFilter = "";
  let providerFilter = "all";

  // Format helpers
  function formatNumber(num) {
    return (num || 0).toLocaleString();
  }

  function formatCompact(num) {
    if (num >= 1000000)
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return (num || 0).toLocaleString();
  }

  function formatCost(val, sym = "$") {
    if (!val || val === 0) return `${sym}0.00`;
    if (val < 0.01) return `${sym}${val.toFixed(4)}`;
    return `${sym}${val.toFixed(2)}`;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderAreaChart(points) {
    const svg = document.getElementById("chart-svg");
    const tooltip = document.getElementById("chart-tooltip");
    if (!svg || !points || points.length === 0) return;

    const width = 760;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 35, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = points.map((p) =>
      activeMetric === "tokens" ? p.tokens : p.cost,
    );
    const maxVal =
      Math.max(...values, activeMetric === "tokens" ? 1000 : 0.1) * 1.15;
    const minVal = 0;

    const stepX = chartW / Math.max(points.length - 1, 1);

    const coords = points.map((p, i) => {
      const val = activeMetric === "tokens" ? p.tokens : p.cost;
      const x = padding.left + i * stepX;
      const y =
        padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, point: p, val };
    });

    // Build SVG path
    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`;

    // Horizontal grid lines
    const gridLines = [0.25, 0.5, 0.75, 1.0]
      .map((ratio) => {
        const y = padding.top + chartH * (1 - ratio);
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="currentColor" opacity="0.1" stroke-dasharray="3 4" />`;
      })
      .join("");

    // X Axis Labels
    const xLabels = coords
      .map((pt, i) => {
        // Show first, middle, last or spaced labels
        if (
          points.length <= 7 ||
          i === 0 ||
          i === Math.floor(points.length / 2) ||
          i === points.length - 1
        ) {
          return `<text x="${pt.x}" y="${height - 10}" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">${pt.point.dayLabel || pt.point.formattedDate}</text>`;
        }
        return "";
      })
      .join("");

    // Interactive dots
    const circles = coords
      .map((pt, i) => {
        return `
        <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#0D9488" stroke="#ffffff" stroke-width="1.5" class="chart-point" data-idx="${i}" style="cursor: pointer;" />
      `;
      })
      .join("");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0D9488" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0D9488" stop-opacity="0.01" />
        </linearGradient>
      </defs>
      <!-- Base line -->
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="currentColor" opacity="0.2" />
      ${gridLines}
      <path d="${areaD}" fill="url(#areaGrad)" />
      <path d="${pathD}" fill="none" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
      ${xLabels}
    `;

    // Tooltip hover interactions
    svg.querySelectorAll(".chart-point").forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        const idx = parseInt(e.target.getAttribute("data-idx") || "0", 10);
        const item = coords[idx];
        if (!item || !tooltip) return;

        const sym = currentState?.currencySymbol || "$";
        tooltip.innerHTML = `
          <div style="font-weight:600; color:#fff;">${item.point.formattedDate} (${item.point.dayLabel})</div>
          <div style="color:#2dd4bf; margin-top:2px;">Tokens: ${formatNumber(item.point.tokens)}</div>
          <div style="color:#a78bfa;">Cost: ${formatCost(item.point.cost, sym)}</div>
          <div style="color:var(--tl-text-muted); font-size:10px;">${item.point.requests} requests</div>
        `;
        tooltip.style.display = "block";
        tooltip.style.left = `${Math.min(e.clientX + 10, window.innerWidth - 160)}px`;
        tooltip.style.top = `${e.clientY - 60}px`;
      });

      el.addEventListener("mouseleave", () => {
        if (tooltip) tooltip.style.display = "none";
      });
    });
  }

  function renderKPIs(summary, currencySymbol = "$") {
    document.getElementById("kpi-total-tokens").textContent = formatNumber(
      summary.totalTokens,
    );
    document.getElementById("kpi-total-cost").textContent = formatCost(
      summary.totalCost,
      currencySymbol,
    );
    document.getElementById("kpi-requests").textContent = formatNumber(
      summary.requestCount,
    );
    document.getElementById("kpi-avg-tokens").textContent = formatCompact(
      summary.avgTokensPerRequest,
    );

    const totalTokens = summary.totalTokens || 1;
    const promptPct = Math.round((summary.promptTokens / totalTokens) * 100);
    const compPct = Math.round((summary.completionTokens / totalTokens) * 100);

    document.getElementById("sub-prompt-tokens").textContent =
      `${formatCompact(summary.promptTokens)} prompt (${promptPct}%)`;
    document.getElementById("sub-comp-tokens").textContent =
      `${formatCompact(summary.completionTokens)} output (${compPct}%)`;
    document.getElementById("sub-cached-tokens").textContent =
      formatCompact(summary.cachedTokens) + " cached";
    document.getElementById("sub-avg-latency").textContent =
      summary.avgLatencyMs + "ms avg latency";

    // Budget Tracker
    const dailyBudget = summary.dailyBudget || 2.0;
    const todayCost = summary.todayCost || 0;
    const pct = Math.min(100, Math.round((todayCost / dailyBudget) * 100));

    const budgetPctEl = document.getElementById("budget-percentage");
    const budgetBarEl = document.getElementById("budget-bar");
    const budgetTextEl = document.getElementById("budget-text");

    if (budgetPctEl) budgetPctEl.textContent = `${pct}%`;
    if (budgetTextEl)
      budgetTextEl.textContent = `${formatCost(todayCost, currencySymbol)} of ${formatCost(dailyBudget, currencySymbol)} daily limit`;

    if (budgetBarEl) {
      budgetBarEl.style.width = `${pct}%`;
      budgetBarEl.className =
        "budget-fill" + (pct > 90 ? " danger" : pct > 75 ? " warning" : "");
    }
  }

  function renderModelBreakdown(models, currencySymbol = "$") {
    const listEl = document.getElementById("model-breakdown-list");
    if (!listEl) return;

    if (!models || models.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state">No model usage recorded for this period.</div>';
      return;
    }

    listEl.innerHTML = models
      .map((m) => {
        const badgeClass = `badge-${m.provider}`;
        return `
        <div class="breakdown-row">
          <div class="breakdown-row-meta">
            <span style="display:flex; align-items:center; gap:6px;">
              <span class="badge ${badgeClass}">${m.provider}</span>
              <strong style="color:#fff;">${m.model}</strong>
            </span>
            <span style="display:flex; align-items:center; gap:8px;">
              <span style="color:#2dd4bf; font-weight:700; font-size:11px; background:rgba(45,212,191,0.12); padding:1px 6px; border-radius:4px; border:1px solid rgba(45,212,191,0.25);">${m.percentage}%</span>
              <span style="color:#fff; font-weight:600;">${formatCompact(m.tokens)}</span>
              <span style="color:var(--tl-text-muted); margin-left:2px;">(${formatCost(m.cost, currencySymbol)})</span>
            </span>
          </div>
          <div class="progress-track" style="height:5px;">
            <div class="progress-fill-prompt" style="width:${m.percentage}%;"></div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function renderProviderCards(providers, currencySymbol = "$") {
    const container = document.getElementById("provider-cards-grid");
    if (!container) return;

    if (!providers || providers.length === 0) {
      container.innerHTML = '<div class="empty-state">No provider data.</div>';
      return;
    }

    container.innerHTML = providers
      .map((p) => {
        return `
        <div style="background:var(--tl-bg-subtle); border:1px solid var(--tl-border); border-radius:var(--tl-radius-sm); padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span class="badge badge-${p.provider}">${p.name}</span>
            <span style="font-size:11px; color:var(--tl-text-muted); margin-top:2px;">${p.requestCount} requests</span>
          </div>
          <div style="text-align:right;">
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
              <span style="color:#2dd4bf; font-weight:700; font-size:11px; background:rgba(45,212,191,0.12); padding:1px 5px; border-radius:4px; border:1px solid rgba(45,212,191,0.25);">${p.percentage}%</span>
              <span style="font-size:14px; font-weight:700; color:#fff;">${formatCompact(p.tokens)}</span>
            </div>
            <div style="font-size:11px; color:#2dd4bf; font-weight:600;">${formatCost(p.cost, currencySymbol)}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function renderHistoryTable(requests, currencySymbol = "$") {
    const tbody = document.getElementById("history-tbody");
    if (!tbody) return;

    let filtered = requests || [];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.promptSnippet && r.promptSnippet.toLowerCase().includes(q)) ||
          (r.model && r.model.toLowerCase().includes(q)) ||
          (r.provider && r.provider.toLowerCase().includes(q)),
      );
    }

    if (providerFilter !== "all") {
      filtered = filtered.filter((r) => r.provider === providerFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching requests found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((r) => {
        return `
        <tr title="Click to view details" data-id="${r.id}" class="request-row" style="cursor:pointer;">
          <td style="color:var(--tl-text-muted); font-size:11px;">${formatTime(r.timestamp)}</td>
          <td><span class="badge badge-${r.provider}">${r.provider}</span></td>
          <td><strong style="color:#fff;">${r.model}</strong></td>
          <td class="prompt-col">${r.promptSnippet || "Prompt execution"}</td>
          <td>
            <span style="font-weight:600; color:#fff;">${formatNumber(r.totalTokens)}</span>
            <span style="color:var(--tl-text-muted); font-size:10px;"> (${formatCompact(r.promptTokens)} / ${formatCompact(r.completionTokens)})</span>
          </td>
          <td class="cost-col">${formatCost(r.estimatedCost, currencySymbol)}</td>
          <td style="color:var(--tl-text-muted); font-size:11px;">${r.latencyMs ? r.latencyMs + "ms" : "-"}</td>
        </tr>
      `;
      })
      .join("");

    // Row click event to show details in notification or alert
    tbody.querySelectorAll(".request-row").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-id");
        const req = requests.find((r) => r.id === id);
        if (req) {
          vscode.postMessage({
            command: "showRequestDetails",
            record: req,
          });
        }
      });
    });
  }

  function updateDashboard(state) {
    currentState = state;
    renderKPIs(state.summary, state.currencySymbol);
    renderAreaChart(state.dailyPoints);
    renderModelBreakdown(state.modelBreakdown, state.currencySymbol);
    renderProviderCards(state.providerBreakdown, state.currencySymbol);
    renderHistoryTable(state.recentRequests, state.currencySymbol);
  }

  // Time range button handlers
  document.querySelectorAll(".time-range-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".time-range-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const range = e.target.getAttribute("data-range");
      vscode.postMessage({ command: "setTimeRange", range });
    });
  });

  // Chart Metric toggle (Tokens vs Cost)
  document
    .getElementById("toggle-chart-tokens")
    ?.addEventListener("click", (e) => {
      activeMetric = "tokens";
      e.target.classList.add("active");
      document.getElementById("toggle-chart-cost")?.classList.remove("active");
      if (currentState) renderAreaChart(currentState.dailyPoints);
    });

  document
    .getElementById("toggle-chart-cost")
    ?.addEventListener("click", (e) => {
      activeMetric = "cost";
      e.target.classList.add("active");
      document
        .getElementById("toggle-chart-tokens")
        ?.classList.remove("active");
      if (currentState) renderAreaChart(currentState.dailyPoints);
    });

  // Search input filter
  document.getElementById("history-search")?.addEventListener("input", (e) => {
    searchFilter = e.target.value;
    if (currentState)
      renderHistoryTable(
        currentState.recentRequests,
        currentState.currencySymbol,
      );
  });

  // Provider dropdown filter
  document
    .getElementById("history-provider-filter")
    ?.addEventListener("change", (e) => {
      providerFilter = e.target.value;
      if (currentState)
        renderHistoryTable(
          currentState.recentRequests,
          currentState.currencySymbol,
        );
    });

  // Action buttons
  document.getElementById("btn-sync")?.addEventListener("click", () => {
    vscode.postMessage({ command: "syncAccount" });
  });

  document.getElementById("btn-export")?.addEventListener("click", () => {
    vscode.postMessage({ command: "exportJSON" });
  });

  document.getElementById("btn-clear")?.addEventListener("click", () => {
    vscode.postMessage({ command: "clearUsage" });
  });

  document.getElementById("btn-settings")?.addEventListener("click", () => {
    vscode.postMessage({ command: "openSettings" });
  });

  // Handle messages from VS Code
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "stateUpdate") {
      updateDashboard(message.state);
    }
  });

  // Request initial state
  vscode.postMessage({ command: "refresh" });
})();
