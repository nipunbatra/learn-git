// Bootstrap — wires everything together

import { GitEngine } from './engine/git-engine.js';
import { TerminalUI } from './terminal/terminal-ui.js';
import { GraphAnimator } from './graph/graph-animator.js';
import { LevelManager } from './levels/level-manager.js';
import { NotificationManager } from './ui/notification.js';
import { ProgressTracker } from './ui/progress-tracker.js';
import { LayoutManager } from './ui/layout-manager.js';

class App {
  constructor() {
    this.engine = new GitEngine();
    this.notifications = new NotificationManager();
    this.progress = new ProgressTracker();
    this.layout = new LayoutManager();
    this.graph = new GraphAnimator('graph-container');
    this.graphTimeline = [];
    this.graphTimelineIndex = -1;
    this.levelManager = new LevelManager(this.engine, this.notifications, this.progress);

    this.terminal = new TerminalUI(this.engine, (input, parsed, result) => {
      this._onCommand(input, parsed, result);
    });

    this.levelManager.onLevelChange = () => {
      this.terminal.clear();
      this.terminal.updatePrompt();
      this._resetGraphTimeline();
      this._updateGraph();
      this._updateRepoState();
      this._updateWorkspaceInspector();
      this._updateClarityPanel();
      this.levelManager.checkObjectives();
      this.terminal.writeHtml(
        `<span class="term-cyan">Lesson loaded!</span> <span class="term-muted">Read the objectives on the left and start typing commands.</span>`
      );
      this.terminal.focus();
    };
    this.levelManager.onObjectivesUpdate = (results) => {
      this._updateCommandCoach(results);
    };

    this._bindUI();
    this.layout.init();

    // Load saved level or start at 1
    const savedLevel = this.progress.getCurrentLevel();
    this.levelManager.loadLevel(savedLevel);

    // Update graph after level setup
    this._updateGraph();
    this._updateRepoState();
    this._updateWorkspaceInspector();
    this._updateClarityPanel();
    this.levelManager.checkObjectives();

    // Welcome message
    this.terminal.writeHtml(
      '<span class="term-green term-bold">Welcome to GitQuest!</span> ' +
      '<span class="term-muted">Type commands below to learn Git. Type "help" for available commands. Press Tab to autocomplete.</span>'
    );
    this.terminal.focus();

  }

