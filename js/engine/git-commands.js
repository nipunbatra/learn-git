// All git command implementations
// Each returns { output: string, success: boolean }

import { Blob, Tree, Commit, nextCommitId, nextBlobId, nextTreeId } from './git-object-model.js';

export class GitCommands {
  constructor(engine) {
    this.engine = engine;
  }

  get wd() { return this.engine.workingDirectory; }
  get stage() { return this.engine.stagingArea; }
  get odb() { return this.engine.objectDatabase; }
  get bm() { return this.engine.branchManager; }
  get me() { return this.engine.mergeEngine; }
  get remote() { return this.engine.remoteModel; }

  // ── git init ──
  init() {
    if (this.engine.initialized) {
      return { output: 'Reinitialized existing Git repository', success: true };
    }
    this.engine.initialized = true;
    this.bm.init('main');
    return {
      output: 'Initialized empty Git repository in ~/project/.git/',
      success: true
    };
  }

  // ── git status ──
  status() {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const branch = this.bm.currentBranch();
    const lines = [];
    lines.push(`On branch ${branch || '(detached HEAD)'}`);

    // Get last committed files
    const committedFiles = this._getCommittedFiles();

    // Staged changes
    const staged = [];
    for (const [path, content] of this.stage.entries()) {
      const committedContent = committedFiles.get(path);
      if (committedContent === undefined) {
        staged.push(`\tnew file:   ${path}`);
      } else if (committedContent !== content) {
        staged.push(`\tmodified:   ${path}`);
      }
    }
    // Staged deletions: files in commit but removed from stage
    for (const path of committedFiles.keys()) {
      if (!this.stage.has(path) && this._wasExplicitlyRemoved(path)) {
        staged.push(`\tdeleted:    ${path}`);
      }
    }

    if (staged.length > 0) {
      lines.push('');
      lines.push('Changes to be committed:');
      lines.push(...staged);
    }

    // Unstaged changes (working dir vs staging/committed)
    const unstaged = [];
    const referenceFiles = this.stage.isEmpty() ? committedFiles : this.stage.entries();

    for (const [path, content] of referenceFiles) {
      if (!this.wd.exists(path)) {
        unstaged.push(`\tdeleted:    ${path}`);
      } else if (this.wd.readFile(path) !== content) {
        unstaged.push(`\tmodified:   ${path}`);
      }
    }

    if (unstaged.length > 0) {
      lines.push('');
      lines.push('Changes not staged for commit:');
      lines.push(...unstaged);
    }

    // Untracked files
    const untracked = [];
    for (const path of this.wd.listFiles()) {
      if (!this.stage.has(path) && !committedFiles.has(path)) {
        untracked.push(`\t${path}`);
      }
    }

    if (untracked.length > 0) {
      lines.push('');
      lines.push('Untracked files:');
      lines.push(...untracked);
    }

    if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
      lines.push('');
      lines.push('nothing to commit, working tree clean');
    }

