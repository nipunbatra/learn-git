// Graph animation coordinator

import { GraphLayout } from './graph-layout.js';
import { GraphRenderer } from './graph-renderer.js';

export class GraphAnimator {
  constructor(containerId) {
    this.layout = new GraphLayout();
    this.renderer = new GraphRenderer(containerId);
  }

  update(graphState) {
    const layoutData = this.layout.compute(graphState);
    this.renderer.render(layoutData);
  }
}
