export const LETTERS = 'ABCDE';

/** Create an element with an optional class and text content (text is never parsed as HTML). */
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function button(cls, text, onClick) {
  const b = el('button', cls, text);
  b.type = 'button';
  if (onClick) b.onclick = onClick;
  return b;
}

/** Options that are code (queries, shell commands, Python lists) get a monospace face. */
export const isCode = (s) =>
  /(^|\s)(db\.|SELECT |find\(|pip3? |git |nltk|\['|\{\s*"|str\.|x-rate|DENSE_RANK|UPPER\(|\.\.\. WHERE)/.test(s);

/**
 * Options that refer to each other ("All of the above", "Only 1 and 2", True/False,
 * numeric ladders) keep their printed order; everything else may be shuffled.
 */
export const keepOrder = (q) =>
  q.o.length < 3 ||
  q.o.some((o) =>
    /\b(above|both|neither|none of|only \d|and \d|interchangeable)\b|^P[12]$|^\d|^(True|False)$|Definitions \d|^(Matrix|Node|Option) [A-D0-9]\b/i.test(o),
  );

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export const shortName = (name) => name.replace(/^Extra · /, '');