  _bindUI() {
    // Hint button in top bar
    document.getElementById('btn-hint').addEventListener('click', () => {
      this.levelManager.nextHint();
    });

    // Reset button
    document.getElementById('btn-reset').addEventListener('click', () => {
      const lessonNum = this.levelManager.currentLevelIndex;
      this.levelManager.loadLevel(lessonNum);
      this.notifications.showToast(`Lesson ${lessonNum} reset!`, 'info');
    });

    // Reset to lesson 0
    document.getElementById('btn-reset-zero').addEventListener('click', () => {
      this.progress.resetProgress();
      this.levelManager.loadLevel(0);
      this.notifications.showToast('Progress reset to Lesson 0', 'info');
    });

    // Re-render graph on layout change
    window.addEventListener('layout-change', () => {
      this._renderGraphAtTimelineIndex();
    });

    document.getElementById('graph-prev').addEventListener('click', () => {
      if (this.graphTimelineIndex > 0) {
        this.graphTimelineIndex -= 1;
        this._renderGraphAtTimelineIndex();
      }
    });

    document.getElementById('graph-next').addEventListener('click', () => {
      if (this.graphTimelineIndex < this.graphTimeline.length - 1) {
        this.graphTimelineIndex += 1;
        this._renderGraphAtTimelineIndex();
      }
    });

    document.getElementById('graph-live').addEventListener('click', () => {
      this.graphTimelineIndex = this.graphTimeline.length - 1;
      this._renderGraphAtTimelineIndex();
    });

    document.getElementById('command-coach-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.command-chip');
      if (!chip) return;
      const cmd = chip.dataset.command || '';
      this.terminal.setInput(cmd);
    });
  }

  _onCommand(input, parsed, result) {
    // Update graph after every command
    this._updateGraph();
    this._updateRepoState();
    this._updateWorkspaceInspector();
    this._updateClarityPanel();

    // Update terminal prompt (branch may have changed)
    this.terminal.updatePrompt();

    // Check level objectives
    this.levelManager.checkObjectives();
  }

  _updateGraph(record = true) {
    const state = this.engine.getGraphState();
    if (record) {
      this._recordGraphSnapshot(state);
    } else if (this._isGraphLive()) {
      this._recordGraphSnapshot(state);
    }
    this._renderGraphAtTimelineIndex();
  }

  _renderGraphHeader(state) {
    // Update branch info in graph header
    const branchInfo = document.getElementById('graph-branch-info');
    if (branchInfo) {
      const branch = state.head && state.head.type === 'branch' ? state.head.ref : 'detached';
      const headCommit = state.headCommitId;
      const replaySuffix = this._isGraphLive() ? '' : ' (replay)';
      if (branch && headCommit) {
        branchInfo.textContent = `${branch} @ ${headCommit}${replaySuffix}`;
      } else if (branch) {
        branchInfo.textContent = `${branch}${replaySuffix}`;
      } else {
        branchInfo.textContent = '';
      }
    }
  }

  _updateRepoState() {
    const wdEl = document.getElementById('repo-state-working');
    const stageEl = document.getElementById('repo-state-staging');
    const headEl = document.getElementById('repo-state-head');
    const wdFilesEl = document.getElementById('repo-state-working-files');
    const stageFilesEl = document.getElementById('repo-state-staging-files');
    const headFilesEl = document.getElementById('repo-state-head-files');
    if (!wdEl || !stageEl || !headEl || !wdFilesEl || !stageFilesEl || !headFilesEl) return;

    const summary = this.engine.getWorkspaceSummary();
    const workingFiles = this.engine.workingDirectory.listFiles();
    const stagingFiles = summary.staged;
    const workingCount = workingFiles.length;
    const stagingCount = stagingFiles.length;
    const branch = summary.branch;
    const headCommit = summary.headCommitId;

    wdEl.textContent = `${workingCount} file${workingCount === 1 ? '' : 's'}`;
    stageEl.textContent = `${stagingCount} file${stagingCount === 1 ? '' : 's'}`;
    wdFilesEl.innerHTML = this._renderFileTags(workingFiles, 'repo-file-tag');
    stageFilesEl.innerHTML = this._renderFileTags(stagingFiles, 'repo-file-tag repo-file-tag--staged');

    if (!headCommit) {
      headEl.textContent = this.engine.initialized ? 'No commits yet' : 'No repo';
      headFilesEl.innerHTML = this._renderFileTags([], 'repo-file-tag repo-file-tag--head');
      return;
    }

    headEl.textContent = branch ? `${branch} @ ${headCommit}` : `detached @ ${headCommit}`;
    const committedFiles = [...this.engine.mergeEngine.getFilesAtCommit(headCommit).keys()].sort();
    headFilesEl.innerHTML = this._renderFileTags(committedFiles, 'repo-file-tag repo-file-tag--head');
  }

  _updateWorkspaceInspector() {
    const summary = this.engine.getWorkspaceSummary();
    const stagedEl = document.getElementById('inspector-staged');
    const unstagedEl = document.getElementById('inspector-unstaged');
    const untrackedEl = document.getElementById('inspector-untracked');
    if (!stagedEl || !unstagedEl || !untrackedEl) return;

    stagedEl.textContent = this._formatFileList(summary.staged);
    unstagedEl.textContent = this._formatFileList(summary.unstaged);
    untrackedEl.textContent = this._formatFileList(summary.untracked);
  }

  _updateClarityPanel() {
    const headLine = document.getElementById('clarity-head-line');
    const modeLine = document.getElementById('clarity-mode-line');
    const branchesLine = document.getElementById('clarity-branches-line');
    const flowLine = document.getElementById('clarity-flow-line');
    const nextLine = document.getElementById('clarity-next-line');
    if (!headLine || !modeLine || !branchesLine || !flowLine || !nextLine) return;

    if (!this.engine.initialized) {
      headLine.textContent = 'HEAD -> (no repo)';
      modeLine.textContent = 'Mode: not initialized';
      branchesLine.textContent = 'Branches: none';
      flowLine.textContent = 'Working Directory -> git add -> Staging Area -> git commit -> History';
      nextLine.textContent = 'Next: run git init';
      return;
    }

    const branch = this.engine.branchManager.currentBranch();
    const headCommit = this.engine.branchManager.headCommitId();
    const mode = branch ? 'attached to branch' : 'detached HEAD';
    headLine.textContent = headCommit
      ? `HEAD -> ${branch || 'detached'} @ ${headCommit}`
      : `HEAD -> ${branch || 'detached'} (no commits yet)`;
    modeLine.textContent = `Mode: ${mode}`;

    const branchPointers = this.engine.branchManager
      .listBranches()
      .map((b) => `${b.name}:${b.commitId || 'none'}`);
    branchesLine.textContent = branchPointers.length > 0
      ? `Branches: ${branchPointers.join(' | ')}`
      : 'Branches: none';

    flowLine.textContent = 'Working Directory -> git add -> Staging Area -> git commit -> History';

    const summary = this.engine.getWorkspaceSummary();
    nextLine.textContent = `Next: ${this._suggestNextStep(summary)}`;
  }

  _suggestNextStep(summary) {
    if (summary.untracked.length > 0) {
      const first = summary.untracked[0];
      return `stage untracked file: git add ${first}`;
    }
    if (summary.unstaged.length > 0) {
      const first = summary.unstaged[0];
      return `stage modified file: git add ${first}`;
    }
    if (summary.staged.length > 0) {
      return 'commit staged changes: git commit -m "message"';
    }
    if (!summary.headCommitId) {
      return 'create a file, then git add + git commit';
    }
    return 'working tree clean. Try git log or create a branch';
  }

  _formatFileList(items) {
    if (!items || items.length === 0) return 'None';
    const preview = items.slice(0, 3).join(', ');
    if (items.length > 3) return `${preview} +${items.length - 3} more`;
    return preview;
  }

  _renderFileTags(files, className) {
    if (!files || files.length === 0) {
      return `<span class="repo-file-tag repo-file-tag--muted">None</span>`;
    }
    const limited = files.slice(0, 6);
    const tags = limited.map((f) =>
      `<span class="${className}" title="${this._escapeHtmlAttr(f)}">${this._escapeHtml(f)}</span>`
    );
    if (files.length > limited.length) {
      tags.push(
        `<span class="repo-file-tag repo-file-tag--muted">+${files.length - limited.length} more</span>`
      );
    }
    return tags.join('');
  }

  _updateCommandCoach(results) {
    const container = document.getElementById('command-coach-chips');
    if (!container) return;
    const suggestions = this.levelManager.getSuggestedCommands(results);
    if (suggestions.length === 0) {
      container.innerHTML = '<span class="term-muted">No suggestions</span>';
      return;
    }
    container.innerHTML = suggestions
      .map((cmd) => `<button class="command-chip" data-command="${this._escapeHtmlAttr(cmd)}">${this._escapeHtml(cmd)}</button>`)
      .join('');
  }

  _recordGraphSnapshot(state) {
    const snapshot = JSON.parse(JSON.stringify(state));
    if (this.graphTimelineIndex < this.graphTimeline.length - 1) {
      this.graphTimeline = this.graphTimeline.slice(0, this.graphTimelineIndex + 1);
    }
    this.graphTimeline.push(snapshot);
    this.graphTimelineIndex = this.graphTimeline.length - 1;
  }

  _resetGraphTimeline() {
    this.graphTimeline = [];
    this.graphTimelineIndex = -1;
  }

  _renderGraphAtTimelineIndex() {
    if (this.graphTimeline.length === 0) {
      this._updateGraph(false);
      return;
    }
    if (this.graphTimelineIndex < 0 || this.graphTimelineIndex >= this.graphTimeline.length) {
      this.graphTimelineIndex = this.graphTimeline.length - 1;
    }
    if (this.graphTimelineIndex < 0 || this.graphTimelineIndex >= this.graphTimeline.length) {
      return;
    }
    const state = this.graphTimeline[this.graphTimelineIndex];
    this.graph.update(state);
    this._updateGraphControls();
    this._renderGraphHeader(state);
  }

  _isGraphLive() {
    return this.graphTimelineIndex === this.graphTimeline.length - 1;
  }

  _updateGraphControls() {
    const prevBtn = document.getElementById('graph-prev');
    const nextBtn = document.getElementById('graph-next');
    const liveBtn = document.getElementById('graph-live');
    if (!prevBtn || !nextBtn || !liveBtn) return;
    prevBtn.disabled = this.graphTimelineIndex <= 0;
    nextBtn.disabled = this.graphTimelineIndex >= this.graphTimeline.length - 1;
    liveBtn.disabled = this._isGraphLive();
  }

  _escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _escapeHtmlAttr(text) {
    return this._escapeHtml(text).replace(/"/g, '&quot;');
  }
}

// Start — modules are deferred, so DOM is ready by the time this runs
try {
  window.app = new App();
} catch (e) {
  console.error('GitQuest init error:', e);
  document.body.innerHTML = `<pre style="color:red;padding:20px;">Init error: ${e.message}\n${e.stack}</pre>`;
}
