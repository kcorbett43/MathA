import katex from 'katex';

import { escapeOutsideMath } from '@/lib/katexHtml';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Walk `$…$` / `$$…$$` and render each math span with katex.renderToString.
 * On any hard failure, returns `{ ok: false }` so callers can show raw TeX.
 */
export function renderMathToHtml(input: string): { ok: boolean; html: string } {
  try {
    let i = 0;
    let out = '';
    while (i < input.length) {
      if (input[i] === '$') {
        const isDisplay = input[i + 1] === '$';
        const openLen = isDisplay ? 2 : 1;
        const start = i + openLen;
        let j = start;
        let closed = false;
        while (j < input.length) {
          if (isDisplay) {
            if (input[j] === '$' && input[j + 1] === '$') {
              const tex = input.slice(start, j);
              out += katex.renderToString(tex, {
                displayMode: true,
                throwOnError: false,
                strict: 'ignore',
                errorColor: '#C62828',
              });
              i = j + 2;
              closed = true;
              break;
            }
          } else if (input[j] === '$') {
            const tex = input.slice(start, j);
            out += katex.renderToString(tex, {
              displayMode: false,
              throwOnError: false,
              strict: 'ignore',
              errorColor: '#C62828',
            });
            i = j + 1;
            closed = true;
            break;
          }
          j += 1;
        }
        if (!closed) {
          out += escapeHtml(input.slice(i)).replace(/\n/g, '<br/>');
          break;
        }
        continue;
      }
      const next = input.indexOf('$', i);
      const chunk = next === -1 ? input.slice(i) : input.slice(i, next);
      out += escapeHtml(chunk).replace(/\n/g, '<br/>');
      if (next === -1) break;
      i = next;
    }
    return { ok: true, html: out };
  } catch {
    // Absolute fallback: escaped source with delimiters preserved for raw display.
    return { ok: false, html: escapeOutsideMath(input) };
  }
}
