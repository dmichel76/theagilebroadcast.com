/* Site analytics: Umami Cloud (cookieless, no consent banner needed).
   ------------------------------------------------------------------
   1. Paste the Umami website ID below. Until it's set, nothing is sent to Umami.
   2. Events recorded (each with "where" = the page section it came from):
        book-call        click on any Calendly link
        book             click through to Leanpub
        youtube          click through to YouTube
        linkedin         click through to LinkedIn
        self-reflection  click on a link to the self-assessment
        self-reflection-done  results shown on the self-assessment page
   3. UTM tags on the landing URL (e.g. ?utm_source=linkedin&utm_campaign=slicing-post)
      are kept for the visit and added to Calendly links, so Calendly can show
      which post a booking came from. */
(function () {
  var UMAMI_WEBSITE_ID = '53310796-e37c-4a64-98a3-dfda55a4ba7c'; // e.g. '3f2a9c1e-....'

  if (UMAMI_WEBSITE_ID) {
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    s.setAttribute('data-domains', 'theagilebroadcast.com,www.theagilebroadcast.com');
    document.head.appendChild(s);
  }

  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) {}
  }

  /* ---- keep UTM tags for the whole visit ---- */
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('tab_utm') || '{}'); } catch (e) {}
  var qs = new URLSearchParams(location.search);
  var fresh = {};
  KEYS.forEach(function (k) { if (qs.get(k)) fresh[k] = qs.get(k); });
  if (Object.keys(fresh).length) {
    utm = fresh;
    try { sessionStorage.setItem('tab_utm', JSON.stringify(utm)); } catch (e) {}
  }

  function withUtm(href) {
    if (!Object.keys(utm).length) return href;
    try {
      var u = new URL(href);
      KEYS.forEach(function (k) { if (utm[k] && !u.searchParams.has(k)) u.searchParams.set(k, utm[k]); });
      return u.toString();
    } catch (e) { return href; }
  }

  function where(el) {
    var sec = el.closest('section, header, footer, nav');
    if (!sec) return 'page';
    return sec.id || sec.getAttribute('aria-label') || sec.className.split(' ')[0] || sec.tagName.toLowerCase();
  }

  /* ---- outbound and self-reflection clicks (delegated, so links added by scripts count too) ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    var data = { where: where(a) };
    if (/calendly\.com/.test(href)) {
      a.href = withUtm(a.href);
      track('book-call', data);
    } else if (/leanpub\.com/.test(href)) {
      track('book', data);
    } else if (/youtube\.com|youtu\.be/.test(href)) {
      track('youtube', data);
    } else if (/linkedin\.com/.test(href)) {
      track('linkedin', data);
    } else if (/self-assessment\.html/.test(href)) {
      track('self-reflection', data);
    }
  }, true);

  /* ---- self-assessment completed: the results band becomes visible ---- */
  var results = document.getElementById('results');
  if (results && results.hasAttribute('hidden')) {
    new MutationObserver(function () {
      if (!results.hidden) track('self-reflection-done');
    }).observe(results, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
