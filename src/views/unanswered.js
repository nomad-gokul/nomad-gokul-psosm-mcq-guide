import { el, LETTERS, shortName } from '../util.js';
import { sourceLinks } from './common.js';

/**
 * Questions the source slides don't settle, grouped by week. Each shows the question
 * cropped from the original PDF, the week's PDF link and why it is unsettled.
 * They are never part of an exam, a custom mix, Mistakes or Starred.
 */

function screenshot(item, setName) {
  const fig = el('figure', 'slide');
  const a = el('a');
  a.href = `/slides/${item.img}.webp`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'Open the screenshot at full size';
  const img = el('img');
  img.src = `/slides/${item.img}.webp`;
  img.alt = `${setName}, ${item.label}: the question as printed in the original PDF`;
  img.loading = 'lazy';
  img.decoding = 'async';
  a.append(img);
  fig.append(a, el('figcaption', null, 'Cropped from the original PDF'));
  return fig;
}

function card(item, set) {
  const c = el('article', 'q un');
  const head = el('div', 'unhead');
  head.append(el('span', 'where', item.label), el('span', 'kind k-' + item.kind.split(' ')[0].toLowerCase(), item.kind));
  c.append(head, screenshot(item, shortName(set.name)), el('p', 'qt', item.q));

  if (item.options?.length) {
    const ul = el('ul', 'opts');
    item.options.forEach((o, i) => {
      const li = el('li');
      const d = el('div', 'opt');
      d.append(el('span', 'lt', LETTERS[i] || '•'), el('span', 'tx', o), el('span', 'mk'));
      li.append(d);
      ul.append(li);
    });
    c.append(ul);
  }

  const why = el('div', 'flag');
  why.append(el('b', null, 'Why it is unsettled: '), document.createTextNode(item.why));
  c.append(why);
  if (item.mark) {
    const m = el('div', 'why');
    m.append(el('b', null, 'On the slide: '), document.createTextNode(item.mark));
    c.append(m);
  }
  if (set.sources?.length) c.append(sourceLinks(set.sources, true));
  return c;
}

export function renderUnanswered(view, data, sets) {
  view.append(el('p', 'lede', data.intro));

  // Week index for quick jumps.
  const groups = sets
    .map((s) => ({ set: s, items: data.items.filter((i) => i.set === s.id) }))
    .filter((g) => g.items.length);

  const jump = el('nav', 'jump');
  jump.setAttribute('aria-label', 'Jump to week');
  groups.forEach((g) => {
    const a = el('a', null, `${shortName(g.set.name)} · ${g.items.length}`);
    a.href = '#un-' + g.set.id;
    a.onclick = (e) => {
      e.preventDefault();
      document.getElementById('un-' + g.set.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    jump.append(a);
  });
  view.append(jump);

  groups.forEach((g) => {
    const sec = el('section', 'oq-group');
    sec.id = 'un-' + g.set.id;
    const h = el('div', 'oq-head');
    h.append(el('h3', null, `${shortName(g.set.name)} · ${g.items.length}`));
    sec.append(h);
    const list = el('div', 'qlist');
    g.items.forEach((it) => list.append(card(it, g.set)));
    sec.append(list);
    view.append(sec);
  });
}

export const unansweredCount = (data) => data.items.length;
