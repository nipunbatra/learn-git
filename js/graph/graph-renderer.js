// SVG commit graph rendering

const BRANCH_COLORS = [
  'var(--branch-main)',   // column 0: green
  'var(--branch-1)',      // column 1: blue
  'var(--branch-2)',      // column 2: purple
  'var(--branch-3)',      // column 3: orange
  'var(--branch-4)',      // column 4: pink
  'var(--branch-5)',      // column 5: cyan
];

function getColor(column) {
  return BRANCH_COLORS[column % BRANCH_COLORS.length];
}

export class GraphRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.previousNodeIds = new Set();
  }

  render(layoutData) {
    const { nodes, edges, labels, width, height } = layoutData;

    if (nodes.length === 0) {
      this.container.innerHTML = `<div class="graph__empty">No commits yet — make your first commit to see the graph</div>`;
      return;
    }

    const svgHeight = Math.max(height + 60, 200);
    const svgWidth = Math.max(width, this.container.clientWidth || 400, 400);

    let svgContent = `<svg class="graph__svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Draw edges first (behind nodes)
    for (const edge of edges) {
      const isNew = !this.previousNodeIds.has(edge.to.id);
      svgContent += this._renderEdge(edge, isNew);
    }

    // Draw nodes
    const newNodeIds = new Set();
    for (const node of nodes) {
      const isNew = !this.previousNodeIds.has(node.id);
      newNodeIds.add(node.id);
      svgContent += this._renderNode(node, isNew);
    }

    // Draw labels
    svgContent += this._renderLabels(labels, nodes);

    svgContent += '</svg>';

    this.container.innerHTML = svgContent;
    this.previousNodeIds = newNodeIds;

    // Scroll to show the latest commit
    this.container.scrollTop = 0;
  }

  _renderNode(node, isNew) {
    const color = getColor(node.column);
    const animClass = isNew ? ' new-commit' : '';

    return `
      <g class="commit-node${animClass}" transform="translate(${node.x}, ${node.y})">
        <circle class="commit-circle" r="8" fill="${color}" stroke="${color}" stroke-opacity="0.5" />
        <circle r="3" fill="var(--bg-primary)" />
        <text class="commit-label" x="16" y="0" dy="0.35em">${node.id}</text>
        <text class="commit-message" x="50" y="0" dy="0.35em">${this._escSvg(this._truncate(node.message, 40))}</text>
      </g>
    `;
  }

  _renderEdge(edge, isNew) {
    const color = getColor(edge.column);
    const animClass = isNew ? ' new-edge' : '';

    if (edge.from.x === edge.to.x) {
      // Straight line
      return `<line class="graph-edge${animClass}"
        x1="${edge.to.x}" y1="${edge.to.y}"
        x2="${edge.from.x}" y2="${edge.from.y}"
        stroke="${color}" />`;
    }

    // Curved path for cross-column edges
    const midY = (edge.from.y + edge.to.y) / 2;
    return `<path class="graph-edge${animClass}"
      d="M${edge.to.x},${edge.to.y} C${edge.to.x},${midY} ${edge.from.x},${midY} ${edge.from.x},${edge.from.y}"
      stroke="${color}" />`;
  }

  _renderLabels(labels, nodes) {
    let svg = '';

    // Group labels by commit
    const labelsByCommit = new Map();
    for (const label of labels) {
      if (!labelsByCommit.has(label.commitId)) {
        labelsByCommit.set(label.commitId, []);
      }
      labelsByCommit.get(label.commitId).push(label);
    }

    for (const [commitId, commitLabels] of labelsByCommit) {
      // Find the node
      const node = nodes.find(n => n.id === commitId);
      if (!node) continue;

      let offsetX = 0;
      // Start labels after the message text area
      const baseX = node.x - 10;
      const baseY = node.y - 22;

      for (const label of commitLabels) {
        const { bgColor, textColor } = this._getLabelColors(label);
        const textWidth = label.name.length * 7 + 10;

        svg += `
          <g class="branch-label${label.type.includes('head') ? ' head-label' : ''}"
             transform="translate(${baseX + offsetX}, ${baseY})">
            <rect x="0" y="-8" width="${textWidth}" height="16"
                  fill="${bgColor}" rx="3" ry="3" />
            <text x="${textWidth / 2}" y="0" dy="0.35em"
                  text-anchor="middle" fill="${textColor}"
                  font-size="10" font-family="var(--font-mono)">${this._escSvg(label.name)}</text>
          </g>
        `;

        offsetX += textWidth + 4;
      }
    }

    return svg;
  }

  _getLabelColors(label) {
    switch (label.type) {
      case 'head-branch':
        return { bgColor: 'var(--accent-green)', textColor: '#000' };
      case 'head-detached':
        return { bgColor: 'var(--accent-red)', textColor: '#fff' };
      case 'branch':
        return { bgColor: 'var(--accent-blue)', textColor: '#000' };
      case 'tag':
        return { bgColor: 'var(--accent-yellow)', textColor: '#000' };
      case 'tracking':
        return { bgColor: 'var(--accent-purple)', textColor: '#000' };
      default:
        return { bgColor: 'var(--border-color)', textColor: 'var(--text-primary)' };
    }
  }

  _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
  }

  _escSvg(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
