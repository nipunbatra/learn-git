// Git object model with readable IDs (c1, c2, etc.)

let commitCounter = 0;
let blobCounter = 0;
let treeCounter = 0;

export function resetCounters() {
  commitCounter = 0;
  blobCounter = 0;
  treeCounter = 0;
}

export function nextCommitId() {
  return `c${++commitCounter}`;
}

export function nextBlobId() {
  return `b${++blobCounter}`;
}

export function nextTreeId() {
  return `t${++treeCounter}`;
}

export function getCommitCounter() {
  return commitCounter;
}

export function setCommitCounter(val) {
  commitCounter = val;
}

export class Blob {
  constructor(id, content) {
    this.type = 'blob';
    this.id = id;
    this.content = content;
  }
}

export class Tree {
  constructor(id, entries) {
    this.type = 'tree';
    this.id = id;
    // entries: Map<filename, blobId>
    this.entries = entries;
  }
}

export class Commit {
  constructor(id, { treeId, parentIds = [], message, author = 'Student', timestamp = null }) {
    this.type = 'commit';
    this.id = id;
    this.treeId = treeId;
    this.parentIds = parentIds;
    this.message = message;
    this.author = author;
    this.timestamp = timestamp || new Date().toISOString();
  }

  shortId() {
    return this.id;
  }
}

export class ObjectDatabase {
  constructor() {
    this.objects = new Map();
  }

  store(obj) {
    this.objects.set(obj.id, obj);
    return obj.id;
  }

  get(id) {
    return this.objects.get(id);
  }

  has(id) {
    return this.objects.has(id);
  }

  getAllCommits() {
    const commits = [];
    for (const obj of this.objects.values()) {
      if (obj.type === 'commit') commits.push(obj);
    }
    return commits;
  }

  clone() {
    const db = new ObjectDatabase();
    for (const [id, obj] of this.objects) {
      db.objects.set(id, obj);
    }
    return db;
  }
}
