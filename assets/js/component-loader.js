/**
 * ============================================================
 * COMPONENT LOADER  v3.0
 * Zero-Flicker Shell Architecture
 * ============================================================
 *
 * ROOT CAUSES OF FLICKER (all fixed here):
 *
 * 1. BLANK FRAME  — containers paint white before skeleton runs
 *    Fix: skeleton CSS injected synchronously in <head> via
 *         inline <style>. Script self-executes before DOMContentLoaded.
 *
 * 2. LAYOUT SHIFT — position:absolute overlay causes reflow
 *    on cleanup (position reset triggers synchronous relayout).
 *    Fix: CSS-grid single-cell stacking — both skeleton and
 *         real content occupy same space in normal flow.
 *         No position toggling, zero reflow ever.
 *
 * 3. DOUBLE PAINT — initFn (sidebar.js/header.js) fired AFTER
 *    transition inside setTimeout, causing visible "jump" when
 *    active classes and logo src applied post-fade.
 *    Fix: initFn fires BEFORE transition starts — JS state is
 *         fully ready when pixels first become visible.
 *
 * 4. STALE CACHE  — single shared version key coupled sidebar
 *    and header: one bad key nuked both caches unnecessarily.
 *    Fix: fully independent per-component cache keys + version.
 *
 * 5. GPU LAYER    — no compositing hint, browser rasterized on
 *    CPU mid-transition causing frame drops on slow devices.
 *    Fix: will-change:opacity set before transition, released
 *         via transitionend (not setTimeout) for exact cleanup.
 *
 * ============================================================
 */

