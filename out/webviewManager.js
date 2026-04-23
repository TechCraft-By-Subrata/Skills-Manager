"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebviewManager = void 0;
const vscode = __importStar(require("vscode"));
class WebviewManager {
    getHtmlContent() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skills Manager By TCBS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      line-height: 1.5;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { margin-bottom: 20px; font-size: 24px; }
    .section {
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .section h2 { font-size: 16px; margin-bottom: 15px; }
    
    .source-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 15px;
    }
    .source-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .source-info {
      flex: 1;
    }
    .source-repo { font-weight: bold; }
    .source-path { opacity: 0.7; font-size: 11px; }
    
    .btn {
      padding: 6px 12px;
      font-size: 12px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.8; }
    .btn-delete {
      background: var(--vscode-errorForeground);
      color: white;
      padding: 4px 8px;
    }
    .btn-sync {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-add {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      width: 100%;
      padding: 10px;
      margin-top: 10px;
    }

    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      font-size: 13px;
    }
    .form-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--vscode-widget-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 3px;
      font-size: 13px;
      font-family: monospace;
    }
    .form-group input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .message {
      padding: 10px;
      border-radius: 3px;
      margin-bottom: 15px;
      display: none;
    }
    .message.show { display: block; }
    .message.info { background: var(--vscode-editor-infoBackground); color: var(--vscode-editor-infoForeground); }
    .message.error { background: var(--vscode-editor-errorBackground); color: var(--vscode-editor-errorForeground); }
    .message.success { background: var(--vscode-editor-warningBackground); }

    .empty-state {
      padding: 20px;
      text-align: center;
      opacity: 0.6;
      font-style: italic;
    }

    .controls {
      display: flex;
      gap: 10px;
    }
    .controls .btn { flex: 1; }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .title-row h1 { margin-bottom: 0; }
    .sponsor-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      background: #ea4aaa;
      color: #fff;
      text-decoration: none;
      transition: opacity 0.2s;
      white-space: nowrap;
    }
    .sponsor-btn:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-row">
      <h1>Skills Manager By TCBS</h1>
      <a class="sponsor-btn" href="https://github.com/sponsors/subraatakumar" target="_blank">
        ♥ Sponsor
      </a>
    </div>
    
    <div id="message" class="message"></div>

    <div class="section">
      <h2>Configured Sources</h2>
      <div id="sourceList" class="source-list"></div>
    </div>

    <div class="section">
      <h2>Add New Source</h2>
      <form id="addForm">
        <div class="form-group">
          <label for="repo">Repository *</label>
          <input id="repo" type="text" placeholder="owner/repo (e.g., software-mansion/react-native-executorch)" required>
        </div>
        <div class="form-group">
          <label for="path">Skill Path</label>
          <input id="path" type="text" placeholder="skills" value="skills">
        </div>
        <div class="form-group">
          <label for="branch">Branch</label>
          <input id="branch" type="text" placeholder="main" value="main">
        </div>
        <button type="submit" class="btn btn-add">+ Add Source</button>
      </form>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function showMessage(text, type = 'info') {
      const el = document.getElementById('message');
      el.textContent = text;
      el.className = \`message show \${type}\`;
      setTimeout(() => { el.classList.remove('show'); }, 5000);
    }

    function renderSources() {
      vscode.postMessage({ command: 'refresh' });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'updateSources') {
        const list = document.getElementById('sourceList');
        const sources = message.sources || [];
        
        if (sources.length === 0) {
          list.innerHTML = '<div class="empty-state">No sources configured yet</div>';
          return;
        }

        list.innerHTML = sources.map((src, idx) => \`
          <div class="source-item">
            <div class="source-info">
              <div class="source-repo">\${src.repo}</div>
              <div class="source-path">\${src.path} @ \${src.branch}</div>
            </div>
            <div class="controls">
              <button type="button" class="btn btn-sync" onclick="syncSource(\${idx})">Sync</button>
              <button type="button" class="btn btn-delete" onclick="deleteSource(\${idx})">Delete</button>
            </div>
          </div>
        \`).join('');
      }
    });

    window.syncSource = (index) => {
      vscode.postMessage({ command: 'sync', index });
      showMessage('Syncing...', 'info');
    };

    window.deleteSource = (index) => {
      if (confirm('Remove this source?')) {
        vscode.postMessage({ command: 'delete', index });
      }
    };

    document.getElementById('addForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const repo = document.getElementById('repo').value.trim();
      const path = document.getElementById('path').value.trim() || 'skills';
      const branch = document.getElementById('branch').value.trim() || 'main';

      if (!repo.includes('/')) {
        showMessage('Repository must be in owner/repo format', 'error');
        return;
      }

      vscode.postMessage({
        command: 'add',
        data: { repo, path, branch }
      });

      document.getElementById('repo').value = '';
      document.getElementById('path').value = 'skills';
      document.getElementById('branch').value = 'main';
      showMessage('Source added!', 'success');
    });

    // Initial load
    renderSources();
  </script>
</body>
</html>
    `;
    }
    createPanel(context, onMessage) {
        this.onMessageHandler = onMessage;
        if (this.panel) {
            this.panel.reveal();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('skillsManager', 'Skills Manager By TCBS', vscode.ViewColumn.One, { enableScripts: true });
        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => { this.panel = undefined; });
        this.panel.webview.onDidReceiveMessage(onMessage);
    }
    registerDashboardView(context, viewId) {
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, {
            resolveWebviewView: (webviewView) => {
                this.view = webviewView;
                webviewView.webview.options = { enableScripts: true };
                webviewView.webview.html = this.getHtmlContent();
                webviewView.webview.onDidReceiveMessage((msg) => {
                    if (this.onMessageHandler) {
                        this.onMessageHandler(msg);
                    }
                });
                webviewView.onDidDispose(() => {
                    this.view = undefined;
                });
            },
        }));
    }
    setOnMessageHandler(onMessage) {
        this.onMessageHandler = onMessage;
    }
    updateSources(sources) {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateSources',
                sources,
            });
        }
        if (this.view) {
            this.view.webview.postMessage({
                command: 'updateSources',
                sources,
            });
        }
    }
    reveal() {
        if (this.panel) {
            this.panel.reveal();
        }
    }
}
exports.WebviewManager = WebviewManager;
//# sourceMappingURL=webviewManager.js.map