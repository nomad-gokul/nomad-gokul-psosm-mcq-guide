// Small wrapper around localStorage. Private windows and blocked storage make it throw,
// so every call is guarded and the app still works (without memory) when it fails.
const PREFIX = 'psosm:';

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable: ignore */
    }
  },
};

/* ---------- best scores ---------- */

export function bestScore(setId) {
  return store.get('best:' + setId, null);
}

export function bestLabel(setId) {
  const b = bestScore(setId);
  return b ? `Best ${b.s}/${b.t} · ${Math.round((100 * b.s) / b.t)}%` : 'Not attempted';
}

/** Saves the score if it beats the previous best. */
export function recordScore(setId, s, t) {
  const b = bestScore(setId);
  if (!b || s / t > b.s / b.t) store.set('best:' + setId, { s, t });
}

/* ---------- mistakes ----------
   { [questionId]: { n: times answered wrong, at: last time (ms) } }
   A question leaves the list the next time it is answered correctly in any exam. */

let mistakes = store.get('mistakes', {});

export const mistakeInfo = (qid) => mistakes[qid] || null;
export const mistakeIds = () => Object.keys(mistakes);

/** Updates the list from one finished exam. Returns how many questions were cleared. */
export function recordAnswers(results) {
  let cleared = 0;
  for (const { id, correct, answered } of results) {
    if (!answered) continue;
    if (correct) {
      if (mistakes[id]) {
        delete mistakes[id];
        cleared++;
      }
    } else {
      mistakes[id] = { n: (mistakes[id]?.n || 0) + 1, at: Date.now() };
    }
  }
  store.set('mistakes', mistakes);
  return cleared;
}

export function clearMistake(qid) {
  delete mistakes[qid];
  store.set('mistakes', mistakes);
}

/* ---------- stars ---------- */

let stars = new Set(store.get('stars', []));

export const isStarred = (qid) => stars.has(qid);
export const starIds = () => [...stars];

export function toggleStar(qid) {
  if (stars.has(qid)) stars.delete(qid);
  else stars.add(qid);
  store.set('stars', [...stars]);
  return stars.has(qid);
}
