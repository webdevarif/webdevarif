/**
 * Vanilla-JS tracker delivered at /t/<publicKey>.js. Self-contained, no
 * dependencies. ~10KB unminified, gzips well. Substituted variables are
 * marked __PLACEHOLDER__ and replaced at request time.
 *
 * Spec coverage:
 *   - auto pageviews (incl. SPA via pushState/popstate hook)
 *   - clicks (selector + truncated text, including outbound flagging)
 *   - rage clicks (3+ within 700ms at same ~32px square)
 *   - scroll depth (25/50/75/100)
 *   - form submits
 *   - JS errors (window error + unhandledrejection)
 *   - web vitals (LCP/CLS/INP) via PerformanceObserver
 *   - UTM + referrer captured into meta on every flush
 *   - window.tm(name, props) global for custom events
 *   - batch every 5s or 20 events, sendBeacon on pagehide
 *   - localStorage TM_DISABLE opt-out (any truthy value disables)
 *   - session replay: only when REPLAY_ENABLED + sample roll hits; loads
 *     rrweb from /vendor/rrweb.min.js on the tracker host (avoids CDN),
 *     records with maskAllInputs:true, gzipped chunks every 10s to
 *     /api/track/replay, hard stop after 5 min.
 */

type Placeholders = {
  publicKey: string;
  ingestUrl: string;
  replayUrl: string;
  replayEnabled: boolean;
  replaySampleRate: number;
  rrwebUrl: string;
};

export function buildTrackerScript(p: Placeholders): string {
  return TRACKER_TEMPLATE
    .replaceAll("__PUBLIC_KEY__", JSON.stringify(p.publicKey))
    .replaceAll("__INGEST_URL__", JSON.stringify(p.ingestUrl))
    .replaceAll("__REPLAY_URL__", JSON.stringify(p.replayUrl))
    .replaceAll("__REPLAY_ENABLED__", JSON.stringify(p.replayEnabled))
    .replaceAll("__REPLAY_SAMPLE_RATE__", String(p.replaySampleRate))
    .replaceAll("__RRWEB_URL__", JSON.stringify(p.rrwebUrl));
}

