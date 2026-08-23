/* End of Summer sale bar. Renders above the nav on every page and counts down to
   the end of the sale in days/hours/minutes. Once the deadline passes it renders
   nothing at all, so the bar disappears on its own without a code change. */
(function () {
  var SALE_ENDS = '2026-09-12T23:59:00-06:00';
  var HEADLINE  = 'End of Summer Sale: 20% off all details!';

  var end = new Date(SALE_ENDS).getTime();
  if (isNaN(end) || Date.now() >= end) return;

  var css = document.createElement('style');
  css.textContent =
    '.sfac-sale{position:relative;z-index:200;background:linear-gradient(90deg,#A87B27 0%,#C9973A 50%,#A87B27 100%);' +
    'color:#fff;font-family:Archivo,system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;' +
    'justify-content:center;gap:.5rem 1rem;padding:.6rem 1rem;text-align:center;line-height:1.3;' +
    'box-shadow:0 1px 0 rgba(0,0,0,.08)}' +
    '.sfac-sale-txt{font-size:.95rem;font-weight:800;letter-spacing:-.01em}' +
    '.sfac-sale-cd{display:inline-flex;align-items:center;gap:.4rem;background:rgba(16,17,18,.82);' +
    'border-radius:999px;padding:.28rem .78rem;font-size:.78rem;font-weight:700;letter-spacing:.02em;' +
    'white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.sfac-sale-cd b{font-weight:800}' +
    '@media (max-width:560px){.sfac-sale{padding:.55rem .75rem;gap:.3rem .6rem}' +
    '.sfac-sale-txt{font-size:.82rem}.sfac-sale-cd{font-size:.72rem;padding:.24rem .6rem}}';
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.className = 'sfac-sale';
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<span class="sfac-sale-txt"></span><span class="sfac-sale-cd"></span>';
  bar.querySelector('.sfac-sale-txt').textContent = HEADLINE;
  var cd = bar.querySelector('.sfac-sale-cd');

  function tick() {
    var left = end - Date.now();
    if (left <= 0) { bar.remove(); return; }
    var mins  = Math.floor(left / 60000);
    var days  = Math.floor(mins / 1440);
    var hours = Math.floor((mins % 1440) / 60);
    cd.innerHTML = 'Ends in <b>' + days + 'd ' + hours + 'h ' + (mins % 60) + 'm</b>';
  }
  tick();
  setInterval(tick, 15000);

  // Pages with a fixed header (the booking app) need to know how tall the bar is
  // so they can offset themselves. Everything else just lets it sit in flow.
  function publishHeight() {
    document.documentElement.style.setProperty('--sfac-sale-h', bar.offsetHeight + 'px');
  }
  function mount() {
    document.body.insertBefore(bar, document.body.firstChild);
    publishHeight();
    // The booking map sizes itself to a fixed container; tell it the box moved.
    window.dispatchEvent(new Event('resize'));
    if (window.ResizeObserver) new ResizeObserver(publishHeight).observe(bar);
    else window.addEventListener('resize', publishHeight);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
