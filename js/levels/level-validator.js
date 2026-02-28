// Check level objectives after each command

export class LevelValidator {
  constructor() {
    this.objectiveStatus = [];
  }

  // Check all objectives of a level, returns array of booleans
  validate(level, engineState) {
    if (!level || !level.objectives) return [];

    this.objectiveStatus = level.objectives.map(obj => {
      try {
        return obj.check(engineState);
      } catch {
        return false;
      }
    });

    return this.objectiveStatus;
  }

  // Are all objectives complete?
  isLevelComplete() {
    return this.objectiveStatus.length > 0 && this.objectiveStatus.every(Boolean);
  }
}
