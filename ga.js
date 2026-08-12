/*
  Google Analytics 4 + Google Ads for shineforacause.com
  -------------------------------------------------------------------------
  One shared loader used by every page. Both products run off the same gtag,
  so there is a single script on the page rather than two.

  TO FINISH SETUP, fill in the three blanks below. Nothing else needs editing,
  anywhere. Until they are filled in, the Ads code stays dormant and the site
  behaves exactly as it does now.

    1. GOOGLE_ADS_ID   Google Ads > Admin > Account settings. Looks like AW-123456789.
    2. CONVERSIONS     Google Ads > Goals > Conversions > Summary. Click a conversion
                       action, then "Tag setup" > "Use Google tag manually". You want
                       the value after the slash in send_to, e.g. for
                         send_to: 'AW-123456789/AbCdEfGh12345'
                       the label is  AbCdEfGh12345

  Fire a conversion from anywhere with:  sfacTrack('booking', { value: 299 })
*/
(function () {
  var GA_MEASUREMENT_ID = 'G-QPPG6HRJVN';

  // ── Google Ads ──────────────────────────────────────────────────────────
  //
  // 2026-08-12: moved to a new Ads account. The old one was AW-18036663664 and
  // its conversion labels are gone with it — a label only works in the account
  // that issued it, so every label below has to be recreated in the new account
  // rather than carried across.
  var GOOGLE_ADS_ID = 'AW-18385284844';

  /* One label per conversion action created in Google Ads. Leave a label empty
     and that conversion simply does not fire, so you can switch them on as you
     create them. */
  var CONVERSIONS = {
    booking: '',                 // "Booking Completed" — the main goal
    phone:   '',                 // "Phone Click" — a tel: tap on the website
    email:   '',                 // "Email Click"
    quote:   '',                 // "Quote Requested"
    contact: '',                 // "Contact Form Submitted"
  };

  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.indexOf('XXXX') !== -1) return; // not configured

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  var adsOn = /^AW-\d+$/.test(GOOGLE_ADS_ID);
  if (adsOn) window.gtag('config', GOOGLE_ADS_ID);

  /**
   * Records a conversion.
   *
   * Always sends a GA4 event so the funnel is visible in Analytics even before
   * the Ads account is wired up, and additionally sends the Ads conversion once
   * that action has a label.
   *
   * @param {string} name  key from CONVERSIONS above
   * @param {object} opts  { value, currency, id }
   *                       `id` makes the conversion idempotent: the same id is
   *                       only ever counted once per browser, so a customer
   *                       refreshing the confirmation page cannot inflate it.
   */
  window.sfacTrack = function (name, opts) {
    opts = opts || {};
    try {
      if (opts.id) {
        var key = 'sfac_conv_' + name + '_' + opts.id;
        if (window.sessionStorage && sessionStorage.getItem(key)) return;
        if (window.sessionStorage) sessionStorage.setItem(key, '1');
      }
    } catch (e) { /* private mode: counting twice beats not counting at all */ }

    var payload = { event_category: 'conversion', event_label: name };
    if (opts.value != null) { payload.value = opts.value; payload.currency = opts.currency || 'USD'; }
    window.gtag('event', 'sfac_' + name, payload);

    var label = CONVERSIONS[name];
    if (adsOn && label) {
      var conv = { send_to: GOOGLE_ADS_ID + '/' + label };
      if (opts.value != null) { conv.value = opts.value; conv.currency = opts.currency || 'USD'; }
      if (opts.id) conv.transaction_id = String(opts.id);
      window.gtag('event', 'conversion', conv);
    }
  };

  /* Phone and email are links, not forms, so the click is the conversion.
     Delegated from the document so it covers every tel:/mailto: on the site,
     including the ones the booking flow builds after load. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a) return;
    window.sfacTrack(a.getAttribute('href').indexOf('tel:') === 0 ? 'phone' : 'email');
  }, true);
})();
