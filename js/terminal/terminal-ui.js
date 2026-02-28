// Terminal DOM rendering, input handling, scrolling

import { CommandParser } from './command-parser.js';
import { CommandRouter } from './command-router.js';
import { OutputFormatter } from './output-formatter.js';
import { CommandHistory } from './history.js';

const GIT_SUBCOMMANDS = [
  'init', 'add', 'commit', 'status', 'log', 'diff',
  'branch', 'checkout', 'switch', 'merge',
  'remote', 'clone', 'push', 'fetch', 'pull',
  'stash', 'reset', 'rebase', 'tag',
];

const SHELL_COMMANDS = ['echo', 'cat', 'touch', 'ls', 'clear', 'help', 'pwd'];

export class TerminalUI {
  constructor(gitEngine, onCommand) {
    this.engine = gitEngine;
    this.onCommand = onCommand; // callback after each command
    this.parser = new CommandParser();
    this.router = new CommandRouter(gitEngine);
    this.formatter = new OutputFormatter();
    this.history = new CommandHistory();

    this.outputEl = document.getElementById('terminal-output');
    this.inputEl = document.getElementById('terminal-input');
    this.promptEl = document.getElementById('terminal-prompt');
    this.lastTabSignature = null;

    this._bindEvents();
    this.updatePrompt();
  }

