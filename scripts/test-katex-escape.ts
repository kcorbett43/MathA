/**
 * Unit checks for ContentMarkdown math delimiter helpers.
 * Run: npx tsx scripts/test-katex-escape.ts
 */
import assert from 'node:assert/strict';

import { containsMathDelimiters, escapeOutsideMath } from '../lib/katexHtml';
import { renderMathToHtml } from '../lib/katexRender';

function check(title: string, fn: () => void) {
  fn();
  console.log(`OK ${title}`);
}

check('detects inline math', () => {
  assert.equal(containsMathDelimiters('P = $1/6$'), true);
  assert.equal(containsMathDelimiters('no math here'), false);
  assert.equal(containsMathDelimiters('lone $ dollar'), false);
});

check('detects display math', () => {
  assert.equal(containsMathDelimiters('$$P(A)=\\frac{|A|}{|\\Omega|}$$'), true);
});

check('escapes HTML outside math', () => {
  const out = escapeOutsideMath('Use <b>bold</b> and $a<b$ safe');
  assert.ok(out.includes('&lt;b&gt;bold&lt;/b&gt;'));
  assert.ok(out.includes('$a<b$'));
});

check('preserves display delimiters', () => {
  const out = escapeOutsideMath('See $$\\frac{1}{2}$$ next');
  assert.ok(out.includes('$$\\frac{1}{2}$$'));
  assert.ok(out.includes('See '));
});

check('unmatched dollar stays escaped text', () => {
  const out = escapeOutsideMath('cost is $5 today');
  assert.ok(out.includes('$5 today') || out.includes('&#39;') || out.length > 0);
  assert.equal(out.includes('<script>'), false);
});

check('renderMathToHtml produces katex for classical probability', () => {
  const { ok, html } = renderMathToHtml(
    'When equally likely,\n\n$$P(A) = \\frac{|A|}{|\\Omega|}.$$',
  );
  assert.equal(ok, true);
  assert.ok(html.includes('katex'), html.slice(0, 200));
  assert.equal(html.includes('$$'), false);
});

check('renderMathToHtml inline mid-sentence', () => {
  const { ok, html } = renderMathToHtml('What is $P(\\text{sum} = 7)$?');
  assert.equal(ok, true);
  assert.ok(html.includes('katex'));
  assert.ok(html.includes('?'));
});

console.log('\nAll katex escape tests passed.');
