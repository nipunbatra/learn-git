// Topological sort and column assignment for commit graph

export class GraphLayout {
  constructor() {
    this.nodeSpacingY = 60;
    this.nodeSpacingX = 80;
    this.paddingTop = 40;
    this.paddingLeft = 60;
    this.nodeRadius = 8;
  }

  // Compute positions for all commits
  compute(graphState) {
    const { commits, branches, head, tags, trackingBranches } = graphState;

    if (commits.length === 0) {
      return { nodes: [], edges: [], labels: [], width: 0, height: 0 };
    }

    // Build adjacency info
    const commitMap = new Map();
    for (const c of commits) {
      commitMap.set(c.id, c);
    }

    // Topological sort (newest first)
    const sorted = this._topoSort(commits, commitMap);

    // Assign columns (branches)
    const columns = this._assignColumns(sorted, branches);

    // Compute node positions
    const nodes = [];
    const nodePositions = new Map();

    for (let i = 0; i < sorted.length; i++) {
      const commit = sorted[i];
      const col = columns.get(commit.id) || 0;
      const x = this.paddingLeft + col * this.nodeSpacingX;
      const y = this.paddingTop + i * this.nodeSpacingY;

      nodePositions.set(commit.id, { x, y });
      nodes.push({
        id: commit.id,
        x, y,
        message: commit.message,
        column: col,
        commit,
      });
    }

    // Compute edges
    const edges = [];
    for (const commit of sorted) {
      const to = nodePositions.get(commit.id);
      if (!to) continue;
      for (const parentId of commit.parentIds) {
        const from = nodePositions.get(parentId);
        if (from) {
          edges.push({
            from: { ...from, id: parentId },
            to: { ...to, id: commit.id },
            column: columns.get(commit.id) || 0,
          });
        }
      }
    }

    // Compute labels (branches, HEAD, tags)
    const labels = [];
    for (const branch of branches) {
      if (branch.commitId && nodePositions.has(branch.commitId)) {
        labels.push({
          type: branch.isCurrent ? 'head-branch' : 'branch',
          name: branch.name,
          commitId: branch.commitId,
          pos: nodePositions.get(branch.commitId),
        });
      }
    }

    // HEAD label for detached
    if (head && head.type === 'detached' && nodePositions.has(head.commitId)) {
      labels.push({
        type: 'head-detached',
        name: 'HEAD',
        commitId: head.commitId,
        pos: nodePositions.get(head.commitId),
      });
    }

    // Tags
    if (tags) {
      for (const [name, commitId] of tags) {
        if (nodePositions.has(commitId)) {
          labels.push({
            type: 'tag',
            name,
            commitId,
            pos: nodePositions.get(commitId),
          });
        }
      }
    }

    // Tracking branches
    if (trackingBranches) {
      for (const tb of trackingBranches) {
        if (nodePositions.has(tb.commitId)) {
          labels.push({
            type: 'tracking',
            name: tb.name,
            commitId: tb.commitId,
            pos: nodePositions.get(tb.commitId),
          });
        }
      }
    }

    const maxCol = Math.max(0, ...columns.values());
    const width = this.paddingLeft * 2 + maxCol * this.nodeSpacingX + 200;
    const height = this.paddingTop * 2 + (sorted.length - 1) * this.nodeSpacingY;

    return { nodes, edges, labels, width: Math.max(width, 400), height: Math.max(height, 100) };
  }

  _topoSort(commits, commitMap) {
    // Simple: sort by commit ID (c1, c2, ...) descending (newest first)
    const sorted = [...commits].sort((a, b) => {
      const numA = parseInt(a.id.slice(1));
      const numB = parseInt(b.id.slice(1));
      return numB - numA;
    });
    return sorted;
  }

  _assignColumns(sorted, branches) {
    const columns = new Map();
    const branchColumns = new Map();
    let nextCol = 0;

    // Assign column 0 to main/master
    const mainBranch = branches.find(b => b.name === 'main' || b.name === 'master');
    if (mainBranch) {
      branchColumns.set(mainBranch.name, 0);
      nextCol = 1;
    }

    // Assign columns to other branches
    for (const branch of branches) {
      if (!branchColumns.has(branch.name)) {
        branchColumns.set(branch.name, nextCol++);
      }
    }

    // Walk from each branch tip and assign columns
    for (const branch of branches) {
      const col = branchColumns.get(branch.name);
      let commitId = branch.commitId;
      const visited = new Set();

      while (commitId && !visited.has(commitId)) {
        visited.add(commitId);
        if (!columns.has(commitId)) {
          columns.set(commitId, col);
        }
        const commit = sorted.find(c => c.id === commitId);
        if (!commit || commit.parentIds.length === 0) break;

        // Follow first parent
        const parentId = commit.parentIds[0];

        // If parent is on main branch (column 0), stop assigning this column
        if (columns.has(parentId) && columns.get(parentId) === 0 && col !== 0) {
          break;
        }

        commitId = parentId;
      }
    }

    // Any unassigned commits get column 0
    for (const commit of sorted) {
      if (!columns.has(commit.id)) {
        columns.set(commit.id, 0);
      }
    }

    return columns;
  }
}
