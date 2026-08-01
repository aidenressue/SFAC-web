/*
  Google Analytics 4 for shineforacause.com  (Measurement ID: G-QPPG6HRJVN)
  -------------------------------------------------------------------------
  This is the single, shared Google Analytics loader used across the site.
  To change the tracking ID later, edit GA_MEASUREMENT_ID below in this one file
  and every page updates automatically.

  (Find your Measurement ID at analytics.google.com > Admin > Data Streams.)
*/
(function () {
  var GA_MEASUREMENT_ID = 'G-QPPG6HRJVN';

  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.indexOf('XXXX') !== -1) return; // not configured

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
})();
