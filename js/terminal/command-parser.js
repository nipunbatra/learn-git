// Tokenize and parse git/shell commands

export class CommandParser {
  parse(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const tokens = this._tokenize(trimmed);
    if (tokens.length === 0) return null;

    const firstToken = tokens[0];

    if (firstToken === 'git') {
      return this._parseGitCommand(tokens.slice(1));
    }

    // Shell command
    return {
      type: 'shell',
      command: firstToken,
      args: tokens.slice(1),
      raw: trimmed,
    };
  }

  _parseGitCommand(tokens) {
    if (tokens.length === 0) {
      return {
        type: 'git',
        command: null,
        args: [],
        flags: {},
        raw: 'git',
      };
    }

    const command = tokens[0];
    const args = [];
    const flags = {};

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token === '-m' || token === '--message') {
        // Next token is the message
        if (i + 1 < tokens.length) {
          flags['-m'] = tokens[i + 1];
          i += 2;
          continue;
        }
      }

      if (token.startsWith('-m') && token.length > 2) {
        // -m"message" or -mmessage
        flags['-m'] = token.slice(2).replace(/^["']|["']$/g, '');
        i++;
        continue;
      }

      if (token === '-n' || token === '--max-count') {
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          flags['-n'] = tokens[i + 1];
          i += 2;
          continue;
        }
        flags['-n'] = true;
        i++;
        continue;
      }

      if (token.startsWith('--') || token.startsWith('-')) {
        flags[token] = true;
        i++;
        continue;
      }

      args.push(token);
      i++;
    }

    return {
      type: 'git',
      command,
      args,
      flags,
    };
  }

  _tokenize(input) {
    const tokens = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
      // Skip whitespace
      while (i < len && input[i] === ' ') i++;
      if (i >= len) break;

      // Quoted string
      if (input[i] === '"' || input[i] === "'") {
        const quote = input[i];
        i++;
        let token = '';
        while (i < len && input[i] !== quote) {
          token += input[i];
          i++;
        }
        if (i < len) i++; // skip closing quote
        tokens.push(token);
        continue;
      }

      // Regular token (but keep > and >> as part of the token stream for echo)
      let token = '';
      while (i < len && input[i] !== ' ' && input[i] !== '"' && input[i] !== "'") {
        token += input[i];
        i++;
      }
      if (token) tokens.push(token);
    }

    return tokens;
  }
}
