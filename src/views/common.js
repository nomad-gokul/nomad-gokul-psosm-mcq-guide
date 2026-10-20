import { el, isCode, LETTERS } from '../util.js';
import { isStarred, toggleStar, mistakeInfo } from '../store.js';

/**
 * Question number, text, a star toggle and (when relevant) where the question comes from
 * and how often it has been missed.
 */
export function questionHead(number, q, app) {
  const top = el('div', 'qtop');
  top.append(el('span', 'qn', 'Q' + number));
  const body = el('div', 'qbody');
  const qt = el('p', 'qt', q.q);
  if (q.a.length > 1) qt.append(el('span', 'multi', 'Select all'));
  body.append(qt);

  const tags = el('div', 'tags');
  if (q.src) tags.append(el('span', 'tag', q.src));
  const miss = mistakeInfo(q.id);
  if (miss) tags.append(el('span', 'tag miss', miss.n > 1 ? `Missed ${miss.n}×` : 'Missed'));
  if (tags.children.length) body.append(tags);
  top.append(body, starButton(q, app));
  return top;
}

function starButton(q, app) {
  const b = el('button', 'star');
  b.type = 'button';
  const paint = () => {
    const on = isStarred(q.id);
    b.textContent = on ? '★' : '☆';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Remove star' : 'Star this question');
    b.title = on ? 'Starred — click to remove' : 'Star this question';
  };
  paint();
  b.onclick = () => {
    toggleStar(q.id);
    paint();
    app?.refreshRail();
  };
  return b;
}

/** A read-only option row, used wherever answers are shown. */
export function optionRow(text, label, cls, mark) {
  const li = el('li');
  const d = el('div', 'opt' + (isCode(text) ? ' code' : '') + (cls ? ' ' + cls : ''));
  d.append(el('span', 'lt', label), el('span', 'tx', text), el('span', 'mk', mark || ''));
  li.append(d);
  return li;
}

/** A clickable option. */
export function optionButton(text, label, selected, onClick) {
  const li = el('li');
  const b = el('button', 'opt' + (isCode(text) ? ' code' : '') + (selected ? ' sel' : ''));
  b.type = 'button';
  b.setAttribute('aria-pressed', String(selected));
  b.append(el('span', 'lt', label), el('span', 'tx', text), el('span', 'mk'));
  b.onclick = onClick;
  li.append(b);
  return li;
}

/** All options in printed order, with the key and (optionally) the reader's picks marked. */
export function answeredOptions(q, picks = []) {
  const ul = el('ul', 'opts');
  q.o.forEach((text, i) => {
    const right = q.a.includes(i);
    const mine = picks.includes(i);
    const cls = right ? 'right' : mine ? 'wrong' : '';
    let mark = '';
    if (right) mark = mine ? '✓ your pick' : '✓ correct';
    else if (mine) mark = '✗ your pick';
    ul.append(optionRow(text, LETTERS[i], cls, mark));
  });
  return ul;
}

export function explanation(q) {
  const frag = document.createDocumentFragment();
  frag.append(el('div', 'why', q.x));
  if (q.f) frag.append(el('div', 'flag', q.f));
  return frag;
}

export function toggle(id, label, checked, onChange) {
  const l = el('label', 'toggle');
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.id = id;
  i.checked = checked;
  i.onchange = () => onChange(i.checked);
  l.append(i, document.createTextNode(label));
  return l;
}

/** Tables, charts or images a question depends on, shown above its options. */
export function figures(q) {
  const frag = document.createDocumentFragment();
  (q.img || []).forEach((f) => {
    const fig = el('figure', 'qfig');
    const a = el('a');
    a.href = `/figures/${f.src}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Open full size';
    const img = el('img');
    img.src = `/figures/${f.src}`;
    img.alt = f.cap || 'Figure for this question';
    img.loading = 'lazy';
    img.decoding = 'async';
    a.append(img);
    fig.append(a);
    if (f.cap) fig.append(el('figcaption', null, f.cap));
    frag.append(fig);
  });
  return frag;
}
