// Panel resizing (basic implementation)

export class LayoutManager {
  constructor() {
    this.mainContent = document.querySelector('.main-content');
  }

  // Could be extended for drag-resize later
  init() {
    // Handle window resize
    window.addEventListener('resize', () => this._onResize());
    this._onResize();
  }

  _onResize() {
    // Trigger graph re-render if needed
    window.dispatchEvent(new CustomEvent('layout-change'));
  }
}
