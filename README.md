# TokenLens - AI Usage & Cost Tracker

TokenLens is a lightweight VS Code and Cursor extension for tracking LLM token consumption, estimated API costs, and request latency. It runs locally in your editor with a compact Sidebar for daily tracking and an Editor Tab Dashboard for detailed breakdowns.

[![Direct Download Latest VSIX](https://img.shields.io/badge/Download_Latest-tokenlens.vsix-0D9488?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://github.com/somya-ranjan/TokenLens/releases/latest/download/tokenlens.vsix)
[![Latest Release Page](https://img.shields.io/badge/Latest_Release-Page-14B8A6?style=for-the-badge&logo=github&logoColor=white)](https://github.com/somya-ranjan/TokenLens/releases/latest)

---

## Direct Download

- **Latest VSIX Package (Direct)**: [Download tokenlens.vsix](https://github.com/somya-ranjan/TokenLens/releases/latest/download/tokenlens.vsix) (always downloads the newest release)
- **Repository Raw File**: [Download tokenlens.vsix from main branch](https://github.com/somya-ranjan/TokenLens/raw/main/tokenlens.vsix)
- **Latest Release Page**: [View Latest GitHub Release](https://github.com/somya-ranjan/TokenLens/releases/latest) (auto-redirects to newest version)
- **All Releases Archive**: [Browse All Releases](https://github.com/somya-ranjan/TokenLens/releases)

---

## Installation Guide

### Option 1: Install Pre-built VSIX (Recommended)

1. Download `tokenlens.vsix` using the direct download link above.
2. Install via your terminal:

```bash
# For VS Code
code --install-extension tokenlens.vsix

# For Cursor
cursor --install-extension tokenlens.vsix
```

3. Or install via the Editor UI:
   - Open the Command Palette (`Ctrl + Shift + P` on Windows/Linux, `Cmd + Shift + P` on macOS).
   - Type and select **`Extensions: Install from VSIX...`**.
   - Pick the downloaded `.vsix` file.
   - Reload your editor window when prompted.

### Option 2: Build from Source

```bash
# 1. Clone repository
git clone https://github.com/somya-ranjan/TokenLens.git
cd TokenLens

# 2. Install dependencies (requires Bun or Node.js)
bun install

# 3. Package extension into a .vsix file
bun run build

# 4. Install the generated package
code --install-extension tokenlens.vsix --force
```

---

## IDE Compatibility

TokenLens targets standard VS Code Extension APIs (`engines.vscode: ^1.85.0`) with zero native binaries:

| Editor                | Support   | Installation Method        |
| :-------------------- | :-------- | :------------------------- |
| **VS Code**           | Supported | Marketplace / VSIX         |
| **Cursor**            | Supported | VSIX / Extensions view     |
| **Windsurf**          | Supported | VSIX / Extensions view     |
| **VSCodium**          | Supported | VSIX / Open VSX            |
| **GitHub Codespaces** | Supported | VSIX / Workspace extension |

---

## Features

### 1. Compact Sidebar View

- **Daily Metrics**: Input (prompt) tokens, output (completion) tokens, request count, and estimated cost.
- **Ratio Bar**: Visual balance of prompt tokens vs. completion tokens.
- **7-Day Trend**: Lightweight SVG sparkline showing weekly consumption.
- **Quick Action Buttons**: Fast shortcuts to open the full dashboard, sync cloud usage, or refresh stats.

### 2. Full Editor Tab Dashboard

- **Summary Cards**: Total tokens, total cost, total requests, and average tokens per API call.
- **Interactive Chart**: Daily usage timeline toggleable between token count and USD cost.
- **Time Range Filters**: Filter analytics by `Today`, `7 Days`, `30 Days`, or `All Time`.
- **Model Breakdown**: Usage and cost split across individual models (GPT-4o, Claude 3.7 Sonnet, Gemini 2.0 Flash, DeepSeek, etc.).
- **Provider Status**: Track consumption across OpenAI, Anthropic, Google Gemini, DeepSeek, and Copilot.
- **Budget Tracking**: Visual progress bar for your configured daily limit with warning states.
- **Request History Table**: Searchable and filterable log with prompt snippets, token counts, cost, and latency.
- **JSON Export**: Export recorded usage data to a JSON file for analysis or backups.

### 3. Direct Cloud Sync

- Pull workspace usage data directly from the official **OpenAI Usage API** and **Anthropic Admin API** without third-party proxies.

### 4. Privacy-First Architecture

- All token logs, stats, and API keys are stored strictly in your local editor storage (`globalState`).
- No external tracking servers or third-party telemetry.

---

## Supported Providers & Models

TokenLens includes pre-configured pricing rates per 1M tokens (cached inputs, standard inputs, and outputs):

| Provider          | Models Covered                                                        |
| :---------------- | :-------------------------------------------------------------------- |
| **OpenAI**        | GPT-4o, GPT-4o-mini, o1, o1-mini, o3-mini, GPT-4-turbo, GPT-3.5-turbo |
| **Anthropic**     | Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus |
| **Google Gemini** | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash                    |
| **DeepSeek**      | DeepSeek Chat (V3), DeepSeek Reasoner (R1)                            |
| **Copilot**       | Local editor assistant request logging and token estimation           |

---

## Configuration Settings

Customize TokenLens in your VS Code / Cursor `settings.json`:

| Setting                     | Type      | Default | Description                                                                        |
| :-------------------------- | :-------- | :------ | :--------------------------------------------------------------------------------- |
| `tokenlens.dailyBudget`     | `number`  | `2.0`   | Daily spend budget in USD for warning indicators                                   |
| `tokenlens.monthlyBudget`   | `number`  | `50.0`  | Monthly spend budget in USD                                                        |
| `tokenlens.currencySymbol`  | `string`  | `$`     | Currency symbol displayed throughout the UI                                        |
| `tokenlens.trackCopilot`    | `boolean` | `true`  | Track requests from Copilot and editor assistants                                  |
| `tokenlens.openaiApiKey`    | `string`  | `""`    | OpenAI API key for cloud usage sync (requires `api.usage.read` scope or Admin key) |
| `tokenlens.anthropicApiKey` | `string`  | `""`    | Anthropic Admin API key (`sk-ant-admin...`) to fetch workspace usage               |

---

## Development & Commands

### Available Scripts

```bash
# Format codebase with Prettier
bun run format

# Verify formatting
bun run format:check

# Package .vsix
bun run build
```

### Registered Commands

| Command                         | Title                               | Description                                        |
| :------------------------------ | :---------------------------------- | :------------------------------------------------- |
| `aiUsageMonitor.openDashboard`  | TokenLens: Open Full Dashboard      | Opens the analytics dashboard in an editor tab     |
| `aiUsageMonitor.syncCloudUsage` | TokenLens: Sync Cloud Account Usage | Pulls usage records from OpenAI and Anthropic APIs |
| `aiUsageMonitor.clearUsage`     | TokenLens: Reset Usage Data         | Resets stored token records after confirmation     |
| `aiUsageMonitor.exportData`     | TokenLens: Export Usage (JSON)      | Exports all records to an editor JSON document     |

---

## License

MIT License
