import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { StateManager } from './stateManager';

export interface SkillSource {
  repo: string;
  path: string;
  branch: string;
  token?: string;
}

interface GitHubEntry {
  name: string;
  type: 'file' | 'dir';
  sha: string;
  download_url: string | null;
  url: string;
}

function getSkillsDir(config: vscode.WorkspaceConfiguration): string {
  const override = config.get<string>('skillsDir', '');
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return path.join(os.homedir(), '.agents', 'skills');
}

function githubRequest<T>(url: string, token?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'vscode-skills-manager',
        'Accept': 'application/vnd.github.v3+json',
        ...(token ? { 'Authorization': `token ${token}` } : {}),
      },
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data) as T);
          } catch (e) {
            reject(new Error(`Failed to parse GitHub response: ${data}`));
          }
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url: string, token?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'vscode-skills-manager',
        ...(token ? { 'Authorization': `token ${token}` } : {}),
      },
    };
    const req = https.get(options, (res) => {
      // Follow redirects (raw.githubusercontent.com)
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location!, token).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Download error ${res.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function syncDirectory(
  apiUrl: string,
  localDir: string,
  token: string | undefined,
  shas: Record<string, string>,
  existingShas: Record<string, string>
): Promise<void> {
  const entries = await githubRequest<GitHubEntry[]>(apiUrl, token);

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    if (entry.type === 'dir') {
      await syncDirectory(entry.url, localPath, token, shas, existingShas);
    } else if (entry.type === 'file' && entry.download_url) {
      const existingSha = existingShas[localPath];
      if (existingSha && existingSha === entry.sha) {
        // Unchanged, skip download
        shas[localPath] = entry.sha;
        continue;
      }
      const content = await downloadFile(entry.download_url, token);
      fs.writeFileSync(localPath, content, 'utf-8');
      shas[localPath] = entry.sha;
    }
  }
}

export async function syncSkills(
  sources: SkillSource[],
  stateManager: StateManager,
  intervalHours: number,
  config: vscode.WorkspaceConfiguration,
  output: vscode.OutputChannel,
  force = false
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const skillsDir = getSkillsDir(config);
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  for (const source of sources) {
    const { repo, path: repoPath, branch, token } = source;
    const key = `${repo}::${repoPath}`;

    if (!force && !stateManager.needsSync(repo, repoPath, intervalHours)) {
      output.appendLine(`[SKIP] ${key} — synced recently, within ${intervalHours}h window.`);
      skipped++;
      continue;
    }

    output.appendLine(`[SYNC] ${key} @ branch:${branch}`);

    try {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}?ref=${branch}`;
      const topEntries = await githubRequest<GitHubEntry[]>(apiUrl, token);
      const skillFolders = topEntries.filter((e) => e.type === 'dir');
      const existingState = stateManager.getSourceState(repo, repoPath);
      const existingShas: Record<string, string> = existingState?.lastSyncedShas ?? {};
      const newShas: Record<string, string> = {};

      for (const folder of skillFolders) {
        const localSkillDir = path.join(skillsDir, folder.name);
        output.appendLine(`  → Syncing skill: ${folder.name}`);
        await syncDirectory(folder.url, localSkillDir, token, newShas, existingShas);
      }

      stateManager.updateSourceState(repo, repoPath, newShas);
      output.appendLine(`[DONE] ${key} — ${skillFolders.length} skill(s) synced.`);
      synced++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      output.appendLine(`[ERROR] ${key} — ${msg}`);
      errors.push(`${key}: ${msg}`);
    }
  }

  return { synced, skipped, errors };
}
