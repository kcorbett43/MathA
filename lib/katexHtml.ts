/**
 * Pure helpers for KaTeX WebView HTML — no React Native imports,
 * so Node scripts can unit-test delimiter escaping.
 */

/** True when the string contains a `$…$` or `$$…$$` pair worth rendering. */
export function containsMathDelimiters(text: string): boolean {
  if (!text.includes('$')) return false;
  if (/\$\$[\s\S]+?\$\$/.test(text)) return true;
  return /\$[^$\n]+\$/.test(text);
}

/** Escape HTML outside math delimiters so author text cannot inject markup. */
export function escapeOutsideMath(input: string): string {
  let i = 0;
  let out = '';
  while (i < input.length) {
    if (input[i] === '$') {
      const isDisplay = input[i + 1] === '$';
      const open = isDisplay ? '$$' : '$';
      const start = i + open.length;
      let j = start;
      let closed = false;
      while (j < input.length) {
        if (isDisplay) {
          if (input[j] === '$' && input[j + 1] === '$') {
            out += open + input.slice(start, j) + '$$';
            i = j + 2;
            closed = true;
            break;
          }
        } else if (input[j] === '$') {
          out += '$' + input.slice(start, j) + '$';
          i = j + 1;
          closed = true;
          break;
        }
        j += 1;
      }
      if (!closed) {
        out += escapeHtml(input.slice(i));
        break;
      }
      continue;
    }
    const next = input.indexOf('$', i);
    const chunk = next === -1 ? input.slice(i) : input.slice(i, next);
    out += escapeHtml(chunk);
    if (next === -1) break;
    i = next;
  }
  return out.replace(/\n/g, '<br/>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeCssColor(color: string, fallback: string): string {
  if (/^#[0-9A-Fa-f]{3,8}$/.test(color)) return color;
  if (/^rgba?\([^)]+\)$/.test(color)) return color;
  if (/^[a-zA-Z]+$/.test(color)) return color;
  return fallback;
}
