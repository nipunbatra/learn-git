// Branch, HEAD, and tag management

export class BranchManager {
  constructor() {
    this.branches = new Map();  // branchName -> commitId
    this.head = null;           // { type: 'branch', ref: 'main' } or { type: 'detached', commitId: 'c1' }
    this.tags = new Map();      // tagName -> commitId
  }

  // Initialize with default branch
  init(branchName = 'main') {
    this.branches.set(branchName, null);
    this.head = { type: 'branch', ref: branchName };
  }

  // Get current branch name (null if detached)
  currentBranch() {
    if (this.head && this.head.type === 'branch') return this.head.ref;
    return null;
  }

  // Get the commit HEAD points to
  headCommitId() {
    if (!this.head) return null;
    if (this.head.type === 'branch') {
      return this.branches.get(this.head.ref) || null;
    }
    return this.head.commitId;
  }

  // Update current branch to point to a new commit
  updateHead(commitId) {
    if (this.head.type === 'branch') {
      this.branches.set(this.head.ref, commitId);
    } else {
      this.head.commitId = commitId;
    }
  }

  // Create a new branch at a commit
  createBranch(name, commitId) {
    if (this.branches.has(name)) {
      return { success: false, error: `branch '${name}' already exists` };
    }
    this.branches.set(name, commitId);
    return { success: true };
  }

  // Delete a branch
  deleteBranch(name) {
    if (!this.branches.has(name)) {
      return { success: false, error: `branch '${name}' not found` };
    }
    if (this.currentBranch() === name) {
      return { success: false, error: `cannot delete checked-out branch '${name}'` };
    }
    this.branches.delete(name);
    return { success: true };
  }

  // Switch to a branch
  checkout(branchName) {
    if (!this.branches.has(branchName)) {
      return { success: false, error: `branch '${branchName}' not found` };
    }
    this.head = { type: 'branch', ref: branchName };
    return { success: true };
  }

  // Detach HEAD at a commit
  detach(commitId) {
    this.head = { type: 'detached', commitId };
  }

  // List all branches
  listBranches() {
    const result = [];
    for (const [name, commitId] of this.branches) {
      result.push({
        name,
        commitId,
        isCurrent: this.currentBranch() === name,
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get commit ID for a branch
  getBranchCommit(name) {
    return this.branches.get(name) || null;
  }

  // Check if branch exists
  hasBranch(name) {
    return this.branches.has(name);
  }

  // Resolve a ref (branch name, tag, HEAD, or commit id) to a commit id
  resolveRef(ref) {
    if (ref === 'HEAD') return this.headCommitId();
    if (this.branches.has(ref)) return this.branches.get(ref);
    if (this.tags.has(ref)) return this.tags.get(ref);
    // Could be a direct commit id
    return ref;
  }

  // Create a tag
  createTag(name, commitId) {
    if (this.tags.has(name)) {
      return { success: false, error: `tag '${name}' already exists` };
    }
    this.tags.set(name, commitId);
    return { success: true };
  }

  // Update branch pointer directly
  setBranchCommit(name, commitId) {
    this.branches.set(name, commitId);
  }

  clone() {
    const bm = new BranchManager();
    for (const [name, id] of this.branches) {
      bm.branches.set(name, id);
    }
    for (const [name, id] of this.tags) {
      bm.tags.set(name, id);
    }
    bm.head = this.head ? { ...this.head } : null;
    return bm;
  }
}
