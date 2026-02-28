// Merge engine: fast-forward and 3-way merge with conflict detection

export class MergeEngine {
  constructor(objectDatabase, branchManager) {
    this.odb = objectDatabase;
    this.bm = branchManager;
  }

  // Check if commitA is an ancestor of commitB
  isAncestor(ancestorId, descendantId) {
    if (!ancestorId || !descendantId) return false;
    if (ancestorId === descendantId) return true;
    const visited = new Set();
    const queue = [descendantId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === ancestorId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const commit = this.odb.get(current);
      if (commit && commit.parentIds) {
        queue.push(...commit.parentIds);
      }
    }
    return false;
  }

  // Find merge base (LCA of two commits)
  findMergeBase(commitIdA, commitIdB) {
    const ancestorsA = new Set();
    const queueA = [commitIdA];
    while (queueA.length > 0) {
      const id = queueA.shift();
      if (ancestorsA.has(id)) continue;
      ancestorsA.add(id);
      const commit = this.odb.get(id);
      if (commit && commit.parentIds) queueA.push(...commit.parentIds);
    }

    const queueB = [commitIdB];
    const visitedB = new Set();
    while (queueB.length > 0) {
      const id = queueB.shift();
      if (visitedB.has(id)) continue;
      visitedB.add(id);
      if (ancestorsA.has(id)) return id;
      const commit = this.odb.get(id);
      if (commit && commit.parentIds) queueB.push(...commit.parentIds);
    }
    return null;
  }

  // Get the file snapshot at a commit
  getFilesAtCommit(commitId) {
    const commit = this.odb.get(commitId);
    if (!commit) return new Map();
    const tree = this.odb.get(commit.treeId);
    if (!tree) return new Map();

    const files = new Map();
    for (const [path, blobId] of tree.entries) {
      const blob = this.odb.get(blobId);
      if (blob) files.set(path, blob.content);
    }
    return files;
  }

  // Perform a 3-way merge, returns { merged: Map, conflicts: Map }
  threeWayMerge(baseFiles, oursFiles, theirsFiles) {
    const allPaths = new Set([...baseFiles.keys(), ...oursFiles.keys(), ...theirsFiles.keys()]);
    const merged = new Map();
    const conflicts = new Map();

    for (const path of allPaths) {
      const base = baseFiles.get(path) ?? null;
      const ours = oursFiles.get(path) ?? null;
      const theirs = theirsFiles.get(path) ?? null;

      if (ours === theirs) {
        // Both sides agree
        if (ours !== null) merged.set(path, ours);
      } else if (ours === base) {
        // Only theirs changed
        if (theirs !== null) merged.set(path, theirs);
      } else if (theirs === base) {
        // Only ours changed
        if (ours !== null) merged.set(path, ours);
      } else {
        // Both changed differently — conflict
        conflicts.set(path, { ours, theirs, base });
        const conflictContent = `<<<<<<< HEAD\n${ours || ''}\n=======\n${theirs || ''}\n>>>>>>> theirs`;
        merged.set(path, conflictContent);
      }
    }

    return { merged, conflicts };
  }
}