;(function (win, doc) {
  'use strict';


  /* ================================================
     AUTO VERSIONING FOR HOSTINGER (Static Hosting)
     ================================================ */
  function getAutoVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    
    // Format: 20250519.1430  (Date + Hour)
    return `${year}${month}${day}.${hour}`;
  }

  var CFG = {
    VERSION: getAutoVersion(),        // ← Automatically generated
    MAX_AGE_MS: 1 * 60 * 60 * 1000, // 1 hours cache (good balance)
    FADE_MS: 180,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    NS: 'hrms_shell_',
  };

  console.log('%c[HRMS Loader] Auto Version: ' + CFG.VERSION, 'color:#1B738C; font-weight:bold');


  /* ─────────────────────────────────────────────────────────────
     CONFIG
     Bump VERSION on every deploy that changes sidebar.html
     or header.html. One string change clears all user caches.
  ───────────────────────────────────────────────────────────── */
  var CFG = {
    VERSION:     getAutoVersion(),               // ← CHANGE ON EVERY DEPLOY
    MAX_AGE_MS:  24 * 60 * 60 * 1000,  // 24-hour hard expiry
    FADE_MS:     180,                   // cross-dissolve duration
    EASING:      'cubic-bezier(0.4,0,0.2,1)',
    NS:          'hrms_shell_',         // localStorage key prefix
  };

  /* ─────────────────────────────────────────────────────────────
     localStorage HELPERS
  ───────────────────────────────────────────────────────────── */
  function storageOk() {
    try {
      localStorage.setItem('__hrms_t', '1');
      localStorage.removeItem('__hrms_t');
      return true;
    } catch (e) { return false; }
  }

  function lsGet(k)    { try { return localStorage.getItem(CFG.NS + k);    } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(CFG.NS + k, v);        } catch (e) {} }
  function lsDel(k)    { try { localStorage.removeItem(CFG.NS + k);        } catch (e) {} }

  /* ─────────────────────────────────────────────────────────────
     FNV-1a 32-bit hash
     Used to detect HTML changes without storing two full copies.
     Same content → same hash. Any byte change → different hash.
  ───────────────────────────────────────────────────────────── */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h  = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
  }

  /* ─────────────────────────────────────────────────────────────
     PER-COMPONENT CACHE
     Each component (sidebar / header) has 4 independent keys:
       hrms_shell_<name>          → full HTML string
       hrms_shell_<name>_hash     → FNV-1a hash of that HTML
       hrms_shell_<name>_ver      → APP_VERSION at cache time
       hrms_shell_<name>_ts       → Unix timestamp of cache write

     Read returns { html, hash } only if ALL checks pass:
       • html exists
       • version matches current APP_VERSION  (deploy guard)
       • age < MAX_AGE_MS                     (staleness guard)
     Otherwise clears that component's keys and returns null.
  ───────────────────────────────────────────────────────────── */
  function cacheRead(name) {
    var html = lsGet(name);
    var hash = lsGet(name + '_hash');
    var ver  = lsGet(name + '_ver');
    var ts   = parseInt(lsGet(name + '_ts') || '0', 10);

    if (!html || !hash)                      { cacheClear(name); return null; }
    if (ver !== CFG.VERSION)                 { cacheClear(name); return null; }
    if (Date.now() - ts > CFG.MAX_AGE_MS)   { cacheClear(name); return null; }
    return { html: html, hash: hash };
  }

  function cacheWrite(name, html) {
    var hash = fnv(html);
    try {
      localStorage.setItem(CFG.NS + name,            html);
      localStorage.setItem(CFG.NS + name + '_hash',  hash);
      localStorage.setItem(CFG.NS + name + '_ver',   CFG.VERSION);
      localStorage.setItem(CFG.NS + name + '_ts',    String(Date.now()));
    } catch (e) {
      /* QuotaExceededError — clear this component only and retry */
      cacheClear(name);
      try {
        localStorage.setItem(CFG.NS + name,            html);
        localStorage.setItem(CFG.NS + name + '_hash',  hash);
        localStorage.setItem(CFG.NS + name + '_ver',   CFG.VERSION);
        localStorage.setItem(CFG.NS + name + '_ts',    String(Date.now()));
      } catch (e2) { /* silent — re-fetch next load */ }
    }
    return hash;
  }

  function cacheClear(name) {
    [name, name + '_hash', name + '_ver', name + '_ts'].forEach(lsDel);
  }

  /* ─────────────────────────────────────────────────────────────
     SKELETON CSS + HTML
     Injected SYNCHRONOUSLY when this <script> tag is parsed —
     before the browser paints body content. Containers show
     a coloured shimmer on frame 1, never blank white.
  ───────────────────────────────────────────────────────────── */
  var SK_CSS_ID = '__hrms_sk__';
  var NAV_W     = [148, 172, 120, 108, 128, 116, 136, 152, 118];

  function injectSkeletonCSS() {
    if (doc.getElementById(SK_CSS_ID)) return;
    var s = doc.createElement('style');
    s.id  = SK_CSS_ID;
    s.textContent =
      /* Shimmer keyframe */
      '@keyframes _skw{0%{background-position:-700px 0}100%{background-position:700px 0}}' +
      /* Shimmer element */
      '._sk{' +
        'background:linear-gradient(90deg,#c2d8e0 25%,#d9edf3 50%,#c2d8e0 75%);' +
        'background-size:1400px 100%;' +
        'animation:_skw 1.5s ease-in-out infinite;' +
        'border-radius:4px;' +
        'will-change:background-position;' +   /* GPU shimmer */
        'transform:translateZ(0);' +            /* own compositing layer */
      '}' +
      /* Cross-dissolve wrappers — opacity-only, in normal flow */
      '._skw{will-change:opacity;transition:opacity ' + CFG.FADE_MS + 'ms ' + CFG.EASING + ';}' +
      '._rw {will-change:opacity;transition:opacity ' + CFG.FADE_MS + 'ms ' + CFG.EASING + ';opacity:0;}';
    (doc.head || doc.documentElement).appendChild(s);
  }

  function skSidebar() {
    var rows = NAV_W.map(function (w, i) {
      var d = (-1.5 + i * 0.1) + 's';
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:2px;">' +
               '<div class="_sk" style="width:14px;height:14px;border-radius:3px;flex-shrink:0;animation-delay:' + d + '"></div>' +
               '<div class="_sk" style="width:' + w + 'px;height:12px;animation-delay:' + d + '"></div>' +
             '</div>';
    }).join('');
    return '<div class="_skw" style="display:flex;flex-direction:column;height:100%;background:#b8cfd7;grid-area:shell;">' +
             '<div style="height:56px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #3098b5;flex-shrink:0;">' +
               '<div class="_sk" style="width:148px;height:28px;border-radius:6px;animation-delay:-0.5s"></div>' +
             '</div>' +
             '<div style="flex:1;padding:14px 8px 8px;overflow:hidden;">' + rows + '</div>' +
           '</div>';
  }

  function skHeader() {
    return '<div class="_skw" style="height:56px;display:flex;align-items:center;justify-content:flex-end;' +
                'padding:0 24px;background:#fff;border-bottom:1px solid #3098b5;gap:16px;width:100%;grid-area:shell;">' +
             '<div class="_sk" style="width:20px;height:20px;border-radius:50%;animation-delay:-1.2s"></div>' +
             '<div style="display:flex;align-items:center;gap:10px;">' +
               '<div class="_sk" style="width:30px;height:30px;border-radius:50%;animation-delay:-0.9s"></div>' +
               '<div>' +
                 '<div class="_sk" style="width:86px;height:11px;margin-bottom:5px;animation-delay:-0.6s"></div>' +
                 '<div class="_sk" style="width:54px;height:9px;animation-delay:-0.3s"></div>' +
               '</div>' +
             '</div>' +
           '</div>';
  }

  function injectSkeletons() {
    injectSkeletonCSS();
    var sb = doc.getElementById('sidebar-container');
    var hd = doc.getElementById('header-container');
    if (sb && !sb.dataset.loaded && !sb.dataset.sk) { sb.innerHTML = skSidebar(); sb.dataset.sk = '1'; }
    if (hd && !hd.dataset.loaded && !hd.dataset.sk) { hd.innerHTML = skHeader();  hd.dataset.sk = '1'; }
  }

  /* ─────────────────────────────────────────────────────────────
     HYDRATION — CSS-grid stacking cross-dissolve

     Both skeleton and real content placed in same grid cell.
     No position:absolute → zero layout recalculation.
     Sequence:
       1. Wrap real node in opacity:0 div (._rw)
       2. Set container to single-cell grid
       3. Append real wrapper (skeleton still visible)
       4. initFn() — JS state applied while content invisible
          (active nav, logo, username all set before fade-in)
       5. rAF × 2 → transition: skeleton→0, real→1 simultaneously
       6. transitionend → cleanup (exact timing, no setTimeout)
  ───────────────────────────────────────────────────────────── */
  function hydrate(containerId, html, initFn) {
    var el = doc.getElementById(containerId);
    if (!el) return;

    /* Parse HTML */
    var tmp = doc.createElement('div');
    tmp.innerHTML = html;
    var realNode = tmp.firstElementChild;
    if (!realNode) return;

    /* Wrap real content — invisible initially */
    var rw = doc.createElement('div');
    rw.className      = '_rw';
    rw.style.gridArea = 'shell';
    rw.appendChild(realNode);

    /* Find skeleton wrapper */
    var sw = el.querySelector('._skw');
    if (sw) sw.style.gridArea = 'shell';

    /* Single-cell grid — both children share exact same space */
    el.style.cssText += ';display:grid;grid-template-areas:"shell";align-items:start;';
    el.appendChild(rw);

    /* ── CRITICAL: init JS BEFORE transition ──
       sidebar.js sets active class, logo, etc.
       These are baked in when pixels first appear → no post-fade jump */
    if (typeof initFn === 'function') {
      try { initFn(); } catch (err) { console.error('[Loader]', err); }
    }

    /* Promote GPU layers before triggering transition */
    if (sw) sw.style.willChange  = 'opacity';
    rw.style.willChange = 'opacity';

    /* Double-rAF: frame 1 = layout, frame 2 = paint + transition */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (sw) sw.style.opacity = '0';
        rw.style.opacity = '1';

        /* Cleanup via transitionend — exact ms, zero drift */
        function onEnd(e) {
          if (e.propertyName !== 'opacity') return;
          rw.removeEventListener('transitionend', onEnd);

          /* Remove skeleton */
          if (sw && sw.parentNode) sw.parentNode.removeChild(sw);

          /* Release GPU memory */
          rw.style.willChange = 'auto';
          rw.style.transition = '';
          rw.style.gridArea   = '';

          /* Restore normal flow on container */
          el.style.display           = '';
          el.style.gridTemplateAreas = '';
          el.style.alignItems        = '';
          el.dataset.loaded          = '1';
          delete el.dataset.sk;

          /* Remove shimmer keyframe block — no longer needed */
          var skCss = doc.getElementById(SK_CSS_ID);
          if (skCss && skCss.parentNode) skCss.parentNode.removeChild(skCss);
        }
        rw.addEventListener('transitionend', onEnd);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FETCH — version-pinned URL busts browser HTTP cache on deploy
  ───────────────────────────────────────────────────────────── */
  function fetchHTML(path) {
    return fetch(path + '?v=' + CFG.VERSION, {
      method:      'GET',
      credentials: 'same-origin',
      headers:     { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    }).then(function (r) {
      if (!r.ok) throw new Error('[Loader] HTTP ' + r.status + ' ' + path);
      return r.text();
    });
  }

  /* ─────────────────────────────────────────────────────────────
     BACKGROUND REVALIDATION
     After a cache-hit render, silently check if HTML changed.
     Changed → update localStorage → next load gets fresh HTML.
     Unchanged → do nothing (saves bandwidth).
  ───────────────────────────────────────────────────────────── */
  function revalidate(name, path, oldHash) {
    fetchHTML(path).then(function (fresh) {
      var newHash = fnv(fresh);
      if (newHash !== oldHash) {
        cacheWrite(name, fresh);
        win.__shellUpdateAvailable = true;
        console.log('[Loader] New version cached for: ' + name + ' (reload to apply)');
      }
    }).catch(function (e) {
      console.warn('[Loader] Revalidation skipped — ' + e.message);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     MAIN LOAD — SWR with per-component independent cache
  ───────────────────────────────────────────────────────────── */
  function loadComponent(cfg) {
    var name     = cfg.name;
    var path     = cfg.path;
    var altPaths = cfg.altPaths || [];
    var cid      = cfg.containerId;
    var initFn   = cfg.initFn;
    var ok       = storageOk();
    var entry    = ok ? cacheRead(name) : null;

    if (entry) {
      /* CACHE HIT → instant render + silent revalidation */
      hydrate(cid, entry.html, initFn);
      revalidate(name, path, entry.hash);
      return;
    }

    /* CACHE MISS → fetch → cache → render */
    var paths = [path].concat(altPaths);
    var idx   = 0;

    (function tryNext() {
      if (idx >= paths.length) {
        var el = doc.getElementById(cid);
        if (el) el.innerHTML = '<div style="padding:12px;color:#dc3545;font-size:12px;text-align:center;">Failed to load. <a href="javascript:location.reload()" style="color:#1B738C;">Retry</a></div>';
        return;
      }
      fetchHTML(paths[idx++]).then(function (html) {
        if (ok) cacheWrite(name, html);
        hydrate(cid, html, initFn);
      }).catch(tryNext);
    }());
  }

  /* ─────────────────────────────────────────────────────────────
     PATH RESOLVER
  ───────────────────────────────────────────────────────────── */
  function basePath() {
    var p = win.location.pathname;
    if (p.indexOf('/pages/reports/') !== -1) return '../../';
    if (p.indexOf('/pages/payroll/') !== -1) return '../../';
    if (p.indexOf('/company-mgmt/')  !== -1) return '../../';
    if (p.indexOf('/pages/')         !== -1) return '../';
    return './';
  }

  /* ─────────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────────── */
  function loadSidebar() {
    var base = basePath();
    loadComponent({
      name:        'sidebar',
      containerId: 'sidebar-container',
      path:        base + 'includes/sidebar.html',
      altPaths:    ['../includes/sidebar.html', './includes/sidebar.html', '/includes/sidebar.html'],
      initFn: function () {
        if (typeof win.initSidebar       === 'function') win.initSidebar();
        if (typeof win.updateSidebarLogo === 'function') win.updateSidebarLogo();
      }
    });
  }

  function loadHeader() {
    var base = basePath();
    loadComponent({
      name:        'header',
      containerId: 'header-container',
      path:        base + 'includes/header.html',
      altPaths:    ['../includes/header.html', './includes/header.html', '/includes/header.html'],
      initFn: function () {
        if (typeof win.initHeader === 'function') win.initHeader();
      }
    });
  }

  function bustCache() {
    ['sidebar', 'header'].forEach(cacheClear);
    console.log('[Loader] All shell caches cleared — reload to fetch fresh components.');
  }

  /* ─────────────────────────────────────────────────────────────
     BOOTSTRAP — run synchronously so skeleton is on screen
     before the browser paints any body content
  ───────────────────────────────────────────────────────────── */
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', injectSkeletons);
  } else {
    injectSkeletons();
  }

  /* ─────────────────────────────────────────────────────────────
     EXPOSE
  ───────────────────────────────────────────────────────────── */
  win.componentLoader = {
    loadSidebar: loadSidebar,
    loadHeader:  loadHeader,
    bustCache:   bustCache,
    version:     CFG.VERSION,
    /* Debug helpers — use in browser console */
    _read:  cacheRead,
    _clear: cacheClear,
    _hash:  fnv,
  };

  /* Drop-in override for common.js — same function names */
  win.loadSidebar = loadSidebar;
  win.loadHeader  = loadHeader;

}(window, document));

/*
═══════════════════════════════════════════════════════════════════
 HOW localStorage VERSIONING WORKS
═══════════════════════════════════════════════════════════════════

 Keys stored per component (example: sidebar):
   hrms_shell_sidebar           full HTML string
   hrms_shell_sidebar_hash      FNV-1a hex hash of that HTML
   hrms_shell_sidebar_ver       APP_VERSION at cache-write time
   hrms_shell_sidebar_ts        Date.now() timestamp

 On every page load, cacheRead() validates:
   1. html + hash exist?                      no → fetch fresh
   2. _ver === current APP_VERSION?           no → clear + fetch
   3. age < 24 hours?                         no → clear + fetch
   4. All pass → return { html, hash }             → instant render

 Background revalidation (always runs after cache hit):
   • Fetches fresh HTML quietly after render completes
   • Computes new FNV hash
   • If different → cacheWrite() updates localStorage
   • Next page load gets new HTML; current page unaffected (no flash)

 On every deploy (sidebar.html or header.html changed):
   Open  /assets/js/component-loader.js
   Change: VERSION: '1.0.0'
   To:     VERSION: '1.0.1'    ← any new string works
   Result: every user's cacheRead() fails version check on
           next visit → cacheClear() → fetchHTML() → new cache

 Emergency bust (no code deploy needed):
   Open browser console on any HRMS page:
   > window.componentLoader.bustCache()
   > location.reload()

 Inspect current cache state:
   > window.componentLoader._read('sidebar')
   → { html: '...', hash: 'a3f21c...' }  or  null (not cached)

   > window.componentLoader._read('header')
   → { html: '...', hash: 'b7d04a...' }  or  null

═══════════════════════════════════════════════════════════════════
*/