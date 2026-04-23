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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const stateManager_1 = require("./stateManager");
const skillsManager_1 = require("./skillsManager");
const webviewManager_1 = require("./webviewManager");
let outputChannel;
let statusBarItem;
let webviewManager;
function activate(context) {
    outputChannel = vscode.window.createOutputChannel('Skills Manager');
    context.subscriptions.push(outputChannel);
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'skillsManager.showStatus';
    context.subscriptions.push(statusBarItem);
    const stateManager = new stateManager_1.StateManager(context);
    webviewManager = new webviewManager_1.WebviewManager();
    webviewManager.setOnMessageHandler(async (msg) => {
        await handleWebviewMessage(msg, stateManager, context);
    });
    webviewManager.registerDashboardView(context, 'skillsManager.dashboard');
    // Command: Open the UI panel
    context.subscriptions.push(vscode.commands.registerCommand('skillsManager.openPanel', () => {
        webviewManager.createPanel(context, async (msg) => {
            await handleWebviewMessage(msg, stateManager, context);
        });
        updateWebviewSources(stateManager);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('skillsManager.focus', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.skillsManager');
        await vscode.commands.executeCommand('skillsManager.dashboard.focus');
        updateWebviewSources(stateManager);
    }));
    // Command: Sync now (manual, always forces check)
    context.subscriptions.push(vscode.commands.registerCommand('skillsManager.sync', async () => {
        await runSync(stateManager, true);
        updateWebviewSources(stateManager);
    }));
    // Command: Show output channel
    context.subscriptions.push(vscode.commands.registerCommand('skillsManager.showStatus', () => {
        outputChannel.show();
    }));
    // Auto-sync on startup if enabled
    const config = vscode.workspace.getConfiguration('skillsManager');
    if (config.get('autoSync', true)) {
        setTimeout(() => runSync(stateManager, false), 3000);
    }
}
async function handleWebviewMessage(msg, stateManager, context) {
    const config = vscode.workspace.getConfiguration('skillsManager');
    switch (msg.command) {
        case 'add': {
            if (!msg.data)
                return;
            const sources = config.get('sources', []);
            sources.push({
                repo: msg.data.repo,
                path: msg.data.path || 'skills',
                branch: msg.data.branch || 'main',
            });
            await config.update('sources', sources, vscode.ConfigurationTarget.Global);
            updateWebviewSources(stateManager);
            outputChannel.appendLine(`[ADD] Source added: ${msg.data.repo}`);
            break;
        }
        case 'delete': {
            if (msg.index === undefined)
                return;
            const sources = config.get('sources', []);
            const deleted = sources[msg.index];
            sources.splice(msg.index, 1);
            await config.update('sources', sources, vscode.ConfigurationTarget.Global);
            updateWebviewSources(stateManager);
            outputChannel.appendLine(`[DELETE] Source removed: ${deleted?.repo}`);
            break;
        }
        case 'sync': {
            await runSync(stateManager, true);
            updateWebviewSources(stateManager);
            break;
        }
        case 'refresh': {
            updateWebviewSources(stateManager);
            break;
        }
    }
}
function updateWebviewSources(stateManager) {
    const config = vscode.workspace.getConfiguration('skillsManager');
    const sources = config.get('sources', []);
    webviewManager.updateSources(sources);
}
async function runSync(stateManager, force) {
    const config = vscode.workspace.getConfiguration('skillsManager');
    const rawSources = config.get('sources', []);
    if (rawSources.length === 0) {
        outputChannel.appendLine('[INFO] No skill sources configured. Add repos via Settings > Skills Manager.');
        setStatusBar('$(cloud-download) Skills: no sources', 'Skills Manager: No sources configured');
        return;
    }
    const sources = rawSources.map((s) => ({
        repo: s.repo,
        path: s.path ?? 'skills',
        branch: s.branch ?? 'main',
        token: s.token,
    }));
    const intervalHours = config.get('syncIntervalHours', 24);
    outputChannel.appendLine(`\n[${new Date().toISOString()}] Starting skills sync (force=${force})...`);
    setStatusBar('$(sync~spin) Skills: syncing…', 'Skills Manager: Syncing...');
    const result = await (0, skillsManager_1.syncSkills)(sources, stateManager, intervalHours, config, outputChannel, force);
    if (result.errors.length > 0) {
        setStatusBar(`$(warning) Skills: ${result.synced} synced, ${result.errors.length} error(s)`, 'Skills Manager: Completed with errors — click to view');
        vscode.window.showWarningMessage(`Skills Manager: ${result.errors.length} source(s) failed. Check the output channel for details.`, 'Show Output').then((choice) => {
            if (choice === 'Show Output') {
                outputChannel.show();
            }
        });
    }
    else {
        setStatusBar(`$(check) Skills: ${result.synced} synced, ${result.skipped} skipped`, 'Skills Manager: All sources up to date');
        if (result.synced > 0) {
            vscode.window.showInformationMessage(`Skills Manager: ${result.synced} source(s) synced successfully.`);
        }
    }
    outputChannel.appendLine(`[SUMMARY] synced=${result.synced} skipped=${result.skipped} errors=${result.errors.length}\n`);
}
function setStatusBar(text, tooltip) {
    statusBarItem.text = text;
    statusBarItem.tooltip = tooltip;
    statusBarItem.show();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map