// Git staging area (index)

export class StagingArea {
  constructor() {
    this.files = new Map(); // path -> content
  }

  add(path, content) {
    this.files.set(path, content);
  }

  remove(path) {
    this.files.delete(path);
  }

  has(path) {
    return this.files.has(path);
  }

  get(path) {
    return this.files.get(path);
  }

  entries() {
    return new Map(this.files);
  }

  isEmpty() {
    return this.files.size === 0;
  }

  clear() {
    this.files.clear();
  }

  listFiles() {
    return [...this.files.keys()].sort();
  }

  clone() {
    const sa = new StagingArea();
    for (const [path, content] of this.files) {
      sa.files.set(path, content);
    }
    return sa;
  }
}
