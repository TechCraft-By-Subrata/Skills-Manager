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
exports.syncSkills = syncSkills;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const https = __importStar(require("https"));
function getSkillsDir(config) {
    const override = config.get('skillsDir', '');
    if (override && override.trim().length > 0) {
        return override.trim();
    }
    return path.join(os.homedir(), '.agents', 'skills');
}
function githubRequest(url, token) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
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
                        resolve(JSON.parse(data));
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse GitHub response: ${data}`));
                    }
                }
                else {
                    reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}
function downloadFile(url, token) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
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
                downloadFile(res.headers.location, token).then(resolve).catch(reject);
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                }
                else {
                    reject(new Error(`Download error ${res.statusCode}: ${url}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}
async function syncDirectory(apiUrl, localDir, token, shas, existingShas) {
    const entries = await githubRequest(apiUrl, token);
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }
    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        if (entry.type === 'dir') {
            await syncDirectory(entry.url, localPath, token, shas, existingShas);
        }
        else if (entry.type === 'file' && entry.download_url) {
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
async function syncSkills(sources, stateManager, intervalHours, config, output, force = false) {
    const skillsDir = getSkillsDir(config);
    const errors = [];
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
            const topEntries = await githubRequest(apiUrl, token);
            const skillFolders = topEntries.filter((e) => e.type === 'dir');
            const existingState = stateManager.getSourceState(repo, repoPath);
            const existingShas = existingState?.lastSyncedShas ?? {};
            const newShas = {};
            for (const folder of skillFolders) {
                const localSkillDir = path.join(skillsDir, folder.name);
                output.appendLine(`  → Syncing skill: ${folder.name}`);
                await syncDirectory(folder.url, localSkillDir, token, newShas, existingShas);
            }
            stateManager.updateSourceState(repo, repoPath, newShas);
            output.appendLine(`[DONE] ${key} — ${skillFolders.length} skill(s) synced.`);
            synced++;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            output.appendLine(`[ERROR] ${key} — ${msg}`);
            errors.push(`${key}: ${msg}`);
        }
    }
    return { synced, skipped, errors };
}
//# sourceMappingURL=skillsManager.js.map