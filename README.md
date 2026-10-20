# PSOSM MCQ Guide

A study and exam-practice web app for the NPTEL course **Privacy and Security in Online Social Media** (noc26-cs141). It has 712 multiple-choice questions from the course's weekly tutorial sessions, with every option, the answer, and a short explanation for each. Questions that depend on a table, chart or network diagram show that figure with the question.

## Features

- **Learn mode.** Each week opens with its key facts, then every question with all options, the correct one marked, and the reason. You can hide answers and pick before you reveal.
- **Exam mode.** One question at a time with a progress grid, single- and multi-select questions, keyboard shortcuts (A–D, ← →), and shuffled questions and options. At the end you get a score and a full review of each answer.
- **Instant feedback.** As you answer, each question is marked **Correct** or **Wrong** straight away, with the right option highlighted and the reason shown. A live tally shows how many you have right and wrong. Multi-answer questions get a **Check answer** button. The answer locks once marked, and you can switch this off for a classic end-of-test result.
- **Mistakes.** Every question you answer wrong is saved and marked "Missed". You can study or sit just your mistakes, and a question leaves the list once you answer it correctly.
- **Starred questions.** Star any question while learning or during an exam, then practise only the starred ones.
- **Custom exam.** Tick any combination of weeks, choose 10, 20, 30, 50 or all questions, and get one shuffled exam across them.
- **Figures in questions.** Paper tables, CDF plots, adjacency matrices and network graphs are attached where a question needs them.
- **View original PDF.** Every set opens with a button to the Google Drive PDF its questions were taken from. The links live in one file, `content/sources.json`.
- **Unanswered questions.** Questions the source slides don't settle (conflicting keys, no key, missing text) are kept out of every exam. They are listed by week, each with the question cropped from the original PDF, that week's PDF link and a note on what makes it uncertain.
- **Progress stays in your browser.** Best scores, mistakes and stars are kept in `localStorage`. There is no account and no server.
- **Works on any screen.** The layout is responsive and has light and dark themes.

## Tech

- Vanilla JavaScript (ES modules) bundled with [Vite](https://vitejs.dev/). There is no framework and no runtime dependencies.
- The question bank is written in a small plain-text format (`content/sets/*.txt`). `scripts/build-data.mjs` compiles it to JSON at build time.
- That build script also validates every question and fails the build on any of these problems:
  - a missing option
  - an answer key that points at an option that doesn't exist
  - a missing explanation
  - an unknown figure
  - duplicate question text
- It gives each question a stable ID (a hash of its text), so saved mistakes and stars survive edits.
- Fully static output (HTML, JS, CSS, images) with no server code or API calls, so it runs on Cloudflare Pages' free plan. Cache rules are in `public/_headers`.

```
content/
  sets/01-w01.txt …        question sets, one file per week or extra set
  sources.json             set id → Google Drive link(s) of the original PDF
  unanswered.json          unsettled questions, by week, with their screenshots
public/
  figures/                 tables, charts and diagrams attached to questions
  slides/                  question screenshots for the unanswered section
  _headers                 Cloudflare Pages cache rules
scripts/build-data.mjs     compiles and validates the question bank
src/
  main.js                  routing, sidebar, set switching
  store.js                 best scores, mistakes, stars (localStorage)
  views/learn.js           Learn mode
  views/exam.js            Exam mode and results
  views/custom.js          multi-week exam builder
  views/unanswered.js      unanswered questions by week
  views/common.js          question card, options, figures, star button
```

## Question format

```
@ w10 | Week 10 | Session of 3 October — home-location inference, VPN / HTTPS
N: A key fact shown at the top of the week in Learn mode.

Q: According to Table I, which attribute has the highest share of non-geographic information?
I: w10-table1.webp | Table I — availability of geographic information per attribute (%)
A: Employment (Google+) at 50.81%
B: Places Lived (Google+) at 31.48%
C: Venue City (Foursquare) at 26.51%
D: Education (Google+) at 36.04%
=: A
?: One- or two-sentence explanation.
!: Optional note, e.g. where the key came from.
```

The format works like this:

- Questions are separated by a blank line.
- `=:` takes one letter, or several separated by commas (such as `A,C`) for multi-select questions.
- `I:` attaches an image from `public/figures/`. You can attach more than one.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs dist/
npm run preview   # serve the production build
```

## Deploy to Cloudflare Pages

**Drag and drop (no Git needed)**
1. Run `npm install && npm run build`, or use the prebuilt `dist` zip.
2. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project, drop in the contents of `dist/` (or the zip), and click **Deploy site**.

**From GitHub (deploys on every push)**
1. Push this folder to a GitHub repository.
2. In **Workers & Pages → Create → Pages → Connect to Git**, pick the repository.
3. Set framework preset **Vite** (or *None*), build command `npm run build`, output directory `dist`. Under environment variables add `NODE_VERSION = 20`. Then **Save and Deploy**.

The site is fully static: no Functions, no server and no API calls, so it stays on the free plan. `public/_headers` is copied into `dist/` and sets long caching for `/assets/*`, a week for figures and screenshots, and revalidation for everything else.

## Traffic analytics

**Users and time spent: Google Analytics 4 (optional, off by default).**

1. Create a free GA4 property at analytics.google.com. Add a **Web** data stream for the site URL and copy its measurement ID (`G-…`).
2. Paste the ID into `analytics.json`. This is `public/analytics.json` in the source, or `analytics.json` at the root of the built `dist` folder, so you can edit it without rebuilding. Then deploy.
3. GA4 then reports **active users, new users, average engagement time per active user, sessions, countries and devices**.
4. The app also sends these events:
   - `page_view`: one per question set opened
   - `exam_start`: an exam begins
   - `question_answered`: includes whether the answer was correct
   - `exam_finish`: includes the score

With an empty ID, nothing is loaded and no data leaves the browser.

**Visits and page views: Cloudflare Web Analytics (free, no cookies).** In the Cloudflare project, open **Metrics → Web Analytics → Enable**, then redeploy once.

## Sources and accuracy

The questions come from the TA-led weekly tutorial sessions of the NPTEL course. Answers follow the keys printed on the slides and the TA's in-class pen marks. Where a slide printed no key, the answer is a plain fact from the course material, and the question says so. Anything still in doubt goes to **Unanswered questions** rather than into an exam.

This is an unofficial study aid and is not affiliated with NPTEL or IIT.
