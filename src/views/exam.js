import { el, button, LETTERS, keepOrder, shuffle, sameSet } from '../util.js';
import { bestLabel, recordScore, recordAnswers } from '../store.js';
import { questionHead, answeredOptions, optionButton, explanation, toggle, figures } from './common.js';

// One exam in progress at a time, tied to the set it was started from.
let exam = null;

export function resetExam() {
  exam = null;
}

export const examRunning = (setId) => !!exam && exam.setId === setId;

/**
 * Starts an exam over `questions` (already chosen by the caller).
 * `opts.record` controls whether the score counts toward the set's best.
 */
export function startExam(setId, questions, prefs, opts = {}) {
  const qs = prefs.shufQ || opts.forceShuffle ? shuffle(questions) : questions.slice();
  exam = {
    setId,
    items: qs.map((q) => {
      const natural = q.o.map((_, i) => i);
      return { q, order: prefs.shufO && !keepOrder(q) ? shuffle(natural) : natural, pick: [] };
    }),
    i: 0,
    done: false,
    confirm: false,
    onlyMissed: false,
    record: opts.record !== false,
    label: opts.label || '',
  };
}

const grade = (it) => (it.pick.length ? (sameSet(it.pick, it.q.a) ? 'r' : 'w') : 's');

function choose(oi, app) {
  const it = exam.items[exam.i];
  if (it.q.a.length > 1) it.pick = it.pick.includes(oi) ? it.pick.filter((x) => x !== oi) : [...it.pick, oi];
  else it.pick = [oi];
  exam.confirm = false;
  app.render();
}

function finish(app) {
  exam.done = true;
  exam.confirm = false;
  exam.score = exam.items.filter((x) => grade(x) === 'r').length;
  if (exam.record) recordScore(exam.setId, exam.score, exam.items.length);
  exam.cleared = recordAnswers(
    exam.items.map((x) => ({ id: x.q.id, correct: grade(x) === 'r', answered: x.pick.length > 0 })),
  );
  exam.newMistakes = exam.items.filter((x) => grade(x) === 'w').length;
  app.render();
  window.scrollTo({ top: 0 });
}

function trySubmit(app) {
  if (exam.items.some((x) => !x.pick.length)) {
    exam.confirm = true;
    app.render();
  } else finish(app);
}

/**
 * Renders the running exam (or its results). `restart` is called by "Retake all";
 * it is the caller's job to start a fresh exam.
 */
export function renderExam(view, toggles, set, app, restart) {
  const changed = (key) => (on) => {
    app.setPref(key, on);
    restart();
    app.render();
  };
  toggles.append(
    toggle('shufQ', 'Shuffle questions', app.state.shufQ, changed('shufQ')),
    toggle('shufO', 'Shuffle options', app.state.shufO, changed('shufO')),
  );
  if (exam.done) return renderResults(view, set, app, restart);

  const n = exam.items.length;
  const it = exam.items[exam.i];
  const answered = exam.items.filter((x) => x.pick.length).length;

  const prog = el('div', 'prog');
  const line = el('div', 'progline');
  line.append(
    el('span', null, `${exam.label ? exam.label + ' · ' : ''}Question ${exam.i + 1} of ${n}`),
    el('span', null, `${answered} answered`),
  );
  const track = el('div', 'track');
  const bar = el('i');
  bar.style.width = (100 * answered) / n + '%';
  track.append(bar);
  const grid = el('div', 'grid');
  exam.items.forEach((x, k) => {
    const d = button('dot' + (x.pick.length ? ' ans' : '') + (k === exam.i ? ' cur' : ''), String(k + 1), () => {
      exam.i = k;
      exam.confirm = false;
      app.render();
    });
    d.setAttribute('aria-label', 'Go to question ' + (k + 1));
    grid.append(d);
  });
  prog.append(line, track, grid);
  view.append(prog);

  const card = el('article', 'q');
  card.append(questionHead(exam.i + 1, it.q, app), figures(it.q));
  const ul = el('ul', 'opts');
  it.order.forEach((oi, pos) =>
    ul.append(optionButton(it.q.o[oi], LETTERS[pos], it.pick.includes(oi), () => choose(oi, app))),
  );
  card.append(ul);
  view.append(card);

  const nav = el('div', 'nav');
  const prev = button('btn', '← Previous', () => {
    exam.i--;
    exam.confirm = false;
    app.render();
  });
  prev.disabled = exam.i === 0;
  const right = el('div', 'navright');
  right.append(
    button('btn', 'Submit exam', () => trySubmit(app)),
    button('btn primary', exam.i === n - 1 ? 'Finish' : 'Next →', () => {
      if (exam.i < n - 1) {
        exam.i++;
        app.render();
      } else trySubmit(app);
    }),
  );
  nav.append(prev, right);
  view.append(nav);

  if (exam.confirm) {
    const left = n - answered;
    const box = el('div', 'confirm');
    box.append(
      el('span', null, `${left} question${left === 1 ? ' is' : 's are'} unanswered and will count as wrong.`),
      button('btn', 'Submit anyway', () => finish(app)),
      button('btn', 'Keep going', () => {
        exam.confirm = false;
        const k = exam.items.findIndex((x) => !x.pick.length);
        if (k >= 0) exam.i = k;
        app.render();
      }),
    );
    view.append(box);
  }

  const hint = el('p', 'hint');
  hint.append('Keys: ', el('kbd', null, 'A'), '–', el('kbd', null, 'D'), ' to pick, ');
  hint.append(el('kbd', null, '←'), ' ', el('kbd', null, '→'), ' to move. ☆ stars a question for later.');
  if (it.q.a.length > 1) hint.append(' This question has more than one correct option; select every one.');
  view.append(hint);
}

