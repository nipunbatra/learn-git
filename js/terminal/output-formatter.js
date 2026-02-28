// Color-coded terminal output formatter

export class OutputFormatter {
  format(text, success = true) {
    if (!text) return '';

    // Apply color coding to specific patterns
    let html = this._escapeHtml(text);

    // Branch names in parentheses
    html = html.replace(/\(HEAD -&gt; (\w[\w/-]*)\)/g,
      '(<span class="term-red term-bold">HEAD</span> -&gt; <span class="term-green term-bold">$1</span>)');

    // Commit IDs (c1, c2, etc.)
    html = html.replace(/\bcommit (c\d+)/g,
      'commit <span class="term-yellow">$1</span>');

    // Branch indicators [main c1]
    html = html.replace(/\[(\w+)\s+(c\d+)\]/g,
      '[<span class="term-green">$1</span> <span class="term-yellow">$2</span>]');

    // Diff lines
    html = html.replace(/^(\+.*)$/gm, '<span class="term-green">$1</span>');
    html = html.replace(/^(-.*)$/gm, '<span class="term-red">$1</span>');

    // "new file:" in green
    html = html.replace(/(new file:\s+\S+)/g, '<span class="term-green">$1</span>');
    // "modified:" in yellow
    html = html.replace(/(modified:\s+\S+)/g, '<span class="term-yellow">$1</span>');
    // "deleted:" in red
    html = html.replace(/(deleted:\s+\S+)/g, '<span class="term-red">$1</span>');

    // fatal/error messages in red
    html = html.replace(/^(fatal:.*)$/gm, '<span class="term-red">$1</span>');
    html = html.replace(/^(error:.*)$/gm, '<span class="term-red">$1</span>');
    html = html.replace(/^(CONFLICT.*)$/gm, '<span class="term-red term-bold">$1</span>');

    // Untracked files in red
    html = html.replace(/^(Untracked files:)$/gm, '<span class="term-red">$1</span>');

    // Section headers
    html = html.replace(/^(Changes to be committed:)$/gm, '<span class="term-green">$1</span>');
    html = html.replace(/^(Changes not staged for commit:)$/gm, '<span class="term-yellow">$1</span>');

    // "Fast-forward" in cyan
    html = html.replace(/(Fast-forward)/g, '<span class="term-cyan">$1</span>');

    // Merge messages
    html = html.replace(/(Merge made by.*)/g, '<span class="term-cyan">$1</span>');

    // Branch listing: current branch with *
    html = html.replace(/^(\* \S+)$/gm, '<span class="term-green term-bold">$1</span>');

    if (!success && !html.includes('term-red')) {
      html = `<span class="term-red">${html}</span>`;
    }

    return html;
  }

  formatPrompt(path, branch) {
    const branchStr = branch ? branch : 'no repo';
    return `<span class="path">${path}</span> <span class="branch">(${branchStr})</span> $&nbsp;`;
  }

  _escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
