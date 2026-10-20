import { el, button, LETTERS } from '../util.js';
import { questionHead, answeredOptions, optionButton, explanation, toggle, figures } from './common.js';

// Per-session memory of which questions the reader has revealed in "hide answers" mode.
const revealed = new Set();
const picks = {};

export function resetLearn() {
  revealed.clear();
}

export function renderLearn(view, toggles, set, app) {
  toggles.append(
    toggle('hideAns', 'Hide answers until I pick', app.state.hide, (on) => {
      app.setPref('hide', on);
      revealed.clear();
      app.render();
    }),
  );

  if (set.notes?.length) {
    const box = el('section', 'notes');
    box.append(el('h3', null, 'Key facts from this session'));
    const ul = el('ul');
    set.notes.forEach((n) => ul.append(el('li', null, n)));
    box.append(ul);
    view.append(box);
  }

  const list = el('div', 'qlist');
  set.qs.forEach((q, qi) => {
    const key = q.id;
    const open = !app.state.hide || revealed.has(key);
    const card = el('article', 'q');
    card.append(questionHead(qi + 1, q, app), figures(q));

    if (open) {
      card.append(answeredOptions(q, key in picks ? [picks[key]] : []), explanation(q));
    } else {
      const ul = el('ul', 'opts');
      q.o.forEach((text, oi) =>
        ul.append(
          optionButton(text, LETTERS[oi], false, () => {
            picks[key] = oi;
            revealed.add(key);
            app.render();
          }),
        ),
      );
      card.append(
        ul,
        button('reveal', 'Show answer', () => {
          revealed.add(key);
          app.render();
        }),
      );
    }
    list.append(card);
  });
  view.append(list);
}
