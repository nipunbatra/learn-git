// Remote repository model

import { ObjectDatabase, Commit, Tree, Blob, nextCommitId, nextBlobId, nextTreeId } from './git-object-model.js';
import { BranchManager } from './branch-manager.js';

export class RemoteModel {
  constructor() {
    this.remotes = new Map(); // remoteName -> RemoteRepo
    this.trackingBranches = new Map(); // 'origin/main' -> commitId
  }

  addRemote(name, url) {
    if (this.remotes.has(name)) {
      return { success: false, error: `remote ${name} already exists` };
    }
    this.remotes.set(name, new RemoteRepo(name, url));
    return { success: true };
  }

  getRemote(name) {
    return this.remotes.get(name);
  }

  hasRemote(name) {
    return this.remotes.has(name);
  }

  listRemotes() {
    const result = [];
    for (const [name, remote] of this.remotes) {
      result.push({ name, url: remote.url });
    }
    return result;
  }

  // Set tracking branch
  setTrackingBranch(remoteName, branchName, commitId) {
    this.trackingBranches.set(`${remoteName}/${branchName}`, commitId);
  }

  getTrackingBranch(remoteName, branchName) {
    return this.trackingBranches.get(`${remoteName}/${branchName}`) || null;
  }

  listTrackingBranches() {
    const result = [];
    for (const [name, commitId] of this.trackingBranches) {
      result.push({ name, commitId });
    }
    return result;
  }
}

export class RemoteRepo {
  constructor(name, url) {
    this.name = name;
    this.url = url;
    this.objectDatabase = new ObjectDatabase();
    this.branches = new Map(); // branchName -> commitId
  }

  // Copy commits from local to remote
  receiveObjects(localOdb, commitIds) {
    const toCopy = new Set();
    const queue = [...commitIds];

    while (queue.length > 0) {
      const id = queue.shift();
      if (toCopy.has(id) || this.objectDatabase.has(id)) continue;
      toCopy.add(id);
      const obj = localOdb.get(id);
      if (obj && obj.type === 'commit') {
        toCopy.add(obj.treeId);
        const tree = localOdb.get(obj.treeId);
        if (tree) {
          for (const blobId of tree.entries.values()) {
            toCopy.add(blobId);
          }
        }
        queue.push(...obj.parentIds);
      }
    }

    for (const id of toCopy) {
      const obj = localOdb.get(id);
      if (obj && !this.objectDatabase.has(id)) {
        this.objectDatabase.store(obj);
      }
    }
  }

  // Get commits that local doesn't have
  getNewCommits(localOdb) {
    const newObjects = [];
    for (const [id, obj] of this.objectDatabase.objects) {
      if (!localOdb.has(id)) {
        newObjects.push(obj);
      }
    }
    return newObjects;
  }
}
