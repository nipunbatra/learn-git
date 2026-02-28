// Level loading, setup, and progression

import { LevelValidator } from './level-validator.js';
import { levels } from './level-data.js';

export class LevelManager {
  constructor(gitEngine, notifications, progressTracker) {
    this.engine = gitEngine;
    this.notifications = notifications;
    this.progress = progressTracker;
    this.validator = new LevelValidator();
    this.currentLevel = null;
    this.currentLevelIndex = 0;
    this.hintIndex = 0;
    this.onLevelChange = null;
    this.onObjectivesUpdate = null;
  }

  getTotalLevels() {
    return Math.max(0, levels.length - 1);
  }

  loadLevel(levelNumber) {
    const index = levelNumber;
    if (index < 0 || index >= levels.length) return;

    this.currentLevelIndex = index;
    this.currentLevel = levels[index];
    this.hintIndex = 0;

    // Reset engine
    this.engine.reset();

    // Run level setup
    if (this.currentLevel.setup) {
      this.currentLevel.setup(this.engine);
    }

    this.progress.setCurrentLevel(levelNumber);

    // Update UI
    this._updateLevelPanel();

    if (this.onLevelChange) {
      this.onLevelChange(this.currentLevel, levelNumber);
    }
  }

  checkObjectives() {
    if (!this.currentLevel) return false;

    const state = this.engine.getState();
    const results = this.validator.validate(this.currentLevel, state);

    // Update UI
    this._updateObjectives(results);

    if (this.onObjectivesUpdate) {
      this.onObjectivesUpdate(results);
    }

    if (this.validator.isLevelComplete()) {
      this._handleLevelComplete();
      return true;
    }

    return false;
  }

  nextHint() {
    if (!this.currentLevel || !this.currentLevel.hints) return null;
    if (this.hintIndex >= this.currentLevel.hints.length) return null;

    const hint = this.currentLevel.hints[this.hintIndex];
    this.hintIndex++;
    this._showHint(hint);
    return hint;
  }

  nextLevel() {
    const nextNum = this.currentLevelIndex + 1;
    if (nextNum < levels.length) {
      this.loadLevel(nextNum);
    }
  }

  _handleLevelComplete() {
    const levelNum = this.currentLevelIndex;
    this.progress.markLevelComplete(levelNum);

    if (levelNum >= levels.length - 1) {
      this.notifications.showGameComplete();
    } else {
      this.notifications.showLevelComplete(this.currentLevel.title, () => {
        this.nextLevel();
      });
    }
  }

  _updateLevelPanel() {
    const level = this.currentLevel;
    const lessonNum = this.currentLevelIndex;

    // World
    document.getElementById('level-world').textContent = level.world;
    // Title
    document.getElementById('level-title').textContent = `Lesson ${lessonNum}: ${level.title}`;
    // Description
    document.getElementById('level-description').textContent = level.description;
    // Level indicator
    document.getElementById('level-indicator').textContent = `Lesson ${lessonNum}/${levels.length - 1}`;
    this._updateLearningPath(lessonNum);
    this._updateTeachingBeat(lessonNum, level.world);
    this._updateBeforeAfter(lessonNum, level);

    // Objectives
    const objContainer = document.getElementById('objectives-container');
    objContainer.innerHTML = `
      <div class="objectives__title">Objectives</div>
      ${level.objectives.map((obj, i) => `
        <div class="objective" id="objective-${i}">
          <div class="objective__check"></div>
          <span>${obj.text}</span>
        </div>
      `).join('')}
    `;

    // Concepts
    const conceptsContainer = document.getElementById('concepts-container');
    if (level.concepts && level.concepts.length > 0) {
      conceptsContainer.innerHTML = `
        <div class="concepts__title">Concepts</div>
        ${level.concepts.map(c => `<div class="concept-card">${c}</div>`).join('')}
      `;
    } else {
      conceptsContainer.innerHTML = '';
    }

    // Hints
    const hintsContainer = document.getElementById('hints-container');
    hintsContainer.innerHTML = level.hints && level.hints.length > 0
      ? `<button class="hint-btn" id="hint-btn-inline">Show Hint</button>
         <div id="hints-display"></div>`
      : '';

    const inlineHintBtn = document.getElementById('hint-btn-inline');
    if (inlineHintBtn) {
      inlineHintBtn.addEventListener('click', () => this.nextHint());
    }
  }

  _updateObjectives(results) {
    results.forEach((complete, i) => {
      const el = document.getElementById(`objective-${i}`);
      if (el) {
        el.classList.toggle('objective--complete', complete);
      }
    });
  }

  _showHint(hintText) {
    const display = document.getElementById('hints-display');
    if (display) {
      const hintEl = document.createElement('div');
      hintEl.className = 'hint-text';
      hintEl.innerHTML = hintText;
      display.appendChild(hintEl);
    }
  }

