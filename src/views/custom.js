import { el, button, shortName } from '../util.js';
import { store } from '../store.js';

const COUNTS = [10, 20, 30, 50, 0]; // 0 = every selected question

export function customSelection(sets) {
  const saved = store.get('custom', null);
  const ids = new Set(sets.map((s) => s.id));
  const chosen = (saved?.sets || []).filter((id) => ids.has(id));
  return { sets: chosen, count: COUNTS.includes(saved?.count) ? saved.count : 30 };
}

/** Builds the question pool for the saved selection, tagging each question with its source set. */
export function customPool(sets, sel) {
  return sets.filter((s) => sel.sets.includes(s.id)).flatMap((s) => s.qs.map((q) => ({ ...q, src: shortName(s.name) })));
}

export function renderCustomBuilder(view, sets, app, onStart) {
  const sel = customSelection(sets);
  const save = () => store.set('custom', sel);

  const panel = el('section', 'builder');
  panel.append(
    el('h3', null, 'Choose the weeks to mix'),
    el('p', 'hint', 'Questions from every set you tick are pooled and shuffled into one exam.'),
  );

  const groups = [
    ['Weekly sessions', (s) => /^Week/.test(s.name)],
    ['Extra practice', (s) => !/^Week/.test(s.name)],
  ];
  const summary = el('p', 'avail');
  const start = button('btn primary', 'Start exam', () => onStart(sel));

  const update = () => {
    const pool = customPool(sets, sel).length;
    const n = sel.count ? Math.min(sel.count, pool) : pool;
    summary.textContent = pool
      ? `${pool} questions in the selected sets · this exam will have ${n}.`
      : 'Tick at least one set to start.';
    start.disabled = !pool;
    save();
  };

  groups.forEach(([title, keep]) => {
    const fs = el('fieldset', 'pick');
    fs.append(el('legend', null, title));
    const grid = el('div', 'pickgrid');
    sets.filter(keep).forEach((s) => {
      const l = el('label', 'pickitem');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'mix-' + s.id;
      cb.checked = sel.sets.includes(s.id);
      cb.onchange = () => {
        sel.sets = cb.checked ? [...sel.sets, s.id] : sel.sets.filter((x) => x !== s.id);
        update();
      };
      l.append(cb, el('span', null, shortName(s.name)), el('span', 'ct', String(s.qs.length)));
      grid.append(l);
    });
    fs.append(grid);
    panel.append(fs);
  });

  const quick = el('div', 'quick');
  quick.append(
    button('btn', 'Select all', () => {
      sel.sets = sets.map((s) => s.id);
      save();
      app.render();
    }),
    button('btn', 'Weekly sessions only', () => {
      sel.sets = sets.filter((s) => /^Week/.test(s.name)).map((s) => s.id);
      save();
      app.render();
    }),
    button('btn', 'Clear', () => {
      sel.sets = [];
      save();
      app.render();
    }),
  );
  panel.append(quick);

  const countRow = el('div', 'countrow');
  countRow.append(el('span', 'lab', 'Questions'));
  const seg = el('div', 'tabs');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', 'Number of questions');
  COUNTS.forEach((c) => {
    const b = button('', c ? String(c) : 'All', () => {
      sel.count = c;
      save();
      app.render();
    });
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(sel.count === c));
    b.setAttribute('aria-selected', String(sel.count === c));
    seg.append(b);
  });
  countRow.append(seg);
  panel.append(countRow, summary, start);
  view.append(panel);
  update();
}
