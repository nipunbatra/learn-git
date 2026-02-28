// Facade over all engine pieces

import { ObjectDatabase, resetCounters } from './git-object-model.js';
import { WorkingDirectory } from './working-directory.js';
import { StagingArea } from './staging-area.js';
import { BranchManager } from './branch-manager.js';
import { MergeEngine } from './merge-engine.js';
import { RemoteModel } from './remote-model.js';
import { GitCommands } from './git-commands.js';

export class GitEngine {
  constructor() {
    this.reset();
  }

  reset() {
    resetCounters();
    this.initialized = false;
    this.objectDatabase = new ObjectDatabase();
    this.workingDirectory = new WorkingDirectory();
    this.stagingArea = new StagingArea();
    this.branchManager = new BranchManager();
    this.mergeEngine = new MergeEngine(this.objectDatabase, this.branchManager);
    this.remoteModel = new RemoteModel();
    this.commands = new GitCommands(this);

    // Internal state
    this._merging = false;
    this._mergeHead = null;
    this._conflicts = new Map();
    this._stash = [];
    this._explicitlyRemoved = new Set();
  }

  // Main entry point: execute a git command
  execute(command, args = [], flags = {}) {
    const cmd = command.toLowerCase();

    switch (cmd) {
      case 'init': return this.commands.init();
      case 'status': return this.commands.status();
      case 'add': return this.commands.add(args);
      case 'commit': return this.commands.commit(args, flags);
      case 'log': return this.commands.log(args, flags);
      case 'diff': return this.commands.diff(args, flags);
      case 'branch': return this.commands.branch(args, flags);
      case 'checkout': return this.commands.checkout(args, flags);
      case 'switch': return this.commands.switch(args, flags);
      case 'merge': return this.commands.merge(args, flags);
      case 'remote': return this.commands.gitRemote(args, flags);
      case 'clone': return this.commands.clone(args);
      case 'push': return this.commands.push(args, flags);
      case 'fetch': return this.commands.fetch(args);
      case 'pull': return this.commands.pull(args);
      case 'stash': return this.commands.stash(args);
      case 'reset': return this.commands.reset(args, flags);
      case 'rebase': return this.commands.rebase(args);
      case 'tag': return this.commands.tag(args);
      default:
        return { output: `git: '${cmd}' is not a git command.`, success: false };
    }
  }

  // Shell commands
  executeShell(command, args = []) {
    switch (command) {
      case 'echo': return this._shellEcho(args);
      case 'cat': return this._shellCat(args);
      case 'ls': return this._shellLs(args);
      case 'touch': return this._shellTouch(args);
      case 'clear': return { output: '__CLEAR__', success: true };
      case 'help': return this._shellHelp();
      case 'pwd': return { output: '~/project', success: true };
      default:
        return { output: `command not found: ${command}`, success: false };
    }
  }

