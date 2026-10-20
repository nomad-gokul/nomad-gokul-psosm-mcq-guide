import './styles.css';
import SETS from './data/sets.json';
import UNANSWERED from './data/unanswered.json';
import { el, button, shortName, shuffle } from './util.js';
import { store, bestScore, bestLabel, mistakeIds, mistakeInfo, starIds } from './store.js';
import { renderLearn, resetLearn } from './views/learn.js';
import { renderExam, resetExam, startExam, examRunning, examKey } from './views/exam.js';
import { renderUnanswered, unansweredCount } from './views/unanswered.js';
import { sourceLinks } from './views/common.js';
import { initAnalytics, pageView } from './analytics.js';
import { renderCustomBuilder, customSelection, customPool } from './views/custom.js';

// Every question by id, with the name of the set it belongs to.
const BY_ID = new Map();
SETS.forEach((s) => s.qs.forEach((q) => BY_ID.set(q.id, { ...q, src: shortName(s.name) })));
const lookup = (ids) => ids.map((id) => BY_ID.get(id)).filter(Boolean);
const setOrder = new Map(SETS.map((s, i) => [s.id, i]));
const bySetOrder = (a, b) => setOrder.get(a.id.split('-')[0]) - setOrder.get(b.id.split('-')[0]);

/* Practice sets built from the learner's own history. They are recomputed on every render. */
const VIRTUAL = {
  custom: () => ({
    id: 'custom',
    name: 'Custom exam',
    sub: 'Mix any weeks together into one shuffled exam.',
    custom: true,
    qs: [],
  }),
  mistakes: () => ({
    id: 'mistakes',
    name: 'Mistakes',
    sub: 'Every question you have answered wrong in an exam. Answer one correctly and it leaves this list.',
    personal: true,
    qs: lookup(mistakeIds()).sort(
      (a, b) => (mistakeInfo(b.id)?.n || 0) - (mistakeInfo(a.id)?.n || 0) || bySetOrder(a, b),
    ),
  }),
  starred: () => ({
    id: 'starred',
    name: 'Starred',
    sub: 'Questions you starred with ☆. Star or unstar from any question card.',
    personal: true,
    qs: lookup(starIds()).sort(bySetOrder),
  }),
  unanswered: () => ({
    id: 'unanswered',
    name: 'Unanswered questions',
    sub: "Questions the slides don't settle, grouped by week, each cropped from the original PDF so you can work them out yourself.",
    open: true,
    qs: [],
  }),
};
// Old links used #open for the unanswered section.
const ALIASES = { open: 'unanswered' };
const getSet = (id) => {
  id = ALIASES[id] || id;
  return SETS.find((s) => s.id === id) || (VIRTUAL[id] ? VIRTUAL[id]() : null);
};

const app = {
  sets: SETS,
  state: {
    set: SETS[0].id,
    mode: store.get('mode', 'learn'),
    hide: store.get('hide', false),
    shufQ: store.get('shufQ', true),
    shufO: store.get('shufO', true),
    instant: store.get('instant', true),
  },
  setPref(key, value) {
    this.state[key] = value;
    store.set(key, value);
  },
  render,
  refreshRail: () => renderRail(),
};

// The URL hash names the open set (#w08, #mistakes, #custom …), so any view can be linked to.
function setFromHash() {
  let id = decodeURIComponent(location.hash.slice(1));
  id = ALIASES[id] || id;
  return getSet(id) ? id : null;
}
app.state.set = setFromHash() || store.get('set', SETS[0].id);
if (!getSet(app.state.set)) app.state.set = SETS[0].id;

function pick(id) {
  if (id === app.state.set) return;
  app.state.set = id;
  store.set('set', id);
  // pushState (not replaceState) so each set is its own history entry: the browser's Back
  // button works, and Cloudflare Web Analytics records each set as a page view.
  if (location.hash.slice(1) !== id) history.pushState(null, '', '#' + id);
  resetExam();
  resetLearn();
  render();
  window.scrollTo({ top: 0 });
}
// Back / Forward between sets, or a #set link typed into the address bar.
const onUrlChange = () => {
  const id = setFromHash();
  if (id) pick(id);
};
window.addEventListener('popstate', onUrlChange);
window.addEventListener('hashchange', onUrlChange);

function countLabel(s) {
  if (s.custom) return '';
  if (s.open) return String(unansweredCount(UNANSWERED));
  return String(s.qs.length);
}

function subLabel(s) {
  if (s.custom) return 'Pick weeks, shuffle together';
  if (s.open) return 'Unsettled · kept out of exams';
  if (s.id === 'mistakes') return s.qs.length ? 'Answered wrong, not yet fixed' : 'Nothing yet';
  if (s.id === 'starred') return s.qs.length ? 'Saved for another look' : 'Nothing starred yet';
  return bestLabel(s.id);
}

