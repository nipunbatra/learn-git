// localStorage persistence for level progress

const STORAGE_KEY = 'gitquest_progress';

export class ProgressTracker {
  constructor() {
    this.data = this._load();
  }

  getCurrentLevel() {
    return Number.isInteger(this.data.currentLevel) ? this.data.currentLevel : 0;
  }

  setCurrentLevel(level) {
    this.data.currentLevel = level;
    this._save();
  }

  markLevelComplete(levelNumber) {
    if (!this.data.completed) this.data.completed = [];
    if (!this.data.completed.includes(levelNumber)) {
      this.data.completed.push(levelNumber);
    }
    this._save();
  }

  isLevelComplete(levelNumber) {
    return (this.data.completed || []).includes(levelNumber);
  }

  getCompletedCount() {
    return (this.data.completed || []).length;
  }

  resetProgress() {
    this.data = { currentLevel: 0, completed: [] };
    this._save();
  }

  _load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { currentLevel: 0, completed: [] };
    } catch {
      return { currentLevel: 0, completed: [] };
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage unavailable
    }
  }
}
