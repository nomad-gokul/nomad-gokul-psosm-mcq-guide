// Optional Google Analytics 4. The site works the same without it.
//
// The measurement ID lives in /analytics.json (public/analytics.json in the source, or
// analytics.json at the root of the built site), so it can be set or removed without a
// rebuild. With no valid ID nothing is loaded and no data leaves the browser.
//
// Besides GA4's automatic metrics (active users, engagement time, countries, devices),
// the app sends a few events that make usage easy to quantify:
//   page_view          one per question set opened (#w08, #custom, #unanswered …)
//   exam_start         set_id, questions
//   question_answered  set_id, correct (instant-feedback mode)
//   exam_finish        set_id, score, total, percent

let ready = false;
const queue = [];

export async function initAnalytics() {
  try {
    const res = await fetch('/analytics.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    const id = String(cfg.ga4MeasurementId || '').trim();
    if (!/^G-[A-Z0-9]{4,}$/.test(id)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    // Page views are sent by the app (one per set), not on script load.
    window.gtag('config', id, { send_page_view: false });

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.append(s);

    ready = true;
    queue.splice(0).forEach(([name, params]) => window.gtag('event', name, params));
  } catch {
    /* analytics is best-effort */
  }
}

export function track(name, params = {}) {
  if (ready) window.gtag('event', name, params);
  else if (queue.length < 50) queue.push([name, params]);
}

export function pageView(setId, title) {
  track('page_view', {
    page_title: title,
    page_location: `${location.origin}/${setId ? '#' + setId : ''}`,
    page_path: `/${setId ? '#' + setId : ''}`,
  });
}
