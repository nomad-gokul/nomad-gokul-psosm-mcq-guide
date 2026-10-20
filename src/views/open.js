import { el, LETTERS } from '../util.js';

function slide(item) {
  const fig = el('figure', 'slide');
  const a = el('a');
  a.href = `/slides/${item.img}.webp`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'Open the slide at full size';
  const img = el('img');
  img.src = `/slides/${item.img}.webp`;
  img.alt = `Slide for ${item.where}: ${item.q}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  a.append(img);
  fig.append(a);
  if (item.mark) fig.append(el('figcaption', null, item.mark));
  return fig;
}

function itemCard(item) {
  const card = el('article', 'q');
  card.append(el('div', 'where', item.where));
  if (item.img) card.append(slide(item));
  card.append(el('p', 'qt', item.q));
  if (item.options && item.options.length) {
    const ul = el('ul', 'opts');
    item.options.forEach((o, i) => {
      const li = el('li');
      const d = el('div', 'opt');
      d.append(el('span', 'lt', LETTERS[i] || '•'), el('span', 'tx', o), el('span', 'mk'));
      li.append(d);
      ul.append(li);
    });
    card.append(ul);
  }
  if (item.note) card.append(el('div', 'flag', item.note));
  return card;
}

export function renderOpen(view, open) {
  view.append(el('p', 'lede', open.intro));

  open.groups.forEach((g) => {
    if (!g.items.length) return;
    const sec = el('section', 'oq-group');
    sec.append(el('h3', null, `${g.title} · ${g.items.length}`), el('p', null, g.desc));
    const list = el('div', 'qlist');
    g.items.forEach((it) => list.append(itemCard(it)));
    sec.append(list);
    view.append(sec);
  });
}

export const openCount = (open) => open.groups.reduce((n, g) => n + g.items.length, 0);
