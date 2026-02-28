// In-memory filesystem: Map<path, content>

export class WorkingDirectory {
  constructor() {
    this.files = new Map();
  }

  // Create or overwrite a file
  writeFile(path, content = '') {
    this.files.set(path, content);
  }

  // Read file content
  readFile(path) {
    if (!this.files.has(path)) return null;
    return this.files.get(path);
  }

  // Check if file exists
  exists(path) {
    return this.files.has(path);
  }

  // Delete a file
  deleteFile(path) {
    return this.files.delete(path);
  }

  // List all files
  listFiles() {
    return [...this.files.keys()].sort();
  }

  // Get all files as entries
  entries() {
    return new Map(this.files);
  }

  // Clear all files
  clear() {
    this.files.clear();
  }

  clone() {
    const wd = new WorkingDirectory();
    for (const [path, content] of this.files) {
      wd.files.set(path, content);
    }
    return wd;
  }
}