function renderRail() {
  const rail = document.getElementById('rail');
  const select = document.getElementById('setSelect');
  rail.textContent = '';
  select.textContent = '';
  const groups = [
    ['My practice', ['custom', 'mistakes', 'starred'].map((id) => VIRTUAL[id]())],
    ['Weekly sessions', SETS.filter((s) => /^Week/.test(s.name))],
    ['Extra practice', SETS.filter((s) => !/^Week/.test(s.name))],
    ['To check yourself', [VIRTUAL.unanswered()]],
  ];
  groups.forEach(([title, list]) => {
    rail.append(el('h2', null, title));
    const og = document.createElement('optgroup');
    og.label = title;
    list.forEach((s) => {
      const b = el('button', 'setbtn' + (s.open ? ' open' : '') + (s.personal || s.custom ? ' mine' : ''));
      b.type = 'button';
      b.setAttribute('aria-current', String(s.id === app.state.set));
      const best = !s.personal && !s.custom && !s.open ? bestScore(s.id) : null;
      b.append(
        el('span', 'nm', shortName(s.name)),
        el('span', 'ct', countLabel(s)),
        el('span', 'best' + (best && best.s === best.t ? ' done' : ''), subLabel(s)),
      );
      b.onclick = () => pick(s.id);
      rail.append(b);

      const c = countLabel(s);
      const o = el('option', null, shortName(s.name) + (c ? ` (${c})` : ''));
      o.value = s.id;
      o.selected = s.id === app.state.set;
      og.append(o);
    });
    select.append(og);
  });
  rail.append(el('p', 'railnote', "There was no Week 4 deck. The Week 9 entry is the TA's hard set on Week 8 material."));
}
document.getElementById('setSelect').onchange = (e) => pick(e.target.value);

function renderHead(set) {
  const h = document.getElementById('sethead');
  h.textContent = '';
  let eyebrow = `${set.qs.length} question${set.qs.length === 1 ? '' : 's'}`;
  if (set.custom) eyebrow = `From ${SETS.reduce((n, s) => n + s.qs.length, 0)} questions`;
  if (set.open) eyebrow = `${unansweredCount(UNANSWERED)} questions · kept out of all exams`;
  h.append(el('div', 'eyebrow', eyebrow), el('h2', null, shortName(set.name)), el('p', null, set.sub));
  if (set.sources?.length) h.append(sourceLinks(set.sources));
}


function setMode(mode) {
  app.setPref('mode', mode);
  render();
}
document.getElementById('tabLearn').onclick = () => setMode('learn');
document.getElementById('tabExam').onclick = () => setMode('exam');

/** Starts (or restarts) the exam for a set. */
function beginExam(set) {
  if (set.custom) {
    const sel = customSelection(SETS);
    let pool = customPool(SETS, sel);
    pool = shuffle(pool);
    if (sel.count) pool = pool.slice(0, sel.count);
    const names = SETS.filter((s) => sel.sets.includes(s.id)).map((s) => shortName(s.name));
    startExam('custom', pool, app.state, {
      record: false,
      forceShuffle: true,
      label: names.length > 3 ? `${names.length} sets mixed` : names.join(' + '),
    });
  } else if (set.personal) {
    if (!set.qs.length) return resetExam();
    startExam(set.id, set.qs, app.state, { record: false, label: set.name });
  } else {
    startExam(set.id, set.qs, app.state);
  }
}

function emptyPersonal(view, set) {
  const box = el('div', 'empty');
  box.append(
    el(
      'p',
      null,
      set.id === 'mistakes'
        ? 'No mistakes saved. Any question you answer wrong in an exam is added here, so you can practise just those.'
        : 'No starred questions. Tap ☆ on any question, in Learn or during an exam, to save it here.',
    ),
  );
  view.append(box);
}

let lastViewed = null;
function render() {
  const set = getSet(app.state.set);
  if (set.id !== lastViewed) {
    lastViewed = set.id;
    pageView(set.id, shortName(set.name));
  }
  document.title = `${shortName(set.name)} · PSOSM MCQ Guide`;
  renderRail();
  renderHead(set);

  const bar = document.getElementById('bar');
  const toggles = document.getElementById('toggles');
  const view = document.getElementById('view');
  const tabLearn = document.getElementById('tabLearn');
  const tabExam = document.getElementById('tabExam');
  toggles.textContent = '';
  view.textContent = '';
  view.className = '';
  bar.hidden = !!set.open;

  if (set.open) {
    renderUnanswered(view, UNANSWERED, SETS);
    return;
  }
  if (set.personal && !set.qs.length && !examRunning(set.id)) {
    bar.hidden = true;
    emptyPersonal(view, set);
    return;
  }

  // A custom mix is exam-only.
  const mode = set.custom ? 'exam' : app.state.mode;
  tabLearn.setAttribute('aria-selected', String(mode === 'learn'));
  tabExam.setAttribute('aria-selected', String(mode === 'exam'));
  tabLearn.disabled = !!set.custom;

  if (mode === 'learn') {
    renderLearn(view, toggles, set, app);
    return;
  }

  view.className = 'exam';
  if (set.custom && !examRunning('custom')) {
    renderCustomBuilder(view, SETS, app, () => {
      beginExam(set);
      render();
    });
    return;
  }
  if (!examRunning(set.id)) beginExam(set);
  if (set.custom) {
    view.append(
      button('linkbtn', '← Change the weeks in this mix', () => {
        resetExam();
        render();
      }),
    );
  }
  renderExam(view, toggles, set, app, () => beginExam(getSet(set.id)));
}

document.addEventListener('keydown', (e) => {
  const set = getSet(app.state.set);
  const mode = set.custom ? 'exam' : app.state.mode;
  if (mode !== 'exam' || set.open || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
  if (examKey(e, app)) e.preventDefault();
});

render();
initAnalytics();
