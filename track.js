/*
 * Page views, counted first party.
 * ---------------------------------------------------------------------------
 * GA4 is on the site already, but reading its numbers back needs a Google
 * service account and they live in someone else's dashboard. This posts one
 * small beacon per page view to the CRM, so visits sit in the same database as
 * the leads and quotes they are meant to be judged against.
 *
 * No cookies and nothing third party. The session id is a random string held in
 * sessionStorage, which the browser drops when the tab closes; it exists to tell
 * one person reading six pages from six people reading one, and it identifies
 * nobody. No IP and no user agent is sent.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://sfac-mu.vercel.app/api/track';
  var SESSION_KEY = 'sfac_sid';
  var SESSION_MINS = 30;

  function session() {
    var now = Date.now();
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.id && now - s.at < SESSION_MINS * 60000) {
          s.at = now;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
          return { id: s.id, isNew: false };
        }
      }
      var id = (now.toString(36) + Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, at: now }));
      return { id: id, isNew: true };
    } catch (e) {
      // Private mode: still count the view, just never as a returning session.
      return { id: 'nostore-' + now.toString(36), isNew: true };
    }
  }

  function send() {
    var s = session();

    // Reuse whatever the ad attribution already worked out, so a view can be
    // split by campaign without asking the visitor anything.
    var attr = null;
    try { attr = window.sfacAttribution ? window.sfacAttribution() : null; } catch (e) {}

    var payload = {
      path: (location.pathname || '/').replace(/\.html$/, '') || '/',
      referrer: document.referrer && document.referrer.indexOf(location.host) === -1
        ? document.referrer : '',
      session_id: s.id,
      is_new_session: s.isNew,
      platform: attr && attr.platform ? attr.platform : '',
      campaign: attr && attr.campaign_name ? attr.campaign_name : ''
    };

    var body = JSON.stringify(payload);
    // sendBeacon survives the page being closed mid-request, which a fetch does
    // not. Falls back where it is missing.
    try {
      if (navigator.sendBeacon &&
          navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    } catch (e) {}
    try {
      fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body, keepalive: true, mode: 'cors'
      }).catch(function () {});
    } catch (e) {}
  }

  // After load, so counting never competes with rendering.
  if (document.readyState === 'complete') send();
  else window.addEventListener('load', send, { once: true });
})();