    return { output: lines.join('\n'), success: true };
  }

  // ── git add ──
  add(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      return { output: 'Nothing specified, nothing added.', success: false };
    }

    const filesToAdd = args[0] === '.' ? this.wd.listFiles() : args;
    let addedCount = 0;

    for (const path of filesToAdd) {
      if (this.wd.exists(path)) {
        this.stage.add(path, this.wd.readFile(path));
        addedCount++;
      } else {
        // If file was tracked and now deleted, handle rm
        const committed = this._getCommittedFiles();
        if (committed.has(path) || this.stage.has(path)) {
          this.stage.remove(path);
          this.engine._explicitlyRemoved.add(path);
          addedCount++;
        } else {
          return { output: `fatal: pathspec '${path}' did not match any files`, success: false };
        }
      }
    }

    return { output: '', success: true };
  }

  // ── git commit ──
  commit(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const message = flags['-m'] || flags['--message'];
    if (!message) {
      return { output: 'error: switch `m\' requires a value', success: false };
    }

    // Check if there's anything to commit
    const committedFiles = this._getCommittedFiles();
    const stagedFiles = this.stage.entries();

    if (this.stage.isEmpty() && this.engine._explicitlyRemoved.size === 0) {
      // Check if staging matches committed
      return { output: 'nothing to commit, working tree clean', success: false };
    }

    // Check if staged differs from committed
    let hasChanges = false;
    if (this.engine._explicitlyRemoved.size > 0) {
      hasChanges = true;
    } else {
      for (const [path, content] of stagedFiles) {
        if (committedFiles.get(path) !== content) { hasChanges = true; break; }
      }
      if (!hasChanges && stagedFiles.size !== committedFiles.size) hasChanges = true;
    }

    if (!hasChanges) {
      return { output: 'nothing to commit, working tree clean', success: false };
    }

    // Create tree from staged files
    const treeEntries = new Map();
    for (const [path, content] of stagedFiles) {
      const blob = new Blob(nextBlobId(), content);
      this.odb.store(blob);
      treeEntries.set(path, blob.id);
    }
    const tree = new Tree(nextTreeId(), treeEntries);
    this.odb.store(tree);

    // Create commit
    const parentIds = [];
    const headCommit = this.bm.headCommitId();
    if (headCommit) parentIds.push(headCommit);

    // Add merge parent if in merging state
    if (this.engine._mergeHead) {
      parentIds.push(this.engine._mergeHead);
      this.engine._mergeHead = null;
      this.engine._merging = false;
      this.engine._conflicts.clear();
    }

    const commit = new Commit(nextCommitId(), {
      treeId: tree.id,
      parentIds,
      message,
    });
    this.odb.store(commit);

    // Update HEAD
    this.bm.updateHead(commit.id);
    this.engine._explicitlyRemoved.clear();

    const branch = this.bm.currentBranch() || 'HEAD';
    const filesChanged = stagedFiles.size;
    return {
      output: `[${branch} ${commit.id}] ${message}\n ${filesChanged} file(s) changed`,
      success: true,
      commitId: commit.id,
    };
  }

  // ── git log ──
  log(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const headCommit = this.bm.headCommitId();
    if (!headCommit) {
      return { output: 'fatal: your current branch does not have any commits yet', success: false };
    }

    const oneline = flags['--oneline'] || false;
    const maxCount = parseInt(flags['-n']) || 50;

    // Walk from HEAD
    const commits = [];
    const queue = [headCommit];
    const visited = new Set();

    while (queue.length > 0 && commits.length < maxCount) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const commit = this.odb.get(id);
      if (!commit) continue;
      commits.push(commit);
      for (const pid of commit.parentIds) {
        queue.push(pid);
      }
    }

    if (oneline) {
      const lines = commits.map(c => {
        const refs = this._getRefsForCommit(c.id);
        const refStr = refs.length > 0 ? ` (${refs.join(', ')})` : '';
        return `${c.id}${refStr} ${c.message}`;
      });
      return { output: lines.join('\n'), success: true };
    }

    const lines = commits.map(c => {
      const refs = this._getRefsForCommit(c.id);
      const refStr = refs.length > 0 ? ` (${refs.join(', ')})` : '';
      return [
        `commit ${c.id}${refStr}`,
        `Author: ${c.author}`,
        `Date:   ${c.timestamp}`,
        '',
        `    ${c.message}`,
      ].join('\n');
    });

    return { output: lines.join('\n\n'), success: true };
  }

  // ── git diff ──
  diff(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const isStaged = flags['--staged'] || flags['--cached'];
    const lines = [];

    if (isStaged) {
      // Show staged vs committed
      const committedFiles = this._getCommittedFiles();
      for (const [path, stagedContent] of this.stage.entries()) {
        const committed = committedFiles.get(path);
        if (committed === undefined) {
          lines.push(`diff --git a/${path} b/${path}`);
          lines.push('new file');
          lines.push(`+++ b/${path}`);
          for (const line of stagedContent.split('\n')) {
            lines.push(`+${line}`);
          }
          lines.push('');
        } else if (committed !== stagedContent) {
          lines.push(`diff --git a/${path} b/${path}`);
          lines.push(`--- a/${path}`);
          lines.push(`+++ b/${path}`);
          this._simpleDiff(committed, stagedContent, lines);
          lines.push('');
        }
      }
    } else {
      // Show working dir vs staged (or committed if not staged)
      const reference = this.stage.isEmpty() ? this._getCommittedFiles() : this.stage.entries();
      for (const [path, refContent] of reference) {
        if (!this.wd.exists(path)) {
          lines.push(`diff --git a/${path} b/${path}`);
          lines.push('deleted file');
          lines.push(`--- a/${path}`);
          for (const line of refContent.split('\n')) {
            lines.push(`-${line}`);
          }
          lines.push('');
        } else {
          const wdContent = this.wd.readFile(path);
          if (wdContent !== refContent) {
            lines.push(`diff --git a/${path} b/${path}`);
            lines.push(`--- a/${path}`);
            lines.push(`+++ b/${path}`);
            this._simpleDiff(refContent, wdContent, lines);
            lines.push('');
          }
        }
      }
      // New files in WD not in reference
      for (const path of this.wd.listFiles()) {
        if (!reference.has(path) && !this.stage.has(path)) {
          // untracked, skip for diff
        }
      }
    }

    return { output: lines.join('\n') || '', success: true };
  }

  // ── git branch ──
  branch(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const deleteFlag = flags['-d'] || flags['-D'] || flags['--delete'];

    // List branches
    if (!args || args.length === 0) {
      const branches = this.bm.listBranches();
      if (branches.length === 0) return { output: '', success: true };
      const lines = branches.map(b =>
        `${b.isCurrent ? '* ' : '  '}${b.name}`
      );
      return { output: lines.join('\n'), success: true };
    }

    // Delete branch
    if (deleteFlag) {
      const name = args[0];
      const result = this.bm.deleteBranch(name);
      if (!result.success) return { output: `error: ${result.error}`, success: false };
      return { output: `Deleted branch ${name}`, success: true };
    }

    // Create branch
    const name = args[0];
    const headCommit = this.bm.headCommitId();
    if (!headCommit) {
      return { output: 'fatal: not a valid object name: no commits yet', success: false };
    }
    const result = this.bm.createBranch(name, headCommit);
    if (!result.success) return { output: `fatal: ${result.error}`, success: false };
    return { output: '', success: true };
  }

  // ── git checkout ──
  checkout(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      return { output: 'error: you need to specify a branch or commit', success: false };
    }

    const createBranch = flags['-b'];
    const target = args[0];

    if (createBranch) {
      const headCommit = this.bm.headCommitId();
      if (!headCommit) return { output: 'fatal: no commits yet', success: false };
      const result = this.bm.createBranch(target, headCommit);
      if (!result.success) return { output: `fatal: ${result.error}`, success: false };
      this.bm.checkout(target);
      this._restoreWorkingDirectory(headCommit);
      return { output: `Switched to a new branch '${target}'`, success: true };
    }

    // Try branch first
    if (this.bm.hasBranch(target)) {
      const commitId = this.bm.getBranchCommit(target);
      this.bm.checkout(target);
      this._restoreWorkingDirectory(commitId);
      return { output: `Switched to branch '${target}'`, success: true };
    }

    // Try commit id
    if (this.odb.has(target) && this.odb.get(target).type === 'commit') {
      this.bm.detach(target);
      this._restoreWorkingDirectory(target);
      return {
        output: `Note: switching to '${target}'.\nYou are in 'detached HEAD' state.`,
        success: true
      };
    }

    return { output: `error: pathspec '${target}' did not match any known ref`, success: false };
  }

  // ── git switch ──
  switch(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const createBranch = flags['-c'] || flags['--create'];
    const target = args[0];

    if (!target) {
      return { output: 'fatal: missing branch name', success: false };
    }

    if (createBranch) {
      return this.checkout(args, { '-b': true });
    }

    if (!this.bm.hasBranch(target)) {
      return { output: `fatal: invalid reference: ${target}`, success: false };
    }

    return this.checkout(args, {});
  }

  // ── git merge ──
  merge(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      return { output: 'fatal: specify a branch to merge', success: false };
    }

    const sourceBranch = args[0];
    const sourceCommitId = this.bm.resolveRef(sourceBranch);
    if (!sourceCommitId || !this.odb.has(sourceCommitId)) {
      return { output: `merge: ${sourceBranch} - not something we can merge`, success: false };
    }

    const headCommitId = this.bm.headCommitId();
    const currentBranch = this.bm.currentBranch();

    // Already up to date
    if (headCommitId === sourceCommitId) {
      return { output: 'Already up to date.', success: true };
    }

    // Fast-forward: HEAD is ancestor of source
    if (this.me.isAncestor(headCommitId, sourceCommitId)) {
      this.bm.updateHead(sourceCommitId);
      this._restoreWorkingDirectory(sourceCommitId);
      return {
        output: `Updating ${headCommitId}..${sourceCommitId}\nFast-forward`,
        success: true,
        fastForward: true,
      };
    }

    // Reverse fast-forward: source is ancestor of HEAD
    if (this.me.isAncestor(sourceCommitId, headCommitId)) {
      return { output: 'Already up to date.', success: true };
    }

    // 3-way merge
    const baseId = this.me.findMergeBase(headCommitId, sourceCommitId);
    const baseFiles = baseId ? this.me.getFilesAtCommit(baseId) : new Map();
    const oursFiles = this.me.getFilesAtCommit(headCommitId);
    const theirsFiles = this.me.getFilesAtCommit(sourceCommitId);

    const { merged, conflicts } = this.me.threeWayMerge(baseFiles, oursFiles, theirsFiles);

    // Update working directory and staging area
    this.wd.clear();
    this.stage.clear();
    for (const [path, content] of merged) {
      this.wd.writeFile(path, content);
      if (!conflicts.has(path)) {
        this.stage.add(path, content);
      }
    }

    if (conflicts.size > 0) {
      this.engine._merging = true;
      this.engine._mergeHead = sourceCommitId;
      this.engine._conflicts = conflicts;
      const conflictFiles = [...conflicts.keys()].join('\n\t');
      return {
        output: `Auto-merging...\nCONFLICT (content): Merge conflict in:\n\t${conflictFiles}\nAutomatic merge failed; fix conflicts and then commit the result.`,
        success: true,
        hasConflicts: true,
      };
    }

    // Auto-commit merge
    this.engine._mergeHead = sourceCommitId;
    const message = `Merge branch '${sourceBranch}' into ${currentBranch}`;
    const commitResult = this.commit([], { '-m': message });

    return {
      output: `Merge made by the 'ort' strategy.\n${commitResult.output}`,
      success: true,
    };
  }

  // ── git remote ──
  gitRemote(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      const remotes = this.remote.listRemotes();
      return { output: remotes.map(r => r.name).join('\n'), success: true };
    }

    if (args[0] === 'add') {
      if (args.length < 3) {
        return { output: 'usage: git remote add <name> <url>', success: false };
      }
      const result = this.remote.addRemote(args[1], args[2]);
      if (!result.success) return { output: `error: ${result.error}`, success: false };
      return { output: '', success: true };
    }

    if (args[0] === '-v' || args[0] === '--verbose') {
      const remotes = this.remote.listRemotes();
      const lines = remotes.flatMap(r => [
        `${r.name}\t${r.url} (fetch)`,
        `${r.name}\t${r.url} (push)`,
      ]);
      return { output: lines.join('\n'), success: true };
    }

    return { output: `error: unknown subcommand: ${args[0]}`, success: false };
  }

  // ── git clone ──
  clone(args) {
    if (this.engine.initialized) {
      return { output: 'fatal: destination already exists', success: false };
    }

    if (!args || args.length === 0) {
      return { output: 'usage: git clone <url>', success: false };
    }

    // Simulate cloning — just init + add remote + create initial content
    this.engine.initialized = true;
    this.bm.init('main');
    const url = args[0];

    // Create a remote
    this.remote.addRemote('origin', url);

    // If we have a preconfigured remote (from level setup), fetch from it
    const remote = this.remote.getRemote('origin');
    if (remote && remote.objectDatabase.objects.size > 0) {
      // Copy all objects from remote
      for (const [id, obj] of remote.objectDatabase.objects) {
        this.odb.store(obj);
      }

      // Set local branches to match remote
      for (const [branchName, commitId] of remote.branches) {
        this.bm.setBranchCommit(branchName, commitId);
        this.remote.setTrackingBranch('origin', branchName, commitId);
      }

      // Restore working directory
      const headCommit = this.bm.headCommitId();
      if (headCommit) {
        this._restoreWorkingDirectory(headCommit);
      }

      return {
        output: `Cloning into 'project'...\nremote: Counting objects: done.\nUnpacking objects: done.`,
        success: true,
      };
    }

    return {
      output: `Cloning into 'project'...\nwarning: You appear to have cloned an empty repository.`,
      success: true,
    };
  }

  // ── git push ──
  push(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const remoteName = (args && args[0]) || 'origin';
    const branchName = (args && args[1]) || this.bm.currentBranch();
    const setUpstream = flags['-u'] || flags['--set-upstream'];

    if (!this.remote.hasRemote(remoteName)) {
      return { output: `fatal: '${remoteName}' does not appear to be a git repository`, success: false };
    }

    const headCommit = this.bm.headCommitId();
    if (!headCommit) {
      return { output: 'error: src refspec does not match any', success: false };
    }

    const remote = this.remote.getRemote(remoteName);

    // Push objects
    remote.receiveObjects(this.odb, [headCommit]);
    remote.branches.set(branchName, headCommit);
    this.remote.setTrackingBranch(remoteName, branchName, headCommit);

    return {
      output: `To ${remote.url}\n   ${headCommit} -> ${branchName}\nBranch '${branchName}' set up to track '${remoteName}/${branchName}'.`,
      success: true,
    };
  }

  // ── git fetch ──
  fetch(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const remoteName = (args && args[0]) || 'origin';
    if (!this.remote.hasRemote(remoteName)) {
      return { output: `fatal: '${remoteName}' does not appear to be a git repository`, success: false };
    }

    const remote = this.remote.getRemote(remoteName);
    const newObjects = remote.getNewCommits(this.odb);

    // Copy objects from remote to local
    for (const obj of newObjects) {
      this.odb.store(obj);
    }

    // Update tracking branches
    for (const [branchName, commitId] of remote.branches) {
      this.remote.setTrackingBranch(remoteName, branchName, commitId);
    }

    const count = newObjects.filter(o => o.type === 'commit').length;
    return {
      output: count > 0
        ? `From ${remote.url}\n   Fetching ${remoteName}\n   ${count} new commit(s)`
        : `From ${remote.url}\n   Already up to date.`,
      success: true,
    };
  }

  // ── git pull ──
  pull(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const remoteName = (args && args[0]) || 'origin';
    const branchName = (args && args[1]) || this.bm.currentBranch();

    // Fetch first
    const fetchResult = this.fetch([remoteName]);
    if (!fetchResult.success) return fetchResult;

    // Then merge tracking branch
    const trackingCommit = this.remote.getTrackingBranch(remoteName, branchName);
    if (!trackingCommit) {
      return {
        output: `${fetchResult.output}\nThere is no tracking information for the current branch.`,
        success: true,
      };
    }

    const headCommitId = this.bm.headCommitId();

    // Already up to date
    if (headCommitId === trackingCommit) {
      return { output: `${fetchResult.output}\nAlready up to date.`, success: true };
    }

    // Fast-forward
    if (this.me.isAncestor(headCommitId, trackingCommit)) {
      this.bm.updateHead(trackingCommit);
      this._restoreWorkingDirectory(trackingCommit);
      return {
        output: `${fetchResult.output}\nUpdating ${headCommitId}..${trackingCommit}\nFast-forward`,
        success: true,
      };
    }

    // 3-way merge — use merge but with the tracking commit directly
    // Temporarily make the tracking branch resolvable
    const tempRef = `${remoteName}/${branchName}`;
    const origResolve = this.bm.resolveRef.bind(this.bm);
    this.bm.resolveRef = (ref) => {
      if (ref === tempRef) return trackingCommit;
      return origResolve(ref);
    };
    const mergeResult = this.merge([tempRef], {});
    this.bm.resolveRef = origResolve;

    return {
      output: `${fetchResult.output}\n${mergeResult.output}`,
      success: mergeResult.success,
    };
  }

  // ── git stash ──
  stash(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const subcommand = args && args[0];

    if (!subcommand || subcommand === 'push') {
      // Save current changes
      const committedFiles = this._getCommittedFiles();
      const hasChanges = this._hasUncommittedChanges(committedFiles);

      if (!hasChanges) {
        return { output: 'No local changes to save', success: true };
      }

      this.engine._stash.push({
        workingDir: this.wd.clone(),
        stagingArea: this.stage.clone(),
      });

      // Restore to committed state
      this.wd.clear();
      this.stage.clear();
      for (const [path, content] of committedFiles) {
        this.wd.writeFile(path, content);
      }

      return {
        output: `Saved working directory and index state WIP on ${this.bm.currentBranch()}`,
        success: true,
      };
    }

    if (subcommand === 'pop') {
      if (this.engine._stash.length === 0) {
        return { output: 'error: No stash entries found.', success: false };
      }

      const stashEntry = this.engine._stash.pop();

      // Restore working directory and staging
      this.wd.clear();
      for (const [path, content] of stashEntry.workingDir.files) {
        this.wd.writeFile(path, content);
      }
      this.stage.clear();
      for (const [path, content] of stashEntry.stagingArea.files) {
        this.stage.add(path, content);
      }

      return {
        output: `On ${this.bm.currentBranch()}: Dropped refs/stash@{0}`,
        success: true,
      };
    }

    if (subcommand === 'list') {
      if (this.engine._stash.length === 0) {
        return { output: '', success: true };
      }
      const lines = this.engine._stash.map((_, i) =>
        `stash@{${i}}: WIP on ${this.bm.currentBranch()}`
      );
      return { output: lines.join('\n'), success: true };
    }

    return { output: `error: unknown subcommand: ${subcommand}`, success: false };
  }

  // ── git reset ──
  reset(args, flags) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    const mode = flags['--soft'] ? 'soft' : flags['--hard'] ? 'hard' : 'mixed';
    const target = (args && args[0]) || 'HEAD';

    // Resolve target
    let commitId;
    if (target === 'HEAD~1' || target === 'HEAD~' || target === 'HEAD^') {
      const headCommit = this.odb.get(this.bm.headCommitId());
      if (!headCommit || headCommit.parentIds.length === 0) {
        return { output: 'fatal: cannot reset past initial commit', success: false };
      }
      commitId = headCommit.parentIds[0];
    } else if (target.startsWith('HEAD~')) {
      const n = parseInt(target.slice(5));
      commitId = this.bm.headCommitId();
      for (let i = 0; i < n; i++) {
        const c = this.odb.get(commitId);
        if (!c || c.parentIds.length === 0) {
          return { output: 'fatal: cannot reset that far back', success: false };
        }
        commitId = c.parentIds[0];
      }
    } else {
      commitId = this.bm.resolveRef(target);
    }

    if (!commitId || !this.odb.has(commitId)) {
      return { output: `fatal: ambiguous argument '${target}'`, success: false };
    }

    // Move HEAD
    this.bm.updateHead(commitId);

    if (mode === 'soft') {
      // Keep staging area and working directory as is
    } else if (mode === 'mixed') {
      // Reset staging area to match commit
      this.stage.clear();
      const files = this.me.getFilesAtCommit(commitId);
      for (const [path, content] of files) {
        this.stage.add(path, content);
      }
    } else if (mode === 'hard') {
      // Reset staging area AND working directory
      this.stage.clear();
      this.wd.clear();
      const files = this.me.getFilesAtCommit(commitId);
      for (const [path, content] of files) {
        this.stage.add(path, content);
        this.wd.writeFile(path, content);
      }
    }

    return {
      output: `HEAD is now at ${commitId}`,
      success: true,
    };
  }

  // ── git rebase ──
  rebase(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      return { output: 'usage: git rebase <branch>', success: false };
    }

    const ontoBranch = args[0];
    const ontoCommitId = this.bm.resolveRef(ontoBranch);
    if (!ontoCommitId || !this.odb.has(ontoCommitId)) {
      return { output: `fatal: invalid upstream '${ontoBranch}'`, success: false };
    }

    const headCommitId = this.bm.headCommitId();
    const currentBranch = this.bm.currentBranch();

    // Already up to date
    if (headCommitId === ontoCommitId) {
      return { output: `Current branch ${currentBranch} is up to date.`, success: true };
    }

    // If onto is ancestor of HEAD, already up to date
    if (this.me.isAncestor(ontoCommitId, headCommitId)) {
      // Collect commits from HEAD back to merge base
      const baseId = this.me.findMergeBase(headCommitId, ontoCommitId);
      // Noop if already linear
      if (baseId === ontoCommitId) {
        return { output: `Current branch ${currentBranch} is up to date.`, success: true };
      }
    }

    // Collect commits to replay (from HEAD back to merge base with onto)
    const baseId = this.me.findMergeBase(headCommitId, ontoCommitId);
    const commitsToReplay = [];
    let current = headCommitId;
    while (current && current !== baseId) {
      commitsToReplay.push(this.odb.get(current));
      const c = this.odb.get(current);
      current = c.parentIds.length > 0 ? c.parentIds[0] : null;
    }
    commitsToReplay.reverse();

    if (commitsToReplay.length === 0) {
      return { output: `Current branch ${currentBranch} is up to date.`, success: true };
    }

    // Replay commits on top of onto
    let parentId = ontoCommitId;
    for (const oldCommit of commitsToReplay) {
      const tree = this.odb.get(oldCommit.treeId);
      const newCommit = new Commit(nextCommitId(), {
        treeId: oldCommit.treeId,
        parentIds: [parentId],
        message: oldCommit.message,
        author: oldCommit.author,
      });
      this.odb.store(newCommit);
      parentId = newCommit.id;
    }

    // Update branch to point to new tip
    this.bm.updateHead(parentId);
    this._restoreWorkingDirectory(parentId);

    return {
      output: `Successfully rebased and updated refs/heads/${currentBranch}.\nReplayed ${commitsToReplay.length} commit(s) onto ${ontoCommitId}.`,
      success: true,
    };
  }

  // ── git tag ──
  tag(args) {
    if (!this.engine.initialized) {
      return { output: 'fatal: not a git repository', success: false };
    }

    if (!args || args.length === 0) {
      const tags = [...this.bm.tags.keys()].sort();
      return { output: tags.join('\n'), success: true };
    }

    const name = args[0];
    const commitId = args[1] ? this.bm.resolveRef(args[1]) : this.bm.headCommitId();
    const result = this.bm.createTag(name, commitId);
    if (!result.success) return { output: `fatal: ${result.error}`, success: false };
    return { output: '', success: true };
  }

  // ── Helper: restore working directory from a commit ──
  _restoreWorkingDirectory(commitId) {
    if (!commitId) return;
    const files = this.me.getFilesAtCommit(commitId);
    this.wd.clear();
    this.stage.clear();
    for (const [path, content] of files) {
      this.wd.writeFile(path, content);
      this.stage.add(path, content);
    }
  }

  // ── Helper: get committed files from HEAD ──
  _getCommittedFiles() {
    const headCommitId = this.bm.headCommitId();
    if (!headCommitId) return new Map();
    return this.me.getFilesAtCommit(headCommitId);
  }

  // ── Helper: simple line diff ──
  _simpleDiff(oldStr, newStr, lines) {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    for (const l of oldLines) {
      if (!newLines.includes(l)) lines.push(`-${l}`);
    }
    for (const l of newLines) {
      if (!oldLines.includes(l)) lines.push(`+${l}`);
    }
  }

  // ── Helper: get refs pointing to a commit ──
  _getRefsForCommit(commitId) {
    const refs = [];
    if (this.bm.headCommitId() === commitId) {
      const branch = this.bm.currentBranch();
      refs.push(branch ? `HEAD -> ${branch}` : 'HEAD');
    }
    for (const b of this.bm.listBranches()) {
      if (b.commitId === commitId && !b.isCurrent) {
        refs.push(b.name);
      }
    }
    for (const [tag, cid] of this.bm.tags) {
      if (cid === commitId) refs.push(`tag: ${tag}`);
    }
    // Tracking branches
    if (this.remote) {
      for (const tb of this.remote.listTrackingBranches()) {
        if (tb.commitId === commitId) refs.push(tb.name);
      }
    }
    return refs;
  }

  _wasExplicitlyRemoved(path) {
    return this.engine._explicitlyRemoved.has(path);
  }

  _hasUncommittedChanges(committedFiles) {
    // Check if working directory differs from committed state
    for (const [path, content] of this.wd.entries()) {
      if (committedFiles.get(path) !== content) return true;
    }
    for (const path of committedFiles.keys()) {
      if (!this.wd.exists(path)) return true;
    }
    for (const [path, content] of this.stage.entries()) {
      if (committedFiles.get(path) !== content) return true;
    }
    return committedFiles.size !== this.wd.files.size;
  }
}
