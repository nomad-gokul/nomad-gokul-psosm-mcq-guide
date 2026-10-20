// Compiles the plain-text question sets in content/sets/ into src/data/sets.json.
// Fails the build if any question is malformed, so a bad edit never ships.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const setsDir = join(root, 'content', 'sets');
const outDir = join(root, 'src', 'data');
const LETTERS = 'ABCDE';

function parseSet(file, text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const head = lines[0].match(/^@ (\S+) \| (.*?) \| (.*)$/);
  if (!head) throw new Error(`${file}: first line must be "@ id | name | subtitle"`);
  const [, id, name, sub] = head;
  const notes = [];
  const qs = [];
  let cur = null;
  const flush = () => { if (cur) qs.push(cur); cur = null; };

  lines.slice(1).forEach((line, i) => {
    const where = `${file}:${i + 2}`;
    if (!line.trim()) return flush();
    const sep = line.indexOf(': ');
    if (sep < 0) throw new Error(`${where}: expected "KEY: value"`);
    const key = line.slice(0, sep);
    const val = line.slice(sep + 2);
    if (key === 'N') return notes.push(val);
    if (key === 'Q') { flush(); cur = { q: val, o: [], a: [], x: '', f: '' }; return; }
    if (!cur) throw new Error(`${where}: "${key}:" appears before any "Q:"`);
    if (key.length === 1 && LETTERS.includes(key)) {
      if (LETTERS.indexOf(key) !== cur.o.length) throw new Error(`${where}: option ${key} is out of order`);
      cur.o.push(val);
    } else if (key === '=') cur.a = val.split(',').map((k) => LETTERS.indexOf(k.trim()));
    else if (key === '?') cur.x = val;
    else if (key === '!') cur.f = val;
    else if (key === 'I') {
      const [src, cap = ''] = val.split(' | ');
      if (!existsSync(join(root, 'public', 'figures', src))) throw new Error(`${where}: figure ${src} not found in public/figures`);
      (cur.img ||= []).push({ src, cap });
    }
    else throw new Error(`${where}: unknown key "${key}"`);
  });
  flush();

  qs.forEach((q, i) => {
    const where = `${file} question ${i + 1}`;
    if (q.o.length < 2) throw new Error(`${where}: needs at least two options`);
    if (!q.a.length || q.a.some((a) => a < 0 || a >= q.o.length)) throw new Error(`${where}: answer key points at a missing option`);
    if (!q.x) throw new Error(`${where}: missing explanation ("?:")`);
  });
  // A stable id per question (set + hash of the question text), so a learner's
  // mistakes and stars survive reordering or adding questions.
  const seen = new Set();
  qs.forEach((q, i) => {
    let qid = id + '-' + createHash('sha1').update(q.q).digest('hex').slice(0, 8);
    if (seen.has(qid)) throw new Error(`${file} question ${i + 1}: duplicate question text`);
    seen.add(qid);
    q.id = qid;
  });
  return { id, name, sub, notes, qs };
}

const files = readdirSync(setsDir).filter((f) => f.endsWith('.txt')).sort();
const sets = files.map((f) => parseSet(f, readFileSync(join(setsDir, f), 'utf8')));
const ids = new Set();
for (const s of sets) {
  if (ids.has(s.id)) throw new Error(`Duplicate set id "${s.id}"`);
  ids.add(s.id);
}

const open = JSON.parse(readFileSync(join(root, 'content', 'open-questions.json'), 'utf8'));
for (const g of open.groups) {
  for (const it of g.items) {
    if (it.img && !existsSync(join(root, 'public', 'slides', it.img + '.webp'))) throw new Error(`Open question "${it.where}": slide ${it.img}.webp not found`);
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sets.json'), JSON.stringify(sets));
writeFileSync(join(outDir, 'open-questions.json'), JSON.stringify(open));

const total = sets.reduce((n, s) => n + s.qs.length, 0);
console.log(`Built ${sets.length} sets, ${total} questions.`);
