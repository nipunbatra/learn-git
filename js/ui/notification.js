// Success toasts and modals

export class NotificationManager {
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notification notification--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showLevelComplete(levelTitle, onNext) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__icon">&#127942;</div>
        <h2 class="modal__title">Level Complete!</h2>
        <p class="modal__message">You completed: ${levelTitle}</p>
        <button class="btn btn--primary" id="modal-next" style="padding: 8px 24px; font-size: 16px;">
          Next Level
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-next').addEventListener('click', () => {
      overlay.remove();
      if (onNext) onNext();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        if (onNext) onNext();
      }
    });
  }

  showGameComplete() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__icon">&#127775;</div>
        <h2 class="modal__title">Congratulations!</h2>
        <p class="modal__message">You've completed all levels of GitQuest! You're now a Git expert.</p>
        <button class="btn btn--primary" id="modal-close" style="padding: 8px 24px; font-size: 16px;">
          Awesome!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-close').addEventListener('click', () => {
      overlay.remove();
    });
  }
}
