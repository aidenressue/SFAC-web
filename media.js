/*
  Autoplay recovery for the muted background videos.
  ---------------------------------------------------------------------------
  Every one of them already carries autoplay + muted + loop + playsinline,
  which is all Safari needs under normal conditions. It is not enough in two
  cases that happen constantly on a real phone:

    1. iOS Low Power Mode blocks autoplay outright and paints the play glyph
       over the poster. Nothing in the markup can override it.
    2. Safari sometimes defers loading a video that carries no preload, and a
       video with no data cannot start.

  Both are recoverable: once the visitor has touched or scrolled the page at
  all, play() is permitted. So this retries every paused video on the first
  gesture of any kind, and plays each one as it scrolls into view.

  Videos driven by script opt out with data-manual — the ceramic quote builder
  steps through its own clips and must not be started behind its back. Those
  carry no autoplay attribute either, so they are excluded twice over.
*/
(function () {
  function videos() {
    return [].slice.call(
      document.querySelectorAll('video[autoplay]:not([data-manual])')
    );
  }

  function tryPlay(v) {
    if (!v.paused) return;
    v.muted = true;                     // the property, not just the attribute
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* still blocked; a later gesture retries */ });
  }

  function onScreen(v) {
    var r = v.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function init() {
    var list = videos();
    if (!list.length) return;

    list.forEach(function (v) {
      // Safari will not autoplay what it has not begun to load.
      if (!v.hasAttribute('preload') || v.getAttribute('preload') === 'none') {
        v.setAttribute('preload', 'auto');
      }
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');   // iOS 9 and older
      v.muted = true;
      v.removeAttribute('controls');
    });

    // Play on entry, pause on exit: a phone should not be decoding video that
    // is nowhere near the screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) tryPlay(e.target);
          else if (!e.target.paused) e.target.pause();
        });
      }, { threshold: 0.15 });
      list.forEach(function (v) { io.observe(v); });
    } else {
      list.forEach(tryPlay);
    }

    // The first gesture of any kind lifts the Low Power Mode block.
    function onFirstGesture() {
      videos().forEach(function (v) { if (onScreen(v)) tryPlay(v); });
    }
    ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, onFirstGesture, { passive: true, once: true });
    });

    // Coming back to the tab leaves them paused otherwise.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      videos().forEach(function (v) { if (onScreen(v)) tryPlay(v); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
