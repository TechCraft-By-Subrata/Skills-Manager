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
exports.StateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class StateManager {
    constructor(context) {
        this.state = { sources: {} };
        const storageDir = context.globalStorageUri.fsPath;
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        this.stateFilePath = path.join(storageDir, 'skills-state.json');
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
                this.state = JSON.parse(raw);
            }
        }
        catch {
            this.state = { sources: {} };
        }
    }
    save() {
        fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    }
    getSourceState(repo, repoPath) {
        return this.state.sources[`${repo}::${repoPath}`];
    }
    updateSourceState(repo, repoPath, shas) {
        this.state.sources[`${repo}::${repoPath}`] = {
            repo,
            path: repoPath,
            lastSyncedAt: Date.now(),
            lastSyncedShas: shas,
        };
        this.save();
    }
    needsSync(repo, repoPath, intervalHours) {
        if (intervalHours === 0) {
            return true;
        }
        const sourceState = this.getSourceState(repo, repoPath);
        if (!sourceState) {
            return true;
        }
        const elapsed = Date.now() - sourceState.lastSyncedAt;
        return elapsed > intervalHours * 60 * 60 * 1000;
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=stateManager.js.map