function renderResults(view, set, app, restart) {
  const t = exam.items.length;
  const s = exam.score;
  const box = el('section', 'score');
  const big = el('div', 'big', String(s));
  big.append(el('small', null, ' / ' + t));
  const meta = el('div', 'meta');
  meta.append(el('span', null, `${Math.round((100 * s) / t)}% correct${exam.label ? ' · ' + exam.label : ''}`));
  if (exam.record) meta.append(el('span', null, bestLabel(exam.setId)));
  const notes = [];
  if (exam.newMistakes) notes.push(`${exam.newMistakes} added to Mistakes`);
  if (exam.cleared) notes.push(`${exam.cleared} cleared from Mistakes`);
  if (notes.length) meta.append(el('span', null, notes.join(' · ')));

  const acts = el('div', 'acts');
  acts.append(
    button('btn primary', 'Retake all', () => {
      restart();
      app.render();
      window.scrollTo({ top: 0 });
    }),
  );
  const missed = exam.items.filter((x) => grade(x) !== 'r').map((x) => x.q);
  if (missed.length) {
    acts.append(
      button('btn', `Retry the ${missed.length} missed`, () => {
        const setId = exam.setId;
        startExam(setId, missed, app.state, { record: false, label: 'Retry of missed' });
        app.render();
        window.scrollTo({ top: 0 });
      }),
    );
  }
  box.append(big, meta, acts);
  view.append(box);

  const filter = el('label', 'toggle');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'onlyMissed';
  cb.checked = exam.onlyMissed;
  cb.onchange = () => {
    exam.onlyMissed = cb.checked;
    app.render();
  };
  filter.append(cb, document.createTextNode('Show only missed'));
  view.append(filter);

  const list = el('div', 'qlist');
  exam.items.forEach((it, k) => {
    const g = grade(it);
    if (exam.onlyMissed && g === 'r') return;
    const card = el('article', 'q');
    card.append(
      questionHead(k + 1, it.q, app),
      el('div', 'verdict ' + g, g === 'r' ? 'Correct' : g === 'w' ? 'Wrong' : 'Skipped'),
      figures(it.q),
      answeredOptions(it.q, it.pick),
      explanation(it.q),
    );
    list.append(card);
  });
  if (!list.children.length) list.append(el('div', 'empty', 'Nothing missed. Every answer was right.'));
  view.append(list);
}

/** Keyboard shortcuts while an exam is in progress. Returns true if handled. */
export function examKey(e, app) {
  if (!exam || exam.done) return false;
  const it = exam.items[exam.i];
  const pos = LETTERS.indexOf(e.key.toUpperCase());
  if (e.key.length === 1 && pos >= 0 && pos < it.order.length) {
    choose(it.order[pos], app);
    return true;
  }
  if (e.key === 'ArrowRight' && exam.i < exam.items.length - 1) {
    exam.i++;
    app.render();
    return true;
  }
  if (e.key === 'ArrowLeft' && exam.i > 0) {
    exam.i--;
    app.render();
    return true;
  }
  return false;
}
