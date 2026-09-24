/* Kelsie Nguyễn — Portfolio. Vanilla JS, no dependencies.
   Ported from the design's DCLogic class: reveal, drift columns, count-up, carousel. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav ---------- */
  var nav = document.querySelector('.nav');
  var burger = nav && nav.querySelector('.nav__burger');
  if (burger) {
    var setOpen = function (open) {
      nav.classList.toggle('nav--open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', function () { setOpen(!nav.classList.contains('nav--open')); });
    nav.querySelectorAll('.nav__menu a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var delays = { card: 0, cap1: 180, cap2: 300, p0: 0, p1: 100, p2: 0, p3: 120, p4: 240, p5: 360, p6: 480 };
  var revealNodes = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-bloom]'));
  var show = function (el) { el.classList.add('is-shown'); };

  if (reduce || !('IntersectionObserver' in window)) {
    revealNodes.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    revealNodes.forEach(function (el) {
      var d = el.hasAttribute('data-bloom-delay')
        ? parseInt(el.getAttribute('data-bloom-delay'), 10)
        : (delays[el.getAttribute('data-reveal')] || 0);
      var ease = 'cubic-bezier(.22,.61,.36,1)';
      el.style.transition = 'opacity 700ms ' + ease + ' ' + d + 'ms, transform 700ms ' + ease + ' ' + d + 'ms';
      io.observe(el);
    });

    // Safety net: never leave content invisible.
    setTimeout(function () {
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el);
      });
    }, 1800);
  }

  /* ---------- Count-up stats ---------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var final = prefix + el.getAttribute('data-count') + suffix;
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = final; return; }

    var run = function () {
      var start = performance.now();
      var dur = 1200;
      var tick = function (t) {
        var p = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
      };
      requestAnimationFrame(tick);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(); cio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    cio.observe(el);
  });

  /* ---------- The Blooms carousel: counter + progress ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (track) {
    var key = track.getAttribute('data-carousel');
    var counter = document.querySelector('[data-carousel-counter="' + key + '"]');
    var fill = document.querySelector('[data-carousel-fill="' + key + '"]');
    var total = track.children.length;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var sync = function () {
      var first = track.children[0];
      var w = first ? first.getBoundingClientRect().width + 24 : 1;
      var i = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / w)));
      // Snap to the last card when scrolled to the end (last cards may never reach the left edge).
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) i = total - 1;
      if (counter) counter.textContent = pad(i + 1) + ' / ' + pad(total);
      if (fill) fill.style.width = ((i + 1) / total * 100) + '%';
    };
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* ---------- Drift columns ----------
     rAF loop, ping-pongs between 0 and max. Hover pauses; wheel / mouse-drag scroll
     the track manually and it resumes from where it was left. */
  var tracks = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));

  var measure = function (track) {
    var vp = track.parentElement;
    var s = track._sg;
    s.max = Math.max(0, track.scrollHeight - vp.clientHeight);
    s.pos = Math.min(s.pos, s.max);
  };

  if (reduce) {
    // Plain scrollable column (overflow-y:auto set in CSS).
    tracks.forEach(function (track) { track.style.transform = 'none'; });
  } else if (tracks.length) {
    tracks.forEach(function (track) {
      var vp = track.parentElement;
      var s = track._sg = { pos: 0, dir: 1, hover: false, drag: null, hold: 0, max: 0, wasDrag: false };
      var clamp = function (v) { return Math.max(0, Math.min(s.max, v)); };
      measure(track);

      vp.style.cursor = 'grab';
      vp.addEventListener('mouseenter', function () { s.hover = true; });
      vp.addEventListener('mouseleave', function () { s.hover = false; });

      vp.addEventListener('wheel', function (e) {
        if (!s.max) return;
        var n = clamp(s.pos + e.deltaY);
        // Only swallow the wheel while the track can still move, so the page scrolls past the ends.
        if (n !== s.pos) {
          e.preventDefault();
          s.pos = n; s.dir = e.deltaY > 0 ? 1 : -1; s.hold = performance.now() + 1200;
        }
      }, { passive: false });

      // Mouse / pen drag only — touch keeps normal page scrolling on phones.
      vp.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        s.drag = { y: e.clientY, p: s.pos, moved: false };
        vp.style.cursor = 'grabbing';
      });
      window.addEventListener('pointermove', function (e) {
        if (!s.drag) return;
        var dy = e.clientY - s.drag.y;
        if (Math.abs(dy) > 4) s.drag.moved = true;
        if (s.drag.moved) { s.pos = clamp(s.drag.p - dy); s.dir = dy < 0 ? 1 : -1; }
      });
      window.addEventListener('pointerup', function () {
        if (!s.drag) return;
        s.wasDrag = s.drag.moved; s.drag = null;
        s.hold = performance.now() + 1500;
        vp.style.cursor = 'grab';
      });
      // A drag must not trigger the "Watch →" link underneath.
      vp.addEventListener('click', function (e) {
        if (s.wasDrag) { e.preventDefault(); e.stopPropagation(); s.wasDrag = false; }
      }, true);
      vp.addEventListener('dragstart', function (e) { e.preventDefault(); });
      vp.style.userSelect = 'none';
      vp.style.webkitUserSelect = 'none';

      if ('ResizeObserver' in window) new ResizeObserver(function () { measure(track); }).observe(track);
    });

    window.addEventListener('resize', function () { tracks.forEach(measure); });
    window.addEventListener('load', function () { tracks.forEach(measure); });

    var last = performance.now();
    var tick = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tracks.forEach(function (track) {
        var s = track._sg;
        if (!s.hover && !s.drag && now > s.hold && s.max) {
          var speed = Math.max(18, s.max / 35) * (parseFloat(track.getAttribute('data-drift-speed')) || 1);
          s.pos += s.dir * speed * dt;
          if (s.pos >= s.max) { s.pos = s.max; s.dir = -1; }
          if (s.pos <= 0) { s.pos = 0; s.dir = 1; }
        }
        track.style.transform = 'translate3d(0,' + (-s.pos) + 'px,0)';
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