const TRACKER_TEMPLATE = `(function () {
  if (typeof window === 'undefined') return;
  if (window.__tmTracker) return;
  window.__tmTracker = true;

  try {
    if (window.localStorage && window.localStorage.getItem('TM_DISABLE')) return;
  } catch (e) { /* private mode etc. — proceed */ }

  var PUBLIC_KEY = __PUBLIC_KEY__;
  var INGEST_URL = __INGEST_URL__;
  var REPLAY_URL = __REPLAY_URL__;
  var REPLAY_ENABLED = __REPLAY_ENABLED__;
  var REPLAY_SAMPLE_RATE = __REPLAY_SAMPLE_RATE__;
  var RRWEB_URL = __RRWEB_URL__;

  var BATCH_INTERVAL_MS = 5000;
  var BATCH_MAX = 20;
  var REPLAY_CHUNK_MS = 10000;
  var REPLAY_HARD_STOP_MS = 5 * 60 * 1000;
  var RAGE_WINDOW_MS = 700;
  var RAGE_THRESHOLD = 3;
  var RAGE_RADIUS_PX = 32;

  // ─── meta payload (referrer, utm, device) ────────────────────────

  var search = (window.location.search || '').replace(/^\\?/, '');
  var params = {};
  search.split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    var k = i >= 0 ? kv.slice(0, i) : kv;
    var v = i >= 0 ? kv.slice(i + 1) : '';
    try { params[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { /* ignore */ }
  });
  function pickUtm(name) { return params['utm_' + name] || null; }

  function detectDevice() {
    var ua = (navigator.userAgent || '').toLowerCase();
    if (/ipad|tablet/.test(ua)) return 'tablet';
    if (/mobi|iphone|android/.test(ua)) return 'mobile';
    return 'desktop';
  }
  function detectBrowser() {
    var ua = navigator.userAgent || '';
    if (/Edg\\//.test(ua)) return 'Edge';
    if (/OPR\\//.test(ua) || /Opera/.test(ua)) return 'Opera';
    if (/Chrome\\//.test(ua)) return 'Chrome';
    if (/Safari\\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/Firefox\\//.test(ua)) return 'Firefox';
    return 'Other';
  }
  function detectOs() {
    var p = (navigator.platform || '') + ' ' + (navigator.userAgent || '');
    if (/Win/i.test(p)) return 'Windows';
    if (/Mac/i.test(p)) return 'macOS';
    if (/Android/i.test(p)) return 'Android';
    if (/iPhone|iPad|iOS/i.test(p)) return 'iOS';
    if (/Linux/i.test(p)) return 'Linux';
    return 'Other';
  }

  var META = {
    entry_page: window.location.pathname || '/',
    referrer: (document.referrer || '').slice(0, 1900) || null,
    utm_source: pickUtm('source'),
    utm_medium: pickUtm('medium'),
    utm_campaign: pickUtm('campaign'),
    device_type: detectDevice(),
    browser: detectBrowser(),
    os: detectOs(),
    screen_w: (window.screen && window.screen.width) || 0,
    screen_h: (window.screen && window.screen.height) || 0
  };

  // ─── event queue + flush ─────────────────────────────────────────

  var queue = [];
  var sessionId = null;

  function path() {
    return (window.location.pathname || '/') + (window.location.search || '');
  }

  function push(type, name, props) {
    queue.push({
      type: type,
      name: name || undefined,
      url_path: path(),
      props: props || undefined,
      ts: Date.now()
    });
    if (queue.length >= BATCH_MAX) flush(false);
  }

  function flush(viaBeacon) {
    if (queue.length === 0) return;
    var batch = queue.splice(0, queue.length);
    var payload = JSON.stringify({
      public_key: PUBLIC_KEY,
      meta: META,
      events: batch
    });
    if (viaBeacon && navigator.sendBeacon) {
      try {
        // Beacon must be text/plain — the server reads body as text.
        navigator.sendBeacon(INGEST_URL, new Blob([payload], { type: 'text/plain' }));
        return;
      } catch (e) { /* fall through */ }
    }
    try {
      fetch(INGEST_URL, {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        credentials: 'omit',
        mode: 'cors'
      })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.session_id) sessionId = j.session_id; })
      .catch(function () { /* swallow */ });
    } catch (e) { /* network */ }
  }
  setInterval(function () { flush(false); }, BATCH_INTERVAL_MS);

  // ─── pageviews (incl. SPA hook) ─────────────────────────────────

  var lastPath = '';
  function emitPageview() {
    var p = path();
    if (p === lastPath) return;
    lastPath = p;
    push('pageview', null, { title: (document.title || '').slice(0, 200) });
  }
  emitPageview();

  function hookHistory(method) {
    var orig = history[method];
    if (typeof orig !== 'function') return;
    history[method] = function () {
      var ret = orig.apply(this, arguments);
      setTimeout(emitPageview, 0);
      return ret;
    };
  }
  hookHistory('pushState');
  hookHistory('replaceState');
  window.addEventListener('popstate', function () { setTimeout(emitPageview, 0); });

  // ─── clicks (with selector/text, rage clicks, outbound) ─────────

  function elSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + el.id;
    var tag = (el.tagName || '').toLowerCase();
    var cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
      : '';
    return (tag + cls).slice(0, 80);
  }
  function elText(el) {
    var t = (el.innerText || el.textContent || '').trim();
    return t ? t.slice(0, 60) : null;
  }

  var rageBuf = [];
  function recordRage(x, y) {
    var now = Date.now();
    rageBuf = rageBuf.filter(function (p) { return now - p.t < RAGE_WINDOW_MS; });
    rageBuf.push({ x: x, y: y, t: now });
    if (rageBuf.length < RAGE_THRESHOLD) return false;
    var origin = rageBuf[0];
    var hit = rageBuf.every(function (p) {
      return Math.abs(p.x - origin.x) <= RAGE_RADIUS_PX
          && Math.abs(p.y - origin.y) <= RAGE_RADIUS_PX;
    });
    if (hit) {
      rageBuf = [];
      return true;
    }
    return false;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t) return;
    // Walk up to the anchor/button if the click landed on a child node.
    var actionable = t;
    while (actionable && actionable !== document.body && actionable.tagName !== 'A' && actionable.tagName !== 'BUTTON') {
      actionable = actionable.parentNode;
    }
    var el = actionable && actionable.tagName ? actionable : t;
    var props = {
      selector: elSelector(el),
      text: elText(el)
    };

    // Outbound link?
    if (el.tagName === 'A' && el.href) {
      try {
        var u = new URL(el.href, window.location.href);
        if (u.host && u.host !== window.location.host) {
          props.href = el.href.slice(0, 500);
          push('outbound', u.host, props);
        }
      } catch (err) { /* invalid url */ }
    }

    push('click', null, props);

    if (recordRage(e.clientX, e.clientY)) {
      push('rage_click', null, { selector: props.selector, x: e.clientX, y: e.clientY });
    }
  }, true);

  // ─── scroll depth (25/50/75/100) ────────────────────────────────

  var thresholds = [25, 50, 75, 100];
  var firedScrolls = {};
  function onScroll() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop || 0;
    var winH = window.innerHeight || doc.clientHeight || 0;
    var pageH = Math.max(
      doc.scrollHeight, document.body.scrollHeight,
      doc.offsetHeight, document.body.offsetHeight
    );
    var max = Math.max(1, pageH - winH);
    var depth = Math.min(100, Math.round(((scrollTop + winH) / pageH) * 100));
    thresholds.forEach(function (th) {
      var key = lastPath + ':' + th;
      if (!firedScrolls[key] && depth >= th) {
        firedScrolls[key] = true;
        push('scroll', String(th), { depth: th });
      }
    });
  }
  window.addEventListener('scroll', throttle(onScroll, 250), { passive: true });

  function throttle(fn, ms) {
    var last = 0, timer = null;
    return function () {
      var now = Date.now();
      var remaining = ms - (now - last);
      if (remaining <= 0) { last = now; fn(); }
      else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn();
        }, remaining);
      }
    };
  }

  // ─── form submits ───────────────────────────────────────────────

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.tagName || f.tagName !== 'FORM') return;
    push('form_submit', f.id || f.name || null, {
      action: (f.action || '').slice(0, 300),
      method: (f.method || 'GET').toUpperCase(),
      fields: (f.elements ? f.elements.length : 0)
    });
  }, true);

  // ─── JS errors ──────────────────────────────────────────────────

  window.addEventListener('error', function (e) {
    push('error', (e.message || 'Error').slice(0, 120), {
      filename: (e.filename || '').slice(0, 200),
      line: e.lineno || null,
      col: e.colno || null
    });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var msg = reason && reason.message ? reason.message : String(reason || 'unhandled');
    push('error', msg.slice(0, 120), { kind: 'unhandledrejection' });
  });

  // ─── web vitals (LCP / CLS / INP) ───────────────────────────────

  function observeVital(name, type, picker) {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      var po = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var v = picker(entries);
        if (typeof v === 'number' && isFinite(v)) {
          push('web_vital', name, { value: Math.round(v * 100) / 100 });
        }
      });
      po.observe({ type: type, buffered: true });
    } catch (e) { /* unsupported */ }
  }
  // LCP — value is the largest reported so far. We re-emit on each update.
  var lcpLast = 0;
  observeVital('LCP', 'largest-contentful-paint', function (entries) {
    var e = entries[entries.length - 1];
    if (!e) return null;
    var v = e.renderTime || e.loadTime || e.startTime || 0;
    if (v > lcpLast) { lcpLast = v; return v; }
    return null;
  });
  // CLS — cumulative; emit final on pagehide via beacon.
  var clsValue = 0;
  observeVital('layout-shift-tick', 'layout-shift', function (entries) {
    entries.forEach(function (e) {
      if (!e.hadRecentInput) clsValue += e.value;
    });
    return null;
  });
  // INP — Event Timing API. Take the worst seen.
  var inpWorst = 0;
  observeVital('event-tick', 'event', function (entries) {
    entries.forEach(function (e) {
      if (e.interactionId && e.duration > inpWorst) inpWorst = e.duration;
    });
    return null;
  });

  // ─── window.tm() custom events ──────────────────────────────────

  window.tm = function (name, props) {
    if (typeof name !== 'string' || !name) return;
    push('custom', name.slice(0, 120), props || undefined);
  };

  // ─── pagehide flush + final vitals ──────────────────────────────

  function finalFlush() {
    if (clsValue > 0) push('web_vital', 'CLS', { value: Math.round(clsValue * 1000) / 1000 });
    if (inpWorst > 0) push('web_vital', 'INP', { value: Math.round(inpWorst) });
    flush(true);
  }
  window.addEventListener('pagehide', finalFlush);
  window.addEventListener('beforeunload', finalFlush);

  // ─── session replay (sampled, gzip chunks) ──────────────────────

  function startReplay() {
    if (!REPLAY_ENABLED) return;
    var roll = Math.random() * 100;
    if (roll >= REPLAY_SAMPLE_RATE) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = RRWEB_URL;
    s.onload = function () {
      var rrweb = window.rrweb || window.rrwebRecord;
      var record = rrweb && (rrweb.record || rrweb);
      if (typeof record !== 'function') return;
      var events = [];
      var chunkIndex = 0;
      record({
        emit: function (e) { events.push(e); },
        maskAllInputs: true,
        maskTextSelector: '.tm-mask'
      });
      var timer = setInterval(sendChunk, REPLAY_CHUNK_MS);
      var stopTimer = setTimeout(function () {
        clearInterval(timer);
        sendChunk();
      }, REPLAY_HARD_STOP_MS);

      // Replay chunks include the initial rrweb DOM snapshot in chunk 0
      // which routinely exceeds navigator.sendBeacon's 64KB ceiling.
      // sendBeacon returns false (not throw) when it can't queue a
      // payload — so the previous beacon-then-fetch code was always
      // returning before the fetch fallback fired, and chunks never
      // landed in the DB. Use fetch() with keepalive directly so big
      // payloads ship reliably during the session AND on unload.
      function sendChunk() {
        if (!sessionId || events.length === 0) return;
        var batch = events.splice(0, events.length);
        var json = JSON.stringify(batch);
        gzipBase64(json).then(function (b64) {
          var body = JSON.stringify({
            public_key: PUBLIC_KEY,
            session_id: sessionId,
            chunk_index: chunkIndex++,
            events_b64: b64
          });
          fetch(REPLAY_URL, {
            method: 'POST',
            body: body,
            headers: { 'content-type': 'application/json' },
            keepalive: true,
            credentials: 'omit',
            mode: 'cors'
          }).catch(function () { /* swallow */ });
        });
      }
      window.addEventListener('pagehide', function () {
        clearInterval(timer);
        clearTimeout(stopTimer);
        sendChunk();
      });
    };
    s.onerror = function () { /* rrweb not installed — skip silently */ };
    document.head.appendChild(s);
  }

  function gzipBase64(str) {
    // Modern browsers ship CompressionStream — fall back to plain base64 if not.
    if (typeof CompressionStream === 'undefined') {
      return Promise.resolve(btoa(unescape(encodeURIComponent(str))));
    }
    var stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).blob().then(function (blob) {
      return blob.arrayBuffer();
    }).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });
  }

  // Defer replay start until the first ingest response gives us sessionId.
  // Poll briefly — the first flush will populate sessionId.
  var sessionWatch = setInterval(function () {
    if (sessionId) {
      clearInterval(sessionWatch);
      startReplay();
    }
  }, 500);
  setTimeout(function () { clearInterval(sessionWatch); }, 30000);
})();
`;
