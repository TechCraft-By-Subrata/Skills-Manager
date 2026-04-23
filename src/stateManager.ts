import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillSourceState {
  repo: string;
  path: string;
  lastSyncedAt: number;       // Unix ms timestamp
  lastSyncedShas: Record<string, string>; // skillFolderName -> last known SHA
}

export interface SkillsState {
  sources: Record<string, SkillSourceState>; // keyed by "repo::path"
}

export class StateManager {
  private stateFilePath: string;
  private state: SkillsState = { sources: {} };

  constructor(context: vscode.ExtensionContext) {
    const storageDir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.stateFilePath = path.join(storageDir, 'skills-state.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
        this.state = JSON.parse(raw);
      }
    } catch {
      this.state = { sources: {} };
    }
  }

  private save(): void {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  getSourceState(repo: string, repoPath: string): SkillSourceState | undefined {
    return this.state.sources[`${repo}::${repoPath}`];
  }

  updateSourceState(repo: string, repoPath: string, shas: Record<string, string>): void {
    this.state.sources[`${repo}::${repoPath}`] = {
      repo,
      path: repoPath,
      lastSyncedAt: Date.now(),
      lastSyncedShas: shas,
    };
    this.save();
  }

  needsSync(repo: string, repoPath: string, intervalHours: number): boolean {
    if (intervalHours === 0) { return true; }
    const sourceState = this.getSourceState(repo, repoPath);
    if (!sourceState) { return true; }
    const elapsed = Date.now() - sourceState.lastSyncedAt;
    return elapsed > intervalHours * 60 * 60 * 1000;
  }
}
