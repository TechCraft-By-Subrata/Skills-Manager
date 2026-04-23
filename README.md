# Skills Manager for VS Code

A VS Code extension to sync GitHub Copilot agent skills from GitHub repositories into `~/.agents/skills/`.

## Features

✨ **Graphical UI** — Add, manage, and sync skill sources without editing JSON
🔄 **Smart Caching** — Only re-downloads files when their SHAs change on GitHub
⏱️ **Auto-Sync** — Automatically syncs on VS Code startup (configurable)
📦 **Multi-Source** — Support multiple GitHub repositories as skill sources

## Quick Start

### 1. Open the UI Panel
- Press `Cmd+Shift+P` and search for **"Skills Manager: Manage Sources"**
- Or use the command palette: `skillsManager.openPanel`

### 2. Add a Source
In the UI panel, fill in:
- **Repository**: `owner/repo` (e.g., `software-mansion/react-native-executorch`)
- **Skill Path**: Folder within the repo where skills are stored (default: `skills`)
- **Branch**: Git branch to sync from (default: `main`)
- Click **"+ Add Source"**

### 3. Sync Skills
- Click **"Sync"** next to a source in the UI, OR
- Press `Cmd+Shift+P` → **"Skills Manager: Sync Skills Now"**
- Skills are downloaded to `~/.agents/skills/`

## Configuration (Manual)

If you prefer to configure via `settings.json`:

```json
"skillsManager.sources": [
  {
    "repo": "software-mansion/react-native-executorch",
    "path": "skills",
    "branch": "main"
  }
],
"skillsManager.autoSync": true,
"skillsManager.syncIntervalHours": 24
```

### Settings Options

| Setting | Default | Description |
|---------|---------|-------------|
| `skillsManager.sources` | `[]` | List of skill sources to sync |
| `skillsManager.autoSync` | `true` | Auto-sync on VS Code startup |
| `skillsManager.syncIntervalHours` | `24` | Hours between syncs (0 = always sync) |
| `skillsManager.skillsDir` | `~/.agents/skills` | Override skills directory location |

## Commands

- `Skills Manager: Manage Sources` — Open the UI panel
- `Skills Manager: Sync Skills Now` — Force sync all sources
- `Skills Manager: Show Sync Status` — Open the output log

## How It Works

1. **State Tracking**: Stores file SHAs in `~/Library/Application Support/Code/User/globalStorage/...`
2. **Efficient Caching**: Only downloads files that have changed on GitHub
3. **Interval Checking**: Respects `syncIntervalHours` to avoid excessive API calls
4. **Version Control**: Tracks when each source was last synced

## Example: Adding React Native ExecuTorch Skills

1. Open Skills Manager UI (`Cmd+Shift+P` → "Skills Manager: Manage Sources")
2. Enter:
   - Repository: `software-mansion/react-native-executorch`
   - Skill Path: `skills`
   - Branch: `main`
3. Click **"+ Add Source"**
4. Click **"Sync"** to download skills immediately
5. Skills are now available in `~/.agents/skills/react-native-executorch/`

## Troubleshooting

**No skills downloaded?**
- Check the output log: `Skills Manager: Show Sync Status`
- Verify the repo path and branch exist on GitHub

**"Skills Manager" commands not appearing?**
- Reload VS Code: Press `Cmd+Shift+P` → "Developer: Reload Window"

**Permission denied?**
- For private repos, add an optional `token` field in settings:
  ```json
  "skillsManager.sources": [
    {
      "repo": "owner/private-repo",
      "path": "skills",
      "branch": "main",
      "token": "ghp_xxxxxxxxxxxxxxxxxxxx"
    }
  ]
  ```

## Development

```bash
cd ~/ai/skills-manager-ext

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package as .vsix
npx vsce package

# Install locally
code --install-extension ./skills-manager-0.2.0.vsix
```

## License

MIT