  _bindEvents() {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') {
        this.lastTabSignature = null;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleSubmit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.inputEl.value = this.history.up(this.inputEl.value);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.inputEl.value = this.history.down(this.inputEl.value);
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        this.clear();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this._handleTab();
      }
    });

    // Focus input when clicking terminal area
    document.getElementById('terminal').addEventListener('click', () => {
      this.inputEl.focus();
    });
  }

  _handleSubmit() {
    const input = this.inputEl.value;
    this.inputEl.value = '';
    this.lastTabSignature = null;
    this.history.add(input);
    this.history.reset();

    // Echo the command
    this._appendLine(this._getPromptHtml() + this._escapeHtml(input), 'cmd-echo');

    if (!input.trim()) {
      this.updatePrompt();
      this.scrollToBottom();
      return;
    }

    // Parse and route
    const parsed = this.parser.parse(input);
    const result = this.router.route(parsed);

    if (result.output === '__CLEAR__') {
      this.clear();
      return;
    }

    if (result.output) {
      this._appendLine(this.formatter.format(result.output, result.success));
    }

    this.updatePrompt();
    this.scrollToBottom();

    // Notify callback
    if (this.onCommand) {
      this.onCommand(input, parsed, result);
    }
  }

  updatePrompt() {
    const branch = this.engine.branchManager.currentBranch();
    const initialized = this.engine.initialized;
    this.promptEl.innerHTML = this.formatter.formatPrompt(
      '~/project',
      initialized ? branch : null
    );
  }

  writeLine(text, className = '') {
    this._appendLine(this.formatter.format(text, true), className);
    this.scrollToBottom();
  }

  writeHtml(html) {
    this._appendLine(html);
    this.scrollToBottom();
  }

  clear() {
    this.outputEl.innerHTML = '';
    this.updatePrompt();
  }

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  focus() {
    this.inputEl.focus();
  }

  setInput(value) {
    this.inputEl.value = value || '';
    this.focus();
  }

  getInput() {
    return this.inputEl.value;
  }

  _appendLine(html, className = '') {
    const div = document.createElement('div');
    div.className = `line ${className}`;
    div.innerHTML = html;
    this.outputEl.appendChild(div);
  }

  _getPromptHtml() {
    const branch = this.engine.branchManager.currentBranch();
    const initialized = this.engine.initialized;
    return this.formatter.formatPrompt('~/project', initialized ? branch : null);
  }

  _handleTab() {
    const input = this.inputEl.value;
    const hasTrailingSpace = /\s$/.test(input);
    const tokens = input.trim() ? input.trim().split(/\s+/) : [];
    const contextTokens = hasTrailingSpace ? tokens : tokens.slice(0, -1);
    const prefix = hasTrailingSpace ? '' : (tokens[tokens.length - 1] || '');

    const candidates = this._getCompletions(contextTokens, prefix);
    if (candidates.length === 0) return;

    if (candidates.length === 1) {
      this._applyCompletion(contextTokens, candidates[0], true);
      this.lastTabSignature = null;
      return;
    }

    const commonPrefix = this._commonPrefix(candidates);
    if (commonPrefix.length > prefix.length) {
      this._applyCompletion(contextTokens, commonPrefix, false);
      this.lastTabSignature = null;
      return;
    }

    const signature = `${contextTokens.join('\u0001')}|${prefix}|${candidates.join('\u0001')}`;
    if (this.lastTabSignature === signature) {
      this._appendLine(
        `<span class="term-muted">${candidates.map((c) => this._escapeHtml(c)).join('    ')}</span>`
      );
      this.scrollToBottom();
      this.lastTabSignature = null;
      return;
    }

    this.lastTabSignature = signature;
  }

  _applyCompletion(contextTokens, completedToken, addTrailingSpace) {
    const next = [...contextTokens, completedToken].join(' ');
    this.inputEl.value = addTrailingSpace ? `${next} ` : next;
  }

  _getCompletions(contextTokens, prefix) {
    let candidates = [];

    if (contextTokens.length === 0) {
      candidates = [...SHELL_COMMANDS, 'git'];
    } else {
      const root = contextTokens[0];
      if (root === 'git') {
        candidates = this._getGitCompletions(contextTokens);
      } else {
        candidates = this._getShellCompletions(contextTokens);
      }
    }

    return candidates
      .filter((c, i, arr) => arr.indexOf(c) === i)
      .filter((c) => c.startsWith(prefix))
      .sort();
  }

  _getGitCompletions(contextTokens) {
    if (contextTokens.length === 1) {
      return GIT_SUBCOMMANDS;
    }

    const sub = contextTokens[1];
    const branchNames = this.engine.branchManager.listBranches().map((b) => b.name);
    const tagNames = [...this.engine.branchManager.tags.keys()];
    const commitIds = this.engine.objectDatabase.getAllCommits().map((c) => c.id);
    const refs = [...branchNames, ...tagNames, ...commitIds, 'HEAD'];
    const files = this.engine.workingDirectory.listFiles();
    const remotes = this.engine.remoteModel.listRemotes().map((r) => r.name);

    if (sub === 'add') return files;
    if (sub === 'commit') return ['-m', '--message'];
    if (sub === 'log') return ['--oneline', '-n', '--max-count'];
    if (sub === 'diff') return ['--staged', '--cached'];
    if (sub === 'branch') return ['-d', '-D', '--delete', ...branchNames];
    if (sub === 'checkout') return ['-b', ...refs];
    if (sub === 'switch') return ['-c', '--create', ...branchNames];
    if (sub === 'merge') return refs;
    if (sub === 'clone') return [];
    if (sub === 'push' || sub === 'fetch' || sub === 'pull') {
      if (contextTokens.length === 2) return remotes.length > 0 ? remotes : ['origin'];
      if (contextTokens.length === 3) return branchNames;
      return [];
    }
    if (sub === 'remote') {
      if (contextTokens.length === 2) return ['add', '-v', '--verbose'];
      if (contextTokens[2] === 'add' && contextTokens.length === 3) {
        return remotes.length > 0 ? remotes : ['origin', 'upstream'];
      }
      return [];
    }
    if (sub === 'stash') return ['push', 'pop', 'list'];
    if (sub === 'reset') return ['--soft', '--mixed', '--hard', 'HEAD~1', 'HEAD~2', ...refs];
    if (sub === 'rebase') return refs;
    if (sub === 'tag') return [...tagNames, ...refs];

    return [];
  }

  _getShellCompletions(contextTokens) {
    const command = contextTokens[0];
    if (contextTokens.length === 1) {
      return SHELL_COMMANDS;
    }
    if (command === 'cat' || command === 'touch') {
      return this.engine.workingDirectory.listFiles();
    }
    return [];
  }

  _commonPrefix(items) {
    if (items.length === 0) return '';
    let prefix = items[0];
    for (let i = 1; i < items.length; i++) {
      while (!items[i].startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
      if (!prefix) break;
    }
    return prefix;
  }

  _escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
