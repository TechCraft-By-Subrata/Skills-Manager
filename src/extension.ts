import * as vscode from 'vscode';
import { StateManager } from './stateManager';
import { syncSkills, SkillSource } from './skillsManager';
import { WebviewManager, SourceMessage, SourceData } from './webviewManager';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let webviewManager: WebviewManager;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Skills Manager');
  context.subscriptions.push(outputChannel);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'skillsManager.showStatus';
  context.subscriptions.push(statusBarItem);

  const stateManager = new StateManager(context);
  webviewManager = new WebviewManager();
  webviewManager.setOnMessageHandler(async (msg: SourceMessage) => {
    await handleWebviewMessage(msg, stateManager, context);
  });
  webviewManager.registerDashboardView(context, 'skillsManager.dashboard');

  // Command: Open the UI panel
  context.subscriptions.push(
    vscode.commands.registerCommand('skillsManager.openPanel', () => {
      webviewManager.createPanel(context, async (msg: SourceMessage) => {
        await handleWebviewMessage(msg, stateManager, context);
      });
      updateWebviewSources(stateManager);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('skillsManager.focus', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.skillsManager');
      await vscode.commands.executeCommand('skillsManager.dashboard.focus');
      updateWebviewSources(stateManager);
    })
  );

  // Command: Sync now (manual, always forces check)
  context.subscriptions.push(
    vscode.commands.registerCommand('skillsManager.sync', async () => {
      await runSync(stateManager, true);
      updateWebviewSources(stateManager);
    })
  );

  // Command: Show output channel
  context.subscriptions.push(
    vscode.commands.registerCommand('skillsManager.showStatus', () => {
      outputChannel.show();
    })
  );

  // Auto-sync on startup if enabled
  const config = vscode.workspace.getConfiguration('skillsManager');
  if (config.get<boolean>('autoSync', true)) {
    setTimeout(() => runSync(stateManager, false), 3000);
  }
}

async function handleWebviewMessage(
  msg: SourceMessage,
  stateManager: StateManager,
  context: vscode.ExtensionContext
): Promise<void> {
  const config = vscode.workspace.getConfiguration('skillsManager');
  
  switch (msg.command) {
    case 'add': {
      if (!msg.data) return;
      const sources = config.get<Array<SourceData>>('sources', []);
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
      if (msg.index === undefined) return;
      const sources = config.get<Array<SourceData>>('sources', []);
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

function updateWebviewSources(stateManager: StateManager): void {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const sources = config.get<Array<SourceData>>('sources', []);
  webviewManager.updateSources(sources);
}

async function runSync(stateManager: StateManager, force: boolean) {
  const config = vscode.workspace.getConfiguration('skillsManager');
  const rawSources = config.get<Array<{
    repo: string;
    path?: string;
    branch?: string;
    token?: string;
  }>>('sources', []);

  if (rawSources.length === 0) {
    outputChannel.appendLine('[INFO] No skill sources configured. Add repos via Settings > Skills Manager.');
    setStatusBar('$(cloud-download) Skills: no sources', 'Skills Manager: No sources configured');
    return;
  }

  const sources: SkillSource[] = rawSources.map((s) => ({
    repo: s.repo,
    path: s.path ?? 'skills',
    branch: s.branch ?? 'main',
    token: s.token,
  }));

  const intervalHours = config.get<number>('syncIntervalHours', 24);

  outputChannel.appendLine(`\n[${new Date().toISOString()}] Starting skills sync (force=${force})...`);
  setStatusBar('$(sync~spin) Skills: syncing…', 'Skills Manager: Syncing...');

  const result = await syncSkills(sources, stateManager, intervalHours, config, outputChannel, force);

  if (result.errors.length > 0) {
    setStatusBar(
      `$(warning) Skills: ${result.synced} synced, ${result.errors.length} error(s)`,
      'Skills Manager: Completed with errors — click to view'
    );
    vscode.window.showWarningMessage(
      `Skills Manager: ${result.errors.length} source(s) failed. Check the output channel for details.`,
      'Show Output'
    ).then((choice) => {
      if (choice === 'Show Output') { outputChannel.show(); }
    });
  } else {
    setStatusBar(
      `$(check) Skills: ${result.synced} synced, ${result.skipped} skipped`,
      'Skills Manager: All sources up to date'
    );
    if (result.synced > 0) {
      vscode.window.showInformationMessage(
        `Skills Manager: ${result.synced} source(s) synced successfully.`
      );
    }
  }

  outputChannel.appendLine(`[SUMMARY] synced=${result.synced} skipped=${result.skipped} errors=${result.errors.length}\n`);
}

function setStatusBar(text: string, tooltip: string) {
  statusBarItem.text = text;
  statusBarItem.tooltip = tooltip;
  statusBarItem.show();
}

export function deactivate() {}
