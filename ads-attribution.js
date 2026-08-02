/*
 * Where the lead actually came from.
 *
 * Google Ads sends people to the site with a ?gclid= on the URL. Nothing was
 * reading it, so every ad click that turned into a lead arrived at the CRM
 * tagged "WEB" — indistinguishable from someone who found the site on their own.
 * That makes the one question ad spend has to answer unanswerable.
 *
 * This does two things:
 *
 *   1. Remembers the ad parameters the first time someone lands, and keeps them
 *      for 90 days. People rarely fill the form on the page they land on, and
 *      the parameters are gone the moment they click through to another page.
 *      First touch wins — the ad that earned the visit gets the credit, not
 *      whatever they happened to be looking at when they finally enquired.
 *
 *   2. Adds them to the lead as it is submitted, by wrapping fetch for the one
 *      CRM endpoint. Ten pages post leads, each building its own payload; this
 *      way none of them had to be rewritten and a new form gets it for free.
 *
 * Deliberately no cookies and no third-party anything — it is one localStorage
 * entry of parameters the advertiser put on their own URL.
 */
(function () {
  'use strict';

  var STORE = 'sfac_attribution';
  var MAX_AGE_DAYS = 90;
  var ENDPOINT = '/api/leads/webhook';

  function readParams() {
    try {
      var q = new URLSearchParams(window.location.search);
      var get = function (k) { return (q.get(k) || '').trim().slice(0, 200); };

      var gclid = get('gclid') || get('wbraid') || get('gbraid');
      var source = get('utm_source').toLowerCase();
      var medium = get('utm_medium').toLowerCase();
      var campaign = get('utm_campaign');
      var content = get('utm_content') || get('utm_term');

      if (!gclid && !source && !campaign) return null;

      // Platform, in the vocabulary the CRM already uses.
      var platform = 'WEB';
      if (gclid || source.indexOf('google') === 0) platform = 'GOOGLE';
      else if (source.indexOf('facebook') === 0 || source === 'fb') platform = 'FB';
      else if (source.indexOf('instagram') === 0 || source === 'ig') platform = 'IG';
      else if (source) platform = source.toUpperCase().slice(0, 20);

      return {
        platform: platform,
        campaign_name: campaign,
        // Falls back to something readable so the CRM is not left with a blank
        // column on a click that clearly came from an ad.
        ad_name: content || (gclid ? 'Google Ads click' : ''),
        gclid: gclid,
        medium: medium,
        landed_on: window.location.pathname,
        at: new Date().toISOString()
      };
    } catch (e) {
      return null;
    }
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.at) return null;
      var ageDays = (Date.now() - new Date(saved.at).getTime()) / 86400000;
      if (!isFinite(ageDays) || ageDays > MAX_AGE_DAYS) {
        window.localStorage.removeItem(STORE);
        return null;
      }
      return saved;
    } catch (e) {
      return null;
    }
  }

  // First touch wins, so a later organic visit does not overwrite the ad that
  // earned the lead. A genuinely new ad click does replace it.
  var fresh = readParams();
  var stored = load();
  if (fresh && (!stored || fresh.gclid || fresh.campaign_name)) {
    try { window.localStorage.setItem(STORE, JSON.stringify(fresh)); } catch (e) {}
    stored = fresh;
  }

  window.sfacAttribution = function () { return stored; };

  // ── Tag leads on their way out ──
  var nativeFetch = window.fetch;
  if (typeof nativeFetch !== 'function') return;

  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var isLead = url.indexOf(ENDPOINT) !== -1;
      var body = init && init.body;

      if (isLead && stored && typeof body === 'string') {
        var payload = JSON.parse(body);

        // Never override something the page knew better than we do: a Facebook
        // lead form posting platform FB must stay FB.
        if (!payload.platform || payload.platform === 'WEB') {
          payload.platform = stored.platform;
        }
        if (!payload.campaign_name && stored.campaign_name) payload.campaign_name = stored.campaign_name;
        if (!payload.ad_name && stored.ad_name) payload.ad_name = stored.ad_name;

        if (stored.gclid) {
          payload.notes = (payload.notes ? payload.notes + ' | ' : '') +
            'gclid: ' + stored.gclid +
            (stored.landed_on ? ' | landed: ' + stored.landed_on : '');
        }

        init = Object.assign({}, init, { body: JSON.stringify(payload) });
      }
    } catch (e) {
      // Attribution must never stop a lead being submitted.
    }
    return nativeFetch.apply(this, [input, init]);
  };
})();