  _shellEcho(args) {
    // Handle "echo content > file"
    const joined = args.join(' ');
    const appendMatch = joined.match(/^(.+?)\s*>>\s*(\S+)$/);
    if (appendMatch) {
      let content = appendMatch[1].trim();
      const file = appendMatch[2];
      content = content.replace(/^["']|["']$/g, '');
      const existing = this.workingDirectory.readFile(file) || '';
      this.workingDirectory.writeFile(file, existing ? existing + '\n' + content : content);
      return { output: '', success: true };
    }

    const redirectMatch = joined.match(/^(.+?)\s*>\s*(\S+)$/);
    if (redirectMatch) {
      let content = redirectMatch[1].trim();
      const file = redirectMatch[2];
      // Remove surrounding quotes
      content = content.replace(/^["']|["']$/g, '');
      this.workingDirectory.writeFile(file, content);
      return { output: '', success: true };
    }

    return { output: joined.replace(/^["']|["']$/g, ''), success: true };
  }

  _shellCat(args) {
    if (!args || args.length === 0) {
      return { output: 'usage: cat <file>', success: false };
    }
    const content = this.workingDirectory.readFile(args[0]);
    if (content === null) {
      return { output: `cat: ${args[0]}: No such file or directory`, success: false };
    }
    return { output: content, success: true };
  }

  _shellLs(args) {
    const files = this.workingDirectory.listFiles();
    if (files.length === 0) {
      return { output: '', success: true };
    }
    return { output: files.join('\n'), success: true };
  }

  _shellTouch(args) {
    if (!args || args.length === 0) {
      return { output: 'usage: touch <file>', success: false };
    }
    for (const file of args) {
      if (!this.workingDirectory.exists(file)) {
        this.workingDirectory.writeFile(file, '');
      }
    }
    return { output: '', success: true };
  }

  _shellHelp() {
    return {
      output: [
        'Available commands:',
        '',
        'Git commands:',
        '  git init          Initialize a repository',
        '  git add <file>    Stage changes',
        '  git commit -m ""  Commit staged changes',
        '  git status        Show working tree status',
        '  git log           Show commit log',
        '  git diff          Show changes',
        '  git branch        List/create branches',
        '  git checkout      Switch branches',
        '  git switch        Switch branches',
        '  git merge         Merge branches',
        '  git remote        Manage remotes',
        '  git push          Push to remote',
        '  git fetch         Fetch from remote',
        '  git pull          Pull from remote',
        '  git stash         Stash changes',
        '  git reset         Reset HEAD',
        '  git rebase        Rebase branch',
        '  git tag           Create tags',
        '',
        'Shell commands:',
        '  echo "text" > f   Write to file',
        '  cat <file>        Display file',
        '  touch <file>      Create empty file',
        '  ls                List files',
        '  clear             Clear terminal',
        '  help              Show this help',
        '',
        'Terminal tips:',
        '  Tab               Autocomplete command/arg',
        '  Tab Tab           Show matching completions',
      ].join('\n'),
      success: true,
    };
  }

  // Get state for graph rendering
  getGraphState() {
    return {
      commits: this.objectDatabase.getAllCommits(),
      branches: this.branchManager.listBranches(),
      head: this.branchManager.head,
      headCommitId: this.branchManager.headCommitId(),
      tags: [...this.branchManager.tags.entries()],
      trackingBranches: this.remoteModel.listTrackingBranches(),
      remotes: this.remoteModel.listRemotes(),
    };
  }

  // Get state for level validation
  getState() {
    return {
      initialized: this.initialized,
      workingDirectory: this.workingDirectory,
      stagingArea: this.stagingArea,
      objectDatabase: this.objectDatabase,
      branchManager: this.branchManager,
      mergeEngine: this.mergeEngine,
      remoteModel: this.remoteModel,
      commits: this.objectDatabase.getAllCommits(),
      headCommitId: this.branchManager.headCommitId(),
      currentBranch: this.branchManager.currentBranch(),
      merging: this._merging,
      conflicts: this._conflicts,
      stash: this._stash,
    };
  }

  getWorkspaceSummary() {
    const committedFiles = this._getCommittedFiles();
    const staged = [];
    const unstaged = [];
    const untracked = [];

    for (const [path, content] of this.stagingArea.entries()) {
      const committedContent = committedFiles.get(path);
      if (committedContent === undefined) {
        staged.push(path);
      } else if (committedContent !== content) {
        staged.push(path);
      }
    }

    for (const [path, content] of this.stagingArea.entries()) {
      if (!this.workingDirectory.exists(path)) {
        unstaged.push(path);
      } else if (this.workingDirectory.readFile(path) !== content) {
        unstaged.push(path);
      }
    }

    for (const path of this.workingDirectory.listFiles()) {
      if (!this.stagingArea.has(path) && !committedFiles.has(path)) {
        untracked.push(path);
      }
    }

    return {
      staged,
      unstaged,
      untracked,
      branch: this.branchManager.currentBranch(),
      headCommitId: this.branchManager.headCommitId(),
    };
  }

  _getCommittedFiles() {
    const headCommitId = this.branchManager.headCommitId();
    if (!headCommitId) return new Map();
    return this.mergeEngine.getFilesAtCommit(headCommitId);
  }
}