  _updateLearningPath(levelNum) {
    const el = document.getElementById('learning-path');
    if (!el) return;

    const prev = levels[levelNum - 1];
    const current = levels[levelNum];
    const next = levels[levelNum + 1];

    const prevText = prev ? `Lesson ${levelNum - 1}: ${prev.title}` : 'Start';
    const currentText = current ? `Lesson ${levelNum}: ${current.title}` : '';
    const nextText = next ? `Lesson ${levelNum + 1}: ${next.title}` : 'Sandbox complete';

    el.innerHTML = `
      <div class="learning-path__title">Learning Path</div>
      <div class="learning-path__row">
        <div class="learning-path__node">${prevText}</div>
        <div class="learning-path__arrow">→</div>
        <div class="learning-path__node learning-path__node--current">${currentText}</div>
      </div>
      <div class="learning-path__row" style="margin-top:4px;">
        <div class="learning-path__node learning-path__node--current">${currentText}</div>
        <div class="learning-path__arrow">→</div>
        <div class="learning-path__node">${nextText}</div>
      </div>
    `;
  }

  getSuggestedCommands(objectiveResults = []) {
    if (!this.currentLevel) return [];

    const suggestions = [];
    const hints = this.currentLevel.hints || [];
    const commandRegex = /<code>(.*?)<\/code>/g;
    for (const hint of hints) {
      let match;
      while ((match = commandRegex.exec(hint)) !== null) {
        const cmd = String(match[1]).trim();
        if (cmd && !cmd.includes('&lt;') && !cmd.includes('&gt;')) {
          suggestions.push(cmd);
        }
      }
    }

    // Favor commands associated with incomplete objectives.
    const incompleteHints = [];
    objectiveResults.forEach((done, idx) => {
      if (!done && hints[idx]) {
        let match;
        const scopedRegex = /<code>(.*?)<\/code>/g;
        while ((match = scopedRegex.exec(hints[idx])) !== null) {
          const cmd = String(match[1]).trim();
          if (cmd && !cmd.includes('&lt;') && !cmd.includes('&gt;')) {
            incompleteHints.push(cmd);
          }
        }
      }
    });

    const ordered = [...incompleteHints, ...suggestions];
    return ordered.filter((cmd, i) => ordered.indexOf(cmd) === i).slice(0, 6);
  }

  _updateTeachingBeat(levelNum, worldLabel) {
    const el = document.getElementById('teaching-beat');
    if (!el) return;

    const beatsByWorld = {
      'World 1: Basics': {
        beat: 'You are a developer discovering how Git remembers project state.',
        ask: 'Ask learners: "Why does Git need a staging area instead of committing immediately?"',
      },
      'World 2: Branching': {
        beat: 'The team starts parallel work. Branches become lanes of development.',
        ask: 'Ask learners: "When should you create a branch vs keep working on main?"',
      },
      'World 3: Collaboration': {
        beat: 'Now multiple developers coordinate through remotes and synchronization.',
        ask: 'Ask learners: "What problems happen if you push without fetching/pulling?"',
      },
      'World 4: Advanced': {
        beat: 'You are now maintaining history quality, safety, and recoverability.',
        ask: 'Ask learners: "When is rebase safer than merge, and when is it risky?"',
      },
    };

    const worldBeat = beatsByWorld[worldLabel] || {
      beat: 'Experiment, discuss tradeoffs, and connect commands to real workflows.',
      ask: 'Ask learners to predict command output before executing.',
    };

    el.innerHTML = `
      <div class="teaching-beat__title">Teaching Beat (Lesson ${levelNum})</div>
      <div class="teaching-beat__line">${worldBeat.beat}</div>
      <div class="teaching-beat__line" style="margin-top:4px;">${worldBeat.ask}</div>
    `;
  }

  _updateBeforeAfter(lessonNum, level) {
    const el = document.getElementById('before-after');
    if (!el) return;

    const fallbackBefore = lessonNum === 0
      ? 'You are new to this simulator and need to orient yourself.'
      : `Before this lesson, you have completed Lessons 0-${Math.max(0, lessonNum - 1)} and know the prior commands.`;
    const fallbackAfter = level.objectives && level.objectives.length > 0
      ? `After this lesson, you should be able to: ${level.objectives.map((o) => o.text).join('; ')}.`
      : 'After this lesson, you should be able to explain the core Git workflow.';

    const beforeText = level.beforeLesson || fallbackBefore;
    const afterText = level.afterLesson || fallbackAfter;

    el.innerHTML = `
      <div class="before-after__card">
        <div class="before-after__title">Before This Lesson</div>
        <div class="before-after__line">${beforeText}</div>
      </div>
      <div class="before-after__card">
        <div class="before-after__title">After This Lesson</div>
        <div class="before-after__line">${afterText}</div>
      </div>
    `;
  }
}
