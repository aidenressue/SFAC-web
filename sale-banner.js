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
    '.sfac-sale{position:relative;z-index:200;background:#fff;' +
    'color:#A87B27;font-family:Archivo,system-ui,sans-serif;display:flex;flex-wrap:wrap;align-items:center;' +
    'justify-content:center;gap:.35rem .8rem;padding:.4rem 1rem;text-align:center;line-height:1.3;' +
    'border-bottom:1px solid rgba(201,151,58,.32)}' +
    '.sfac-sale-txt{font-size:.8rem;font-weight:800;letter-spacing:-.01em}' +
    '.sfac-sale-cd{display:inline-flex;align-items:center;gap:.35rem;background:rgba(201,151,58,.12);' +
    'border-radius:999px;padding:.2rem .6rem;font-size:.68rem;font-weight:700;letter-spacing:.02em;' +
    'white-space:nowrap;font-variant-numeric:tabular-nums;color:#A87B27}' +
    '.sfac-sale-cd b{font-weight:800}' +
    '@media (max-width:560px){.sfac-sale{padding:.36rem .7rem;gap:.2rem .5rem}' +
    '.sfac-sale-txt{font-size:.72rem}.sfac-sale-cd{font-size:.63rem;padding:.16rem .5rem}}';
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
