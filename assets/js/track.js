/* Site analytics: Umami Cloud (cookieless, so no consent banner needed).
   Page views are counted automatically. These clicks show up under Events:
     Book a conversation       any Calendly button (section = where on the page)
     Book                      click through to Leanpub
     YouTube                   click through to YouTube
     LinkedIn                  click through to LinkedIn
     Menu: <name>              menu and in-page links, e.g. "Menu: Training"
     Self-reflection started   link to the self-assessment
     Self-reflection completed results shown on the self-assessment page
     Carry-over map opened     link to the sprint carry-over map
     Download                  a file downloaded from the site (file = its name, e.g. the Claude skill zip)
     Carry-over: sample shown  a visitor chose to see the sample data on the carry-over map
     Carry-over: CSV loaded    a visitor loaded their own CSV on the carry-over map (sent from carry-over.html; the file itself never leaves the browser) */
(function () {
  var UMAMI_WEBSITE_ID = '53310796-e37c-4a64-98a3-dfda55a4ba7c';

  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  s.setAttribute('data-domains', 'theagilebroadcast.com,www.theagilebroadcast.com');
  document.head.appendChild(s);

  function track(name, data) {
    try { if (window.umami) window.umami.track(name, data); } catch (e) {}
  }

  function section(el) {
    var sec = el.closest('section, header, footer');
    return sec ? (sec.id || sec.className.split(' ')[0] || sec.tagName.toLowerCase()) : 'page';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/calendly\.com/.test(href)) track('Book a conversation', { section: section(a) });
    else if (/leanpub\.com/.test(href)) track('Book', { section: section(a) });
    else if (/youtube\.com|youtu\.be/.test(href)) track('YouTube', { section: section(a) });
    else if (/linkedin\.com/.test(href)) track('LinkedIn', { section: section(a) });
    else if (/self-assessment\.html/.test(href)) track('Self-reflection started', { section: section(a) });
    else if (/\.zip(\?|$)/.test(href)) track('Download', { file: href.split('/').pop() });
    else if (/carry-over\.html/.test(href)) track('Carry-over map opened', { section: section(a) });
    else if (/^#[a-z]/.test(href)) {
      var name = (a.textContent || href.slice(1)).trim().replace(/\s+/g, ' ');
      track('Menu: ' + name);
    }
  }, true);

  var results = document.getElementById('results');
  if (results && results.hasAttribute('hidden')) {
    new MutationObserver(function () {
      if (!results.hidden) track('Self-reflection completed');
    }).observe(results, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
