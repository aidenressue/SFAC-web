/*
  Mobile menu accordions.
  ---------------------------------------------------------------------------
  The Services and Resources dropdowns are plain buttons followed by a panel:

      <button class="m-acc" aria-expanded="false">Services …</button>
      <div class="m-acc-panel"> … </div>

  Seven pages shipped that markup with no script behind it, so on gallery,
  testimonials, contact, blog, quote-builder, privacy-policy and
  terms-conditions the dropdowns did nothing at all when tapped.

  IMPORTANT: this file must NOT be added to a page that already has its own
  inline .m-acc handler (index, home-new, ceramic-coating, paint-correction,
  maintenance, fleet-cleaning and the area-* pages all do). Two handlers means
  every tap toggles twice, which lands back where it started and would break
  the pages that currently work.

  Delegated from the document so it does not care when the menu is built.
*/
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.m-acc');
    if (!btn) return;

    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));

    var panel = btn.nextElementSibling;
    if (panel && panel.classList.contains('m-acc-panel')) {
      panel.classList.toggle('open', !open);
    }
  });
})();
