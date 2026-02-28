// Command history with up/down arrow navigation

export class CommandHistory {
  constructor(maxSize = 100) {
    this.history = [];
    this.maxSize = maxSize;
    this.index = -1; // -1 means "not browsing"
    this.currentInput = ''; // what user was typing before browsing
  }

  add(command) {
    if (!command.trim()) return;
    // Don't add duplicates of the last command
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) return;
    this.history.push(command);
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
    this.index = -1;
  }

  up(currentInput) {
    if (this.history.length === 0) return currentInput;

    if (this.index === -1) {
      // Starting to browse — save current input
      this.currentInput = currentInput;
      this.index = this.history.length - 1;
    } else if (this.index > 0) {
      this.index--;
    }

    return this.history[this.index];
  }

  down(currentInput) {
    if (this.index === -1) return currentInput;

    if (this.index < this.history.length - 1) {
      this.index++;
      return this.history[this.index];
    } else {
      // Back to current input
      this.index = -1;
      return this.currentInput;
    }
  }

  reset() {
    this.index = -1;
    this.currentInput = '';
  }
}
