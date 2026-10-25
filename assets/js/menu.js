/* Mobile menu: a three-line (hamburger) button that opens the section links on small screens.
   Shared by every page; it reuses the links already in the page's <nav aria-label="Main">.
   Shown below 980px, where the desktop links are hidden. Bump menu.js?v=... in each page after editing. */
(function () {
  var nav = document.querySelector('header.site nav[aria-label="Main"]');
  var bar = document.querySelector('header.site .nav');
  if (!nav || !bar) return;

  var css = document.createElement('style');
  css.textContent =
    '.menu-btn{display:none;appearance:none;background:none;border:2px solid rgba(255,255,255,.35);width:44px;height:44px;padding:0;cursor:pointer;flex:none;place-items:center;border-radius:4px}' +
    '.menu-btn:hover{border-color:#F2A91E}' +
    '.menu-btn:focus-visible{outline:3px solid #F2A91E;outline-offset:2px}' +
    '.menu-btn i{display:block;width:20px;height:2px;background:#fff;position:relative;transition:transform .2s,background .2s}' +
    '.menu-btn i::before,.menu-btn i::after{content:"";position:absolute;left:0;width:20px;height:2px;background:#fff;transition:transform .2s,top .2s}' +
    '.menu-btn i::before{top:-7px}.menu-btn i::after{top:7px}' +
    '.menu-btn[aria-expanded="true"] i{background:transparent}' +
    '.menu-btn[aria-expanded="true"] i::before{top:0;transform:rotate(45deg)}' +
    '.menu-btn[aria-expanded="true"] i::after{top:0;transform:rotate(-45deg)}' +
    '.menu-panel{position:absolute;left:0;right:0;top:100%;background:#12213B;border-top:1px solid #1C3157;box-shadow:0 18px 30px rgba(0,0,0,.3);max-height:calc(100vh - 72px);overflow-y:auto}' +
    '.menu-panel[hidden]{display:none}' +
    '.menu-panel ul{list-style:none;margin:0;padding:8px max(16px,env(safe-area-inset-left,0px)) 16px}' +
    '.menu-panel a{display:block;padding:14px 4px;border-bottom:1px solid #1C3157;color:#DCE3EF;text-decoration:none;font-family:"Archivo","Arial Black",system-ui,sans-serif;font-weight:800;font-size:1.15rem;text-transform:uppercase;letter-spacing:.01em}' +
    '.menu-panel li:last-child a{border-bottom:0}' +
    '.menu-panel a:hover,.menu-panel a:focus-visible{color:#F2A91E;outline:none}' +
    '.nav-right{display:flex;align-items:center;gap:10px}' +
    '@media (max-width:980px){.menu-btn{display:grid}}' +
    '@media (max-width:420px){header.site .nav{gap:10px}.nav-right{gap:8px}.menu-btn{width:40px;height:40px}header.site .nav .btn{padding:8px 10px;font-size:.72rem}}' +
    '@media (min-width:981px){.menu-panel{display:none!important}}' +
    '@media (prefers-reduced-motion:reduce){.menu-btn i,.menu-btn i::before,.menu-btn i::after{transition:none}}';
  document.head.appendChild(css);

  // button, placed next to the "Book a conversation" button
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'menu-btn';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'menu-panel');
  btn.innerHTML = '<i aria-hidden="true"></i>';

  var cta = bar.querySelector(':scope > .btn');
  var right = document.createElement('div');
  right.className = 'nav-right';
  if (cta) { bar.insertBefore(right, cta); right.appendChild(cta); } else { bar.appendChild(right); }
  right.appendChild(btn);

  // panel with a copy of the section links
  var panel = document.createElement('nav');
  panel.id = 'menu-panel';
  panel.className = 'menu-panel';
  panel.setAttribute('aria-label', 'Sections');
  panel.hidden = true;
  var list = nav.querySelector('ul');
  if (list) panel.appendChild(list.cloneNode(true));
  document.querySelector('header.site').appendChild(panel);

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  }
  btn.addEventListener('click', function () { setOpen(panel.hidden); if (!panel.hidden) { var f = panel.querySelector('a'); if (f) f.focus(); } });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 980 && !panel.hidden) setOpen(false); });
})();
