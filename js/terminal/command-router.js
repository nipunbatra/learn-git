// Dispatch parsed commands to engine

export class CommandRouter {
  constructor(gitEngine) {
    this.engine = gitEngine;
  }

  route(parsed) {
    if (!parsed) {
      return { output: '', success: true };
    }

    if (parsed.type === 'git') {
      if (!parsed.command) {
        return {
          output: 'usage: git <command> [<args>]\n\nType "help" to see available commands.',
          success: false,
        };
      }
      return this.engine.execute(parsed.command, parsed.args, parsed.flags);
    }

    if (parsed.type === 'shell') {
      // Handle echo specially — pass full args for redirect parsing
      if (parsed.command === 'echo') {
        // Reconstruct the echo args from raw input
        const raw = parsed.raw || '';
        const echoContent = raw.replace(/^echo\s+/, '');
        return this.engine.executeShell('echo', [echoContent]);
      }
      return this.engine.executeShell(parsed.command, parsed.args);
    }

    return { output: `command not found: ${parsed.raw}`, success: false };
  }
}
